import { create } from 'zustand'
import { ActivityLog } from '../lib/types'

interface ActivityLogState {
  logs: ActivityLog[]
  loading: boolean
  error: string | null | any

  setLogs: (logs: ActivityLog[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  fetchLogs: () => Promise<void>
  createLog: (log: ActivityLog) => Promise<boolean>
}

export const useLogStore = create<ActivityLogState>((set) => ({
  logs: [],
  loading: false,
  error: null,

  setLogs: (logs) => set({ logs }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchLogs: async () => {
    set({ loading: true, error: null })
    try {
      const res = await window.context.log.getAll()

      if (!res.success) {
        set({ error: res.message || 'Failed to fetch activity logs' })
        return
      }

      // The logs now contain entityDetails from the backend
      set({ logs: res.logs || [] })
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
      set({ error: 'Failed to fetch activity logs' })
    } finally {
      set({ loading: false })
    }
  },

  createLog: async (log) => {
    set({ loading: true, error: null })
    try {
      const res = await window.context.log.create(log)

      if (!res.success) {
        set({ error: res.message || 'Failed to create activity log' })
        return false
      }

      set((state) => ({ logs: [log, ...state.logs] }))
      return true
    } catch (error) {
      console.error('Failed to create new log:', error)
      set({ error: 'Failed to create new log' })
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
