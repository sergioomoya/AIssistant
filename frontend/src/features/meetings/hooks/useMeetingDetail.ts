/**
 * Hook para gestionar la lógica del detalle de reunión
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'

export type TabId = 'summary' | 'transcript' | 'actions'

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}

export function useMeetingDetail(meetingId: string | undefined) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  
  // Fetch meeting details
  const { data: meeting, isLoading: isLoadingMeeting } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      const response = await api.get(`/meetings/${meetingId}`)
      return response.data
    },
    enabled: !!meetingId,
  })
  
  // Fetch transcript
  const { data: transcript } = useQuery({
    queryKey: ['transcript', meetingId],
    queryFn: async () => {
      const response = await api.get(`/transcription/${meetingId}`)
      return response.data
    },
    enabled: !!meeting && meeting.status === 'completed',
  })
  
  // Fetch action items
  const { data: actionItems } = useQuery({
    queryKey: ['action-items', meetingId],
    queryFn: async () => {
      const response = await api.get(`/summarization/${meetingId}/action-items`)
      return response.data
    },
    enabled: !!meeting && meeting.status === 'completed',
  })
  
  // Generate summary mutation
  const generateSummary = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/summarization/${meetingId}/generate`, {
        include_action_items: true,
        include_sentiment: true,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] })
      queryClient.invalidateQueries({ queryKey: ['action-items', meetingId] })
      toast.success('Resumen generado correctamente')
    },
    onError: () => {
      toast.error('Error al generar el resumen')
    },
  })
  
  // Chat with AI mutation
  const chatWithAI = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.post(`/summarization/${meetingId}/chat`, {
        message,
        context_type: 'full',
      })
      return response.data
    },
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, { role: 'ai', text: data.response }])
    },
    onError: () => {
      toast.error('Error al comunicarse con la IA')
    },
  })
  
  // Handlers
  const handleSendChat = () => {
    if (!chatMessage.trim()) return
    
    setChatHistory(prev => [...prev, { role: 'user', text: chatMessage }])
    chatWithAI.mutate(chatMessage)
    setChatMessage('')
  }
  
  const handleExport = async (format: 'docx' | 'txt' | 'md') => {
    try {
      const response = await api.post(`/export/${meetingId}`, { format }, { responseType: 'blob' })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `AIssistant_${meeting?.title}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success(`Exportado como ${format.toUpperCase()}`)
    } catch {
      toast.error('Error al exportar')
    }
  }
  
  const handleGoBack = () => navigate(-1)
  
  // Computed
  const isProcessing = meeting?.status === 'processing' || meeting?.status === 'uploading'
  const taskId = meeting?.task_id || meeting?.metadata?.task_id
  const canGenerateSummary = meeting?.status === 'completed' && !meeting?.summary
  
  return {
    // Estado
    meeting,
    transcript,
    actionItems,
    isLoadingMeeting,
    activeTab,
    chatMessage,
    chatHistory,
    
    // Mutaciones
    generateSummary,
    chatWithAI,
    
    // Computed
    isProcessing,
    taskId,
    canGenerateSummary,
    
    // Setters
    setActiveTab,
    setChatMessage,
    
    // Handlers
    handleSendChat,
    handleExport,
    handleGoBack,
  }
}

