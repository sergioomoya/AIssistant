/**
 * Tab de transcripción de reunión
 */

import { MessageSquare } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatTranscriptTime } from '@/utils/format'

interface TranscriptSegment {
  start_time: number
  text: string
  speaker_name?: string
  is_user?: boolean
}

interface TranscriptTabProps {
  transcript?: {
    segments?: TranscriptSegment[]
  }
}

export function TranscriptTab({ transcript }: TranscriptTabProps) {
  const segments = transcript?.segments || []

  if (segments.length === 0) {
    return (
      <div className="text-center py-10">
        <MessageSquare className="w-12 h-12 text-surface-500 mx-auto mb-4" />
        <p className="text-surface-400">
          La transcripción no está disponible aún
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {segments.map((segment, i) => (
        <TranscriptSegmentItem key={i} segment={segment} />
      ))}
    </div>
  )
}

function TranscriptSegmentItem({ segment }: { segment: TranscriptSegment }) {
  const speakerName = segment.speaker_name || (segment.is_user ? 'Tú' : 'Otro')
  
  return (
    <div className="flex gap-4">
      <span className="text-xs text-surface-500 w-12 pt-1">
        {formatTranscriptTime(segment.start_time)}
      </span>
      <div className="flex-1">
        <span className={cn(
          "text-xs font-medium",
          segment.is_user ? "text-primary-400" : "text-accent-400"
        )}>
          {speakerName}
        </span>
        <p className="text-surface-300">{segment.text}</p>
      </div>
    </div>
  )
}

