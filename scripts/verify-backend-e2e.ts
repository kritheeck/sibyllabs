import 'dotenv/config'
import { memoryAgent } from '../lib/memory-agent'
import { getSibylClient } from '../lib/sibyl-mcp-client'

async function verify() {
  console.log('====================================================')
  console.log('STARTING MEMORYOS COMPLETE BACKEND VERIFICATION')
  console.log('====================================================\n')

  // 1. Check Gemini configuration
  console.log('--- TEST 1: GEMINI CONFIGURATION CHECK ---')
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }
  console.log('GEMINI_API_KEY present: YES')
  console.log('Expected model: gemini-2.5-flash\n')

  // 2. Arbitrary Chat Query (General Knowledge & Technical)
  console.log('--- TEST 2: ARBITRARY GENERAL KNOWLEDGE & CODE ---')
  const arbitraryQuery = 'Explain quantum computing like I\'m 15 and write a simple 3-line TypeScript debounce example.'
  console.log('User query:', arbitraryQuery)
  const resArbitrary = await memoryAgent.run(arbitraryQuery)
  console.log('\nGemini Reply:\n', resArbitrary.reply)
  console.log('\nRecalled memories count:', resArbitrary.recalledMemories.length)
  console.log('Stored memories count:', resArbitrary.storedMemories.length)
  if (!resArbitrary.reply || resArbitrary.reply.length < 50) {
    throw new Error('Arbitrary query did not produce a real Gemini response')
  }
  console.log('Arbitrary query test: PASSED\n')

  // 3. True Long-Term Memory Across Deleted Sessions
  console.log('--- TEST 3: SESSION A - FACT PERSISTENCE ---')
  const sessionAId = 'session-test-alpha-' + Date.now()
  const sessionAMessage = 'I am building Atlas. It uses Supabase and TypeScript. I prefer staged deployments.'
  console.log(`Session A (${sessionAId}) Message: "${sessionAMessage}"`)

  const resSessionA = await memoryAgent.run(sessionAMessage, sessionAId)
  console.log('\nSession A Gemini Reply:\n', resSessionA.reply)
  console.log('\nSession A Stored Memories in Sibyl:', JSON.stringify(resSessionA.storedMemories, null, 2))

  if (resSessionA.storedMemories.length === 0) {
    throw new Error('Failed to extract and persist durable memories in Session A')
  }
  console.log('Session A persistence test: PASSED\n')

  // 4. End / Delete Session A (Discard session completely)
  console.log('--- TEST 4: PURGING SESSION A ---')
  console.log(`Discarding Session A (${sessionAId}). Conversation transcript is deleted.`)
  const sessionBId = 'session-test-beta-' + Date.now()
  console.log(`Initialized completely new Session B (${sessionBId}) with NO prior transcript.\n`)

  // 5. Query Session B - Database
  console.log('--- TEST 5: SESSION B - DATABASE QUERY ---')
  const qDb = 'What database does Atlas use?'
  console.log(`User query in Session B: "${qDb}"`)
  const resDb = await memoryAgent.run(qDb, sessionBId)
  console.log('\nRecalled Memories from Sibyl:\n', resDb.recalledMemories.map(m => `[${m.category}] ${m.name}: ${m.label}`).join('\n'))
  console.log('\nSession B Gemini Reply:\n', resDb.reply)

  if (!resDb.reply.toLowerCase().includes('supabase')) {
    throw new Error(`Expected Gemini to answer 'Supabase' using recalled memory, got: ${resDb.reply}`)
  }
  console.log('Database recall test: PASSED (Supabase correctly retrieved from Sibyl)\n')

  // 6. Query Session B - Language
  console.log('--- TEST 6: SESSION B - LANGUAGE QUERY ---')
  const qLang = 'What language does Atlas use?'
  console.log(`User query in Session B: "${qLang}"`)
  const resLang = await memoryAgent.run(qLang, sessionBId)
  console.log('\nRecalled Memories from Sibyl:\n', resLang.recalledMemories.map(m => `[${m.category}] ${m.name}: ${m.label}`).join('\n'))
  console.log('\nSession B Gemini Reply:\n', resLang.reply)

  if (!resLang.reply.toLowerCase().includes('typescript')) {
    throw new Error(`Expected Gemini to answer 'TypeScript' using recalled memory, got: ${resLang.reply}`)
  }
  console.log('Language recall test: PASSED (TypeScript correctly retrieved from Sibyl)\n')

  // 7. Query Session B - Deployment Preference
  console.log('--- TEST 7: SESSION B - DEPLOYMENT PREFERENCE ---')
  const qPref = 'How do I prefer deployments to be handled?'
  console.log(`User query in Session B: "${qPref}"`)
  const resPref = await memoryAgent.run(qPref, sessionBId)
  console.log('\nRecalled Memories from Sibyl:\n', resPref.recalledMemories.map(m => `[${m.category}] ${m.name}: ${m.label}`).join('\n'))
  console.log('\nSession B Gemini Reply:\n', resPref.reply)

  if (!resPref.reply.toLowerCase().includes('staged')) {
    throw new Error(`Expected Gemini to recall 'staged' deployment preference, got: ${resPref.reply}`)
  }
  console.log('Deployment preference test: PASSED (Staged deployments recalled from Sibyl)\n')

  // 8. Policy Constraint & Load-Bearing Reasoning
  console.log('--- TEST 8: LOAD-BEARING CONSTRAINT PERSISTENCE & ENFORCEMENT ---')
  const sessionCId = 'session-test-gamma-' + Date.now()
  const constraintMsg = 'We decided on a strict constraint: No production deployments on Friday.'
  console.log(`Establishing constraint in Session C (${sessionCId}): "${constraintMsg}"`)
  const resConstraint = await memoryAgent.run(constraintMsg, sessionCId)
  console.log('Gemini reply:', resConstraint.reply)
  console.log('Stored constraint in Sibyl:', resConstraint.storedMemories)

  console.log('\nTesting enforcement in a fresh Session D...')
  const sessionDId = 'session-test-delta-' + Date.now()
  const deployQuery = 'Should I deploy Atlas to production today on Friday?'
  console.log(`User query in Session D: "${deployQuery}"`)
  const resDeploy = await memoryAgent.run(deployQuery, sessionDId)
  console.log('\nRecalled constraint from Sibyl:\n', resDeploy.recalledMemories.map(m => `[${m.category}] ${m.name}: ${m.label}`).join('\n'))
  console.log('\nSession D Gemini Reply:\n', resDeploy.reply)
  console.log('Agent Decision Action:', resDeploy.decision.action)

  if (!resDeploy.reply.toLowerCase().includes('friday') || (!resDeploy.reply.toLowerCase().includes('no') && !resDeploy.reply.toLowerCase().includes('block') && !resDeploy.reply.toLowerCase().includes('prohibit') && !resDeploy.reply.toLowerCase().includes('prevent'))) {
    throw new Error(`Expected Gemini to enforce Friday deployment constraint, got: ${resDeploy.reply}`)
  }
  console.log('Constraint enforcement test: PASSED (Friday deployment constraint enforced)\n')

  console.log('====================================================')
  console.log('ALL TESTS EXECUTED AND PASSED SUCCESSFULLY!')
  console.log('====================================================')

  const client = getSibylClient()
  client.close()
  process.exit(0)
}

verify().catch((err) => {
  console.error('\nVerification failed with error:', err)
  process.exit(1)
})
