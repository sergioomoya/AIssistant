/**
 * Panel de transcripción en tiempo real
 */

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Mic } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatTranscriptTime } from '@/utils/format'
import type { TranscriptSegment } from '@/stores/meetingStore'

interface TranscriptPanelProps {
  segments: TranscriptSegment[]
  partialText: string
  isRecording: boolean
}

export function TranscriptPanel({ segments, partialText, isRecording }: TranscriptPanelProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll cuando hay nuevo contenido
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments, partialText])
  
  const isEmpty = segments.length === 0 && !partialText

  return (
    <div className="lg:col-span-2 card flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-400" />
          Transcripción en tiempo real
        </h2>
        <span className="text-sm text-surface-400">
          {segments.length} segmentos
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {isEmpty ? (
          <EmptyState isRecording={isRecording} />
        ) : (
          <>
            {segments.map((segment) => (
              <TranscriptSegmentItem key={segment.id} segment={segment} />
            ))}
            
            {partialText && <PartialTranscript text={partialText} />}
            
            <div ref={transcriptEndRef} />
          </>
        )}
      </div>
    </div>
  )
}

// ========== Sub-componentes ==========

function EmptyState({ isRecording }: { isRecording: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
        <Mic className="w-8 h-8 text-surface-500" />
      </div>
      <p className="text-surface-400">
        {isRecording
          ? 'Escuchando... Habla para ver la transcripción'
          : 'Inicia la grabación para comenzar a transcribir'}
      </p>
    </div>
  )
}

interface TranscriptSegmentItemProps {
  segment: TranscriptSegment
}

function TranscriptSegmentItem({ segment }: TranscriptSegmentItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4"
    >
      <span className="text-xs text-surface-500 w-12 pt-1 font-mono">
        {formatTranscriptTime(segment.startTime)}
      </span>
      <div className="flex-1">
        <span className={cn(
          "text-xs font-medium",
          segment.isUser ? "text-primary-400" : "text-accent-400"
        )}>
          {segment.speaker}
        </span>
        <p className="text-surface-200">{segment.text}</p>
      </div>
    </motion.div>
  )
}

function PartialTranscript({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-4 opacity-60"
    >
      <span className="text-xs text-surface-500 w-12 pt-1 font-mono">
        ...
      </span>
      <div className="flex-1">
        <p className="text-surface-400 italic">{text}</p>
      </div>
    </motion.div>
  )
}

