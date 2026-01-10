/**
 * Header de la página de reuniones
 */

import { Link } from 'react-router-dom'
import { Mic } from 'lucide-react'

export function MeetingsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Reuniones
        </h1>
        <p className="text-surface-400">
          Gestiona y revisa todas tus reuniones
        </p>
      </div>
      
      <Link to="/meetings/new" className="btn-primary flex items-center gap-2">
        <Mic className="w-5 h-5" />
        Nueva reunión
      </Link>
    </div>
  )
}

