/**
 * Estado vacío para lista de reuniones
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Mic } from 'lucide-react'

interface EmptyMeetingsProps {
  hasSearchQuery: boolean
}

export function EmptyMeetings({ hasSearchQuery }: EmptyMeetingsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 card"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
        <Calendar className="w-8 h-8 text-surface-500" />
      </div>
      
      <h3 className="text-lg font-medium text-white mb-2">
        No hay reuniones
      </h3>
      
      <p className="text-surface-400 mb-6">
        {hasSearchQuery
          ? 'No se encontraron reuniones con ese término'
          : 'Comienza tu primera reunión para verla aquí'}
      </p>
      
      <Link to="/meetings/new" className="btn-primary">
        <Mic className="w-5 h-5 mr-2" />
        Nueva reunión
      </Link>
    </motion.div>
  )
}

