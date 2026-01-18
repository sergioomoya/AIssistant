/**
 * Iconos de proveedores (Google, Microsoft, etc.)
 */

import { cn } from '@/utils/cn'

interface ProviderIconProps {
  provider: 'google' | 'microsoft' | 'outlook' | 'apple' | 'calendar'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
    </svg>
  )
}

export function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  )
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

export function ProviderIcon({ provider, size = 'md', className }: ProviderIconProps) {
  const sizeClass = sizeClasses[size]
  const combinedClassName = cn(sizeClass, className)
  
  switch (provider) {
    case 'google':
      return <GoogleIcon className={cn(combinedClassName, 'text-red-400')} />
    case 'microsoft':
    case 'outlook':
      return <MicrosoftIcon className={cn(combinedClassName, 'text-blue-400')} />
    case 'apple':
      return <AppleIcon className={cn(combinedClassName, 'text-gray-300')} />
    case 'calendar':
      return <CalendarIcon className={cn(combinedClassName, 'text-primary-400')} />
    default:
      return <CalendarIcon className={cn(combinedClassName, 'text-surface-400')} />
  }
}

export function ProviderIconContainer({ 
  provider, 
  children 
}: { 
  provider: 'google' | 'microsoft' | 'outlook' | 'apple' | 'calendar'
  children?: React.ReactNode 
}) {
  const bgClass = {
    'google': 'bg-red-500/20',
    'microsoft': 'bg-blue-500/20',
    'outlook': 'bg-blue-500/20',
    'apple': 'bg-gray-500/20',
    'calendar': 'bg-primary-500/20',
  }[provider] || 'bg-surface-700'
  
  return (
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bgClass)}>
      {children || <ProviderIcon provider={provider} />}
    </div>
  )
}

