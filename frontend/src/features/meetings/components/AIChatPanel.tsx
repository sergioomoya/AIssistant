/**
 * Panel de chat con IA sobre la reunión
 */

import { Sparkles, Send, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}

interface AIChatPanelProps {
  chatHistory: ChatMessage[]
  chatMessage: string
  onMessageChange: (message: string) => void
  onSend: () => void
  isPending: boolean
  isDisabled: boolean
}

export function AIChatPanel({
  chatHistory,
  chatMessage,
  onMessageChange,
  onSend,
  isPending,
  isDisabled,
}: AIChatPanelProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="card flex flex-col h-[500px]">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary-400" />
        Chat con IA
      </h3>
      
      {/* Historial de chat */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {chatHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-surface-500">
              Pregunta lo que quieras sobre esta reunión
            </p>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))
        )}
        
        {isPending && <ThinkingIndicator />}
      </div>
      
      {/* Input de chat */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={chatMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregunta sobre la reunión..."
          className="input flex-1"
          disabled={isPending || isDisabled}
        />
        <button
          onClick={onSend}
          disabled={isPending || !chatMessage.trim()}
          className="btn-primary p-2.5"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// ========== Sub-componentes ==========

function ChatBubble({ message }: { message: ChatMessage }) {
  return (
    <div
      className={cn(
        "p-3 rounded-xl max-w-[90%]",
        message.role === 'user'
          ? "bg-primary-500/20 ml-auto"
          : "bg-surface-800"
      )}
    >
      <p className="text-sm text-surface-200">{message.text}</p>
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-surface-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">Pensando...</span>
    </div>
  )
}

