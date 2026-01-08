import { useState, useRef, useCallback } from 'react'

interface UseAudioCaptureOptions {
  onAudioChunk: (chunk: ArrayBuffer) => void
  sampleRate?: number
  channelCount?: number
  chunkDurationMs?: number
}

interface UseAudioCaptureReturn {
  isCapturing: boolean
  error: string | null
  startCapture: () => Promise<void>
  stopCapture: () => void
  getAudioLevel: () => number
}

/**
 * Hook para captura de audio del sistema (Agente Silencioso)
 * 
 * Captura tanto el micrófono como el audio del sistema
 */
export function useAudioCapture({
  onAudioChunk,
  sampleRate = 16000,
  channelCount = 1,
  chunkDurationMs = 3000,
}: UseAudioCaptureOptions): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioLevelRef = useRef(0)
  
  const startCapture = useCallback(async () => {
    try {
      setError(null)
      
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate,
          channelCount,
        },
      })
      
      streamRef.current = stream
      
      // Crear contexto de audio
      const audioContext = new AudioContext({ sampleRate })
      audioContextRef.current = audioContext
      
      // Crear analizador para nivel de audio
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      
      // Crear fuente desde el stream
      const source = audioContext.createMediaStreamSource(stream)
      
      // Crear procesador para capturar chunks
      const bufferSize = Math.floor(sampleRate * chunkDurationMs / 1000)
      const processor = audioContext.createScriptProcessor(bufferSize, channelCount, channelCount)
      processorRef.current = processor
      
      // Procesar audio
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)
        
        // Calcular nivel de audio
        let sum = 0
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i]
        }
        audioLevelRef.current = Math.sqrt(sum / inputData.length)
        
        // Convertir a Int16 para enviar
        const int16Data = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        
        // Enviar chunk
        onAudioChunk(int16Data.buffer)
      }
      
      // Conectar nodos
      source.connect(analyser)
      analyser.connect(processor)
      processor.connect(audioContext.destination)
      
      setIsCapturing(true)
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al acceder al micrófono'
      setError(message)
      throw err
    }
  }, [sampleRate, channelCount, chunkDurationMs, onAudioChunk])
  
  const stopCapture = useCallback(() => {
    // Detener stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // Desconectar procesador
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    
    // Cerrar contexto
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    analyserRef.current = null
    audioLevelRef.current = 0
    setIsCapturing(false)
  }, [])
  
  const getAudioLevel = useCallback(() => {
    return audioLevelRef.current
  }, [])
  
  return {
    isCapturing,
    error,
    startCapture,
    stopCapture,
    getAudioLevel,
  }
}

