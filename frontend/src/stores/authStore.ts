import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  fullName: string
  deploymentMode: 'local' | 'hybrid' | 'cloud'
  onboardingCompleted?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  
  // Acciones
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  completeOnboarding: () => void
  setNeedsOnboarding: (needs: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      needsOnboarding: true,
      
      login: (user, token) => set({
        user,
        token,
        isAuthenticated: true,
        // Si el usuario ya completó onboarding, no mostrarlo
        needsOnboarding: !user.onboardingCompleted,
      }),
      
      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
        needsOnboarding: true,
      }),
      
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null,
      })),
      
      completeOnboarding: () => set((state) => ({
        needsOnboarding: false,
        user: state.user ? { ...state.user, onboardingCompleted: true } : null,
      })),
      
      setNeedsOnboarding: (needs) => set({
        needsOnboarding: needs,
      }),
    }),
    {
      name: 'aissistant-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        needsOnboarding: state.needsOnboarding,
      }),
    }
  )
)
