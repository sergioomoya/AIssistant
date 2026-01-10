import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

/**
 * Página de callback para OAuth de calendarios
 * 
 * Esta página recibe el código de autorización del proveedor de OAuth
 * y lo intercambia por tokens para conectar el calendario.
 */
export default function CalendarCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  
  // Detectar proveedor desde la URL o localStorage
  const getProvider = (): string => {
    // Google y Microsoft usan diferentes parámetros
    // Podemos detectar por el patrón del código o guardar en localStorage antes de redirigir
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    // Si hay error de OAuth
    const error = searchParams.get('error')
    if (error) {
      return 'unknown'
    }
    
    // Intentar obtener del localStorage (guardado antes de la redirección)
    const savedProvider = localStorage.getItem('calendar_oauth_provider')
    if (savedProvider) {
      localStorage.removeItem('calendar_oauth_provider')
      return savedProvider
    }
    
    // Detectar por estructura del código (heurística)
    if (code) {
      // Los códigos de Google suelen empezar con "4/"
      if (code.startsWith('4/')) return 'google'
      // Los códigos de Microsoft son más largos y tienen formato diferente
      if (code.length > 500) return 'microsoft'
    }
    
    // Default a google si no podemos determinar
    return 'google'
  }
  
  const exchangeCode = useMutation({
    mutationFn: async ({ code, provider }: { code: string; provider: string }) => {
      const redirectUri = `${window.location.origin}/settings/calendar/callback`
      const response = await api.post('/calendar/callback', {
        code,
        redirect_uri: redirectUri,
        provider,
      })
      return response.data
    },
    onSuccess: (data) => {
      setStatus('success')
      toast.success(`${data.provider === 'google' ? 'Google Calendar' : 'Outlook'} conectado correctamente`)
      
      // Redirigir a settings después de 2 segundos
      setTimeout(() => {
        navigate('/settings', { replace: true })
      }, 2000)
    },
    onError: (error: any) => {
      setStatus('error')
      setErrorMessage(error.response?.data?.detail || 'Error al conectar el calendario')
      toast.error('Error al conectar el calendario')
    },
  })
  
  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    if (error) {
      setStatus('error')
      setErrorMessage(errorDescription || `Error de OAuth: ${error}`)
      return
    }
    
    if (!code) {
      setStatus('error')
      setErrorMessage('No se recibió código de autorización')
      return
    }
    
    const provider = getProvider()
    exchangeCode.mutate({ code, provider })
  }, [searchParams])
  
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="card text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary-500 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-display font-bold text-white mb-2">
                Conectando calendario...
              </h1>
              <p className="text-surface-400">
                Por favor espera mientras verificamos tu autorización.
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="text-xl font-display font-bold text-white mb-2">
                ¡Calendario conectado!
              </h1>
              <p className="text-surface-400">
                Tu calendario ha sido conectado correctamente.
                Redirigiendo a configuración...
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <h1 className="text-xl font-display font-bold text-white mb-2">
                Error al conectar
              </h1>
              <p className="text-surface-400 mb-4">
                {errorMessage}
              </p>
              <button
                onClick={() => navigate('/settings', { replace: true })}
                className="btn-primary"
              >
                Volver a configuración
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

