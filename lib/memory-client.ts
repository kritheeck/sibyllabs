import { type MemoryGraph } from './memory-data'

export interface MemorySearchHit {
  id?: string
  category: string
  name: string
  body?: Record<string, unknown>
  tier?: string
  score?: number
}

export interface MemorySearchResponse {
  query: string
  memories: Array<{
    id: string
    label: string
    ref: string
    category: string
    tier?: string
    score?: number
    reason: string
    confidence: number
    createdAt: string
  }>
}

export async function fetchMemoryGraph(): Promise<MemoryGraph> {
  const res = await fetch('/api/memory', {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Failed to load memory graph: ${res.status}`)
  }
  const data = (await res.json()) as { nodes: MemoryGraph['nodes']; edges: MemoryGraph['edges'] }
  return { nodes: data.nodes ?? [], edges: data.edges ?? [] }
}

export async function searchMemories(
  query: string,
  limit = 20,
  tiers?: string,
): Promise<MemorySearchResponse> {
  const res = await fetch('/api/memory/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ query, limit, tiers }),
  })
  if (!res.ok) {
    throw new Error(`Failed to search memories: ${res.status}`)
  }
  return (await res.json()) as MemorySearchResponse
}
