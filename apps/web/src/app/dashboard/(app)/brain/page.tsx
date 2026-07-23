import type { Metadata } from 'next'
import { ChatInterface } from '../../../../components/ai/chat-interface'

export const metadata: Metadata = { title: 'AI Business Brain' }

export default function BrainPage() {
  return (
    <div className="flex h-screen flex-col">
      <div className="border-b px-6 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-kanavu-500 to-kanavu-600 flex items-center justify-center">
          <span className="text-white text-sm">🧠</span>
        </div>
        <div>
          <h1 className="font-semibold">AI Business Brain</h1>
          <p className="text-xs text-muted-foreground">Your central AI advisor — always on, always learning</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface placeholder="What do you want to achieve today? I'll create a plan and get to work." />
      </div>
    </div>
  )
}
