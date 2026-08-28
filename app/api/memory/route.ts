import { NextResponse } from 'next/server'
import { getSibylClient } from '@/lib/sibyl-mcp-client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const client = getSibylClient()
    const result = await client.listEntities()

    let entities: Array<{
      id?: string
      category: string
      name: string
      body?: Record<string, unknown>
      created_at?: string
      updated_at?: string
    }> = []

    if (Array.isArray(result)) {
      entities = result
    } else if (
      typeof result === 'object' &&
      result !== null &&
      'entities' in result &&
      Array.isArray((result as { entities: unknown[] }).entities)
    ) {
      entities = (result as { entities: Array<{ id?: string; category: string; name: string; body?: Record<string, unknown>; created_at?: string; updated_at?: string }> }).entities
    }

    const nodes = entities.map((entity, index) => {
      const body = entity.body ?? {}
      const type = mapCategoryToType(entity.category)
      const importance = (typeof body.importance === 'string' ? body.importance.toUpperCase() : 'MEDIUM') as
        | 'CRITICAL'
        | 'HIGH'
        | 'MEDIUM'
        | 'LOW'

      return {
        id: entity.id ?? entity.name ?? `entity-${index}`,
        label: typeof body.label === 'string' ? body.label : entity.name,
        ref: typeof body.ref === 'string' ? body.ref : `${type} #${index + 1}`,
        type,
        importance,
        confidence: typeof body.confidence === 'number' ? body.confidence : 0.9,
        createdAt: entity.created_at ?? entity.updated_at ?? new Date().toISOString(),
        reason: typeof body.reason === 'string' ? body.reason : '',
        usedInDecisions: typeof body.usedInDecisions === 'number' ? body.usedInDecisions : 0,
        position: Array.isArray(body.position)
          ? (body.position as [number, number, number])
          : ([0, 0, 0] as [number, number, number]),
        relatedIds: Array.isArray(body.relatedIds) ? (body.relatedIds as string[]) : [],
        tags: Array.isArray(body.tags) ? (body.tags as string[]) : [entity.category],
      }
    })

    const edges = buildEdges(nodes)

    return NextResponse.json({ nodes, edges })
  } catch (error) {
    console.error('Failed to load memory graph:', error)
    return NextResponse.json(
      { error: 'Failed to load memory graph', details: String(error) },
      { status: 500 },
    )
  }
}

function mapCategoryToType(category: string): 'PROJECT' | 'DECISION' | 'CONSTRAINT' | 'INCIDENT' | 'LESSON' | 'EVENT' | 'ACTION' {
  const normalized = category.toLowerCase()
  if (normalized.includes('project')) return 'PROJECT'
  if (normalized.includes('decision')) return 'DECISION'
  if (normalized.includes('constraint') || normalized.includes('policy')) return 'CONSTRAINT'
  if (normalized.includes('incident')) return 'INCIDENT'
  if (normalized.includes('lesson')) return 'LESSON'
  if (normalized.includes('event')) return 'EVENT'
  if (normalized.includes('action')) return 'ACTION'
  return 'EVENT'
}

function buildEdges(
  nodes: Array<{ id: string; relatedIds: string[] }>,
): Array<{ from: string; to: string; strength: number; kind: 'derives' | 'constrains' | 'caused' | 'informs' | 'executes' }> {
  const edges: Array<{ from: string; to: string; strength: number; kind: 'derives' | 'constrains' | 'caused' | 'informs' | 'executes' }> = []
  const seen = new Set<string>()

  for (const node of nodes) {
    for (const targetId of node.relatedIds) {
      if (targetId === node.id) continue
      const key = `${node.id}->${targetId}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({
        from: node.id,
        to: targetId,
        strength: 0.5,
        kind: 'informs',
      })
    }
  }

  return edges
}
