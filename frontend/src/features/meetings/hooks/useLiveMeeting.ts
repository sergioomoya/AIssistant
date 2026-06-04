/**
 * Hook para gestionar la lógica de reunión en vivo
 * Encapsula: audio capture, WebSocket, estado de grabación
 */

import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeetingStore } from '@/stores/meetingStore'
import { useAudioCapture } from '@/hooks/useAudioCapture'
import { useTranscriptionSocket } from '@/hooks/useTranscriptionSocket'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'

export type CaptureMode = 'microphone' | 'system' | 'both'

interface UseLiveMeetingProps {
  meetingId?: number
}

export function useLiveMeeting({ meetingId: initialMeetingId }: UseLiveMeetingProps) {
  const navigate = useNavigate()
  const [meetingId, setMeetingId] = useState<number | undefined>(initialMeetingId)
  
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
  
  // Hook de WebSocket para transcripción (solo se conecta si hay meetingId válido)
  const {
    isConnected,
    sendAudioChunk,
    disconnect,
    connect,
  } = useTranscriptionSocket({
    meetingId: meetingId || 0,
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
      console.warn('Error de conexión WebSocket (se reintentará en segundo plano):', error)
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
  
  // Reconectar automáticamente si se está grabando y se pierde la conexión con el servidor
  useEffect(() => {
    let reconnectInterval: NodeJS.Timeout | null = null
    
    if (isRecording && !isConnected && meetingId) {
      reconnectInterval = setInterval(() => {
        console.log('Intentando reconectar WebSocket desde useLiveMeeting...')
        connect()
      }, 5000)
    }
    
    return () => {
      if (reconnectInterval) {
        clearInterval(reconnectInterval)
      }
    }
  }, [isRecording, isConnected, meetingId, connect])

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
      // Crear reunión si no existe
      let currentMeetingId = meetingId
      if (!currentMeetingId || isNaN(currentMeetingId) || currentMeetingId <= 0) {
        const response = await api.post('/meetings', {
          title: `Reunión ${new Date().toLocaleString()}`,
          // No enviar status - el backend lo determina automáticamente
        })
        currentMeetingId = response.data.id
        setMeetingId(currentMeetingId)
        // Navegar a la URL con el ID de la reunión
        navigate(`/meetings/${currentMeetingId}/live`, { replace: true })
      }
      
      // Iniciar captura de audio
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
      
      // Conectar WebSocket y empezar grabación
      if (currentMeetingId) {
        connect()
        startRecording(currentMeetingId)
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar la grabación')
    }
  }, [meetingId, startMicrophoneCapture, startSystemCapture, startBothCapture, startRecording, navigate, connect])
  
  // Detener grabación
  const handleStop = useCallback(async () => {
    try {
      stopCapture()
      disconnect()
      
      // Detener la reunión formalmente en el backend
      if (meetingId) {
        await api.post(`/meetings/${meetingId}/stop`)
      }
      
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

