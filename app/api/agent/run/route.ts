import { NextResponse } from 'next/server'
import { memoryAgent } from '@/lib/memory-agent'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({ query: '' }))
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : undefined

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const result = await memoryAgent.run(query, sessionId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Agent run execution error:', error)
    return NextResponse.json(
      { error: 'Agent run failed', details: String(error) },
      { status: 500 },
    )
  }
}
