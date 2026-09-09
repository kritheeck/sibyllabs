import { NextResponse } from 'next/server'
import { getSibylClient } from '@/lib/sibyl-mcp-client'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const category = typeof body.category === 'string' ? body.category.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!category || !name) {
      return NextResponse.json(
        { error: 'category and name are required' },
        { status: 400 },
      )
    }

    const client = getSibylClient()
    const result = await client.recallEntity(category, name)
    return NextResponse.json({ result })
  } catch (error) {
    console.error('Failed to recall entity from Sibyl:', error)
    return NextResponse.json(
      { error: 'Failed to recall entity', details: String(error) },
      { status: 500 },
    )
  }
}
