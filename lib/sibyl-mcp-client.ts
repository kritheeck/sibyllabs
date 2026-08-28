import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const SIBYL_MCP_PATH =
  process.env.SIBYL_MCP_PATH ??
  'C:\\Users\\Kritheeck\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\sibyl-memory-mcp.exe'

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: Record<string, unknown>
}

type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: number | string
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
    { resolve: (value: unknown) => void; reject: (err: Error) => void }
  >()
  private nextId = 1
  private initialized = false

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    this.proc = spawn(SIBYL_MCP_PATH, [], {
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
      console.error('[sibyl-mcp stderr]', chunk.toString())
    })

    proc.on('error', (err) => {
      console.error('[sibyl-mcp error]', err)
    })

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

    await this.send('notifications/initialized', undefined, true)
    this.initialized = true
  }

  private drainBuffer(): void {
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const msg = JSON.parse(trimmed) as JsonRpcResponse
        if (msg.id != null && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!
          this.pending.delete(msg.id)
          if (msg.error) {
            reject(new Error(`Sibyl MCP error ${msg.error.code}: ${msg.error.message}`))
          } else {
            resolve(msg.result)
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
        id: id ?? uuid(),
        method,
        ...(params != null ? { params } : {}),
      }

      if (!notification && id != null) {
        this.pending.set(id, { resolve, reject })
      }

      this.proc.stdin.write(JSON.stringify(payload) + '\n', (err) => {
        if (err) {
          if (id != null) {
            this.pending.delete(id)
          }
          reject(err)
        }
      })

      if (notification) {
        resolve(undefined)
      }
    })
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
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
