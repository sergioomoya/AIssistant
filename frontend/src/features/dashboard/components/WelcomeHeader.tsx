/**
 * Header de bienvenida del dashboard
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'

interface WelcomeHeaderProps {
  userName?: string
}

export function WelcomeHeader({ userName }: WelcomeHeaderProps) {
  const displayName = userName?.split(' ')[0] || 'Usuario'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between"
    >
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">
          ¡Hola, {displayName}! 👋
        </h1>
        <p className="text-surface-400">
          Aquí tienes un resumen de tu actividad reciente.
        </p>
      </div>
      
      <Link
        to="/meetings/new"
        className="btn-primary flex items-center gap-2"
      >
        <Mic className="w-5 h-5" />
        Nueva reunión
      </Link>
    </motion.div>
  )
}

