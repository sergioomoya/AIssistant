import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api'
import { formatDate, formatDuration, formatTranscriptTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Play,
  Download,
  Share2,
  Calendar,
  Clock,
  Users,
  MessageSquare,
  CheckCircle2,
  FileText,
  TrendingUp,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react'

/**
 * Detalle de una reunión
 */
export default function MeetingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'actions'>('summary')
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  
  // Fetch meeting details
  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      const response = await api.get(`/meetings/${id}`)
      return response.data
    },
  })
  
  // Fetch transcript
  const { data: transcript } = useQuery({
    queryKey: ['transcript', id],
    queryFn: async () => {
      const response = await api.get(`/transcription/${id}`)
      return response.data
    },
    enabled: !!meeting && meeting.status === 'completed',
  })
  
  // Fetch action items
  const { data: actionItems } = useQuery({
    queryKey: ['action-items', id],
    queryFn: async () => {
      const response = await api.get(`/summarization/${id}/action-items`)
      return response.data
    },
    enabled: !!meeting && meeting.status === 'completed',
  })
  
  // Generate summary mutation
  const generateSummary = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/summarization/${id}/generate`, {
        include_action_items: true,
        include_sentiment: true,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', id] })
      queryClient.invalidateQueries({ queryKey: ['action-items', id] })
      toast.success('Resumen generado correctamente')
    },
    onError: () => {
      toast.error('Error al generar el resumen')
    },
  })
  
  // Chat with AI
  const chatWithAI = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.post(`/summarization/${id}/chat`, {
        message,
        context_type: 'full',
      })
      return response.data
    },
    onSuccess: (data) => {
      setChatHistory((prev) => [...prev, { role: 'ai', text: data.response }])
    },
    onError: () => {
      toast.error('Error al comunicarse con la IA')
    },
  })
  
  const handleSendChat = () => {
    if (!chatMessage.trim()) return
    
    setChatHistory((prev) => [...prev, { role: 'user', text: chatMessage }])
    chatWithAI.mutate(chatMessage)
    setChatMessage('')
  }
  
  // Export meeting
  const handleExport = async (format: 'docx' | 'txt' | 'md') => {
    try {
      const response = await api.post(`/export/${id}`, { format }, { responseType: 'blob' })
      
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
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }
  
  if (!meeting) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">Reunión no encontrada</p>
        <Link to="/meetings" className="btn-secondary mt-4">
          Volver a reuniones
        </Link>
      </div>
    )
  }
  
  const sentimentColors = {
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    neutral: 'text-surface-400',
    mixed: 'text-amber-400',
  }
  
  const tabs = [
    { id: 'summary', label: 'Resumen', icon: FileText },
    { id: 'transcript', label: 'Transcripción', icon: MessageSquare },
    { id: 'actions', label: 'Acciones', icon: CheckCircle2 },
  ]
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-display font-bold text-white mb-2">
              {meeting.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-surface-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(meeting.actual_start || meeting.created_at, 'PPp')}
              </span>
              
              {meeting.duration_seconds && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatDuration(meeting.duration_seconds)}
                </span>
              )}
              
              {meeting.sentiment && (
                <span className={cn("flex items-center gap-1.5", sentimentColors[meeting.sentiment as keyof typeof sentimentColors])}>
                  <TrendingUp className="w-4 h-4" />
                  Sentimiento {meeting.sentiment}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Acciones */}
        <div className="flex items-center gap-2">
          {meeting.status === 'completed' && !meeting.summary && (
            <button
              onClick={() => generateSummary.mutate()}
              disabled={generateSummary.isPending}
              className="btn-accent flex items-center gap-2"
            >
              {generateSummary.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              Generar resumen
            </button>
          )}
          
          <div className="relative group">
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-5 h-5" />
              Exportar
            </button>
            
            <div className="absolute right-0 top-full mt-2 w-40 bg-surface-800 border border-surface-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="p-2">
                {['docx', 'txt', 'md'].map((format) => (
                  <button
                    key={format}
                    onClick={() => handleExport(format as 'docx' | 'txt' | 'md')}
                    className="w-full text-left px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-800/50 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary-500 text-white"
                : "text-surface-400 hover:text-white"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel principal */}
        <div className="lg:col-span-2 card">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {meeting.summary ? (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Resumen ejecutivo
                    </h3>
                    <p className="text-surface-300 leading-relaxed">
                      {meeting.summary}
                    </p>
                  </div>
                  
                  {meeting.key_points?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Puntos clave
                      </h3>
                      <ul className="space-y-2">
                        {meeting.key_points.map((point: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-surface-300">
                            <span className="text-primary-400 mt-1">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {meeting.decisions?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Decisiones tomadas
                      </h3>
                      <ul className="space-y-2">
                        {meeting.decisions.map((decision: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-surface-300">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10">
                  <Sparkles className="w-12 h-12 text-surface-500 mx-auto mb-4" />
                  <p className="text-surface-400">
                    {meeting.status === 'completed'
                      ? 'Genera un resumen con IA para ver los puntos clave'
                      : 'El resumen estará disponible cuando la reunión termine'}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'transcript' && (
            <div className="space-y-4">
              {transcript?.segments?.length > 0 ? (
                transcript.segments.map((segment: any, i: number) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-xs text-surface-500 w-12 pt-1">
                      {formatTranscriptTime(segment.start_time)}
                    </span>
                    <div className="flex-1">
                      <span className={cn(
                        "text-xs font-medium",
                        segment.is_user ? "text-primary-400" : "text-accent-400"
                      )}>
                        {segment.speaker_name || (segment.is_user ? 'Tú' : 'Otro')}
                      </span>
                      <p className="text-surface-300">{segment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <MessageSquare className="w-12 h-12 text-surface-500 mx-auto mb-4" />
                  <p className="text-surface-400">
                    La transcripción no está disponible aún
                  </p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'actions' && (
            <div className="space-y-4">
              {actionItems?.length > 0 ? (
                actionItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 bg-surface-800/50 rounded-xl"
                  >
                    <input
                      type="checkbox"
                      checked={item.status === 'completed'}
                      className="mt-1 rounded border-surface-600 bg-surface-700 text-primary-500"
                      readOnly
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-surface-400 mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
                        {item.assignee_name && (
                          <span>Asignado: {item.assignee_name}</span>
                        )}
                        {item.due_date && (
                          <span>Fecha: {item.due_date}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-12 h-12 text-surface-500 mx-auto mb-4" />
                  <p className="text-surface-400">
                    No hay elementos de acción identificados
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Chat con IA */}
        <div className="card flex flex-col h-[500px]">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-400" />
            Chat con IA
          </h3>
          
          {/* Historial de chat */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-surface-500">
                  Pregunta lo que quieras sobre esta reunión
                </p>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-xl max-w-[90%]",
                    msg.role === 'user'
                      ? "bg-primary-500/20 ml-auto"
                      : "bg-surface-800"
                  )}
                >
                  <p className="text-sm text-surface-200">{msg.text}</p>
                </div>
              ))
            )}
            
            {chatWithAI.isPending && (
              <div className="flex items-center gap-2 text-surface-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            )}
          </div>
          
          {/* Input de chat */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Pregunta sobre la reunión..."
              className="input flex-1"
              disabled={chatWithAI.isPending || meeting.status !== 'completed'}
            />
            <button
              onClick={handleSendChat}
              disabled={chatWithAI.isPending || !chatMessage.trim()}
              className="btn-primary p-2.5"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

