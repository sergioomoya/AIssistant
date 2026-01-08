import { useState, useRef, useCallback, useEffect } from 'react'
import { getWebSocketUrl } from '@/utils/api'

interface TranscriptionData {
  type: 'partial' | 'final'
  text: string
  start_time: number
  end_time: number
  speaker: string
  confidence: number
  sequence: number
}

interface UseTranscriptionSocketOptions {
  meetingId: number
  onTranscript: (data: TranscriptionData) => void
  onError?: (error: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

interface UseTranscriptionSocketReturn {
  isConnected: boolean
  sendAudioChunk: (chunk: ArrayBuffer) => void
  connect: () => void
  disconnect: () => void
}

/**
 * Hook para comunicación WebSocket con el servicio de transcripción
 */
export function useTranscriptionSocket({
  meetingId,
  onTranscript,
  onError,
  onConnect,
  onDisconnect,
}: UseTranscriptionSocketOptions): UseTranscriptionSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 2000
  
  const connect = useCallback(() => {
    // Si ya hay una conexión activa, no hacer nada
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return
    }
    
    // Cerrar conexión anterior si existe
    if (socketRef.current) {
      socketRef.current.close()
    }
    
    const wsUrl = getWebSocketUrl(`/api/v1/transcription/ws/${meetingId}`)
    
    try {
      const socket = new WebSocket(wsUrl)
      socketRef.current = socket
      
      socket.onopen = () => {
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        onConnect?.()
      }
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TranscriptionData
          onTranscript(data)
        } catch (err) {
          console.error('Error parsing transcription data:', err)
        }
      }
      
      socket.onerror = (event) => {
        console.error('WebSocket error:', event)
        onError?.('Error de conexión WebSocket')
      }
      
      socket.onclose = (event) => {
        setIsConnected(false)
        onDisconnect?.()
        
        // Intentar reconectar si no fue un cierre limpio
        if (!event.wasClean && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY * reconnectAttemptsRef.current)
        }
      }
      
    } catch (err) {
      console.error('Error creating WebSocket:', err)
      onError?.('No se pudo crear la conexión WebSocket')
    }
  }, [meetingId, onTranscript, onError, onConnect, onDisconnect])
  
  const disconnect = useCallback(() => {
    // Cancelar reconexión pendiente
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Cerrar socket
    if (socketRef.current) {
      socketRef.current.close(1000, 'Client disconnect')
      socketRef.current = null
    }
    
    setIsConnected(false)
  }, [])
  
  const sendAudioChunk = useCallback((chunk: ArrayBuffer) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(chunk)
    }
  }, [])
  
  // Auto-conectar al montar
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, []) // Solo al montar/desmontar
  
  return {
    isConnected,
    sendAudioChunk,
    connect,
    disconnect,
  }
}

