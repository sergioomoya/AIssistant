/**
 * Header del detalle de reunión
 */

import { ArrowLeft, Calendar, Clock, TrendingUp, Download, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDate, formatDuration } from '@/utils/format'

interface MeetingHeaderProps {
  meeting: {
    title: string
    actual_start?: string
    created_at: string
    duration_seconds?: number
    sentiment?: string
    status: string
    summary?: string
  }
  onBack: () => void
  onExport: (format: 'docx' | 'txt' | 'md') => void
  onGenerateSummary: () => void
  isGenerating: boolean
  canGenerateSummary: boolean
}

const SENTIMENT_COLORS = {
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  neutral: 'text-surface-400',
  mixed: 'text-amber-400',
}

export function MeetingHeader({
  meeting,
  onBack,
  onExport,
  onGenerateSummary,
  isGenerating,
  canGenerateSummary,
}: MeetingHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors mt-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            {meeting.title}
          </h1>
          
          <MeetingMeta meeting={meeting} />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {canGenerateSummary && (
          <button
            onClick={onGenerateSummary}
            disabled={isGenerating}
            className="btn-accent flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            Generar resumen
          </button>
        )}
        
        <ExportDropdown onExport={onExport} />
      </div>
    </div>
  )
}

// ========== Sub-componentes ==========

function MeetingMeta({ meeting }: { meeting: MeetingHeaderProps['meeting'] }) {
  return (
    <div className="flex items-center gap-4 text-sm text-surface-400">
      <span className="flex items-center gap-1.5">
        <Calendar className="w-4 h-4" />
        {formatDate(meeting.actual_start || meeting.created_at, 'PPp')}
      </span>
      
      {meeting.duration_seconds && (
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {formatDuration(meeting.duration_seconds)}
        </span>
      )}
      
      {meeting.sentiment && (
        <span className={cn(
          "flex items-center gap-1.5",
          SENTIMENT_COLORS[meeting.sentiment as keyof typeof SENTIMENT_COLORS]
        )}>
          <TrendingUp className="w-4 h-4" />
          Sentimiento {meeting.sentiment}
        </span>
      )}
    </div>
  )
}

function ExportDropdown({ onExport }: { onExport: (format: 'docx' | 'txt' | 'md') => void }) {
  return (
    <div className="relative group">
      <button className="btn-secondary flex items-center gap-2">
        <Download className="w-5 h-5" />
        Exportar
      </button>
      
      <div className="absolute right-0 top-full mt-2 w-40 bg-surface-800 border border-surface-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
        <div className="p-2">
          {(['docx', 'txt', 'md'] as const).map((format) => (
            <button
              key={format}
              onClick={() => onExport(format)}
              className="w-full text-left px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

