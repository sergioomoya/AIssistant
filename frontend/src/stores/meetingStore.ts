import { create } from 'zustand'

export interface TranscriptSegment {
  id: string
  text: string
  startTime: number
  endTime: number
  speaker: string
  isUser: boolean
  confidence: number
}

interface MeetingState {
  // Estado de la reunión en vivo
  isRecording: boolean
  isPaused: boolean
  currentMeetingId: number | null
  elapsedTime: number
  
  // Transcripción en tiempo real
  liveTranscript: TranscriptSegment[]
  partialText: string
  
  // Audio
  audioLevel: number
  
  // Acciones
  startRecording: (meetingId: number) => void
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  
  addTranscriptSegment: (segment: TranscriptSegment) => void
  setPartialText: (text: string) => void
  setAudioLevel: (level: number) => void
  updateElapsedTime: (time: number) => void
  
  resetMeeting: () => void
}

export const useMeetingStore = create<MeetingState>((set) => ({
  isRecording: false,
  isPaused: false,
  currentMeetingId: null,
  elapsedTime: 0,
  liveTranscript: [],
  partialText: '',
  audioLevel: 0,
  
  startRecording: (meetingId) => set({
    isRecording: true,
    isPaused: false,
    currentMeetingId: meetingId,
    elapsedTime: 0,
    liveTranscript: [],
    partialText: '',
  }),
  
  stopRecording: () => set({
    isRecording: false,
    isPaused: false,
  }),
  
  pauseRecording: () => set({
    isPaused: true,
  }),
  
  resumeRecording: () => set({
    isPaused: false,
  }),
  
  addTranscriptSegment: (segment) => set((state) => ({
    liveTranscript: [...state.liveTranscript, segment],
    partialText: '',
  })),
  
  setPartialText: (text) => set({
    partialText: text,
  }),
  
  setAudioLevel: (level) => set({
    audioLevel: level,
  }),
  
  updateElapsedTime: (time) => set({
    elapsedTime: time,
  }),
  
  resetMeeting: () => set({
    isRecording: false,
    isPaused: false,
    currentMeetingId: null,
    elapsedTime: 0,
    liveTranscript: [],
    partialText: '',
    audioLevel: 0,
  }),
}))

