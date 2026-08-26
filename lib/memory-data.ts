/**
 * MEMORYOS — mock operational memory store.
 *
 * This module is the single source of truth for the UI. It is intentionally
 * shaped like a real memory API response so it can be swapped for a live
 * Sibyl Memory client later without touching any component:
 *
 *   export async function getMemoryGraph(): Promise<MemoryGraph>
 *
 * Components consume `MemoryGraph` / `MemoryRecord` only — never raw literals.
 */

export type MemoryType =
  | 'PROJECT'
  | 'DECISION'
  | 'CONSTRAINT'
  | 'INCIDENT'
  | 'LESSON'
  | 'EVENT'
  | 'ACTION'

export type Importance = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type AgentState =
  | 'IDLE'
  | 'LISTENING'
  | 'RECALLING'
  | 'REASONING'
  | 'EXECUTING'
  | 'SUCCESS'
  | 'FAILED'

export interface MemoryRecord {
  id: string
  /** Display label, e.g. "NO FRIDAY DEPLOYMENTS" */
  label: string
  /** Short human ref, e.g. "DECISION #17" */
  ref: string
  type: MemoryType
  importance: Importance
  /** 0 - 1 */
  confidence: number
  createdAt: string
  reason: string
  usedInDecisions: number
  /** Normalized position in the constellation, roughly -1..1 on each axis */
  position: [number, number, number]
  relatedIds: string[]
  tags: string[]
}

export interface MemoryEdge {
  from: string
  to: string
  /** 0 - 1, drives line opacity + pulse speed */
  strength: number
  kind: 'derives' | 'constrains' | 'caused' | 'informs' | 'executes'
}

export interface ActivityEvent {
  id: string
  time: string
  kind:
    | 'MEMORY RECALLED'
    | 'CONSTRAINT EVALUATED'
    | 'REASONING'
    | 'DECISION'
    | 'MEMORY UPDATED'
    | 'ACTION DISPATCHED'
  detail: string
  memoryIds?: string[]
  tone?: 'default' | 'critical' | 'success'
}

export interface DecisionRecord {
  id: string
  statement: string
  memoriesUsed: string[]
  confidence: number
  action: string
  outcome: 'BLOCKED' | 'APPROVED' | 'DEFERRED'
  project: string
  timestamp: string
}

export interface IntegrationRecord {
  id: string
  name: string
  descriptor: string
  status: 'CONNECTED' | 'SYNCING' | 'OFFLINE'
  latencyMs: number
  hash: string
}

export interface ProjectRecord {
  id: string
  name: string
  status: 'ACTIVE' | 'STAGED' | 'ARCHIVED'
  memories: number
  risk: number
  owner: string
}

export interface MemoryGraph {
  nodes: MemoryRecord[]
  edges: MemoryEdge[]
}

/* ------------------------------------------------------------------ nodes */

