import { NextResponse } from 'next/server'
import { memoryAgent } from '@/lib/memory-agent'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const query =
      (typeof body.query === 'string' && body.query.trim()) ||
      (typeof body.message === 'string' && body.message.trim()) ||
      (Array.isArray(body.messages) &&
        typeof body.messages[body.messages.length - 1]?.content === 'string' &&
        body.messages[body.messages.length - 1].content.trim()) ||
      ''

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : undefined

    if (!query) {
      return NextResponse.json({ error: 'message or query is required' }, { status: 400 })
    }

    const result = await memoryAgent.run(query, sessionId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Chat API failed', details: String(error) },
      { status: 500 },
    )
  }
}
