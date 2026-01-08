import { useEffect, useState, useRef } from 'react'
import { getWebSocketUrl } from '@/utils/api'

interface TaskStatus {
  status: 'pending' | 'uploading' | 'processing' | 'transcribing' | 'summarizing' | 'completed' | 'failed'
  progress: number // 0.0 a 1.0
  message?: string
  error?: string
}

/**
 * Hook para conectarse a WebSocket y recibir actualizaciones de estado de tareas
 */
export function useTaskStatus(taskId: string | null) {
  const [status, setStatus] = useState<TaskStatus>({
    status: 'pending',
    progress: 0,
  })
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!taskId) return

    // Conectar a WebSocket
    const wsUrl = getWebSocketUrl(`/api/v1/ws/tasks/${taskId}`)
    const ws = new WebSocket(wsUrl)

    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket conectado para tarea:', taskId)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        setStatus({
          status: data.status || 'pending',
          progress: data.progress || 0,
          message: data.message,
          error: data.error,
        })
      } catch (error) {
        console.error('Error parseando mensaje WebSocket:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('Error en WebSocket:', error)
      setStatus((prev) => ({
        ...prev,
        status: 'failed',
        error: 'Error de conexión',
      }))
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log('WebSocket desconectado')
    }

    // Cleanup
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [taskId])

  return {
    status: status.status,
    progress: status.progress,
    message: status.message,
    error: status.error,
    isConnected,
  }
}

