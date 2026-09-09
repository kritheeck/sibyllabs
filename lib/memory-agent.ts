import { getSibylClient } from './sibyl-mcp-client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { saveMessage, createOrUpdateSession } from './supabase'
import { randomUUID } from 'node:crypto'

export interface AgentMemoryItem {
  id?: string
  category: string
  name: string
  body?: Record<string, unknown>
  tier?: string
  score?: number
  reason?: string
  confidence?: number
  createdAt?: string
  label?: string
  ref?: string
}

export interface AgentDecision {
  action: string
  reason: string
  memories: AgentMemoryItem[]
  constraintHit?: string
  confidence: number
}

export interface StoredMemorySummary {
  category: string
  name: string
  label: string
  reason?: string
}

export interface AgentRunResult {
  reply: string
  decision: AgentDecision
  memories: AgentMemoryItem[]
  recalledMemories: AgentMemoryItem[]
  storedMemories: StoredMemorySummary[]
  sessionId?: string
}

interface ExtractedMemoryItem {
  category: string
  name: string
  label: string
  reason: string
  importance?: string
  tags?: string[]
}

const ALLOWED_CATEGORIES = new Set([
  'FACT',
  'PREFERENCE',
  'DECISION',
  'CONSTRAINT',
  'PROJECT',
  'EVENT',
  'INCIDENT',
  'LESSON',
  'RELATIONSHIP',
  'ACTION',
  'OUTCOME',
])

