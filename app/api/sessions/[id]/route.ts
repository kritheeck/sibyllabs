import { NextResponse } from 'next/server'
import { getSession, deleteSession, createOrUpdateSession } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params
    const data = await getSession(id)
    if (!data.session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to get session:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params
    const body = await request.json().catch(() => ({}))
    const title = typeof body.title === 'string' ? body.title.trim() : undefined
    const metadata = typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : undefined

    const session = await createOrUpdateSession(id, title, metadata)
    return NextResponse.json({ session })
  } catch (error) {
    console.error('Failed to update session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params
    // Delete session from Supabase application storage.
    // NOTE: SIBYL MEMORIES ARE NEVER DELETED WHEN SESSIONS ARE DELETED.
    await deleteSession(id)
    return NextResponse.json({ ok: true, deletedSessionId: id })
  } catch (error) {
    console.error('Failed to delete session:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
