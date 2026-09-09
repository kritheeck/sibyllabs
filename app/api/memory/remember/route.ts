import { NextResponse } from 'next/server'
import { getSibylClient } from '@/lib/sibyl-mcp-client'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const category = typeof body.category === 'string' ? body.category.trim() : 'CONSTRAINT'
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const label = typeof body.label === 'string' ? body.label.trim() : name
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const confidence = typeof body.confidence === 'number' ? body.confidence : 0.9

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const client = getSibylClient()
    await client.rememberEntity(category, name, {
      label,
      reason,
      confidence,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, name, category })
  } catch (error) {
    console.error('Failed to remember memory:', error)
    return NextResponse.json(
      { error: 'Failed to remember memory', details: String(error) },
      { status: 500 },
    )
  }
}
