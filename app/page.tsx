import { AgentRuntimeProvider } from '@/components/agent-runtime'
import { AmbientBackdrop } from '@/components/ambient-backdrop'
import { Dashboard } from '@/components/dashboard'
import { MemoryGraphProvider } from '@/lib/memory-context'

export default function Page() {
  return (
    <MemoryGraphProvider>
      <AgentRuntimeProvider>
        <AmbientBackdrop />
        <div className="relative z-10">
          <Dashboard />
        </div>
      </AgentRuntimeProvider>
    </MemoryGraphProvider>
  )
}
