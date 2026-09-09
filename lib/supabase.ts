import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

export interface StoredChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  recalled_memories?: Array<Record<string, unknown>>
  stored_memories?: Array<Record<string, unknown>>
  decision?: Record<string, unknown> | null
  created_at: string
}

// In-memory fallback store for local development/testing when Supabase is not configured
const memorySessions = new Map<string, ChatSession>()
const memoryMessages = new Map<string, StoredChatMessage[]>()

let supabaseClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
        },
      })
      return supabaseClient
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e)
    }
  }

  return null
}

export async function listSessions(): Promise<ChatSession[]> {
  const sb = getSupabase()
  if (sb) {
    try {
      const { data, error } = await sb
        .from('sessions')
        .select('*')
        .order('updated_at', { ascending: false })
      if (!error && data) {
        return data as ChatSession[]
      }
    } catch (err) {
      console.warn('Supabase listSessions fallback:', err)
    }
  }

  return Array.from(memorySessions.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

export async function getSession(id: string): Promise<{
  session: ChatSession | null
  messages: StoredChatMessage[]
}> {
  const sb = getSupabase()
  if (sb) {
    try {
      const { data: sessionData, error: sErr } = await sb
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (!sErr && sessionData) {
        const { data: messagesData } = await sb
          .from('messages')
          .select('*')
          .eq('session_id', id)
          .order('created_at', { ascending: true })

        return {
          session: sessionData as ChatSession,
          messages: (messagesData as StoredChatMessage[]) || [],
        }
      }
    } catch (err) {
      console.warn('Supabase getSession fallback:', err)
    }
  }

  const session = memorySessions.get(id) ?? null
  const messages = memoryMessages.get(id) ?? []
  return { session, messages }
}

export async function createOrUpdateSession(
  id: string,
  title?: string,
  metadata?: Record<string, unknown>,
): Promise<ChatSession> {
  const now = new Date().toISOString()
  const sb = getSupabase()

  if (sb) {
    try {
      const payload: Partial<ChatSession> = {
        id,
        updated_at: now,
        ...(title ? { title } : {}),
        ...(metadata ? { metadata } : {}),
      }
      const { data, error } = await sb
        .from('sessions')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()

      if (!error && data) {
        return data as ChatSession
      }
    } catch (err) {
      console.warn('Supabase createOrUpdateSession fallback:', err)
    }
  }

  const existing = memorySessions.get(id)
  const session: ChatSession = {
    id,
    title: title || existing?.title || 'New Session',
    created_at: existing?.created_at || now,
    updated_at: now,
    metadata: metadata || existing?.metadata || {},
  }
  memorySessions.set(id, session)
  return session
}

export async function deleteSession(id: string): Promise<boolean> {
  const sb = getSupabase()
  if (sb) {
    try {
      await sb.from('messages').delete().eq('session_id', id)
      await sb.from('sessions').delete().eq('id', id)
    } catch (err) {
      console.warn('Supabase deleteSession fallback:', err)
    }
  }

  memorySessions.delete(id)
  memoryMessages.delete(id)
  return true
}

export async function saveMessage(message: StoredChatMessage): Promise<StoredChatMessage> {
  // Ensure session exists
  await createOrUpdateSession(message.session_id)

  const sb = getSupabase()
  if (sb) {
    try {
      const { data, error } = await sb
        .from('messages')
        .insert(message)
        .select()
        .single()

      if (!error && data) {
        return data as StoredChatMessage
      }
    } catch (err) {
      console.warn('Supabase saveMessage fallback:', err)
    }
  }

  const list = memoryMessages.get(message.session_id) || []
  list.push(message)
  memoryMessages.set(message.session_id, list)
  return message
}
