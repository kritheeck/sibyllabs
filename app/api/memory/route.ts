import { NextResponse } from 'next/server'
import { getSibylClient } from '@/lib/sibyl-mcp-client'
import { type MemoryType } from '@/lib/memory-data'

export const runtime = 'nodejs'

// Category cluster angles and radii for 3D constellation layout
const CATEGORY_ORBITS: Record<string, { r: number; phiSpan: [number, number]; thetaOffset: number }> = {
  PROJECT: { r: 0.6, phiSpan: [0.35, 0.65], thetaOffset: 0 },
  DECISION: { r: 1.15, phiSpan: [0.2, 0.45], thetaOffset: (2 * Math.PI) / 3 },
  CONSTRAINT: { r: 1.25, phiSpan: [0.55, 0.85], thetaOffset: (4 * Math.PI) / 3 },
  FACT: { r: 0.95, phiSpan: [0.4, 0.7], thetaOffset: Math.PI / 4 },
  INCIDENT: { r: 1.35, phiSpan: [0.65, 0.9], thetaOffset: Math.PI },
  LESSON: { r: 1.05, phiSpan: [0.3, 0.6], thetaOffset: (5 * Math.PI) / 4 },
  ACTION: { r: 1.2, phiSpan: [0.25, 0.55], thetaOffset: Math.PI / 2 },
  OUTCOME: { r: 1.1, phiSpan: [0.45, 0.75], thetaOffset: (7 * Math.PI) / 4 },
  EVENT: { r: 1.3, phiSpan: [0.35, 0.65], thetaOffset: (3 * Math.PI) / 2 },
}

function calculateNodePosition(
  category: string,
  index: number,
  categoryCount: number,
  _total: number,
): [number, number, number] {
  const normCategory = mapCategoryToType(category)
  const orbit = CATEGORY_ORBITS[normCategory] || { r: 1.1, phiSpan: [0.3, 0.7], thetaOffset: 0 }

  const angleFraction = categoryCount > 1 ? index / categoryCount : 0.5
  const theta = orbit.thetaOffset + (angleFraction - 0.5) * (Math.PI * 0.85)

  const [minPhi, maxPhi] = orbit.phiSpan
  const phi = (minPhi + (maxPhi - minPhi) * ((index % 3) / 2)) * Math.PI

  const r = orbit.r + (index % 2 === 0 ? 0.08 : -0.08)

  const x = Number((r * Math.sin(phi) * Math.cos(theta)).toFixed(3))
  const y = Number((r * Math.cos(phi) * 0.85).toFixed(3))
  const z = Number((r * Math.sin(phi) * Math.sin(theta)).toFixed(3))

  return [x, y, z]
}

export async function GET() {
  try {
    const client = getSibylClient()
    const result = await client.listEntities(undefined, 100)

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
    } else if (typeof result === 'object' && result !== null) {
      if ('results' in result && Array.isArray((result as { results: unknown[] }).results)) {
        entities = (result as { results: typeof entities }).results
      } else if ('entities' in result && Array.isArray((result as { entities: unknown[] }).entities)) {
        entities = (result as { entities: typeof entities }).entities
      }
    }

    // Count entities by category for cluster spacing
    const categoryCounts: Record<string, number> = {}
    for (const e of entities) {
      const cat = mapCategoryToType(e.category)
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    }

    const categoryIndices: Record<string, number> = {}

    const nodes = entities.map((entity, globalIndex) => {
      const body = entity.body ?? {}
      const type = mapCategoryToType(entity.category)
      const catIndex = categoryIndices[type] || 0
      categoryIndices[type] = catIndex + 1

      const importance = (typeof body.importance === 'string' ? body.importance.toUpperCase() : 'MEDIUM') as
        | 'CRITICAL'
        | 'HIGH'
        | 'MEDIUM'
        | 'LOW'

      const hasCustomPos =
        Array.isArray(body.position) &&
        body.position.length === 3 &&
        body.position.some((coord: unknown) => typeof coord === 'number' && coord !== 0)

      const position: [number, number, number] = hasCustomPos
        ? (body.position as [number, number, number])
        : calculateNodePosition(entity.category, catIndex, categoryCounts[type] || 1, entities.length || 1)

      const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : formatHumanLabel(entity.name)
      const ref = typeof body.ref === 'string' && body.ref.trim() ? body.ref.trim() : `${type} #${globalIndex + 1}`

      return {
        id: entity.name || entity.id || `entity-${globalIndex}`,
        name: entity.name,
        label,
        ref,
        type,
        importance,
        confidence: typeof body.confidence === 'number' ? body.confidence : 0.95,
        createdAt: typeof body.createdAt === 'string' ? body.createdAt : entity.created_at ?? entity.updated_at ?? new Date().toISOString(),
        reason: typeof body.reason === 'string' ? body.reason : '',
        usedInDecisions: typeof body.usedInDecisions === 'number' ? body.usedInDecisions : 1,
        position,
        relatedIds: Array.isArray(body.relatedIds) ? (body.relatedIds as string[]) : [],
        tags: Array.isArray(body.tags) ? (body.tags as string[]) : [entity.category.toLowerCase()],
      }
    })

    const edges = buildEdges(nodes)

    return NextResponse.json({ nodes, edges, count: nodes.length })
  } catch (error) {
    console.error('Failed to load memory graph from Sibyl:', error)
    return NextResponse.json(
      { error: 'Failed to load memory graph', details: String(error) },
      { status: 500 },
    )
  }
}

