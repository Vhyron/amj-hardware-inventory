import { create } from 'zustand'

interface LoadingState {
  loading: boolean
  message: string | null
  timeoutId: number | null
  setLoading: (loading: boolean, message?: string) => void
  waitForLoadingComplete: () => Promise<void>
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  loading: false,
  message: null,
  timeoutId: null,
  setLoading: (loading: boolean, message?: string) => {
    // Clear any existing timeout
    const { timeoutId } = get()
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
    }

    if (loading) {
      // Set loading state with a new timeout
      const newTimeoutId = window.setTimeout(() => {
        set({ loading: false, message: null, timeoutId: null })
      }, 1500)

      set({ loading, message: message || null, timeoutId: newTimeoutId })
    } else {
      // Just clear the loading state without a timeout
      set({ loading, message: message || null, timeoutId: null })
    }
  },
  waitForLoadingComplete: async () => {
    return new Promise((resolve) => {
      const checkLoading = () => {
        const { loading } = get()
        if (!loading) {
          resolve()
        } else {
          setTimeout(checkLoading, 100)
        }
      }
      checkLoading()
    })
  }
}))
