import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMeetingStore, TranscriptSegment } from '@/stores/meetingStore'
import { useAudioCapture } from '@/hooks/useAudioCapture'
import { useTranscriptionSocket } from '@/hooks/useTranscriptionSocket'
import { formatDuration, formatTranscriptTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  Settings,
  MessageSquare,
  Activity,
  Users,
  Monitor,
  MonitorSpeaker,
} from 'lucide-react'

/**
 * Página de reunión en vivo con transcripción en tiempo real
 */
export default function LiveMeeting() {
  const { id } = useParams()
  const navigate = useNavigate()
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  
  const {
    isRecording,
    isPaused,
    elapsedTime,
    liveTranscript,
    partialText,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    addTranscriptSegment,
    setPartialText,
    setAudioLevel,
    updateElapsedTime,
    resetMeeting,
  } = useMeetingStore()
  
  const [showSettings, setShowSettings] = useState(false)
  
  // Hook de captura de audio mejorado
  const {
    isCapturing,
    captureMode,
    error: audioError,
    startMicrophoneCapture,
    startSystemCapture,
    startBothCapture,
    stopCapture,
    getAudioLevel,
  } = useAudioCapture({
    onAudioChunk: (chunk, isUserAudio) => {
      // Enviar chunk al WebSocket con metadata de origen
      sendAudioChunk(chunk)
    },
  })
  
  const [showCaptureOptions, setShowCaptureOptions] = useState(false)
  
  // Hook de WebSocket para transcripción
  const {
    isConnected,
    sendAudioChunk,
    disconnect,
  } = useTranscriptionSocket({
    meetingId: Number(id),
    onTranscript: (data) => {
      if (data.type === 'final') {
        addTranscriptSegment({
          id: Date.now().toString(),
          text: data.text,
          startTime: data.start_time,
          endTime: data.end_time,
          speaker: data.speaker,
          isUser: data.speaker === 'Tú',
          confidence: data.confidence,
        })
      } else {
        setPartialText(data.text)
      }
    },
    onError: (error) => {
      toast.error('Error de conexión: ' + error)
    },
  })
  
  // Timer para el tiempo transcurrido
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        updateElapsedTime(elapsedTime + 1)
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, isPaused, elapsedTime, updateElapsedTime])
  
  // Actualizar nivel de audio
  useEffect(() => {
    let animationFrame: number
    
    const updateLevel = () => {
      if (isCapturing) {
        setAudioLevel(getAudioLevel())
        animationFrame = requestAnimationFrame(updateLevel)
      }
    }
    
    if (isCapturing) {
      updateLevel()
    }
    
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
    }
  }, [isCapturing, getAudioLevel, setAudioLevel])
  
  // Auto-scroll de la transcripción
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveTranscript, partialText])
  
  // Iniciar grabación con modo seleccionado
  const handleStart = async (mode: 'microphone' | 'system' | 'both') => {
    try {
      setShowCaptureOptions(false)
      
      if (mode === 'microphone') {
        await startMicrophoneCapture()
        toast.success('Grabación de micrófono iniciada')
      } else if (mode === 'system') {
        await startSystemCapture()
        toast.success('Grabación de audio del sistema iniciada')
      } else {
        await startBothCapture()
        toast.success('Grabación completa iniciada (micrófono + sistema)')
      }
      
      startRecording(Number(id))
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar la grabación')
    }
  }
  
  // Detener grabación
  const handleStop = async () => {
    try {
      stopCapture()
      disconnect()
      stopRecording()
      
      toast.success('Reunión finalizada. Procesando transcripción...')
      
      // Navegar al detalle después de unos segundos
      setTimeout(() => {
        navigate(`/meetings/${id}`)
      }, 2000)
    } catch (error) {
      toast.error('Error al detener la grabación')
    }
  }
  
  // Pausar/reanudar
  const handlePauseResume = () => {
    if (isPaused) {
      resumeRecording()
      toast('Grabación reanudada', { icon: '▶️' })
    } else {
      pauseRecording()
      toast('Grabación pausada', { icon: '⏸️' })
    }
  }
  
  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopCapture()
        disconnect()
      }
    }
  }, [isRecording, stopCapture, disconnect])
  
  // Barras del visualizador de audio
  const audioBarCount = 20
  const audioBars = Array.from({ length: audioBarCount }, (_, i) => {
    const threshold = (i / audioBarCount) * 100
    const isActive = audioLevel * 100 > threshold
    return isActive ? Math.min(100, (audioLevel * 100 - threshold) * 5 + 20) : 10
  })
  
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header de la reunión en vivo */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Indicador de grabación */}
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
          
          {/* Estado de conexión */}
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
          
          {/* Indicador de modo de captura */}
          {captureMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400">
              {captureMode === 'microphone' && <Mic className="w-3 h-3" />}
              {captureMode === 'system' && <Monitor className="w-3 h-3" />}
              {captureMode === 'both' && <MonitorSpeaker className="w-3 h-3" />}
              {captureMode === 'microphone' ? 'Micrófono' : captureMode === 'system' ? 'Sistema' : 'Ambos'}
            </div>
          )}
        </div>
        
        {/* Controles */}
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <div className="relative">
              <button
                onClick={() => setShowCaptureOptions(!showCaptureOptions)}
                className="btn-accent flex items-center gap-2 px-6"
              >
                <Mic className="w-5 h-5" />
                Iniciar grabación
              </button>
              
              {/* Menú de opciones de captura */}
              <AnimatePresence>
                {showCaptureOptions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-72 bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-2 border-b border-surface-700">
                      <p className="text-xs text-surface-400 px-2">Selecciona modo de captura</p>
                    </div>
                    
                    <button
                      onClick={() => handleStart('microphone')}
                      className="w-full flex items-center gap-3 p-3 hover:bg-surface-700 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                        <Mic className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Solo micrófono</p>
                        <p className="text-xs text-surface-400">Graba solo tu voz</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleStart('system')}
                      className="w-full flex items-center gap-3 p-3 hover:bg-surface-700 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-accent-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Audio del sistema</p>
                        <p className="text-xs text-surface-400">Graba audio de apps (Zoom, Teams...)</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleStart('both')}
                      className="w-full flex items-center gap-3 p-3 hover:bg-surface-700 transition-colors text-left border-t border-surface-700"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <MonitorSpeaker className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Micrófono + Sistema</p>
                        <p className="text-xs text-surface-400">Captura completa (recomendado)</p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <button
                onClick={handlePauseResume}
                className="btn-secondary flex items-center gap-2"
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                {isPaused ? 'Reanudar' : 'Pausar'}
              </button>
              
              <button
                onClick={handleStop}
                className="btn-primary bg-red-500 hover:bg-red-400 flex items-center gap-2"
              >
                <Square className="w-5 h-5" />
                Finalizar
              </button>
            </>
          )}
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Contenido principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Transcripción en vivo */}
        <div className="lg:col-span-2 card flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-400" />
              Transcripción en tiempo real
            </h2>
            <span className="text-sm text-surface-400">
              {liveTranscript.length} segmentos
            </span>
          </div>
          
          {/* Lista de transcripción */}
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
            {liveTranscript.length === 0 && !partialText ? (
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
            ) : (
              <>
                {liveTranscript.map((segment, i) => (
                  <motion.div
                    key={segment.id}
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
                ))}
                
                {/* Texto parcial (en proceso) */}
                {partialText && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4 opacity-60"
                  >
                    <span className="text-xs text-surface-500 w-12 pt-1 font-mono">
                      ...
                    </span>
                    <div className="flex-1">
                      <p className="text-surface-400 italic">{partialText}</p>
                    </div>
                  </motion.div>
                )}
                
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>
        </div>
        
        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Visualizador de audio */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-400" />
              Nivel de audio
            </h3>
            
            <div className="flex items-end justify-center gap-1 h-20 mb-4">
              {audioBars.map((height, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "w-2 rounded-full",
                    isRecording && !isPaused
                      ? "bg-primary-500"
                      : "bg-surface-700"
                  )}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.1 }}
                />
              ))}
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-white">
                {Math.round(audioLevel * 100)}%
              </p>
              <p className="text-sm text-surface-400">Volumen detectado</p>
            </div>
          </div>
          
          {/* Participantes */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-400" />
              Participantes detectados
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-400">T</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Tú</p>
                  <p className="text-xs text-surface-400">Host</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent-400">O</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Otros</p>
                  <p className="text-xs text-surface-400">Participantes</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tips */}
          <div className="card bg-gradient-to-br from-primary-600/10 to-accent-600/10 border-primary-500/20">
            <p className="text-sm text-surface-300">
              💡 <strong>Tip:</strong> Habla claro y cerca del micrófono para 
              obtener mejores resultados de transcripción.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

