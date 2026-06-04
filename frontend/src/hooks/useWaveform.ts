import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'

interface UseWaveformOptions {
  audioUrl?: string
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  onFinish?: () => void
}

/**
 * Hook para usar WaveSurfer.js para visualización de audio
 */
export function useWaveform(options: UseWaveformOptions = {}) {
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!waveformRef.current) return

    // Crear instancia de WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4f46e5',
      progressColor: '#818cf8',
      cursorColor: '#a5b4fc',
      barWidth: 2,
      barRadius: 3,
      height: 100,
      normalize: true,
      backend: 'WebAudio',
    })

    wavesurferRef.current = wavesurfer

    // Event listeners
    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration())
      setIsReady(true)
      options.onReady?.()
    })

    wavesurfer.on('play', () => {
      setIsPlaying(true)
      options.onPlay?.()
    })

    wavesurfer.on('pause', () => {
      setIsPlaying(false)
      options.onPause?.()
    })

    wavesurfer.on('finish', () => {
      setIsPlaying(false)
      options.onFinish?.()
    })

    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(time)
    })

    // Cargar audio si hay URL
    if (options.audioUrl) {
      wavesurfer.load(options.audioUrl)
    }

    // Cleanup
    return () => {
      wavesurfer.destroy()
    }
  }, [])

  // Cargar nuevo audio cuando cambie la URL
  useEffect(() => {
    if (wavesurferRef.current && options.audioUrl) {
      wavesurferRef.current.load(options.audioUrl)
    }
  }, [options.audioUrl])

  const play = () => {
    wavesurferRef.current?.play()
  }

  const pause = () => {
    wavesurferRef.current?.pause()
  }

  const stop = () => {
    wavesurferRef.current?.stop()
  }

  const seekTo = (time: number) => {
    wavesurferRef.current?.seekTo(time / duration)
  }

  const setVolume = (volume: number) => {
    wavesurferRef.current?.setVolume(volume)
  }

  return {
    waveformRef,
    isPlaying,
    duration,
    currentTime,
    isReady,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
  }
}