async function generateContentWithRetry(
  ai: GoogleGenerativeAI,
  preferredModelName: string,
  prompt: string,
  extraConfig?: Record<string, unknown>,
  maxRetries = 4,
): Promise<any> {
  const candidateModels = [
    preferredModelName,
    'gemini-3.6-flash',
    'gemini-2.5-flash',
  ].filter((v, i, a) => a.indexOf(v) === i)

  let attempt = 0
  let modelIdx = 0

  while (true) {
    const currentModelName = candidateModels[modelIdx] || preferredModelName
    const model = ai.getGenerativeModel({ model: currentModelName, ...(extraConfig || {}) })
    try {
      return await model.generateContent(prompt)
    } catch (err: any) {
      attempt++
      const isRetryable =
        err?.status === 429 ||
        err?.status === 503 ||
        err?.status === 500 ||
        /429|503|500|quota|rate limit|too many requests|high demand|overloaded|temporarily unavailable|try again later/i.test(err?.message || '')

      if (isRetryable && attempt <= maxRetries) {
        if (candidateModels.length > 1) {
          modelIdx = (modelIdx + 1) % candidateModels.length
        }
        const delayMs = attempt * 2500 + Math.floor(Math.random() * 1000)
        console.warn(`[MemoryAgent] Gemini transient issue (${err.status || 'rate/demand'}). Retrying in ${delayMs}ms with model ${candidateModels[modelIdx]} (attempt ${attempt}/${maxRetries})...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }
      throw err
    }
  }
}

export class MemoryAgent {
  private client = getSibylClient()

  private getGeminiModel() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || !apiKey.trim()) {
      throw new Error(
        'Missing required environment variable: GEMINI_API_KEY. ' +
        'Please configure GEMINI_API_KEY in .env.local. ' +
        "The implementation expects Gemini model 'gemini-3.6-flash' (or 'gemini-2.5-flash').",
      )
    }
    const ai = new GoogleGenerativeAI(apiKey.trim())
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash'
    return { ai, modelName, model: ai.getGenerativeModel({ model: modelName }) }
  }

  private coerceMemory(hit: unknown, index: number): AgentMemoryItem {
    const record = (hit && typeof hit === 'object' ? hit : {}) as Record<string, unknown>
    const body = (record.body && typeof record.body === 'object' ? record.body : {}) as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name : (typeof record.key === 'string' ? record.key : `entity-${index}`)
    const category = typeof record.category === 'string' ? record.category.toUpperCase() : 'FACT'
    const label = typeof body.label === 'string' && body.label ? body.label : formatHumanLabel(name)
    const ref = typeof body.ref === 'string' && body.ref ? body.ref : `${category} #${index + 1}`

    return {
      id: typeof record.id === 'string' ? record.id : name,
      category,
      name,
      body,
      tier: typeof record.tier === 'string' ? record.tier : 'entity',
      score: typeof record.score === 'number' ? record.score : 0.9,
      reason: typeof body.reason === 'string' ? body.reason : (typeof body.description === 'string' ? body.description : ''),
      confidence: typeof body.confidence === 'number' ? body.confidence : 0.95,
      createdAt: typeof body.createdAt === 'string' ? body.createdAt : (typeof record.created_at === 'string' ? record.created_at : new Date().toISOString()),
      label,
      ref,
    }
  }

  private extractHits(result: unknown): unknown[] {
    if (Array.isArray(result)) return result
    if (typeof result === 'object' && result !== null) {
      const record = result as Record<string, unknown>
      if (Array.isArray(record.results)) return record.results
      if (Array.isArray(record.entities)) return record.entities
      if (Array.isArray(record.hits)) return record.hits
    }
    return []
  }

  /**
   * Authoritatively recalls relevant memories from Sibyl for the given query.
   * Only returns memories that have real semantic or lexical relevance.
   */
  async recall(query: string, limit = 20): Promise<{ allMemories: AgentMemoryItem[]; relevantMemories: AgentMemoryItem[] }> {
    try {
      // 1. Query Sibyl memory search
      const searchRes = await this.client.searchEntities(query, limit)
      const searchHits = this.extractHits(searchRes)

      // 2. Query Sibyl memory list to ensure complete cross-session coverage
      const listRes = await this.client.listEntities(undefined, 100)
      const listHits = this.extractHits(listRes)

      const mergedHits: unknown[] = [...searchHits]
      const seenKeys = new Set(searchHits.map((h: any) => h.name || h.key || h.id))

      for (const item of listHits as any[]) {
        const key = item.name || item.key || item.id
        if (key && !seenKeys.has(key)) {
          mergedHits.push(item)
          seenKeys.add(key)
        }
      }

      const allMemories = mergedHits.map((hit, index) => this.coerceMemory(hit, index))

      // 3. Extract query tokens (length >= 3, excluding common stop words)
      const stopWords = new Set([
        'what', 'which', 'where', 'when', 'why', 'how', 'who', 'does', 'doing', 'have', 'has',
        'the', 'and', 'for', 'with', 'about', 'our', 'your', 'from', 'this', 'that', 'should',
        'could', 'would', 'will', 'can', 'are', 'was', 'were', 'use', 'using', 'used', 'tell',
      ])
      const queryTokens = query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !stopWords.has(t))

      if (queryTokens.length === 0) {
        return { allMemories, relevantMemories: [] }
      }

      // 4. Score each memory for query relevance
      const scored = allMemories.map((m) => {
        const bodyStr = JSON.stringify(m.body || {})
        const targetText = `${m.name} ${m.category} ${m.label || ''} ${m.reason || ''} ${bodyStr}`.toLowerCase()
        let matchScore = 0

        for (const token of queryTokens) {
          if (targetText.includes(token)) {
            // Give higher weight to matches in name, category, or label
            if (m.name.toLowerCase().includes(token) || (m.label && m.label.toLowerCase().includes(token))) {
              matchScore += 5
            } else if (m.category.toLowerCase().includes(token)) {
              matchScore += 3
            } else {
              matchScore += 1
            }
          }
        }

        return { memory: m, score: matchScore }
      })

      // Filter to only memories that actually matched the query tokens
      const matching = scored.filter((s) => s.score > 0)
      matching.sort((a, b) => b.score - a.score)

      const relevantMemories = matching.slice(0, limit).map((s) => s.memory)
      return { allMemories, relevantMemories }
    } catch (error) {
      console.error('[MemoryAgent] Failed to recall memories from Sibyl:', error)
      return { allMemories: [], relevantMemories: [] }
    }
  }

  /**
   * Intelligently extracts durable operational memories from user interaction using Gemini,
   * and persists them authoritatively into Sibyl long-term memory.
   */
  async extractAndStoreMemories(query: string): Promise<StoredMemorySummary[]> {
    const trimmed = query.trim()
    const lower = trimmed.toLowerCase()

    // 1. Guard against storing pure questions, greetings, or ephemeral chitchat
    const isPureQuestion =
      trimmed.endsWith('?') ||
      /^(what|which|where|when|why|how|who|is|are|can|could|should|do|does|did|will|would|tell me|show me|explain)\b/i.test(trimmed)

    const isEphemeralGreeting =
      /^(hi|hello|hey|greetings|thanks|thank you|good morning|good evening|good afternoon|ok|okay|bye|farewell)\b/i.test(trimmed) &&
      trimmed.split(/\s+/).length <= 4

    if (isPureQuestion || isEphemeralGreeting) {
      return []
    }

    const stored: StoredMemorySummary[] = []

    try {
      const { ai, modelName } = this.getGeminiModel()

      const extractionPrompt = `You are the memory extraction engine for MEMORYOS.
Analyze the following user statement and extract any durable, long-term operational knowledge that should be remembered in Sibyl memory.

Categories to extract:
- PROJECT: Core project identity, repository, scope, or mission.
- FACT: Verified architectural, technical, infrastructure, or stack facts.
- PREFERENCE: Explicit user or team technical/procedural preferences (e.g., deployment style, tooling).
- DECISION: Definite technical, architectural, or procedural decisions agreed upon.
- CONSTRAINT: Mandatory rules, limitations, or policies (e.g. no Friday deployments).
- LESSON: Operational insights or takeaways.
- INCIDENT: Outages, regressions, or system blockers.
- ACTION: Significant operational milestones performed.
- OUTCOME: Concrete results from an action or project phase.

CRITICAL INSTRUCTIONS:
- If the statement contains NO durable facts, preferences, decisions, constraints, or project context, return an empty JSON array: [].
- Do not store temporary conversation artifacts or questions.
- Format 'name' as a lowercase unique identifier with underscores (e.g., 'atlas_tech_stack_supabase', 'deployment_preference_staged', 'friday_deployment_constraint').
- 'importance' must be one of: CRITICAL, HIGH, MEDIUM, LOW.

USER STATEMENT:
"${trimmed}"

Respond ONLY with a JSON array conforming to this schema:
[
  {
    "category": "PROJECT" | "FACT" | "PREFERENCE" | "DECISION" | "CONSTRAINT" | "LESSON" | "INCIDENT" | "ACTION" | "OUTCOME",
    "name": "string",
    "label": "string",
    "reason": "string",
    "importance": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    "tags": ["string"]
  }
]`

      const extractResult = await generateContentWithRetry(
        ai,
        modelName,
        extractionPrompt,
        { generationConfig: { responseMimeType: 'application/json' } },
      )
      const rawJson = extractResult.response.text().trim()
      let items: ExtractedMemoryItem[] = []

      try {
        const parsed = JSON.parse(rawJson)
        if (Array.isArray(parsed)) {
          items = parsed.filter(
            (it) =>
              it &&
              typeof it === 'object' &&
              typeof it.category === 'string' &&
              typeof it.name === 'string' &&
              typeof it.label === 'string',
          )
        }
      } catch (parseErr) {
        console.warn('[MemoryAgent] Failed to parse JSON from memory extraction:', parseErr, rawJson)
      }

      // Persist each extracted memory into Sibyl
      for (const item of items) {
        const category = ALLOWED_CATEGORIES.has(item.category.toUpperCase())
          ? item.category.toUpperCase()
          : 'FACT'
        const slug = item.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')
        const label = item.label.trim()
        const reason = item.reason || `Extracted from user interaction: "${trimmed}"`
        const importance = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(item.importance?.toUpperCase() || '')
          ? item.importance!.toUpperCase()
          : 'HIGH'
        const tags = Array.isArray(item.tags) && item.tags.length > 0
          ? item.tags.map((t) => String(t).toLowerCase())
          : [category.toLowerCase()]

        try {
          await this.client.rememberEntity(category, slug, {
            label,
            ref: `${category.slice(0, 3)}-${slug.slice(0, 6).toUpperCase()}`,
            reason,
            confidence: 0.98,
            importance,
            tags,
            createdAt: new Date().toISOString(),
          })

          await this.client.recordEvent(
            'MEMORY_RECORDED',
            { category, name: slug, label, reason, importance },
            category,
            slug,
          )

          stored.push({ category, name: slug, label, reason })
          console.log(`[MemoryAgent] Stored durable memory to Sibyl: [${category}] ${slug}`)
        } catch (storeErr) {
          console.error(`[MemoryAgent] Error saving memory ${slug} to Sibyl:`, storeErr)
        }
      }
    } catch (err) {
      console.warn('[MemoryAgent] LLM extraction error, executing fallback pattern extraction:', err)
      // Resilient fallback rule-based extraction
      const fallbackItems = this.fallbackExtraction(trimmed)
      for (const fb of fallbackItems) {
        try {
          await this.client.rememberEntity(fb.category, fb.name, {
            label: fb.label,
            ref: `${fb.category.slice(0, 3)}-${fb.name.slice(0, 6).toUpperCase()}`,
            reason: fb.reason,
            confidence: 0.95,
            importance: fb.importance || 'HIGH',
            tags: fb.tags || [fb.category.toLowerCase()],
            createdAt: new Date().toISOString(),
          })
          stored.push({ category: fb.category, name: fb.name, label: fb.label, reason: fb.reason })
        } catch (e) {
          console.error('[MemoryAgent] Fallback remember error:', e)
        }
      }
    }

    return stored
  }

  private fallbackExtraction(query: string): ExtractedMemoryItem[] {
    const items: ExtractedMemoryItem[] = []
    const lower = query.toLowerCase()

    // Project extraction
    const projectMatch = query.match(/(?:my project is (?:called )?|working on (?:project )?|building (?:project )?|project:?\s*)([A-Za-z0-9_\-]+)/i)
    if (projectMatch && projectMatch[1] && !/^(the|a|an|this|that|and|our)$/i.test(projectMatch[1])) {
      const proj = projectMatch[1].trim()
      items.push({
        category: 'PROJECT',
        name: `project_${proj.toLowerCase()}`,
        label: `${proj} Project`,
        reason: `User declared project context: ${proj}`,
        importance: 'CRITICAL',
        tags: [proj.toLowerCase(), 'project'],
      })
    }

    // Technology stack / database
    if (lower.includes('supabase')) {
      items.push({
        category: 'FACT',
        name: 'stack_supabase_database',
        label: 'Database: Supabase',
        reason: 'Supabase declared as active database infrastructure',
        importance: 'HIGH',
        tags: ['supabase', 'database', 'infrastructure'],
      })
    }
    if (lower.includes('typescript')) {
      items.push({
        category: 'FACT',
        name: 'stack_typescript_language',
        label: 'Language: TypeScript',
        reason: 'TypeScript declared as primary development language',
        importance: 'HIGH',
        tags: ['typescript', 'language'],
      })
    }

    // Deployment preference
    if (lower.includes('staged deployment') || lower.includes('staged deployments')) {
      items.push({
        category: 'PREFERENCE',
        name: 'preference_staged_deployments',
        label: 'Preference: Staged Deployments',
        reason: 'User explicitly prefers staged deployments',
        importance: 'MEDIUM',
        tags: ['deployment', 'preference', 'staged'],
      })
    }

    // Constraint (e.g. Friday deployments)
    if ((lower.includes('no') || lower.includes('never') || lower.includes('block')) && lower.includes('friday') && lower.includes('deploy')) {
      items.push({
        category: 'CONSTRAINT',
        name: 'constraint_no_friday_deployments',
        label: 'Policy: No Friday Deployments',
        reason: 'Deployments on Fridays are prohibited to preserve operational stability',
        importance: 'CRITICAL',
        tags: ['constraint', 'deployment', 'policy'],
      })
    }

    return items
  }

  /**
   * Generates a grounded, intelligent response using real Gemini,
   * incorporating authoritative memories recalled from Sibyl.
   */
  async generateResponse(
    query: string,
    recalled: AgentMemoryItem[],
    stored: StoredMemorySummary[],
  ): Promise<string> {
    const { ai, modelName } = this.getGeminiModel()

    // Format recalled memories as explicit grounding context
    const recalledContext = recalled.length > 0
      ? recalled
          .map((m) => `- [${m.category}] ${m.label || m.name}: ${m.reason || (m.body ? JSON.stringify(m.body) : '')}`)
          .join('\n')
      : '(No existing prior memories found for this query in Sibyl)'

    // Format newly stored memories if any were written
    const storedContext = stored.length > 0
      ? stored
          .map((s) => `- [${s.category}] ${s.label}: ${s.reason || ''}`)
          .join('\n')
      : ''

    const prompt = `You are MEMORYOS, an operational AI assistant with authoritative, persistent long-term memory powered by Sibyl.

AUTHORITATIVE PERSISTENT MEMORIES RECALLED FROM SIBYL:
${recalledContext}

${storedContext ? `DURABLE MEMORIES JUST COMMITTED TO SIBYL IN THIS TURN:\n${storedContext}\n` : ''}

USER MESSAGE:
${query}

CORE INSTRUCTIONS:
1. LOAD-BEARING REASONING:
   - When the user asks about projects, technology stack, architecture, database, preferences, decisions, constraints, or previous interactions, your answer MUST be grounded in the AUTHORITATIVE PERSISTENT MEMORIES recalled from Sibyl above.
   - For example, if recalled memories indicate that a project uses a specific database, language, or deployment strategy, cite and use those facts accurately.
   - If a policy or constraint is recalled (e.g., no Friday deployments) and the user proposes an action that conflicts with it, strictly enforce the constraint and explain why.

2. NEW DURABLE KNOWLEDGE:
   - If new durable memories were just committed to Sibyl (shown above), acknowledge to the user that these facts/preferences/decisions have been durably stored in persistent memory.

3. GENERAL & ARBITRARY INQUIRIES:
   - If the user asks general knowledge questions, technical concepts (e.g., explaining quantum computing, writing a debounce function, Next.js optimization), reasoning questions, or unrelated inquiries, answer comprehensively, expertly, and naturally using your intelligence.
   - Do NOT invent or hallucinate fake memories if none are present in the recalled context.

4. TONE & STYLE:
   - Authoritative, clean, precise, and operational.`

    try {
      const result = await generateContentWithRetry(ai, modelName, prompt)
      const text = result.response.text()
      if (!text || !text.trim()) {
        throw new Error('Gemini returned an empty response.')
      }
      return text.trim()
    } catch (apiError: any) {
      console.error('[MemoryAgent] Gemini API execution failed:', apiError)
      throw new Error(`Gemini API execution failed: ${apiError.message || String(apiError)}`)
    }
  }

  /**
   * Main orchestrator pipeline:
   * User message → Recall Sibyl memories → Extract & store new memories →
   * Gemini response grounded in Sibyl → Decision structure → Supabase persistence.
   */
  async run(query: string, sessionId?: string): Promise<AgentRunResult> {
    const activeSessionId = sessionId || randomUUID()

    // 1. Authoritative recall from Sibyl
    const { allMemories, relevantMemories } = await this.recall(query)

    // 2. Extract durable operational memories from the message and write to Sibyl
    const storedMemories = await this.extractAndStoreMemories(query)

    // If new memories were just written, merge them into relevantMemories so they are immediately accessible
    const effectiveRecalled = [...relevantMemories]
    for (const s of storedMemories) {
      if (!effectiveRecalled.some((m) => m.name === s.name)) {
        effectiveRecalled.unshift({
          category: s.category,
          name: s.name,
          label: s.label,
          reason: s.reason,
          confidence: 0.99,
        })
      }
    }

    // 3. Generate grounded response from real Gemini
    const reply = await this.generateResponse(query, effectiveRecalled, storedMemories)

    // 4. Formulate operational decision metadata
    const constraintHit = effectiveRecalled.find((m) => m.category === 'CONSTRAINT')?.name
    const isDeployOrRelease = /deploy|release|ship|production/i.test(query)
    const action = constraintHit && isDeployOrRelease ? 'BLOCK' : 'PROCEED_WITH_CONTEXT'

    const decision: AgentDecision = {
      action,
      reason: reply.slice(0, 160),
      memories: effectiveRecalled,
      constraintHit: action === 'BLOCK' ? constraintHit : undefined,
      confidence: 0.98,
    }

    // 5. Persist session metadata and messages to Supabase without replacing Sibyl
    try {
      await createOrUpdateSession(activeSessionId, `Chat: ${query.slice(0, 32)}`)

      // Save user message
      await saveMessage({
        id: `usr-${randomUUID()}`,
        session_id: activeSessionId,
        role: 'user',
        content: query,
        created_at: new Date().toISOString(),
      })

      // Save assistant message
      await saveMessage({
        id: `ast-${randomUUID()}`,
        session_id: activeSessionId,
        role: 'assistant',
        content: reply,
        recalled_memories: effectiveRecalled.map((m) => ({
          category: m.category,
          name: m.name,
          label: m.label || m.name,
        })),
        stored_memories: storedMemories.map((s) => ({
          category: s.category,
          name: s.name,
          label: s.label,
        })),
        decision: decision as unknown as Record<string, unknown>,
        created_at: new Date().toISOString(),
      })
    } catch (dbErr) {
      console.warn('[MemoryAgent] Supabase session logging note:', dbErr)
    }

    return {
      reply,
      decision,
      memories: allMemories,
      recalledMemories: effectiveRecalled,
      storedMemories,
      sessionId: activeSessionId,
    }
  }
}

function formatHumanLabel(name: string): string {
  if (!name) return 'Memory'
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const memoryAgent = new MemoryAgent()
