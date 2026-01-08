import { useTaskStatus } from '@/hooks/useTaskStatus'
import { Loader2, CheckCircle2, XCircle, Upload, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'

interface TaskProgressProps {
  taskId: string | null
  className?: string
}

/**
 * Componente para mostrar el progreso de una tarea asíncrona
 */
export default function TaskProgress({ taskId, className }: TaskProgressProps) {
  const { status, progress, message, error, isConnected } = useTaskStatus(taskId)
  
  if (!taskId) {
    return null
  }
  
  const statusConfig = {
    pending: { icon: Loader2, color: 'text-surface-400', label: 'Pendiente' },
    uploading: { icon: Upload, color: 'text-blue-400', label: 'Subiendo' },
    processing: { icon: Loader2, color: 'text-primary-400', label: 'Procesando' },
    transcribing: { icon: FileText, color: 'text-purple-400', label: 'Transcribiendo' },
    summarizing: { icon: Sparkles, color: 'text-amber-400', label: 'Generando resumen' },
    completed: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completado' },
    failed: { icon: XCircle, color: 'text-red-400', label: 'Error' },
  }
  
  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon
  
  return (
    <div className={cn("p-4 bg-surface-900 border border-surface-800 rounded-xl", className)}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className={cn("w-5 h-5", config.color, status !== 'completed' && status !== 'failed' && "animate-spin")} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white">{config.label}</span>
            <span className="text-xs text-surface-500">{Math.round(progress * 100)}%</span>
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                status === 'failed' ? 'bg-red-500' : 'bg-gradient-to-r from-primary-500 to-accent-500'
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Mensaje o error */}
      {message && (
        <p className="text-sm text-surface-400 mt-2">{message}</p>
      )}
      
      {error && (
        <p className="text-sm text-red-400 mt-2">Error: {error}</p>
      )}
      
      {/* Estado de conexión */}
      {!isConnected && status !== 'completed' && status !== 'failed' && (
        <p className="text-xs text-amber-400 mt-2">Reconectando...</p>
      )}
    </div>
  )
}

