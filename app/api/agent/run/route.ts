import { NextResponse } from 'next/server'
import { memoryAgent } from '@/lib/memory-agent'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({ query: '' }))
    const query = typeof body.query === 'string' ? body.query.trim() : ''

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    try {
      const result = await memoryAgent.run(query)
      return NextResponse.json(result)
    } catch {
      return NextResponse.json(mockAgentResponse(query))
    }
  } catch (error) {
    console.error('Agent run failed:', error)
    return NextResponse.json(
      { error: 'Agent run failed', details: String(error) },
      { status: 500 },
    )
  }
}

function mockAgentResponse(query: string) {
  const deployKeywords = /deploy|release|ship|production/i
  const wantsDeploy = deployKeywords.test(query)
  const today = new Date().getDay()
  const isFriday = today === 5

  if (isFriday && wantsDeploy) {
    return {
      decision: {
        action: 'BLOCK',
        reason: 'Friday deployment blocked by constraint: production_deploy_friday',
        memories: [
          {
            id: 'mock-1',
            category: 'CONSTRAINT',
            name: 'production_deploy_friday',
            body: {
              label: 'No production deployments on Friday',
              reason: 'Friday deployments are blocked to protect weekend stability.',
              confidence: 0.95,
            },
            confidence: 0.95,
          },
        ],
        constraintHit: 'production_deploy_friday',
        confidence: 0.95,
      },
      memories: [
        {
          id: 'mock-1',
          category: 'CONSTRAINT',
          name: 'production_deploy_friday',
          body: {
            label: 'No production deployments on Friday',
            reason: 'Friday deployments are blocked to protect weekend stability.',
            confidence: 0.95,
          },
          confidence: 0.95,
        },
      ],
    }
  }

  if (wantsDeploy) {
    return {
      decision: {
        action: 'REVIEW',
        reason: 'Active deployment constraint may affect this action.',
        memories: [],
        confidence: 0.7,
      },
      memories: [],
    }
  }

  return {
    decision: {
      action: 'PROCEED',
      reason: 'No relevant memories found. Proceeding without historical context.',
      memories: [],
      confidence: 0.4,
    },
    memories: [],
  }
}
