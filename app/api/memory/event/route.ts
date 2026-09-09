import { NextResponse } from 'next/server'
import { getSibylClient } from '@/lib/sibyl-mcp-client'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const kind = typeof body.kind === 'string' ? body.kind.trim() : 'EVENT'
    const eventBody = typeof body.body === 'object' && body.body !== null ? body.body : {}
    const category = typeof body.category === 'string' ? body.category.trim() : undefined
    const name = typeof body.name === 'string' ? body.name.trim() : undefined

    const client = getSibylClient()
    const result = await client.recordEvent(kind, eventBody, category, name)
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('Failed to record event in Sibyl:', error)
    return NextResponse.json(
      { error: 'Failed to record event', details: String(error) },
      { status: 500 },
    )
  }
}
