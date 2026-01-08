import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react'

// Icono de Google
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

/**
 * Página de inicio de sesión
 */
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Por favor completa todos los campos')
      return
    }
    
    setIsLoading(true)
    
    try {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)
      
      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      
      const { access_token, user } = response.data
      
      login({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        deploymentMode: user.deployment_mode,
        onboardingCompleted: user.onboarding_completed,
      }, access_token)
      
      toast.success('¡Bienvenido de vuelta!')
      
      // Redirigir según estado de onboarding
      if (user.onboarding_completed) {
        navigate('/')
      } else {
        navigate('/setup')
      }
      
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al iniciar sesión'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    
    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`
      
      const response = await api.get('/oauth/google/auth-url', {
        params: { redirect_uri: redirectUri }
      })
      
      // Redirigir a Google
      window.location.href = response.data.auth_url
      
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Google OAuth no está configurado'
      toast.error(message)
      setIsGoogleLoading(false)
    }
  }
  
  return (
    <div>
      {/* Logo móvil */}
      <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-2xl font-display font-bold text-white">AIssistant</span>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-3xl font-display font-bold text-white mb-2">
          Iniciar sesión
        </h2>
        <p className="text-surface-400 mb-8">
          Bienvenido de vuelta. Ingresa tus credenciales.
        </p>
      </motion.div>
      
      {/* Botón de Google */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continuar con Google
        </button>
      </motion.div>
      
      {/* Separador */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-surface-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-surface-900 text-surface-500">o con email</span>
        </div>
      </div>
      
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="input pl-11"
              autoComplete="email"
            />
          </div>
        </div>
        
        {/* Contraseña */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input pl-11 pr-11"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Recordar / Olvidé contraseña */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-surface-400">
            <input type="checkbox" className="rounded border-surface-600 bg-surface-800 text-primary-500" />
            Recordarme
          </label>
          <a href="#" className="text-primary-400 hover:text-primary-300">
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        
        {/* Botón de submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Iniciando sesión...
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </motion.form>
      
      {/* Link a registro */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-center text-surface-400"
      >
        ¿No tienes una cuenta?{' '}
        <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
          Regístrate gratis
        </Link>
      </motion.p>
    </div>
  )
}
