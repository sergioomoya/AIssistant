/**
 * Pantalla de configuración inicial (Onboarding)
 * 
 * Refactorizado: Lógica en useOnboarding hook, pasos en componentes separados
 */

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useOnboarding } from './hooks/useOnboarding'
import { STEPS } from './constants'
import {
  WelcomeStep,
  DeploymentStep,
  ApiKeysStep,
  ModelsStep,
  CompleteStep,
} from './components'

export default function Onboarding() {
  const {
    currentStep,
    totalSteps,
    data,
    showApiKeys,
    hasApiKeys,
    configuredKeysCount,
    progress,
    saveConfig,
    isSaving,
    nextStep,
    prevStep,
    setDeploymentMode,
    setApiKey,
    toggleShowApiKey,
    setWhisperModel,
    setLlmModel,
  } = useOnboarding()

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Progress bar */}
      <ProgressBar progress={progress} />
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <WelcomeStep onNext={nextStep} />
            )}
            
            {currentStep === 1 && (
              <DeploymentStep
                selectedMode={data.deploymentMode}
                onSelectMode={setDeploymentMode}
              />
            )}
            
            {currentStep === 2 && (
              <ApiKeysStep
                deploymentMode={data.deploymentMode}
                apiKeys={data.apiKeys}
                showApiKeys={showApiKeys}
                onSetApiKey={setApiKey}
                onToggleShow={toggleShowApiKey}
                hasAnyKey={hasApiKeys}
              />
            )}
            
            {currentStep === 3 && (
              <ModelsStep
                deploymentMode={data.deploymentMode}
                whisperModel={data.whisperModel}
                llmModel={data.llmModel}
                onSelectWhisper={setWhisperModel}
                onSelectLlm={setLlmModel}
              />
            )}
            
            {currentStep === 4 && (
              <CompleteStep
                data={data}
                configuredKeysCount={configuredKeysCount}
                onComplete={() => saveConfig.mutate()}
                isSaving={isSaving}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Navigation buttons */}
      {currentStep > 0 && currentStep < totalSteps - 1 && (
        <NavigationFooter
          currentStep={currentStep}
          totalSteps={totalSteps}
          onPrev={prevStep}
          onNext={nextStep}
        />
      )}
    </div>
  )
}

// ========== Sub-componentes ==========

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1 bg-surface-800">
      <motion.div
        className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  )
}

interface NavigationFooterProps {
  currentStep: number
  totalSteps: number
  onPrev: () => void
  onNext: () => void
}

function NavigationFooter({ currentStep, totalSteps, onPrev, onNext }: NavigationFooterProps) {
  return (
    <div className="p-6 border-t border-surface-800">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <button onClick={onPrev} className="btn-ghost flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          Atrás
        </button>
        
        <StepIndicator current={currentStep} total={totalSteps} />
        
        <button onClick={onNext} className="btn-primary flex items-center gap-2">
          Siguiente
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            i === current ? "bg-primary-500" : "bg-surface-700"
          )}
        />
      ))}
    </div>
  )
}
