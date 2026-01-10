import { useState, useRef, useCallback } from 'react'

interface UseAudioCaptureOptions {
  onAudioChunk: (chunk: ArrayBuffer, isUserAudio: boolean) => void
  sampleRate?: number
  channelCount?: number
  chunkDurationMs?: number
}

interface UseAudioCaptureReturn {
  isCapturing: boolean
  captureMode: 'microphone' | 'system' | 'both' | null
  error: string | null
  startMicrophoneCapture: () => Promise<void>
  startSystemCapture: () => Promise<void>
  startBothCapture: () => Promise<void>
  stopCapture: () => void
  getAudioLevel: () => number
}

/**
 * Hook para captura de audio (Agente Silencioso)
 * 
 * Soporta tres modos:
 * - Micrófono: Solo captura del micrófono del usuario
 * - Sistema: Captura audio del sistema (requiere compartir pantalla)
 * - Ambos: Captura micrófono + sistema combinados
 * 
 * El modo "sistema" usa getDisplayMedia con audio para capturar
 * el sonido de aplicaciones (Zoom, Teams, Meet, etc.)
 */
export function useAudioCapture({
  onAudioChunk,
  sampleRate = 16000,
  channelCount = 1,
  chunkDurationMs = 3000,
}: UseAudioCaptureOptions): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureMode, setCaptureMode] = useState<'microphone' | 'system' | 'both' | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Referencias para el contexto de audio
  const audioContextRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const systemProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const audioLevelRef = useRef(0)
  
  /**
   * Crear procesador de audio para un stream
   */
  const createAudioProcessor = useCallback((
    audioContext: AudioContext,
    stream: MediaStream,
    isUserAudio: boolean
  ): ScriptProcessorNode => {
    const source = audioContext.createMediaStreamSource(stream)
    const bufferSize = Math.floor(sampleRate * chunkDurationMs / 1000)
    const processor = audioContext.createScriptProcessor(bufferSize, channelCount, channelCount)
    
    processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0)
      
      // Calcular nivel de audio
      let sum = 0
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i]
      }
      const level = Math.sqrt(sum / inputData.length)
      
      // Actualizar nivel solo si es mayor (para mostrar el más alto)
      if (level > audioLevelRef.current || isUserAudio) {
        audioLevelRef.current = level
      }
      
      // Solo enviar si hay audio significativo
      if (level > 0.001) {
        // Convertir a Int16 para enviar
        const int16Data = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        
        // Enviar chunk con indicador de origen
        onAudioChunk(int16Data.buffer, isUserAudio)
      }
    }
    
    // Conectar source -> processor -> destination (para que funcione)
    source.connect(processor)
    processor.connect(audioContext.destination)
    
    return processor
  }, [sampleRate, chunkDurationMs, channelCount, onAudioChunk])
  
  /**
   * Iniciar captura solo de micrófono
   */
  const startMicrophoneCapture = useCallback(async () => {
    try {
      setError(null)
      
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate,
          channelCount,
        },
      })
      
      micStreamRef.current = stream
      
      // Crear contexto de audio
      const audioContext = new AudioContext({ sampleRate })
      audioContextRef.current = audioContext
      
      // Crear procesador
      micProcessorRef.current = createAudioProcessor(audioContext, stream, true)
      
      setCaptureMode('microphone')
      setIsCapturing(true)
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al acceder al micrófono'
      setError(message)
      throw err
    }
  }, [sampleRate, channelCount, createAudioProcessor])
  
  /**
   * Iniciar captura de audio del sistema (pantalla compartida)
   */
  const startSystemCapture = useCallback(async () => {
    try {
      setError(null)
      
      // Solicitar compartir pantalla CON audio
      // Nota: El usuario debe seleccionar una pestaña o ventana y marcar "Compartir audio"
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Requerido por algunos navegadores
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as any, // TypeScript no tiene tipos completos para esto
      })
      
      // Verificar que el stream tiene audio
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        // Detener el video ya que no necesitamos
        stream.getVideoTracks().forEach(track => track.stop())
        throw new Error('No se seleccionó audio. Por favor, marca "Compartir audio del sistema" al compartir pantalla.')
      }
      
      // Detener la pista de video ya que solo necesitamos audio
      stream.getVideoTracks().forEach(track => track.stop())
      
      systemStreamRef.current = stream
      
      // Crear contexto de audio
      const audioContext = new AudioContext({ sampleRate })
      audioContextRef.current = audioContext
      
      // Crear procesador (audio del sistema = NO es del usuario)
      systemProcessorRef.current = createAudioProcessor(audioContext, stream, false)
      
      setCaptureMode('system')
      setIsCapturing(true)
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al capturar audio del sistema'
      setError(message)
      throw err
    }
  }, [sampleRate, createAudioProcessor])
  
  /**
   * Iniciar captura de micrófono + sistema simultáneamente
   * Ideal para grabar reuniones donde quieres capturar tu voz Y el audio de los demás
   */
  const startBothCapture = useCallback(async () => {
    try {
      setError(null)
      
      // 1. Solicitar micrófono
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate,
          channelCount,
        },
      })
      
      // 2. Solicitar pantalla con audio
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as any,
      })
      
      // Verificar audio del sistema
      const systemAudioTracks = systemStream.getAudioTracks()
      if (systemAudioTracks.length === 0) {
        micStream.getTracks().forEach(track => track.stop())
        systemStream.getTracks().forEach(track => track.stop())
        throw new Error('No se seleccionó audio del sistema. Marca "Compartir audio del sistema" al compartir.')
      }
      
      // Detener video del sistema
      systemStream.getVideoTracks().forEach(track => track.stop())
      
      micStreamRef.current = micStream
      systemStreamRef.current = systemStream
      
      // Crear contexto de audio
      const audioContext = new AudioContext({ sampleRate })
      audioContextRef.current = audioContext
      
      // Crear procesadores separados
      micProcessorRef.current = createAudioProcessor(audioContext, micStream, true)
      systemProcessorRef.current = createAudioProcessor(audioContext, systemStream, false)
      
      setCaptureMode('both')
      setIsCapturing(true)
      
    } catch (err) {
      // Limpiar si algo falló
      micStreamRef.current?.getTracks().forEach(track => track.stop())
      systemStreamRef.current?.getTracks().forEach(track => track.stop())
      
      const message = err instanceof Error ? err.message : 'Error al iniciar captura combinada'
      setError(message)
      throw err
    }
  }, [sampleRate, channelCount, createAudioProcessor])
  
  /**
   * Detener toda captura de audio
   */
  const stopCapture = useCallback(() => {
    // Detener streams
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
      micStreamRef.current = null
    }
    
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(track => track.stop())
      systemStreamRef.current = null
    }
    
    // Desconectar procesadores
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect()
      micProcessorRef.current = null
    }
    
    if (systemProcessorRef.current) {
      systemProcessorRef.current.disconnect()
      systemProcessorRef.current = null
    }
    
    // Cerrar contexto
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    audioLevelRef.current = 0
    setCaptureMode(null)
    setIsCapturing(false)
  }, [])
  
  const getAudioLevel = useCallback(() => {
    return audioLevelRef.current
  }, [])
  
  return {
    isCapturing,
    captureMode,
    error,
    startMicrophoneCapture,
    startSystemCapture,
    startBothCapture,
    stopCapture,
    getAudioLevel,
  }
}
