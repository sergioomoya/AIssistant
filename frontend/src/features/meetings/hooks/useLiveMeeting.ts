/**
 * Hook para gestionar la lógica de reunión en vivo
 * Encapsula: audio capture, WebSocket, estado de grabación
 */

import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeetingStore } from '@/stores/meetingStore'
import { useAudioCapture } from '@/hooks/useAudioCapture'
import { useTranscriptionSocket } from '@/hooks/useTranscriptionSocket'
import toast from 'react-hot-toast'

export type CaptureMode = 'microphone' | 'system' | 'both'

interface UseLiveMeetingProps {
  meetingId: number
}

export function useLiveMeeting({ meetingId }: UseLiveMeetingProps) {
  const navigate = useNavigate()
  
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
  } = useMeetingStore()
  
  // Hook de WebSocket para transcripción
  const {
    isConnected,
    sendAudioChunk,
    disconnect,
  } = useTranscriptionSocket({
    meetingId,
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
  
  // Hook de captura de audio
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
    onAudioChunk: (chunk) => {
      sendAudioChunk(chunk)
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
  
  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopCapture()
        disconnect()
      }
    }
  }, [isRecording, stopCapture, disconnect])
  
  // Iniciar grabación
  const handleStart = useCallback(async (mode: CaptureMode) => {
    try {
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
      
      startRecording(meetingId)
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar la grabación')
    }
  }, [meetingId, startMicrophoneCapture, startSystemCapture, startBothCapture, startRecording])
  
  // Detener grabación
  const handleStop = useCallback(async () => {
    try {
      stopCapture()
      disconnect()
      stopRecording()
      
      toast.success('Reunión finalizada. Procesando transcripción...')
      
      setTimeout(() => {
        navigate(`/meetings/${meetingId}`)
      }, 2000)
    } catch (error) {
      toast.error('Error al detener la grabación')
    }
  }, [meetingId, stopCapture, disconnect, stopRecording, navigate])
  
  // Pausar/reanudar
  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      resumeRecording()
      toast('Grabación reanudada', { icon: '▶️' })
    } else {
      pauseRecording()
      toast('Grabación pausada', { icon: '⏸️' })
    }
  }, [isPaused, pauseRecording, resumeRecording])
  
  return {
    // Estado
    isRecording,
    isPaused,
    isConnected,
    isCapturing,
    captureMode,
    elapsedTime,
    audioLevel,
    liveTranscript,
    partialText,
    audioError,
    
    // Acciones
    handleStart,
    handleStop,
    handlePauseResume,
  }
}

