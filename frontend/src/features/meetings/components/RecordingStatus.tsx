/**
 * Indicadores de estado de grabación
 */

import { Mic, Monitor, MonitorSpeaker } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/format'

interface RecordingStatusProps {
  isRecording: boolean
  isPaused: boolean
  isConnected: boolean
  captureMode: 'microphone' | 'system' | 'both' | null
  elapsedTime: number
}

export function RecordingStatus({
  isRecording,
  isPaused,
  isConnected,
  captureMode,
  elapsedTime,
}: RecordingStatusProps) {
  return (
    <div className="flex items-center gap-4">
      <TimerDisplay
        isRecording={isRecording}
        isPaused={isPaused}
        elapsedTime={elapsedTime}
      />
      
      <ConnectionIndicator isConnected={isConnected} />
      
      {captureMode && <CaptureModeIndicator mode={captureMode} />}
    </div>
  )
}

// ========== Sub-componentes ==========

interface TimerDisplayProps {
  isRecording: boolean
  isPaused: boolean
  elapsedTime: number
}

function TimerDisplay({ isRecording, isPaused, elapsedTime }: TimerDisplayProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 rounded-xl",
      isRecording
        ? isPaused
          ? "bg-amber-500/10 border border-amber-500/30"
          : "bg-red-500/10 border border-red-500/30"
        : "bg-surface-800 border border-surface-700"
    )}>
      {isRecording && !isPaused && <span className="recording-indicator" />}
      <span className={cn(
        "font-mono text-lg font-medium",
        isRecording ? (isPaused ? "text-amber-400" : "text-red-400") : "text-surface-400"
      )}>
        {formatDuration(elapsedTime)}
      </span>
    </div>
  )
}

interface ConnectionIndicatorProps {
  isConnected: boolean
}

function ConnectionIndicator({ isConnected }: ConnectionIndicatorProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
      isConnected
        ? "bg-emerald-500/10 text-emerald-400"
        : "bg-surface-800 text-surface-400"
    )}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        isConnected ? "bg-emerald-500" : "bg-surface-500"
      )} />
      {isConnected ? 'Conectado' : 'Desconectado'}
    </div>
  )
}

interface CaptureModeIndicatorProps {
  mode: 'microphone' | 'system' | 'both'
}

function CaptureModeIndicator({ mode }: CaptureModeIndicatorProps) {
  const config = {
    microphone: { icon: Mic, label: 'Micrófono' },
    system: { icon: Monitor, label: 'Sistema' },
    both: { icon: MonitorSpeaker, label: 'Ambos' },
  }
  
  const { icon: Icon, label } = config[mode]
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400">
      <Icon className="w-3 h-3" />
      {label}
    </div>
  )
}

