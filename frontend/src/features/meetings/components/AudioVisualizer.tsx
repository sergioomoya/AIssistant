/**
 * Visualizador de nivel de audio
 */

import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AudioVisualizerProps {
  audioLevel: number
  isRecording: boolean
  isPaused: boolean
}

const BAR_COUNT = 20

export function AudioVisualizer({ audioLevel, isRecording, isPaused }: AudioVisualizerProps) {
  const isActive = isRecording && !isPaused
  
  // Calcular altura de cada barra
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const threshold = (i / BAR_COUNT) * 100
    const isBarActive = audioLevel * 100 > threshold
    return isBarActive ? Math.min(100, (audioLevel * 100 - threshold) * 5 + 20) : 10
  })

  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary-400" />
        Nivel de audio
      </h3>
      
      <div className="flex items-end justify-center gap-1 h-20 mb-4">
        {bars.map((height, i) => (
          <motion.div
            key={i}
            className={cn(
              "w-2 rounded-full",
              isActive ? "bg-primary-500" : "bg-surface-700"
            )}
            animate={{ height: `${height}%` }}
            transition={{ duration: 0.1 }}
          />
        ))}
      </div>
      
      <div className="text-center">
        <p className="text-2xl font-mono font-bold text-white">
          {Math.round(audioLevel * 100)}%
        </p>
        <p className="text-sm text-surface-400">Volumen detectado</p>
      </div>
    </div>
  )
}

