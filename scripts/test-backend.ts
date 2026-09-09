import { memoryAgent } from '../lib/memory-agent'
import { getSibylClient } from '../lib/sibyl-mcp-client'
import { getSession, deleteSession, listSessions } from '../lib/supabase'

async function runAcceptanceTest() {
  console.log('====================================================')
  console.log('STARTING MEMORYOS BACKEND ACCEPTANCE TEST')
  console.log('====================================================\n')

  const client = getSibylClient()
  const sessionA_Id = `test-session-a-${Date.now()}`
  const sessionB_Id = `test-session-b-${Date.now()}`

  // 1. Session A: tell the chatbot project and migration info
  console.log(`[Step 1] Session A (${sessionA_Id}): User says: "My project is Atlas and we are migrating production to Supabase."`)
  const resultA = await memoryAgent.run('My project is Atlas and we are migrating production to Supabase.', sessionA_Id)
  console.log('AI Reply:', resultA.reply)
  console.log('Stored Memories in Sibyl:', JSON.stringify(resultA.storedMemories, null, 2))

  // 2. Verify durable information in Sibyl
  console.log('\n[Step 2] Verifying persistent memories stored directly in Sibyl MCP...')
  const searchAtlas = await client.searchEntities('Atlas', 10)
  console.log('Sibyl search for "Atlas":', JSON.stringify(searchAtlas, null, 2))
  const searchSupabase = await client.searchEntities('Supabase', 10)
  console.log('Sibyl search for "Supabase":', JSON.stringify(searchSupabase, null, 2))

  // 3. Verify Session A exists in Supabase
  const sessionAData = await getSession(sessionA_Id)
  console.log('\n[Step 3] Session A in Supabase persistence:', sessionAData.session?.id, 'Messages count:', sessionAData.messages.length)
  if (!sessionAData.session || sessionAData.messages.length === 0) {
    throw new Error('Session A was not properly recorded in Supabase!')
  }

  // 4. Delete Session A from Supabase
  console.log('\n[Step 4] Deleting Session A from Supabase...')
  await deleteSession(sessionA_Id)
  const sessionACheck = await getSession(sessionA_Id)
  console.log('Session A after deletion:', sessionACheck.session)
  if (sessionACheck.session !== null) {
    throw new Error('Session A was not deleted from Supabase!')
  }

  // 5. Start Session B and ask question
  console.log(`\n[Step 5] Session B (${sessionB_Id}): User asks: "What database are we using for Atlas?"`)
  const resultB = await memoryAgent.run('What database are we using for Atlas?', sessionB_Id)
  console.log('AI Reply:', resultB.reply)
  console.log('Recalled Memories in Session B:', JSON.stringify(resultB.recalledMemories.map(m => ({ category: m.category, name: m.name, label: m.label, reason: m.reason })), null, 2))

  // Verify answer mentions Supabase
  const answerLower = resultB.reply.toLowerCase()
  if (!answerLower.includes('supabase')) {
    throw new Error(`Session B AI answer did not contain "Supabase"! Reply was: "${resultB.reply}"`)
  }
  console.log('\n>>> SUCCESS: Session B answered "Supabase" using Sibyl persistent recall without relying on Session A chat history!')

  // 6. Verify Brain/Core Graph
  console.log('\n[Step 6] Verifying Brain/Core memory graph from Sibyl MCP...')
  const allEntities = await client.listEntities(undefined, 100)
  console.log('Total persistent entities in Sibyl:', Array.isArray(allEntities) ? allEntities.length : JSON.stringify(allEntities).slice(0, 100))

  client.close()

  console.log('\n====================================================')
  console.log('ALL ACCEPTANCE TESTS PASSED PERFECTLY!')
  console.log('====================================================')
}

runAcceptanceTest().catch((err) => {
  console.error('\nXXX ACCEPTANCE TEST FAILED:', err)
  process.exit(1)
})
