import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  ChevronRight, 
  Gauge 
} from 'lucide-react'

interface AudioPlayerProps {
  meetingId: number | string
}

export function AudioPlayer({ meetingId }: AudioPlayerProps) {
  const token = useAuthStore((state) => state.token)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const audioUrl = `${API_URL}/api/v1/meetings/${meetingId}/audio?token=${token}`
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  
  // Sincronizar estado al cambiar la fuente
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [meetingId])

  // Formatear tiempo (segundos -> MM:SS)
  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Play / Pause toggle
  const togglePlay = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Error al reproducir el audio:', err)
      })
    }
  }

  // Volver a reproducir o rebobinar 10s
  const rewind = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
  }
  
  // Adelantar 10s
  const forward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10)
  }

  // Cambiar volumen
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
      audioRef.current.muted = newVolume === 0
    }
  }

  // Mute toggle
  const toggleMute = () => {
    if (!audioRef.current) return
    const newMuted = !isMuted
    setIsMuted(newMuted)
    audioRef.current.muted = newMuted
    if (!newMuted && volume === 0) {
      setVolume(0.5)
      audioRef.current.volume = 0.5
    }
  }

  // Cambiar progreso al arrastrar el slider
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  // Cambiar velocidad de reproducción
  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate)
    setShowSpeedMenu(false)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }

  // Listeners del elemento de audio
  const onPlay = () => setIsPlaying(true)
  const onPause = () => setIsPlaying(false)
  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }
  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }
  const onEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  return (
    <div className="card bg-surface-900/50 border border-surface-800 backdrop-blur-md p-4 rounded-xl flex flex-col md:flex-row items-center gap-4 w-full shadow-lg transition-all duration-300 hover:border-surface-700">
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        preload="metadata"
      />
      
      {/* Botones de control principales */}
      <div className="flex items-center gap-2">
        <button
          onClick={rewind}
          title="Rebobinar 10 segundos"
          className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center bg-primary-600 hover:bg-primary-500 text-white rounded-full transition-all shadow-md active:scale-95"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          )}
        </button>
        
        <button
          onClick={forward}
          title="Adelantar 10 segundos"
          className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Tiempos y barra de progreso */}
      <div className="flex-1 flex items-center gap-3 w-full">
        <span className="text-xs text-surface-400 font-mono select-none w-10 text-right">
          {formatTime(currentTime)}
        </span>
        
        <div className="flex-1 relative group py-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleProgressChange}
            className="w-full h-1 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-primary-500 hover:accent-primary-400 focus:outline-none transition-all"
            style={{
              background: `linear-gradient(to right, rgb(var(--color-primary-500, 124 58 237)) ${
                duration ? (currentTime / duration) * 100 : 0
              }%, rgb(31 41 55) ${duration ? (currentTime / duration) * 100 : 0}%)`
            }}
          />
        </div>
        
        <span className="text-xs text-surface-400 font-mono select-none w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Volumen y velocidad */}
      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-surface-800/50 pt-3 md:pt-0">
        
        {/* Velocidad */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-surface-300 hover:text-white hover:bg-surface-800 rounded-lg transition-all border border-surface-800"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{playbackRate === 1 ? 'Normal' : `${playbackRate}x`}</span>
          </button>
          
          {showSpeedMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowSpeedMenu(false)}
              />
              <div className="absolute right-0 bottom-full md:bottom-auto md:top-full mb-2 md:mb-0 md:mt-2 z-20 w-24 bg-surface-950 border border-surface-800 rounded-lg shadow-xl py-1 overflow-hidden">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-all ${
                      playbackRate === rate 
                        ? 'text-primary-400 bg-primary-500/10 font-bold' 
                        : 'text-surface-400 hover:text-white hover:bg-surface-900'
                    }`}
                  >
                    {rate === 1 ? '1.0x (Normal)' : `${rate}x`}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* Volumen */}
        <div className="flex items-center gap-2 group/vol">
          <button
            onClick={toggleMute}
            className="p-1.5 text-surface-400 hover:text-white rounded-lg transition-all"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 md:w-20 h-1 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-surface-300 hover:accent-white focus:outline-none transition-all"
            style={{
              background: `linear-gradient(to right, rgb(209 213 219) ${
                (isMuted ? 0 : volume) * 100
              }%, rgb(31 41 55) ${(isMuted ? 0 : volume) * 100}%)`
            }}
          />
        </div>
      </div>
    </div>
  )
}
