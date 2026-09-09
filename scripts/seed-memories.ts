import { getSibylClient } from '../lib/sibyl-mcp-client'

const MEMORIES = [
  {
    category: 'PROJECT',
    name: 'atlas_production_migration',
    body: {
      label: 'Atlas Production Migration',
      ref: 'PRJ-01',
      reason: 'Core enterprise infrastructure migration to high-availability database cluster.',
      confidence: 0.98,
      importance: 'CRITICAL',
      relatedIds: [
        'supabase_over_firebase',
        'no_friday_deployments',
        'production_runs_on_supabase',
        'production_migration_incident_12',
      ],
      createdAt: new Date().toISOString(),
    },
  },
  {
    category: 'FACT',
    name: 'production_runs_on_supabase',
    body: {
      label: 'Production runs on Supabase',
      ref: 'FCT-01',
      reason: 'Production database infrastructure is hosted on managed PostgreSQL via Supabase.',
      confidence: 0.99,
      importance: 'HIGH',
      relatedIds: ['atlas_production_migration'],
      createdAt: new Date().toISOString(),
    },
  },
  {
    category: 'DECISION',
    name: 'supabase_over_firebase',
    body: {
      label: 'Supabase over Firebase',
      ref: 'DEC-01',
      reason: 'Selected Supabase for native PostgreSQL relational schema, ACID transactions, and Row Level Security.',
      confidence: 0.95,
      importance: 'HIGH',
      relatedIds: ['staged_deployment'],
      createdAt: new Date().toISOString(),
    },
  },
  {
    category: 'CONSTRAINT',
    name: 'no_friday_deployments',
    body: {
      label: 'No Friday Deployments',
      ref: 'CON-01',
      reason: 'Policy rule: Zero production release windows permitted on Fridays to protect weekend operational escalations.',
      confidence: 0.99,
      importance: 'CRITICAL',
      relatedIds: ['staged_deployment'],
      createdAt: new Date().toISOString(),
    },
  },
  {
    category: 'INCIDENT',
    name: 'production_migration_incident_12',
    body: {
      label: 'Production Migration Incident #12',
      ref: 'INC-12',
      reason: 'Unverified connection pooling limits caused transient connection timeouts during previous live rollover.',
      confidence: 0.92,
      importance: 'HIGH',
      relatedIds: ['verify_backups_before_migration'],
      createdAt: new Date().toISOString(),
    },
  },
  {
    category: 'ACTION',
    name: 'staged_deployment',
    body: {
      label: 'Staged Deployment',
      ref: 'ACT-01',
      reason: 'Execute canary deployment stages: 10% traffic split, automated health verification, then 100% promotion.',
      confidence: 0.90,
      importance: 'HIGH',
      relatedIds: ['deployment_completed_successfully'],
      createdAt: new Date().toISOString(),
    },
  },
  {
    category: 'OUTCOME',
    name: 'deployment_completed_successfully',
    body: {
      label: 'Deployment completed successfully',
      ref: 'OUT-01',
      reason: 'All migration verification steps completed with 0 errors and latency under 45ms.',
      confidence: 0.98,
      importance: 'MEDIUM',
      relatedIds: [],
      createdAt: new Date().toISOString(),
    },
  },
  {
    category: 'LESSON',
    name: 'verify_backups_before_migration',
    body: {
      label: 'Verify backups before migration',
      ref: 'LES-01',
      reason: 'Automated pre-flight backup snapshot and restore validation must pass before triggering rollover script.',
      confidence: 0.96,
      importance: 'HIGH',
      relatedIds: [],
      createdAt: new Date().toISOString(),
    },
  },
]

async function seed() {
  const client = getSibylClient()
  console.log('Seeding 8 core MEMORYOS memories into Sibyl MCP...')

  for (const item of MEMORIES) {
    console.log(`- Remembering ${item.category}: ${item.name} (${item.body.label})...`)
    const res = await client.rememberEntity(item.category, item.name, item.body)
    console.log('  Result:', res)
  }

  console.log('Verifying stored entities in Sibyl MCP...')
  const list = await client.listEntities(undefined, 50)
  console.log('Current stored entities:', JSON.stringify(list, null, 2))

  client.close()
  console.log('Seeding complete.')
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
