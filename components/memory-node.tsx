'use client'

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { TYPE_META, type MemoryRecord } from '@/lib/memory-data'

const IMPORTANCE_SIZE: Record<MemoryRecord['importance'], number> = {
  CRITICAL: 0.185,
  HIGH: 0.15,
  MEDIUM: 0.125,
  LOW: 0.105,
}

interface MemoryNodeProps {
  node: MemoryRecord
  position: THREE.Vector3
  selected: boolean
  hovered: boolean
  active: boolean
  dimmed: boolean
  index: number
  reducedMotion: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

export function MemoryNode({
  node,
  position,
  selected,
  hovered,
  active,
  dimmed,
  index,
  reducedMotion,
  onSelect,
  onHover,
}: MemoryNodeProps) {
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const shell = useRef<THREE.Mesh>(null)
  const [pointer, setPointer] = useState(false)

  const meta = TYPE_META[node.type]
  const color = useMemo(() => new THREE.Color(meta.hex), [meta.hex])
  const baseSize = IMPORTANCE_SIZE[node.importance]
  const phase = useMemo(() => index * 1.31, [index])
  const isProject = node.type === 'PROJECT'

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime

    if (group.current) {
      if (!reducedMotion) {
        // each node drifts on its own slow orbit — the memory field breathes
        group.current.position.set(
          position.x + Math.sin(t * 0.28 + phase) * 0.07,
          position.y + Math.sin(t * 0.36 + phase * 1.6) * 0.09,
          position.z + Math.cos(t * 0.24 + phase) * 0.07,
        )
      } else {
        group.current.position.copy(position)
      }
    }

    const emphasis = selected ? 1 : hovered ? 0.75 : active ? 0.55 : 0
    const targetScale = 1 + emphasis * 0.55
    const targetOpacity = dimmed ? 0.22 : 1

    if (core.current) {
      const s = core.current.scale.x
      core.current.scale.setScalar(s + (targetScale - s) * Math.min(1, delta * 8))
      const mat = core.current.material as THREE.MeshStandardMaterial
      mat.opacity += (targetOpacity - mat.opacity) * Math.min(1, delta * 8)
      const targetEmissive = 1.1 + emphasis * 2.6 + (dimmed ? -0.7 : 0)
      mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * Math.min(1, delta * 6)
    }

    if (halo.current) {
      const mat = halo.current.material as THREE.MeshBasicMaterial
      const pulse = reducedMotion ? 0.5 : (Math.sin(t * (active || selected ? 2.4 : 1.05) + phase) + 1) / 2
      const target = dimmed ? 0.03 : 0.06 + pulse * (0.1 + emphasis * 0.3)
      mat.opacity += (target - mat.opacity) * Math.min(1, delta * 6)
      const scale = 1 + pulse * (0.28 + emphasis * 0.7)
      halo.current.scale.setScalar(scale)
    }

    if (shell.current) {
      const mat = shell.current.material as THREE.MeshBasicMaterial
      const target = dimmed ? 0.02 : 0.05 + emphasis * 0.12
      mat.opacity += (target - mat.opacity) * Math.min(1, delta * 6)
      if (!reducedMotion) {
        shell.current.rotation.y += delta * 0.3
        shell.current.rotation.x += delta * 0.14
      }
    }

    if (ring.current) {
      ring.current.visible = selected || (isProject && !dimmed)
      if (!reducedMotion) ring.current.rotation.z += delta * (selected ? 0.9 : 0.28)
      const mat = ring.current.material as THREE.MeshBasicMaterial
      const target = selected ? 0.85 : 0.28
      mat.opacity += (target - mat.opacity) * Math.min(1, delta * 6)
    }
  })

  const labelVisible = selected || hovered || node.importance === 'CRITICAL'

  return (
    <group ref={group} position={position}>
      {/* interaction target — generous, invisible */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation()
          setPointer(true)
          onHover(node.id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setPointer(false)
          onHover(null)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(node.id)
        }}
      >
        <sphereGeometry args={[baseSize * 3.2, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* luminous core */}
      <mesh ref={core}>
        <icosahedronGeometry args={[baseSize, isProject ? 2 : 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.1}
          roughness={0.28}
          metalness={0.1}
          transparent
          opacity={1}
        />
      </mesh>

      {/* faceted outer shell */}
      <mesh ref={shell}>
        <icosahedronGeometry args={[baseSize * 1.85, 0]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={0.05}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* soft pulse halo */}
      <mesh ref={halo}>
        <sphereGeometry args={[baseSize * 2.1, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* selection / project orbit ring */}
      <Billboard>
        <mesh ref={ring} visible={false}>
          <ringGeometry args={[baseSize * 2.5, baseSize * 2.62, 48]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </Billboard>

      {/* label */}
      {labelVisible && (
        <Billboard position={[0, baseSize * 2.9, 0]}>
          <Text
            fontSize={isProject ? 0.135 : 0.108}
            color={selected || hovered || pointer ? '#f2f8fb' : '#b7cbd6'}
            anchorX="center"
            anchorY="bottom"
            letterSpacing={0.14}
            fillOpacity={dimmed ? 0.25 : selected || hovered ? 1 : 0.6}
            outlineWidth={0.004}
            outlineColor="#07090d"
          >
            {node.label}
          </Text>
          <Text
            position={[0, -0.055, 0]}
            fontSize={0.062}
            color={meta.hex}
            anchorX="center"
            anchorY="top"
            letterSpacing={0.2}
            fillOpacity={dimmed ? 0.2 : selected || hovered ? 0.9 : 0.45}
          >
            {node.type}
          </Text>
        </Billboard>
      )}
    </group>
  )
}
