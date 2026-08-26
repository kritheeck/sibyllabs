import { AgentRuntimeProvider } from '@/components/agent-runtime'
import { AmbientBackdrop } from '@/components/ambient-backdrop'
import { Dashboard } from '@/components/dashboard'

export default function Page() {
  return (
    <AgentRuntimeProvider>
      <AmbientBackdrop />
      <div className="relative z-10">
        <Dashboard />
      </div>
    </AgentRuntimeProvider>
  )
}
