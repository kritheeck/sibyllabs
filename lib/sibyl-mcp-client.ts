import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'

function getMcpSpawnTarget(): { command: string; args: string[] } {
  if (process.env.SIBYL_MCP_COMMAND) {
    const parts = process.env.SIBYL_MCP_COMMAND.trim().split(/\s+/)
    return { command: parts[0], args: parts.slice(1) }
  }
  if (process.env.SIBYL_MCP_PATH && fs.existsSync(process.env.SIBYL_MCP_PATH)) {
    return { command: process.env.SIBYL_MCP_PATH, args: [] }
  }
  if (process.platform === 'win32') {
    const wslBin = process.env.SIBYL_WSL_BIN ?? '/home/kritheeck/.sibyl-venv/bin/sibyl-memory-mcp'
    return { command: 'wsl', args: ['-e', wslBin] }
  }
  return { command: 'sibyl-memory-mcp', args: [] }
}

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id?: number | string
  method: string
  params?: Record<string, unknown>
}

type JsonRpcResponse = {
  jsonrpc: '2.0'
  id?: number | string
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

function uuid(): number | string {
  return randomUUID()
}

export class SibylMCPClient {
  private proc: ReturnType<typeof spawn> | null = null
  private buffer = ''
  private pending = new Map<
    number | string,
    { resolve: (value: unknown) => void; reject: (err: Error) => void; timer?: NodeJS.Timeout }
  >()
  private nextId = 1
  private initialized = false
  private initPromise: Promise<void> | null = null

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.proc && !this.proc.killed) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      const target = getMcpSpawnTarget()
      console.log(`[SibylMCPClient] Spawning Sibyl MCP server: ${target.command} ${target.args.join(' ')}`)

      this.proc = spawn(/*turbopackIgnore: true*/ target.command, target.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      })

      const proc = this.proc
      if (proc.stdout == null || proc.stderr == null || proc.stdin == null) {
        throw new Error('Failed to open stdio for Sibyl MCP server')
      }

      proc.stdout.setEncoding('utf-8')
      proc.stdout.on('data', (chunk: string) => {
        this.buffer += chunk
        this.drainBuffer()
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        const msg = chunk.toString().trim()
        if (msg) console.error('[sibyl-mcp stderr]', msg)
      })

      const handleExit = (err?: Error) => {
        this.initialized = false
        this.proc = null
        this.initPromise = null
        for (const [id, item] of this.pending.entries()) {
          if (item.timer) clearTimeout(item.timer)
          item.reject(err || new Error('Sibyl MCP process disconnected'))
        }
        this.pending.clear()
      }

      proc.on('error', (err) => {
        console.error('[sibyl-mcp process error]', err)
        handleExit(err)
      })

      proc.on('close', (code) => {
        if (code !== 0 && code !== null) {
          console.warn(`[sibyl-mcp process closed with code ${code}]`)
        }
        handleExit()
      })

      try {
        const initResponse = await this.send('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'memoryos-backend', version: '1.0.0' },
        })

        if (
          typeof initResponse !== 'object' ||
          initResponse === null ||
          !('serverInfo' in initResponse)
        ) {
          throw new Error('Invalid initialize response from Sibyl MCP server')
        }

        await this.send('notifications/initialized', {}, true)
        this.initialized = true
        console.log('[SibylMCPClient] Sibyl MCP client initialized successfully')
      } catch (err) {
        this.initialized = false
        this.proc?.kill()
        this.proc = null
        throw err
      } finally {
        this.initPromise = null
      }
    })()

    return this.initPromise
  }

  private drainBuffer(): void {
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const msg = JSON.parse(trimmed) as JsonRpcResponse
        const idKey =
          msg.id != null
            ? this.pending.has(msg.id)
              ? msg.id
              : this.pending.has(String(msg.id))
                ? String(msg.id)
                : this.pending.has(Number(msg.id))
                  ? Number(msg.id)
                  : null
            : null

        if (idKey != null) {
          const item = this.pending.get(idKey)!
          this.pending.delete(idKey)
          if (item.timer) clearTimeout(item.timer)
          if (msg.error) {
            item.reject(new Error(`Sibyl MCP error ${msg.error.code}: ${msg.error.message}`))
          } else {
            item.resolve(msg.result)
          }
        }
      } catch {
        // ignore non-JSON lines
      }
    }
  }

  private send(method: string, params?: Record<string, unknown>, notification = false): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.proc || this.proc.stdin == null) {
        return reject(new Error('Sibyl MCP client is not initialized'))
      }

      const id = notification ? undefined : this.nextId++
      const payload: JsonRpcRequest = {
        jsonrpc: '2.0',
        ...(notification ? {} : { id: id ?? uuid() }),
        method,
        params: params ?? {},
      }

      let timer: NodeJS.Timeout | undefined
      if (!notification && id != null) {
        timer = setTimeout(() => {
          if (this.pending.has(id)) {
            this.pending.delete(id)
            reject(new Error(`Sibyl MCP request timed out after 15s (method: ${method})`))
          }
        }, 15000)
        this.pending.set(id, { resolve, reject, timer })
      }

      this.proc.stdin.write(JSON.stringify(payload) + '\n', (err) => {
        if (err) {
          if (id != null) {
            this.pending.delete(id)
          }
          if (timer) clearTimeout(timer)
          reject(err)
        }
      })

      if (notification) {
        resolve(undefined)
      }
    })
  }

  private async callRemoteTool(
    baseUrl: string,
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const cleanUrl = baseUrl.replace(/\/+$/, '')
    const apiKey = process.env.SIBYL_API_KEY?.trim()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await fetch(`${cleanUrl}/tools/call`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, arguments: args }),
      cache: 'no-store',
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Remote Sibyl MCP tool call [${name}] failed (${response.status}): ${errText}`)
    }

    const data = await response.json()
    if (data && typeof data === 'object' && 'result' in data) {
      return data.result
    }
    return data
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const remoteUrl = process.env.SIBYL_MCP_URL?.trim()
    if (remoteUrl) {
      return this.callRemoteTool(remoteUrl, name, args)
    }

    await this.ensureInitialized()
    const response = await this.send('tools/call', {
      name,
      arguments: args,
    })

    if (
      typeof response !== 'object' ||
      response === null ||
      !('content' in response) ||
      !Array.isArray((response as { content: unknown[] }).content)
    ) {
      throw new Error(`Unexpected tool response shape for ${name}`)
    }

    const content = (response as { content: Array<{ type: string; text?: string }> }).content
    const textPart = content.find((part) => part.type === 'text')
    if (!textPart?.text) {
      return null
    }

    try {
      return JSON.parse(textPart.text)
    } catch {
      return textPart.text
    }
  }

  async listEntities(category?: string, limit = 50): Promise<unknown> {
    return this.callTool('memory_list', {
      category: category ?? null,
      limit: Math.min(limit, 200),
    })
  }

  async searchEntities(query: string, limit = 20, tiers?: string): Promise<unknown> {
    return this.callTool('memory_search', {
      query,
      limit: Math.min(limit, 50),
      tiers: tiers ?? null,
    })
  }

  async recallEntity(category: string, name: string): Promise<unknown> {
    return this.callTool('memory_recall', { category, name })
  }

  async rememberEntity(
    category: string,
    name: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.callTool('memory_remember', { category, name, body })
  }

  async recordEvent(
    kind: string,
    body: Record<string, unknown>,
    category?: string,
    name?: string,
  ): Promise<unknown> {
    return this.callTool('memory_record_event', {
      kind,
      body,
      category: category ?? null,
      name: name ?? null,
    })
  }

  async getState(key: string): Promise<unknown> {
    return this.callTool('memory_get_state', { key })
  }

  async setState(key: string, body: Record<string, unknown>): Promise<unknown> {
    return this.callTool('memory_set_state', { key, body })
  }

  close(): void {
    if (this.proc) {
      this.proc.kill('SIGTERM')
      this.proc = null
      this.initialized = false
    }
  }
}

let sharedClient: SibylMCPClient | null = null

export function getSibylClient(): SibylMCPClient {
  if (!sharedClient) {
    sharedClient = new SibylMCPClient()
  }
  return sharedClient
}
