'use client'

import { type MemoryRecord, type MemoryEdge } from './memory-data'
import { fetchMemoryGraph, searchMemories, type MemorySearchResponse } from './memory-client'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

interface MemoryGraphContextValue {
  nodes: MemoryRecord[]
  edges: MemoryEdge[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getMemory: (id: string) => MemoryRecord | undefined
  search: (query: string, limit?: number, tiers?: string) => Promise<MemorySearchResponse>
}

const MemoryGraphContext = createContext<MemoryGraphContextValue | null>(null)

export function MemoryGraphProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<MemoryRecord[]>([])
  const [edges, setEdges] = useState<MemoryEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMemoryGraph()
      setNodes(data.nodes)
      setEdges(data.edges)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load memory graph')
      setNodes([])
      setEdges([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const getMemory = useMemo(
    () => (id: string) => nodes.find((n) => n.id === id),
    [nodes],
  )

  const search = useMemo(
    () => async (query: string, limit?: number, tiers?: string) => {
      const result = await searchMemories(query, limit, tiers)
      return result
    },
    [],
  )

  const value = useMemo<MemoryGraphContextValue>(
    () => ({
      nodes,
      edges,
      loading,
      error,
      refresh,
      getMemory,
      search,
    }),
    [nodes, edges, loading, error, getMemory, search],
  )

  return <MemoryGraphContext.Provider value={value}>{children}</MemoryGraphContext.Provider>
}

export function useMemoryGraph(): MemoryGraphContextValue {
  const ctx = useContext(MemoryGraphContext)
  if (!ctx) {
    throw new Error('useMemoryGraph must be used inside MemoryGraphProvider')
  }
  return ctx
}
