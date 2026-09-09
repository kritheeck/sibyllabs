import { NextResponse } from 'next/server'
import { getSibylClient } from '@/lib/sibyl-mcp-client'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    if (!key) {
      return NextResponse.json({ error: 'key parameter is required' }, { status: 400 })
    }

    const client = getSibylClient()
    const state = await client.getState(key)
    return NextResponse.json({ key, state })
  } catch (error) {
    console.error('Failed to get state from Sibyl:', error)
    return NextResponse.json(
      { error: 'Failed to get state', details: String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const key = typeof body.key === 'string' ? body.key.trim() : ''
    const stateBody = typeof body.body === 'object' && body.body !== null ? body.body : {}

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }

    const client = getSibylClient()
    const result = await client.setState(key, stateBody)
    return NextResponse.json({ ok: true, key, result })
  } catch (error) {
    console.error('Failed to set state in Sibyl:', error)
    return NextResponse.json(
      { error: 'Failed to set state', details: String(error) },
      { status: 500 },
    )
  }
}
