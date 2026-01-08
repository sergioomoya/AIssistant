import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'

/**
 * Página de registro
 */
export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const navigate = useNavigate()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('Por favor completa todos los campos')
      return
    }
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    
    setIsLoading(true)
    
    try {
      await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      })
      
      toast.success('¡Cuenta creada! Ahora puedes iniciar sesión.')
      navigate('/login')
      
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al crear la cuenta'
      toast.error(message)
    } finally {
      setIsLoading(false)
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
          Crear cuenta
        </h2>
        <p className="text-surface-400 mb-8">
          Comienza a transformar tus reuniones con IA.
        </p>
      </motion.div>
      
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Nombre completo */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Nombre completo
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              className="input pl-11"
              autoComplete="name"
            />
          </div>
        </div>
        
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
              placeholder="Mínimo 8 caracteres"
              className="input pl-11 pr-11"
              autoComplete="new-password"
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
        
        {/* Confirmar contraseña */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Confirmar contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              className="input pl-11"
              autoComplete="new-password"
            />
          </div>
        </div>
        
        {/* Términos */}
        <label className="flex items-start gap-2 text-sm text-surface-400">
          <input type="checkbox" className="mt-1 rounded border-surface-600 bg-surface-800 text-primary-500" required />
          <span>
            Acepto los{' '}
            <a href="#" className="text-primary-400 hover:text-primary-300">términos de servicio</a>
            {' '}y la{' '}
            <a href="#" className="text-primary-400 hover:text-primary-300">política de privacidad</a>
          </span>
        </label>
        
        {/* Botón de submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creando cuenta...
            </>
          ) : (
            'Crear cuenta'
          )}
        </button>
      </motion.form>
      
      {/* Link a login */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-center text-surface-400"
      >
        ¿Ya tienes una cuenta?{' '}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
          Inicia sesión
        </Link>
      </motion.p>
    </div>
  )
}

