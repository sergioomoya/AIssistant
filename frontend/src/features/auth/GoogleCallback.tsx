import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

/**
 * Página de callback para Google OAuth
 * Maneja el código de autorización devuelto por Google
 */
export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [error, setError] = useState<string | null>(null)
  const hasProcessed = useRef(false)
  
  useEffect(() => {
    // Evitar procesamiento duplicado (React StrictMode)
    if (hasProcessed.current) {
      return
    }
    
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')
    
    if (errorParam) {
      hasProcessed.current = true
      setError('Autenticación cancelada')
      setTimeout(() => navigate('/login'), 2000)
      return
    }
    
    if (!code) {
      hasProcessed.current = true
      setError('No se recibió código de autorización')
      setTimeout(() => navigate('/login'), 2000)
      return
    }
    
    // Marcar como procesado antes de hacer la llamada
    hasProcessed.current = true
    
    // Intercambiar código por token
    const exchangeCode = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/google/callback`
        
        const response = await api.post('/oauth/google/callback', {
          code,
          redirect_uri: redirectUri,
        })
        
        const { access_token, user } = response.data
        
        login({
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          deploymentMode: user.deployment_mode,
          onboardingCompleted: user.onboarding_completed,
        }, access_token)
        
        toast.success('¡Bienvenido!')
        
        // Redirigir según estado de onboarding
        if (user.onboarding_completed) {
          navigate('/')
        } else {
          navigate('/setup')
        }
        
      } catch (err: any) {
        console.error('Error en OAuth:', err)
        const message = err.response?.data?.detail || 'Error al iniciar sesión con Google'
        setError(message)
        toast.error(message)
        setTimeout(() => navigate('/login'), 3000)
      }
    }
    
    exchangeCode()
  }, [searchParams, navigate, login])
  
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
            <p className="text-surface-400">{error}</p>
            <p className="text-surface-500 text-sm mt-2">Redirigiendo...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Iniciando sesión con Google
            </h2>
            <p className="text-surface-400">Por favor espera...</p>
          </>
        )}
      </div>
    </div>
  )
}

