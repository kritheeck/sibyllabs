'use client'

import { type MemoryRecord, type MemoryEdge, MEMORY_NODES, MEMORY_EDGES } from './memory-data'
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
  const [nodes, setNodes] = useState<MemoryRecord[]>(() => MEMORY_NODES)
  const [edges, setEdges] = useState<MemoryEdge[]>(() => MEMORY_EDGES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMemoryGraph()
      if (Array.isArray(data.nodes) && data.nodes.length > 0) {
        setNodes(data.nodes)
        setEdges(Array.isArray(data.edges) ? data.edges : [])
      }
    } catch (e) {
      console.warn('Failed to refresh live memory graph from backend:', e)
      // Retain existing populated nodes instead of wiping out the 3D field
      setError(e instanceof Error ? e.message : 'Failed to load memory graph')
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