export const MEMORY_NODES: MemoryRecord[] = [
  {
    id: 'prj-atlas',
    label: 'ATLAS PROJECT',
    ref: 'PROJECT #01',
    type: 'PROJECT',
    importance: 'CRITICAL',
    confidence: 1,
    createdAt: 'Jun 14, 2026',
    reason: 'Primary production migration programme for the Atlas platform.',
    usedInDecisions: 31,
    position: [0, 0.05, 0],
    relatedIds: ['dec-17', 'con-backup', 'inc-12', 'les-staged', 'act-deploy', 'evt-window'],
    tags: ['atlas', 'migration', 'production'],
  },
  {
    id: 'dec-17',
    label: 'NO FRIDAY DEPLOYMENTS',
    ref: 'DECISION #17',
    type: 'DECISION',
    importance: 'CRITICAL',
    confidence: 0.98,
    createdAt: 'Sep 02, 2026',
    reason: 'Previous Atlas production incident.',
    usedInDecisions: 4,
    position: [-1.15, 0.62, 0.35],
    relatedIds: ['con-backup', 'inc-12', 'les-staged', 'prj-atlas'],
    tags: ['policy', 'deployment', 'risk'],
  },
  {
    id: 'con-backup',
    label: 'BACKUP REQUIRED',
    ref: 'CONSTRAINT #04',
    type: 'CONSTRAINT',
    importance: 'CRITICAL',
    confidence: 0.99,
    createdAt: 'Jul 21, 2026',
    reason:
      'Verified backup snapshot must exist within 60 minutes of any schema-affecting release.',
    usedInDecisions: 12,
    position: [1.2, 0.5, -0.4],
    relatedIds: ['prj-atlas', 'dec-17', 'act-deploy', 'inc-12'],
    tags: ['safety', 'database', 'gate'],
  },
  {
    id: 'inc-12',
    label: 'INCIDENT #12',
    ref: 'INCIDENT #12',
    type: 'INCIDENT',
    importance: 'CRITICAL',
    confidence: 1,
    createdAt: 'Aug 29, 2026',
    reason:
      'Friday 18:40 release corrupted the Atlas write path. 3h14m of degraded checkout traffic.',
    usedInDecisions: 9,
    position: [-0.55, -0.95, -0.5],
    relatedIds: ['dec-17', 'les-staged', 'con-backup', 'prj-atlas'],
    tags: ['sev1', 'postmortem', 'checkout'],
  },
  {
    id: 'les-staged',
    label: 'STAGED DEPLOYMENT',
    ref: 'LESSON #08',
    type: 'LESSON',
    importance: 'HIGH',
    confidence: 0.94,
    createdAt: 'Aug 30, 2026',
    reason: 'Canary at 5% for 30 minutes surfaces write-path regressions before full rollout.',
    usedInDecisions: 7,
    position: [0.75, -0.85, 0.55],
    relatedIds: ['inc-12', 'act-deploy', 'dec-17'],
    tags: ['canary', 'rollout', 'practice'],
  },
  {
    id: 'act-deploy',
    label: 'DEPLOYMENT ACTION',
    ref: 'ACTION #22',
    type: 'ACTION',
    importance: 'HIGH',
    confidence: 0.91,
    createdAt: 'Sep 05, 2026',
    reason: 'Executes the Atlas release pipeline once every upstream constraint clears.',
    usedInDecisions: 5,
    position: [1.55, -0.28, 0.65],
    relatedIds: ['con-backup', 'les-staged', 'prj-atlas'],
    tags: ['pipeline', 'execution'],
  },
  {
    id: 'evt-window',
    label: 'CHANGE WINDOW',
    ref: 'EVENT #41',
    type: 'EVENT',
    importance: 'MEDIUM',
    confidence: 0.88,
    createdAt: 'Sep 04, 2026',
    reason: 'Approved change window Tue–Thu, 09:00–16:00 UTC for Atlas production.',
    usedInDecisions: 6,
    position: [-1.5, -0.2, -0.7],
    relatedIds: ['prj-atlas', 'dec-17', 'con-freeze'],
    tags: ['schedule', 'governance'],
  },
  {
    id: 'con-freeze',
    label: 'Q4 CODE FREEZE',
    ref: 'CONSTRAINT #09',
    type: 'CONSTRAINT',
    importance: 'HIGH',
    confidence: 0.96,
    createdAt: 'Aug 12, 2026',
    reason: 'No non-critical production changes between Nov 20 and Jan 04.',
    usedInDecisions: 3,
    position: [-0.35, 1.1, -0.85],
    relatedIds: ['evt-window', 'dec-17'],
    tags: ['freeze', 'policy'],
  },
  {
    id: 'les-rollback',
    label: 'ROLLBACK DRILL',
    ref: 'LESSON #11',
    type: 'LESSON',
    importance: 'MEDIUM',
    confidence: 0.9,
    createdAt: 'Sep 01, 2026',
    reason: 'Rollback rehearsal reduced mean recovery time from 41m to 6m.',
    usedInDecisions: 2,
    position: [0.35, 1.05, 0.85],
    relatedIds: ['inc-12', 'act-deploy'],
    tags: ['recovery', 'drill'],
  },
  {
    id: 'evt-audit',
    label: 'SOC2 AUDIT',
    ref: 'EVENT #47',
    type: 'EVENT',
    importance: 'HIGH',
    confidence: 0.93,
    createdAt: 'Sep 03, 2026',
    reason: 'External audit sampling window opens Sep 18; all releases require change tickets.',
    usedInDecisions: 4,
    position: [1.05, 1.0, -1.05],
    relatedIds: ['con-freeze', 'con-backup'],
    tags: ['compliance', 'audit'],
  },
  {
    id: 'act-notify',
    label: 'NOTIFY ONCALL',
    ref: 'ACTION #26',
    type: 'ACTION',
    importance: 'MEDIUM',
    confidence: 0.87,
    createdAt: 'Sep 05, 2026',
    reason: 'Pages the Atlas on-call rotation whenever a deployment is blocked by policy.',
    usedInDecisions: 2,
    position: [-1.7, 0.85, 0.95],
    relatedIds: ['dec-17', 'inc-12'],
    tags: ['oncall', 'notification'],
  },
  {
    id: 'prj-orion',
    label: 'ORION EDGE',
    ref: 'PROJECT #03',
    type: 'PROJECT',
    importance: 'MEDIUM',
    confidence: 0.85,
    createdAt: 'Aug 02, 2026',
    reason: 'Secondary edge-routing programme sharing the Atlas deployment pipeline.',
    usedInDecisions: 8,
    position: [-0.05, -1.35, 1.1],
    relatedIds: ['act-deploy', 'les-staged'],
    tags: ['edge', 'routing'],
  },
]

