/**
 * Controles de grabación para reunión en vivo
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  Pause,
  Play,
  Square,
  Settings,
  Monitor,
  MonitorSpeaker,
} from 'lucide-react'
import type { CaptureMode } from '../hooks/useLiveMeeting'

interface RecordingControlsProps {
  isRecording: boolean
  isPaused: boolean
  onStart: (mode: CaptureMode) => void
  onStop: () => void
  onPauseResume: () => void
  onSettingsClick: () => void
}

export function RecordingControls({
  isRecording,
  isPaused,
  onStart,
  onStop,
  onPauseResume,
  onSettingsClick,
}: RecordingControlsProps) {
  const [showCaptureOptions, setShowCaptureOptions] = useState(false)
  
  const handleStartWithMode = (mode: CaptureMode) => {
    setShowCaptureOptions(false)
    onStart(mode)
  }

  if (!isRecording) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowCaptureOptions(!showCaptureOptions)}
            className="btn-accent flex items-center gap-2 px-6"
          >
            <Mic className="w-5 h-5" />
            Iniciar grabación
          </button>
          
          <CaptureOptionsMenu
            isOpen={showCaptureOptions}
            onSelect={handleStartWithMode}
          />
        </div>
        
        <SettingsButton onClick={onSettingsClick} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPauseResume}
        className="btn-secondary flex items-center gap-2"
      >
        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        {isPaused ? 'Reanudar' : 'Pausar'}
      </button>
      
      <button
        onClick={onStop}
        className="btn-primary bg-red-500 hover:bg-red-400 flex items-center gap-2"
      >
        <Square className="w-5 h-5" />
        Finalizar
      </button>
      
      <SettingsButton onClick={onSettingsClick} />
    </div>
  )
}

// ========== Sub-componentes ==========

interface CaptureOptionsMenuProps {
  isOpen: boolean
  onSelect: (mode: CaptureMode) => void
}

function CaptureOptionsMenu({ isOpen, onSelect }: CaptureOptionsMenuProps) {
  const options = [
    {
      mode: 'microphone' as const,
      icon: Mic,
      color: 'primary',
      title: 'Solo micrófono',
      description: 'Graba solo tu voz',
    },
    {
      mode: 'system' as const,
      icon: Monitor,
      color: 'accent',
      title: 'Audio del sistema',
      description: 'Graba audio de apps (Zoom, Teams...)',
    },
    {
      mode: 'both' as const,
      icon: MonitorSpeaker,
      color: 'emerald',
      title: 'Micrófono + Sistema',
      description: 'Captura completa (recomendado)',
      hasBorder: true,
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full right-0 mt-2 w-72 bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          <div className="p-2 border-b border-surface-700">
            <p className="text-xs text-surface-400 px-2">Selecciona modo de captura</p>
          </div>
          
          {options.map((option) => (
            <button
              key={option.mode}
              onClick={() => onSelect(option.mode)}
              className={`w-full flex items-center gap-3 p-3 hover:bg-surface-700 transition-colors text-left ${
                option.hasBorder ? 'border-t border-surface-700' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-lg bg-${option.color}-500/20 flex items-center justify-center`}>
                <option.icon className={`w-5 h-5 text-${option.color}-400`} />
              </div>
              <div>
                <p className="font-medium text-white">{option.title}</p>
                <p className="text-xs text-surface-400">{option.description}</p>
              </div>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
    >
      <Settings className="w-5 h-5" />
    </button>
  )
}