function formatHumanLabel(name: string): string {
  if (!name) return 'Memory Node'
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function mapCategoryToType(category: string): MemoryType {
  const normalized = category.toLowerCase()
  if (normalized.includes('project')) return 'PROJECT'
  if (normalized.includes('decision')) return 'DECISION'
  if (normalized.includes('constraint') || normalized.includes('policy')) return 'CONSTRAINT'
  if (normalized.includes('incident')) return 'INCIDENT'
  if (normalized.includes('lesson')) return 'LESSON'
  if (normalized.includes('fact')) return 'FACT'
  if (normalized.includes('outcome')) return 'OUTCOME'
  if (normalized.includes('action')) return 'ACTION'
  if (normalized.includes('event')) return 'EVENT'
  return 'FACT'
}

function buildEdges(
  nodes: Array<{ id: string; name?: string; type: string; relatedIds: string[]; label: string }>,
): Array<{ from: string; to: string; strength: number; kind: 'derives' | 'constrains' | 'caused' | 'informs' | 'executes' }> {
  const edges: Array<{ from: string; to: string; strength: number; kind: 'derives' | 'constrains' | 'caused' | 'informs' | 'executes' }> = []
  const seen = new Set<string>()

  const idMap = new Map<string, string>()
  for (const node of nodes) {
    idMap.set(node.id, node.id)
    idMap.set(node.id.toLowerCase(), node.id)
    if (node.name) {
      idMap.set(node.name, node.id)
      idMap.set(node.name.toLowerCase(), node.id)
    }
  }

  const addEdge = (
    from: string,
    to: string,
    strength = 0.75,
    kind: 'derives' | 'constrains' | 'caused' | 'informs' | 'executes' = 'informs',
  ) => {
    if (!from || !to || from === to) return
    const key1 = `${from}->${to}`
    const key2 = `${to}->${from}`
    if (seen.has(key1) || seen.has(key2)) return
    seen.add(key1)
    edges.push({ from, to, strength, kind })
  }

  // 1. Explicit relatedIds defined in entity bodies
  for (const node of nodes) {
    for (const targetRef of node.relatedIds) {
      const resolvedTargetId = idMap.get(targetRef) ?? idMap.get(targetRef.toLowerCase())
      if (resolvedTargetId && nodes.some((n) => n.id === resolvedTargetId)) {
        const targetNode = nodes.find((n) => n.id === resolvedTargetId)
        const kind =
          targetNode?.type === 'CONSTRAINT'
            ? 'constrains'
            : targetNode?.type === 'DECISION'
              ? 'derives'
              : targetNode?.type === 'ACTION'
                ? 'executes'
                : targetNode?.type === 'INCIDENT'
                  ? 'caused'
                  : 'informs'
        addEdge(node.id, resolvedTargetId, 0.85, kind)
      }
    }
  }

  // 2. Semantic links between Projects and related category nodes
  const projectNodes = nodes.filter((n) => n.type === 'PROJECT')
  const nonProjectNodes = nodes.filter((n) => n.type !== 'PROJECT')

  for (const proj of projectNodes) {
    const projKeywords = `${proj.id} ${proj.label}`.toLowerCase().split(/\W+/).filter((k) => k.length > 2)

    for (const other of nonProjectNodes) {
      const otherText = `${other.id} ${other.label} ${other.type}`.toLowerCase()
      const matches = projKeywords.some((kw) => otherText.includes(kw))

      if (matches || edges.length < nodes.length) {
        const kind =
          other.type === 'CONSTRAINT'
            ? 'constrains'
            : other.type === 'DECISION'
              ? 'derives'
              : other.type === 'ACTION'
                ? 'executes'
                : other.type === 'INCIDENT'
                  ? 'caused'
                  : 'informs'
        addEdge(proj.id, other.id, matches ? 0.9 : 0.6, kind)
      }
    }
  }

  // 3. Connect Decisions to Constraints / Actions / Outcomes
  const decisions = nodes.filter((n) => n.type === 'DECISION')
  const constraints = nodes.filter((n) => n.type === 'CONSTRAINT')
  const actions = nodes.filter((n) => n.type === 'ACTION')

  for (const dec of decisions) {
    for (const con of constraints) {
      addEdge(dec.id, con.id, 0.75, 'constrains')
    }
    for (const act of actions) {
      addEdge(dec.id, act.id, 0.8, 'executes')
    }
  }

  return edges
}