/* ------------------------------------------------------------------ edges */

export const MEMORY_EDGES: MemoryEdge[] = [
  { from: 'prj-atlas', to: 'dec-17', strength: 0.95, kind: 'constrains' },
  { from: 'prj-atlas', to: 'con-backup', strength: 0.92, kind: 'constrains' },
  { from: 'prj-atlas', to: 'inc-12', strength: 0.8, kind: 'caused' },
  { from: 'prj-atlas', to: 'les-staged', strength: 0.7, kind: 'informs' },
  { from: 'prj-atlas', to: 'act-deploy', strength: 0.85, kind: 'executes' },
  { from: 'prj-atlas', to: 'evt-window', strength: 0.6, kind: 'informs' },
  { from: 'inc-12', to: 'dec-17', strength: 1, kind: 'caused' },
  { from: 'inc-12', to: 'les-staged', strength: 0.9, kind: 'derives' },
  { from: 'inc-12', to: 'les-rollback', strength: 0.72, kind: 'derives' },
  { from: 'inc-12', to: 'act-notify', strength: 0.5, kind: 'informs' },
  { from: 'dec-17', to: 'con-backup', strength: 0.66, kind: 'informs' },
  { from: 'dec-17', to: 'act-notify', strength: 0.58, kind: 'executes' },
  { from: 'dec-17', to: 'evt-window', strength: 0.62, kind: 'informs' },
  { from: 'con-backup', to: 'act-deploy', strength: 0.88, kind: 'constrains' },
  { from: 'les-staged', to: 'act-deploy', strength: 0.78, kind: 'informs' },
  { from: 'les-rollback', to: 'act-deploy', strength: 0.55, kind: 'informs' },
  { from: 'con-freeze', to: 'evt-window', strength: 0.64, kind: 'constrains' },
  { from: 'con-freeze', to: 'dec-17', strength: 0.48, kind: 'informs' },
  { from: 'evt-audit', to: 'con-freeze', strength: 0.6, kind: 'informs' },
  { from: 'evt-audit', to: 'con-backup', strength: 0.52, kind: 'constrains' },
  { from: 'prj-orion', to: 'act-deploy', strength: 0.5, kind: 'executes' },
  { from: 'prj-orion', to: 'les-staged', strength: 0.44, kind: 'informs' },
]

export const MEMORY_GRAPH: MemoryGraph = { nodes: MEMORY_NODES, edges: MEMORY_EDGES }

/* --------------------------------------------------------------- activity */

export const ACTIVITY_FEED: ActivityEvent[] = [
  {
    id: 'a1',
    time: '14:31:02',
    kind: 'MEMORY RECALLED',
    detail: '3 relevant memories found',
    memoryIds: ['dec-17', 'con-backup', 'inc-12'],
  },
  {
    id: 'a2',
    time: '14:31:03',
    kind: 'CONSTRAINT EVALUATED',
    detail: 'Friday deployment policy',
    memoryIds: ['dec-17'],
  },
  {
    id: 'a3',
    time: '14:31:05',
    kind: 'REASONING',
    detail: 'Deployment risk assessment',
  },
  {
    id: 'a4',
    time: '14:31:07',
    kind: 'DECISION',
    detail: 'Deployment blocked',
    tone: 'critical',
  },
  {
    id: 'a5',
    time: '14:31:08',
    kind: 'MEMORY UPDATED',
    detail: 'Outcome stored',
    tone: 'success',
  },
]

/** Additional events streamed in over time to keep the timeline alive. */
export const ACTIVITY_STREAM: Omit<ActivityEvent, 'id' | 'time'>[] = [
  { kind: 'ACTION DISPATCHED', detail: 'On-call rotation notified', memoryIds: ['act-notify'] },
  { kind: 'MEMORY RECALLED', detail: '2 relevant memories found', memoryIds: ['evt-window'] },
  { kind: 'CONSTRAINT EVALUATED', detail: 'Backup snapshot freshness', memoryIds: ['con-backup'] },
  { kind: 'REASONING', detail: 'Change-window feasibility', memoryIds: ['evt-window'] },
  { kind: 'DECISION', detail: 'Release rescheduled to Tue 09:00', tone: 'success' },
  { kind: 'MEMORY UPDATED', detail: 'Confidence recalibrated +2%', tone: 'success' },
  { kind: 'MEMORY RECALLED', detail: '5 relevant memories found', memoryIds: ['les-staged'] },
  { kind: 'CONSTRAINT EVALUATED', detail: 'SOC2 change-ticket requirement', memoryIds: ['evt-audit'] },
]

