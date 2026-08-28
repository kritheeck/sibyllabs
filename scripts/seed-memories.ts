import { getSibylClient } from '../lib/sibyl-mcp-client'

async function seed() {
  const client = getSibylClient()

  await client.rememberEntity('CONSTRAINT', 'production_deploy_friday', {
    label: 'No production deployments on Friday',
    ref: 'constraint-001',
    reason: 'Friday deployments are blocked to protect weekend stability.',
    confidence: 0.95,
    createdAt: new Date().toISOString(),
  })

  await client.rememberEntity('DECISION', 'database_choice', {
    label: 'Use Supabase over Firebase',
    ref: 'decision-001',
    reason: 'Project requires PostgreSQL and RLS. Firebase does not provide PostgreSQL.',
    confidence: 0.9,
    createdAt: new Date().toISOString(),
  })

  await client.rememberEntity('PROJECT', 'MEMORYOS', {
    label: 'MEMORYOS - Sibyl Labs Hackathon',
    ref: 'project-001',
    reason: 'Autonomous agent OS with load-bearing memory.',
    confidence: 0.9,
    createdAt: new Date().toISOString(),
  })

  console.log('Seeded demo memories')
}

seed().catch((err) => {
  console.error('Failed to seed memories:', err)
  process.exit(1)
})
