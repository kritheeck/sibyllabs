'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ACTIVITY_STREAM,
  type ActivityEvent,
  type AgentState,
} from '@/lib/memory-data'
import { type MemoryRecord } from '@/lib/memory-data'
import { useMemoryGraph } from '@/lib/memory-context'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { rememberMemory } from '@/lib/memory-client'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  recalledMemories?: Array<{ category: string; label: string; name: string }>
  storedMemories?: Array<{ category: string; label: string; name: string }>
  timestamp: string
}

interface AgentRuntimeValue {
  sessionId: string
  state: AgentState
  activeMemoryIds: string[]
  activity: ActivityEvent[]
  selectedId: string | null
  select: (id: string | null) => void
  runQuery: (query: string) => Promise<void>
  resetSession: () => void
  messages: ChatMessage[]
  rememberMemory: (input: {
    category?: string
    name: string
    label?: string
    reason?: string
    confidence?: number
  }) => Promise<void>
  lastDecision: {
    action: string
    reason: string
    memories: MemoryRecord[]
    constraintHit?: string
    confidence: number
  } | null
  lastQuery: string | null
  reducedMotion: boolean
}

const AgentRuntimeContext = createContext<AgentRuntimeValue | null>(null)

/** Ambient loop: the agent keeps working even when nobody is interacting. */
const AMBIENT_CYCLE: { state: AgentState; hold: number }[] = [
  { state: 'RECALLING', hold: 5200 },
  { state: 'REASONING', hold: 4600 },
  { state: 'LISTENING', hold: 6400 },
  { state: 'RECALLING', hold: 4200 },
  { state: 'EXECUTING', hold: 3600 },
  { state: 'SUCCESS', hold: 2600 },
  { state: 'IDLE', hold: 5000 },
]

const QUERY_SEQUENCE: { state: AgentState; hold: number; event?: Omit<ActivityEvent, 'id' | 'time'> }[] =
  [
    {
      state: 'LISTENING',
      hold: 500,
      event: { kind: 'MEMORY RECALLED', detail: 'Query embedded, Sibyl index scanned' },
    },
    {
      state: 'RECALLING',
      hold: 1000,
      event: {
        kind: 'MEMORY RECALLED',
        detail: 'Relevant persistent memories retrieved from Sibyl MCP',
      },
    },
    {
      state: 'REASONING',
      hold: 1100,
      event: {
        kind: 'CONSTRAINT EVALUATED',
        detail: 'Context evaluated against active operational policies',
      },
    },
    {
      state: 'EXECUTING',
      hold: 800,
      event: { kind: 'DECISION', detail: 'Operational response dispatched', tone: 'default' },
    },
    {
      state: 'SUCCESS',
      hold: 1400,
      event: { kind: 'MEMORY UPDATED', detail: 'Persistent memory synchronized', tone: 'success' },
    },
  ]

