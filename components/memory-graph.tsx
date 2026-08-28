'use client'

import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  TYPE_META,
  type MemoryEdge,
  type MemoryRecord,
} from '@/lib/memory-data'
import { useMemoryGraph } from '@/lib/memory-context'
import { MemoryNode } from './memory-node'

const SCALE = 2.35

function toVec(p: [number, number, number]) {
  return new THREE.Vector3(p[0] * SCALE, p[1] * SCALE, p[2] * SCALE)
}

/* --------------------------------------------------------------- particles */

function ParticleField({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null)

  const { positions, count } = useMemo(() => {
    const count = 620
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // shell distribution so particles surround the constellation
      const r = 4.2 + Math.random() * 5.6
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.65
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return { positions, count }
  }, [])

  useFrame((_, delta) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y += delta * 0.012
    ref.current.rotation.x += delta * 0.004
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial
        size={0.032}
        color="#8fd4ea"
        transparent
        opacity={0.42}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ edges */

interface EdgeProps {
  from: THREE.Vector3
  to: THREE.Vector3
  strength: number
  highlighted: boolean
  dimmed: boolean
  color: string
  offset: number
  reducedMotion: boolean
}

function GraphEdge({
  from,
  to,
  strength,
  highlighted,
  dimmed,
  color,
  offset,
  reducedMotion,
}: EdgeProps) {
  const pulse = useRef<THREE.Mesh>(null)
  const t = useRef(offset)

  const points = useMemo(() => {
    // gentle arc between nodes so the network reads as volumetric
    const mid = from.clone().add(to).multiplyScalar(0.5)
    const dir = to.clone().sub(from)
    const bow = dir.length() * 0.11
    mid.add(new THREE.Vector3(-dir.z, dir.x * 0.35 + 0.4, dir.x).normalize().multiplyScalar(bow))
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to)
    return curve.getPoints(28)
  }, [from, to])

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points])

  useFrame((_, delta) => {
    if (!pulse.current) return
    if (reducedMotion) {
      pulse.current.visible = false
      return
    }
    const speed = highlighted ? 0.45 : 0.12 + strength * 0.09
    t.current = (t.current + delta * speed) % 1
    const p = curve.getPoint(t.current)
    pulse.current.position.copy(p)
    const visible = highlighted || strength > 0.6
    pulse.current.visible = visible && !dimmed
    const s = highlighted ? 0.055 : 0.032
    pulse.current.scale.setScalar(s * (0.8 + Math.sin(t.current * Math.PI) * 0.5))
  })

  const opacity = dimmed
    ? 0.05
    : highlighted
      ? 0.55 + strength * 0.35
      : 0.09 + strength * 0.14

  return (
    <group>
      <Line
        points={points}
        color={highlighted ? color : '#5f8fa8'}
        lineWidth={highlighted ? 1.5 : 0.85}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
      <mesh ref={pulse}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={highlighted ? color : '#9fe0f5'}
          transparent
          opacity={highlighted ? 0.95 : 0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ scene */

interface SceneProps {
  nodes: MemoryRecord[]
  edges: MemoryEdge[]
  selectedId: string | null
  hoveredId: string | null
  activeIds: string[]
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  reducedMotion: boolean
}

function Scene({
  nodes,
  edges,
  selectedId,
  hoveredId,
  activeIds,
  onSelect,
  onHover,
  reducedMotion,
}: SceneProps) {
  const group = useRef<THREE.Group>(null)
  const { pointer } = useThree()

  const positions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>()
    nodes.forEach((n) => map.set(n.id, toVec(n.position)))
    return map
  }, [nodes])

  const focusId = hoveredId ?? selectedId

  const neighbourSet = useMemo(() => {
    if (!focusId) return null
    const set = new Set<string>([focusId])
    edges.forEach((e) => {
      if (e.from === focusId) set.add(e.to)
      if (e.to === focusId) set.add(e.from)
    })
    return set
  }, [focusId, edges])

  useFrame((state, delta) => {
    if (!group.current) return
    if (reducedMotion) {
      group.current.rotation.set(0, 0.35, 0)
      return
    }
    const t = state.clock.elapsedTime
    group.current.rotation.y += delta * 0.045
    const targetX = -pointer.y * 0.16 + Math.sin(t * 0.22) * 0.05
    const targetZ = pointer.x * 0.05
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.035
    group.current.rotation.z += (targetZ - group.current.rotation.z) * 0.035
    group.current.position.y = Math.sin(t * 0.35) * 0.09
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 6, 6]} intensity={22} color="#9fe0f5" distance={26} decay={2} />
      <pointLight position={[-6, -4, -5]} intensity={14} color="#a78bfa" distance={24} decay={2} />

      <ParticleField reducedMotion={reducedMotion} />

      <group ref={group}>
        {edges.map((edge, i) => {
          const from = positions.get(edge.from)
          const to = positions.get(edge.to)
          if (!from || !to) return null
          const isActive =
            activeIds.includes(edge.from) && activeIds.includes(edge.to)
          const isFocused =
            !!focusId && (edge.from === focusId || edge.to === focusId)
          const highlighted = isFocused || isActive
          const dimmed = !!neighbourSet && !isFocused
          const node = nodes.find((n) => n.id === edge.to)
          return (
            <GraphEdge
              key={`${edge.from}-${edge.to}`}
              from={from}
              to={to}
              strength={edge.strength}
              highlighted={highlighted}
              dimmed={dimmed}
              color={node ? TYPE_META[node.type].hex : '#7dd8f0'}
              offset={(i * 0.137) % 1}
              reducedMotion={reducedMotion}
            />
          )
        })}

        {nodes.map((node, i) => (
          <MemoryNode
            key={node.id}
            node={node}
            position={positions.get(node.id)!}
            selected={selectedId === node.id}
            hovered={hoveredId === node.id}
            active={activeIds.includes(node.id)}
            dimmed={!!neighbourSet && !neighbourSet.has(node.id)}
            index={i}
            reducedMotion={reducedMotion}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </group>
    </>
  )
}

/* ----------------------------------------------------------------- public */

interface MemoryGraphProps {
  selectedId: string | null
  activeIds: string[]
  onSelect: (id: string) => void
  reducedMotion: boolean
}

export function MemoryGraph({
  selectedId,
  activeIds,
  onSelect,
  reducedMotion,
}: MemoryGraphProps) {
  const { nodes, edges, loading, error } = useMemoryGraph()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hovered = hoveredId ? nodes.find((n) => n.id === hoveredId) : null

  const renderOverlay = () => {
    if (error) {
      return (
        <div className="absolute inset-0 grid place-items-center bg-surface-stage">
          <div className="flex flex-col items-center gap-3">
            <p className="type-label text-muted-foreground/70">MEMORY LAYER UNAVAILABLE</p>
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground/50">{error}</p>
          </div>
        </div>
      )
    }
    if (!loading && nodes.length === 0) {
      return (
        <div className="absolute inset-0 grid place-items-center bg-surface-stage">
          <div className="flex flex-col items-center gap-3">
            <p className="type-label text-muted-foreground/70">NO MEMORIES STORED</p>
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground/50">
              Query the memory layer to populate the field
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="absolute inset-0">
      {renderOverlay()}
      <Canvas
        camera={{ position: [0, 1.1, 8.4], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <Suspense fallback={null}>
          <Scene
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            hoveredId={hoveredId}
            activeIds={activeIds}
            onSelect={onSelect}
            onHover={setHoveredId}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </Canvas>

      {/* hover readout — DOM overlay keeps type crisp */}
      <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-[10px] tracking-[0.16em]">
        {hovered ? (
          <div className="flex items-center gap-2">
            <span
              className="size-1.5 rounded-full"
              style={{ background: TYPE_META[hovered.type].hex }}
            />
            <span className="text-foreground/90">{hovered.label}</span>
            <span className="text-muted-foreground/60">{hovered.ref}</span>
          </div>
        ) : (
          <span className="text-muted-foreground/45">HOVER A NODE / CLICK TO INSPECT</span>
        )}
      </div>
    </div>
  )
}

export { Html }
