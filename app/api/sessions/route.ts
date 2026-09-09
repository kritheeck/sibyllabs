import { NextResponse } from 'next/server'
import { listSessions, createOrUpdateSession } from '@/lib/supabase'
import { randomUUID } from 'node:crypto'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const sessions = await listSessions()
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Failed to list sessions:', error)
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : randomUUID()
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'New Session'
    const metadata = typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {}

    const session = await createOrUpdateSession(id, title, metadata)
    return NextResponse.json({ session })
  } catch (error) {
    console.error('Failed to create session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
