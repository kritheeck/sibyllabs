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
  ACTIVITY_FEED,
  ACTIVITY_STREAM,
  type ActivityEvent,
  type AgentState,
} from '@/lib/memory-data'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface AgentRuntimeValue {
  state: AgentState
  /** Memory ids currently being recalled — drives graph highlighting. */
  activeMemoryIds: string[]
  activity: ActivityEvent[]
  selectedId: string | null
  select: (id: string | null) => void
  /** Simulates a user query running through the recall → reason → decide loop. */
  runQuery: (query: string) => void
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
      hold: 700,
      event: { kind: 'MEMORY RECALLED', detail: 'Query embedded, index scanned' },
    },
    {
      state: 'RECALLING',
      hold: 1500,
      event: {
        kind: 'MEMORY RECALLED',
        detail: '3 relevant memories found',
        memoryIds: ['dec-17', 'con-backup', 'inc-12'],
      },
    },
    {
      state: 'REASONING',
      hold: 1700,
      event: {
        kind: 'CONSTRAINT EVALUATED',
        detail: 'Friday deployment policy',
        memoryIds: ['dec-17'],
      },
    },
    {
      state: 'REASONING',
      hold: 1400,
      event: { kind: 'REASONING', detail: 'Deployment risk assessment' },
    },
    {
      state: 'EXECUTING',
      hold: 1300,
      event: { kind: 'DECISION', detail: 'Deployment blocked', tone: 'critical' },
    },
    {
      state: 'SUCCESS',
      hold: 2200,
      event: { kind: 'MEMORY UPDATED', detail: 'Outcome stored', tone: 'success' },
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
  const [state, setState] = useState<AgentState>('RECALLING')
  const [activeMemoryIds, setActiveMemoryIds] = useState<string[]>([
    'dec-17',
    'con-backup',
    'inc-12',
  ])
  const [activity, setActivity] = useState<ActivityEvent[]>(ACTIVITY_FEED)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState<string | null>(null)
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
    t = setTimeout(tick, 2400)
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
      pushEvent(ACTIVITY_STREAM[i % ACTIVITY_STREAM.length])
      i += 1
    }, 7000)
    return () => clearInterval(interval)
  }, [pushEvent, reducedMotion])

  /* ------------------------------------------------------------ query run */
  const runQuery = useCallback(
    (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) return
      setLastQuery(trimmed)
      clearTimers()
      queryRunning.current = true

      let elapsed = 0
      QUERY_SEQUENCE.forEach((step) => {
        const timer = setTimeout(() => {
          setState(step.state)
          if (step.event) pushEvent(step.event)
        }, elapsed)
        timers.current.push(timer)
        elapsed += reducedMotion ? Math.min(step.hold, 220) : step.hold
      })

      const done = setTimeout(() => {
        queryRunning.current = false
        setState('LISTENING')
      }, elapsed + 400)
      timers.current.push(done)
    },
    [clearTimers, pushEvent, reducedMotion],
  )

  useEffect(() => clearTimers, [clearTimers])

  const value = useMemo<AgentRuntimeValue>(
    () => ({
      state,
      activeMemoryIds,
      activity,
      selectedId,
      select: setSelectedId,
      runQuery,
      lastQuery,
      reducedMotion,
    }),
    [state, activeMemoryIds, activity, selectedId, runQuery, lastQuery, reducedMotion],
  )

  return <AgentRuntimeContext.Provider value={value}>{children}</AgentRuntimeContext.Provider>
}

export function useAgentRuntime(): AgentRuntimeValue {
  const ctx = useContext(AgentRuntimeContext)
  if (!ctx) throw new Error('useAgentRuntime must be used inside AgentRuntimeProvider')
  return ctx
}