/* --------------------------------------------------------------- decision */

export const CURRENT_DECISION: DecisionRecord = {
  id: 'dec-live',
  statement: 'Do not deploy Atlas today.',
  memoriesUsed: ['dec-17', 'con-backup', 'inc-12'],
  confidence: 0.96,
  action: 'Deployment Blocked',
  outcome: 'BLOCKED',
  project: 'Atlas Production Migration',
  timestamp: '14:31:07',
}

export const DECISION_HISTORY: DecisionRecord[] = [
  CURRENT_DECISION,
  {
    id: 'dec-prev-1',
    statement: 'Promote Orion edge canary to 25%.',
    memoriesUsed: ['les-staged', 'act-deploy'],
    confidence: 0.89,
    action: 'Canary Expanded',
    outcome: 'APPROVED',
    project: 'Orion Edge',
    timestamp: '11:04:19',
  },
  {
    id: 'dec-prev-2',
    statement: 'Hold schema migration until audit window closes.',
    memoriesUsed: ['evt-audit', 'con-freeze', 'con-backup'],
    confidence: 0.82,
    action: 'Migration Deferred',
    outcome: 'DEFERRED',
    project: 'Atlas Production Migration',
    timestamp: '09:47:52',
  },
]

/* ------------------------------------------------------------ integrations */

export const INTEGRATIONS: IntegrationRecord[] = [
  {
    id: 'sibyl',
    name: 'SIBYL MEMORY',
    descriptor: 'Persistent memory layer',
    status: 'CONNECTED',
    latencyMs: 42,
    hash: '0x7f3a…c19d',
  },
  {
    id: 'base',
    name: 'BASE',
    descriptor: 'Settlement network',
    status: 'CONNECTED',
    latencyMs: 118,
    hash: '0x4b81…9ae2',
  },
  {
    id: 'virtuals',
    name: 'VIRTUALS ACP',
    descriptor: 'Agent commerce protocol',
    status: 'CONNECTED',
    latencyMs: 76,
    hash: '0xd20c…5f47',
  },
]

/* --------------------------------------------------------------- projects */

export const PROJECTS: ProjectRecord[] = [
  {
    id: 'atlas',
    name: 'Atlas Production Migration',
    status: 'ACTIVE',
    memories: 84,
    risk: 0.72,
    owner: 'MEMORYOS-01',
  },
  { id: 'orion', name: 'Orion Edge Routing', status: 'ACTIVE', memories: 37, risk: 0.34, owner: 'MEMORYOS-01' },
  { id: 'vega', name: 'Vega Billing Rewrite', status: 'STAGED', memories: 19, risk: 0.51, owner: 'MEMORYOS-02' },
  { id: 'lyra', name: 'Lyra Data Retention', status: 'ARCHIVED', memories: 8, risk: 0.12, owner: 'MEMORYOS-02' },
]

/* ---------------------------------------------------------------- metrics */

export const METRICS = [
  { id: 'memories', value: 148, label: 'MEMORIES', delta: '+12 / 24H' },
  { id: 'decisions', value: 12, label: 'ACTIVE DECISIONS', delta: '+3 / 24H' },
  { id: 'actions', value: 4, label: 'PENDING ACTIONS', delta: '2 BLOCKED' },
] as const

export const AGENT = {
  id: 'MEMORYOS-01',
  workspace: 'Atlas Operations',
  project: 'Atlas Production Migration',
} as const

/* --------------------------------------------------------------- helpers */

const NODE_INDEX = new Map(MEMORY_NODES.map((n) => [n.id, n]))

export function getMemory(id: string): MemoryRecord | undefined {
  return NODE_INDEX.get(id)
}

export function getMemoryLabel(id: string): string {
  return NODE_INDEX.get(id)?.label ?? id
}

/** Async accessor — swap the body for a real Sibyl Memory fetch later. */
export async function getMemoryGraph(): Promise<MemoryGraph> {
  return MEMORY_GRAPH
}

export const TYPE_META: Record<
  MemoryType,
  { color: string; hex: string; short: string }
> = {
  PROJECT: { color: 'var(--primary)', hex: '#7dd8f0', short: 'PRJ' },
  DECISION: { color: 'var(--secondary)', hex: '#a78bfa', short: 'DEC' },
  CONSTRAINT: { color: 'var(--warning)', hex: '#e3c05c', short: 'CON' },
  INCIDENT: { color: 'var(--critical)', hex: '#f0736a', short: 'INC' },
  LESSON: { color: 'var(--success)', hex: '#4fd8b0', short: 'LES' },
  EVENT: { color: 'var(--primary)', hex: '#5fb3d4', short: 'EVT' },
  ACTION: { color: 'var(--secondary)', hex: '#8ea2f5', short: 'ACT' },
}
