import { create } from 'zustand'
import { User } from './userStore'

interface AuthState {
  user: User | null
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user: User) => set({ user }),
  logout: async () => {
    await window.context.auth.logout()
    set({ user: null })
  }
}))