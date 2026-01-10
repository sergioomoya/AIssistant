/**
 * Página de reunión en vivo con transcripción en tiempo real
 * 
 * Refactorizado: Lógica en useLiveMeeting, UI en componentes separados
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveMeeting } from './hooks/useLiveMeeting'
import {
  RecordingControls,
  RecordingStatus,
  TranscriptPanel,
  AudioVisualizer,
  ParticipantsPanel,
} from './components'

export default function LiveMeeting() {
  const { id } = useParams()
  const [showSettings, setShowSettings] = useState(false)
  
  const {
    isRecording,
    isPaused,
    isConnected,
    captureMode,
    elapsedTime,
    audioLevel,
    liveTranscript,
    partialText,
    handleStart,
    handleStop,
    handlePauseResume,
  } = useLiveMeeting({ meetingId: Number(id) })

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header de la reunión en vivo */}
      <div className="flex items-center justify-between mb-6">
        <RecordingStatus
          isRecording={isRecording}
          isPaused={isPaused}
          isConnected={isConnected}
          captureMode={captureMode}
          elapsedTime={elapsedTime}
        />
        
        <RecordingControls
          isRecording={isRecording}
          isPaused={isPaused}
          onStart={handleStart}
          onStop={handleStop}
          onPauseResume={handlePauseResume}
          onSettingsClick={() => setShowSettings(!showSettings)}
        />
      </div>
      
      {/* Contenido principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Transcripción en vivo */}
        <TranscriptPanel
          segments={liveTranscript}
          partialText={partialText}
          isRecording={isRecording}
        />
        
        {/* Panel lateral */}
        <div className="space-y-6">
          <AudioVisualizer
            audioLevel={audioLevel}
            isRecording={isRecording}
            isPaused={isPaused}
          />
          
          <ParticipantsPanel />
          
          <TipCard />
        </div>
      </div>
    </div>
  )
}

// ========== Sub-componentes ==========

function TipCard() {
  return (
    <div className="card bg-gradient-to-br from-primary-600/10 to-accent-600/10 border-primary-500/20">
      <p className="text-sm text-surface-300">
        💡 <strong>Tip:</strong> Habla claro y cerca del micrófono para 
        obtener mejores resultados de transcripción.
      </p>
    </div>
  )
}
