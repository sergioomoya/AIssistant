import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { motion } from 'framer-motion'

/**
 * Layout para páginas de autenticación (login/register)
 */
export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  // Redirigir si ya está autenticado
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  
  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Panel izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Fondo con gradiente y patrón */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-surface-900" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        
        {/* Círculos decorativos */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
        
        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-center px-12 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-2xl font-display font-bold text-white">
                AIssistant
              </span>
            </div>
            
            {/* Tagline */}
            <h1 className="text-4xl font-display font-bold text-white mb-4">
              Tu asistente de reuniones
              <span className="block text-primary-200">con inteligencia artificial</span>
            </h1>
            
            <p className="text-lg text-primary-100/80 mb-10 max-w-md">
              Transcripción en tiempo real, resúmenes inteligentes y privacidad por diseño. 
              Tu conversación, tu control.
            </p>
            
            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: '🔇', text: 'Agente Silencioso - Sin bots visibles' },
                { icon: '🔒', text: 'Privacidad total - Modo 100% local' },
                { icon: '⚡', text: 'Transcripción en tiempo real' },
                { icon: '🤖', text: 'Resúmenes con IA avanzada' },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 text-white/90"
                >
                  <span className="text-xl">{feature.icon}</span>
                  <span>{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Panel derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}

