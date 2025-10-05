import { create } from 'zustand'
import { useLogStore } from './activityLogStore'
import { useAuthStore } from './authStore'
import { generatePrefixedUUID } from '../lib/uuid'

export interface User {
  id: string
  name: string
  username: string
  role: string
  permissions: string[]
  profile_image?: string
}

interface UserState {
  users: User[]
  loading: boolean
  error: string | null | any

  setUsers: (users: User[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  fetchUsers: () => Promise<void>
  addUser: (userData: Omit<User, 'id'>) => Promise<boolean>
  updateUser: (id: string, userData: User) => Promise<boolean>
  deleteUser: (userId: string) => Promise<boolean>
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  setUsers: (users) => set({ users }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchUsers: async () => {
    set({ loading: true, error: null })
    try {
      const users = await window.context.users.getAll()
      set({ users })
    } catch (error) {
      console.error('Failed to fetch users:', error)
      set({ error: 'Failed to fetch users' })
    } finally {
      set({ loading: false })
    }
  },
  addUser: async (userData: Omit<User, 'id'>) => {
    set({ loading: true })
    try {
      const response = await window.context.users.add(userData)
      if (response.success) {
        set((state) => ({ users: [...state.users, { ...userData, id: response.userId! }] }))
        
        // Create activity log after successful user creation
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'create',
            entityType: 'user',
            entityId: response.userId!,
            details: `Created new user: ${userData.username} (${userData.role})`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
        
        return true
      } else {
        set({ error: response.message })
        return false
      }
    } catch (error) {
      set({ error: 'Failed to add user' })
      console.log("Error:", error)
      return false
    } finally {
      set({ loading: false })
    }
  },
  updateUser: async (id: string, userData: User) => {
    set({ loading: true })
    try {
      const response = await window.context.users.update(id, userData)
      if (response) {
        set((state) => ({
          users: state.users.map((user) => (user.id === id ? userData : user))
        }))
        
        // Create activity log after successful user update
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'update',
            entityType: 'user',
            entityId: id,
            details: `Updated user: ${userData.username} (${userData.role})`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
        
        return true
      } else {
        set({ error: "Failed to update user" })
        return false
      }
    } catch (error) {
      set({ error: 'Failed to update user' })
      console.log("Error:", error)
      return false
    } finally {
      set({ loading: false })
    }
  },
  deleteUser: async (userId: string) => {
    set({ loading: true })
    try {
      // Find user before deletion to include username in log
      const userToDelete = get().users.find(user => user.id === userId)
      
      const response = await window.context.users.delete(userId)
      if (response) {
        set((state) => ({
          users: state.users.filter((user) => user.id !== userId)
        }))
        
        // Create activity log after successful user deletion
        const currentUser = useAuthStore.getState().user
        if (currentUser && userToDelete) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'delete',
            entityType: 'user',
            entityId: userId,
            details: `Deleted user: ${userToDelete.username} (${userToDelete.role})`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
        
        return true
      } else {
        set({ error: "Failed to delete user" })
        return false
      }
    } catch (error) {
      set({ error: 'Failed to delete user' })
      console.log("Error:", error)
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
