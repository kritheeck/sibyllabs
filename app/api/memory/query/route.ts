import { NextResponse } from 'next/server'
import { getSibylClient } from '@/lib/sibyl-mcp-client'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({ query: '' }))
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    const limit = typeof body.limit === 'number' ? Math.min(body.limit, 50) : 20
    const tiers = typeof body.tiers === 'string' ? body.tiers : undefined

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const client = getSibylClient()
    const result = await client.searchEntities(query, limit, tiers)

    let hits: Array<{
      id?: string
      category: string
      name: string
      body?: Record<string, unknown>
      tier?: string
      score?: number
    }> = []

    if (Array.isArray(result)) {
      hits = result
    } else if (
      typeof result === 'object' &&
      result !== null &&
      'hits' in result &&
      Array.isArray((result as { hits: unknown[] }).hits)
    ) {
      hits = (result as { hits: Array<{ id?: string; category: string; name: string; body?: Record<string, unknown>; tier?: string; score?: number }> }).hits
    } else if (
      typeof result === 'object' &&
      result !== null &&
      'results' in result &&
      Array.isArray((result as { results: unknown[] }).results)
    ) {
      hits = (result as { results: Array<{ id?: string; category: string; name: string; body?: Record<string, unknown>; tier?: string; score?: number }> }).results
    }

    const memories = hits.map((hit, index) => {
      const body = hit.body ?? {}
      return {
        id: hit.id ?? hit.name ?? `hit-${index}`,
        label: typeof body.label === 'string' ? body.label : hit.name,
        ref: typeof body.ref === 'string' ? body.ref : `${hit.category} #${index + 1}`,
        category: hit.category,
        tier: hit.tier ?? 'entity',
        score: typeof hit.score === 'number' ? hit.score : 0.9,
        reason: typeof body.reason === 'string' ? body.reason : '',
        confidence: typeof body.confidence === 'number' ? body.confidence : 0.9,
        createdAt: typeof body.createdAt === 'string' ? body.createdAt : '',
      }
    })

    return NextResponse.json({ query, memories })
  } catch (error) {
    console.error('Failed to search memories:', error)
    return NextResponse.json(
      { error: 'Failed to search memories', details: String(error) },
      { status: 500 },
    )
  }
}
