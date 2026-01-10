/**
 * Detalle de una reunión
 * 
 * Refactorizado: Lógica en useMeetingDetail, UI en componentes separados
 */

import { useParams, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import TaskProgress from '@/components/tasks/TaskProgress'
import { useMeetingDetail } from './hooks/useMeetingDetail'
import {
  MeetingHeader,
  MeetingTabs,
  SummaryTab,
  TranscriptTab,
  ActionsTab,
  AIChatPanel,
} from './components'

export default function MeetingDetail() {
  const { id } = useParams()
  
  const {
    meeting,
    transcript,
    actionItems,
    isLoadingMeeting,
    activeTab,
    chatMessage,
    chatHistory,
    generateSummary,
    chatWithAI,
    isProcessing,
    taskId,
    canGenerateSummary,
    setActiveTab,
    setChatMessage,
    handleSendChat,
    handleExport,
    handleGoBack,
  } = useMeetingDetail(id)

  if (isLoadingMeeting) {
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

  return (
    <div className="space-y-6">
      {/* Progreso de tarea */}
      {isProcessing && taskId && (
        <TaskProgress taskId={taskId} />
      )}
      
      {/* Header */}
      <MeetingHeader
        meeting={meeting}
        onBack={handleGoBack}
        onExport={handleExport}
        onGenerateSummary={() => generateSummary.mutate()}
        isGenerating={generateSummary.isPending}
        canGenerateSummary={canGenerateSummary}
      />
      
      {/* Tabs */}
      <MeetingTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel principal */}
        <div className="lg:col-span-2 card">
          {activeTab === 'summary' && (
            <SummaryTab meeting={meeting} />
          )}
          
          {activeTab === 'transcript' && (
            <TranscriptTab transcript={transcript} />
          )}
          
          {activeTab === 'actions' && (
            <ActionsTab actionItems={actionItems} />
          )}
        </div>
        
        {/* Chat con IA */}
        <AIChatPanel
          chatHistory={chatHistory}
          chatMessage={chatMessage}
          onMessageChange={setChatMessage}
          onSend={handleSendChat}
          isPending={chatWithAI.isPending}
          isDisabled={meeting.status !== 'completed'}
        />
      </div>
    </div>
  )
}
