import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Cliente HTTP configurado para la API de AIssistant
 */
export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para añadir token de autenticación
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

/**
 * Crear URL para WebSocket
 */
export function getWebSocketUrl(path: string): string {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
  const token = useAuthStore.getState().token
  
  return `${wsUrl}${path}?token=${token}`
}