function clockLabel(offsetSeconds = 0) {
  const d = new Date(Date.now() + offsetSeconds * 1000)
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

export function AgentRuntimeProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion()
  const { nodes, loading, refresh } = useMemoryGraph()
  const [state, setState] = useState<AgentState>('LISTENING')
  const [activeMemoryIds, setActiveMemoryIds] = useState<string[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>(() => `session-${Date.now()}`)
  const [lastQuery, setLastQuery] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [lastDecision, setLastDecision] = useState<{
    action: string
    reason: string
    memories: MemoryRecord[]
    constraintHit?: string
    confidence: number
  } | null>(null)
  const queryRunning = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const seq = useRef(0)

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const pushEvent = useCallback((event: Omit<ActivityEvent, 'id' | 'time'>) => {
    seq.current += 1
    const entry: ActivityEvent = { ...event, id: `live-${seq.current}`, time: clockLabel() }
    setActivity((prev) => [entry, ...prev].slice(0, 14))
    if (event.memoryIds?.length) setActiveMemoryIds(event.memoryIds)
  }, [])

  const resetSession = useCallback(() => {
    clearTimers()
    const newSessionId = `session-${Date.now()}`
    setSessionId(newSessionId)
    setState('LISTENING')
    setActiveMemoryIds([])
    setActivity([])
    setSelectedId(null)
    setLastQuery(null)
    setLastDecision(null)
    setMessages([])
    queryRunning.current = false
    refresh()
    pushEvent({
      kind: 'MEMORY RECALLED',
      detail: `New Session initialized (${newSessionId.slice(0, 15)}...). Authoritative Sibyl memory retained.`,
    })
  }, [clearTimers, pushEvent, refresh])

  const handleRememberMemory = useCallback(
    async (input: {
      category?: string
      name: string
      label?: string
      reason?: string
      confidence?: number
    }) => {
      try {
        await rememberMemory(input)
        await refresh()
        pushEvent({
          kind: 'MEMORY UPDATED',
          detail: `Remembered ${input.name}`,
          tone: 'success',
        })
      } catch (err) {
        console.error('Failed to remember memory:', err)
        pushEvent({
          kind: 'MEMORY UPDATED',
          detail: `Failed to remember ${input.name}`,
          tone: 'critical',
        })
      }
    },
    [pushEvent, refresh],
  )

  /* ---------------------------------------------------- ambient behaviour */
  useEffect(() => {
    if (reducedMotion) {
      setState('LISTENING')
      return
    }
    let index = 0
    let cancelled = false
    let t: ReturnType<typeof setTimeout>

    const tick = () => {
      if (cancelled || queryRunning.current) {
        t = setTimeout(tick, 1200)
        return
      }
      const step = AMBIENT_CYCLE[index % AMBIENT_CYCLE.length]
      setState(step.state)
      index += 1
      t = setTimeout(tick, step.hold)
    }
    t = setTimeout(tick, 4000)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [reducedMotion])

  /* ambient activity stream — timeline keeps breathing on its own */
  useEffect(() => {
    if (reducedMotion) return
    let i = 0
    const interval = setInterval(() => {
      if (queryRunning.current) return
      const event = ACTIVITY_STREAM[i % ACTIVITY_STREAM.length]
      const enriched = event.memoryIds?.length
        ? { ...event, memoryIds: event.memoryIds.filter((id) => nodes.some((n) => n.id === id)) }
        : event
      pushEvent(enriched)
      i += 1
    }, 9000)
    return () => clearInterval(interval)
  }, [pushEvent, reducedMotion, nodes])

  /* ------------------------------------------------------------ query run */
  const runQuery = useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) return
      setLastQuery(trimmed)
      setLastDecision(null)
      clearTimers()
      queryRunning.current = true

      // Add user message to session chat log immediately
      const userMessage: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        text: trimmed,
        timestamp: clockLabel(),
      }
      setMessages((prev) => [...prev, userMessage])
      setState('RECALLING')
      pushEvent({
        kind: 'MEMORY RECALLED',
        detail: `Recalling persistent memories for: "${trimmed.slice(0, 30)}..."`,
      })

      try {
        const fetchPromise = fetch('/api/agent/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ query: trimmed, sessionId }),
        })

        // Give a quick pulse to reasoning state
        const reasoningTimer = setTimeout(() => {
          if (queryRunning.current) {
            setState('REASONING')
            pushEvent({
              kind: 'CONSTRAINT EVALUATED',
              detail: 'Evaluating recalled context against active constraints',
            })
          }
        }, 300)
        timers.current.push(reasoningTimer)

        const res = await fetchPromise
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          throw new Error(errData.details || errData.error || `Agent run failed with status ${res.status}`)
        }

        const result = await res.json()
        const memories: MemoryRecord[] = Array.isArray(result.memories) ? result.memories : []
        const decision = result.decision ?? null
        setLastDecision(decision)

        const memoryIds = memories.map((m) => m.id).filter((id): id is string => Boolean(id))
        if (memoryIds.length > 0) {
          setActiveMemoryIds(memoryIds)
        }

        // Add assistant message to session chat log
        const assistantMessage: ChatMessage = {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          text: result.reply || decision?.reason || 'Operational memory processed.',
          recalledMemories: Array.isArray(result.recalledMemories) ? result.recalledMemories : undefined,
          storedMemories: Array.isArray(result.storedMemories) ? result.storedMemories : undefined,
          timestamp: clockLabel(),
        }
        setMessages((prev) => [...prev, assistantMessage])

        // Refresh memory graph if new memories were written
        if (Array.isArray(result.storedMemories) && result.storedMemories.length > 0) {
          refresh()
        }

        const tone =
          decision?.action === 'BLOCK'
            ? 'critical'
            : decision?.action === 'REVIEW'
              ? 'warning'
              : 'success'
        pushEvent({
          kind: decision?.action === 'BLOCK' ? 'CONSTRAINT EVALUATED' : 'DECISION',
          detail: decision?.reason ?? 'Response generated with persistent memory',
          memoryIds,
          tone,
        })

        setState('SUCCESS')
        const resetTimer = setTimeout(() => {
          setState('LISTENING')
          queryRunning.current = false
        }, 1200)
        timers.current.push(resetTimer)
      } catch (err) {
        console.error('Agent query execution error:', err)
        setState('FAILED')
        const errorMessage: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `Error querying memory layer: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: clockLabel(),
        }
        setMessages((prev) => [...prev, errorMessage])
        pushEvent({
          kind: 'DECISION',
          detail: 'Transient error querying memory layer',
          tone: 'critical',
        })
        const resetTimer = setTimeout(() => {
          setState('LISTENING')
          queryRunning.current = false
        }, 2000)
        timers.current.push(resetTimer)
      }
    },
    [clearTimers, pushEvent, refresh, sessionId],
  )

  useEffect(() => clearTimers, [clearTimers])

  useEffect(() => {
    if (!loading && nodes.length > 0 && activeMemoryIds.length === 0) {
      const firstIds = nodes.slice(0, 3).map((n) => n.id)
      setActiveMemoryIds(firstIds)
    }
  }, [loading, nodes, activeMemoryIds.length])

  const value = useMemo<AgentRuntimeValue>(
    () => ({
      sessionId,
      state,
      activeMemoryIds,
      activity,
      selectedId,
      select: setSelectedId,
      runQuery,
      resetSession,
      messages,
      rememberMemory: handleRememberMemory,
      lastDecision,
      lastQuery,
      reducedMotion,
    }),
    [sessionId, state, activeMemoryIds, activity, selectedId, runQuery, resetSession, messages, handleRememberMemory, lastDecision, lastQuery, reducedMotion],
  )

  return <AgentRuntimeContext.Provider value={value}>{children}</AgentRuntimeContext.Provider>
}

export function useAgentRuntime(): AgentRuntimeValue {
  const ctx = useContext(AgentRuntimeContext)
  if (!ctx) throw new Error('useAgentRuntime must be used inside AgentRuntimeProvider')
  return ctx
}
