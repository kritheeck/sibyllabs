import { getSibylClient } from './sibyl-mcp-client'

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
}

export interface AgentDecision {
  action: string
  reason: string
  memories: AgentMemoryItem[]
  constraintHit?: string
  confidence: number
}

export class MemoryAgent {
  private client = getSibylClient()

  private coerceMemory(hit: unknown, index: number): AgentMemoryItem {
    const record = hit as AgentMemoryItem
    const body = record.body ?? {}
    return {
      id: record.id ?? record.name ?? `hit-${index}`,
      category: record.category,
      name: record.name,
      body,
      tier: record.tier ?? 'entity',
      score: typeof record.score === 'number' ? record.score : 0.9,
      reason: typeof body.reason === 'string' ? body.reason : '',
      confidence: typeof body.confidence === 'number' ? body.confidence : 0.9,
      createdAt: typeof body.createdAt === 'string' ? body.createdAt : '',
    }
  }

  async recall(query: string, limit = 20): Promise<AgentMemoryItem[]> {
    try {
      const result = await this.client.searchEntities(query, limit)
      const hits = this.extractHits(result)
      return hits.map((hit, index) => this.coerceMemory(hit, index))
    } catch {
      return []
    }
  }

  private extractHits(result: unknown): unknown[] {
    if (Array.isArray(result)) return result
    if (typeof result === 'object' && result !== null) {
      const record = result as Record<string, unknown>
      if (Array.isArray(record.hits)) return record.hits
      if (Array.isArray(record.results)) return record.results
      if (Array.isArray(record.entities)) return record.entities
    }
    return []
  }

  async decide(query: string, memories: AgentMemoryItem[]): Promise<AgentDecision> {
    const constraintHits = memories.filter((m) => m.category.toLowerCase().includes('constraint') || m.category.toLowerCase().includes('policy'))
    const decisionHits = memories.filter((m) => m.category.toLowerCase().includes('decision'))
    const outcomeHits = memories.filter((m) => m.category.toLowerCase().includes('incident') || m.category.toLowerCase().includes('lesson'))

    const today = new Date().getDay()
    const isFriday = today === 5
    const deployKeywords = /deploy|release|ship|production/i
    const wantsDeploy = deployKeywords.test(query)

    if (isFriday && wantsDeploy && constraintHits.length > 0) {
      return {
        action: 'BLOCK',
        reason: `Friday deployment blocked by constraint: ${constraintHits[0].name}`,
        memories: constraintHits,
        constraintHit: constraintHits[0].name,
        confidence: 0.95,
      }
    }

    if (constraintHits.length > 0 && wantsDeploy) {
      return {
        action: 'REVIEW',
        reason: `Active constraint affects this action: ${constraintHits[0].name}`,
        memories: constraintHits,
        constraintHit: constraintHits[0].name,
        confidence: 0.8,
      }
    }

    if (decisionHits.length > 0) {
      return {
        action: 'PROCEED_WITH_CONTEXT',
        reason: `Proceeding, but ${decisionHits.length} prior decision(s) in memory may be relevant.`,
        memories: decisionHits,
        confidence: 0.75,
      }
    }

    if (memories.length > 0) {
      return {
        action: 'PROCEED',
        reason: `No blocking constraints found. ${memories.length} memories reviewed.`,
        memories,
        confidence: 0.6,
      }
    }

    return {
      action: 'PROCEED',
      reason: 'No relevant memories found. Proceeding without historical context.',
      memories: [],
      confidence: 0.4,
    }
  }

  async writeOutcome(action: string, query: string, decision: AgentDecision): Promise<void> {
    try {
      await this.client.rememberEntity(
        'DECISION',
        `Outcome: ${action} for "${query.slice(0, 40)}"`,
        {
          label: `Outcome: ${action}`,
          ref: `outcome-${Date.now()}`,
          reason: decision.reason,
          confidence: decision.confidence,
          relatedIds: decision.memories.map((m) => m.id).filter(Boolean),
          createdAt: new Date().toISOString(),
        },
      )
    } catch {
      // best-effort write-back
    }
  }

  async run(query: string): Promise<{ decision: AgentDecision; memories: AgentMemoryItem[] }> {
    const memories = await this.recall(query)
    const decision = await this.decide(query, memories)
    await this.writeOutcome(decision.action, query, decision)
    return { decision, memories }
  }
}

export const memoryAgent = new MemoryAgent()
