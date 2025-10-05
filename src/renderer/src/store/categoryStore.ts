import { create } from 'zustand'
import { Category } from '../pages/Stocks/types'
import { useLogStore } from './activityLogStore'
import { useAuthStore } from './authStore'
import { generatePrefixedUUID } from '../lib/uuid'

interface CategoryState {
  categories: Category[]
  loading: boolean
  error: string | null | any

  // Basic state setters
  setCategories: (categories: Category[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // API operations that also update state
  fetchCategories: () => Promise<void>
  getCategoryByName: (name: string, excludeId?: string) => Promise<boolean>
  addCategory: (category: Category) => Promise<boolean>
  updateCategory: (category: Category) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  // Basic state setters
  setCategories: (categories) => set({ categories }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch all categories
  fetchCategories: async () => {
    set({ loading: true, error: null })

    try {
      const response = await window.context.categories.getAll()

      if (response.success) {
        set({ categories: response.categories })
      } else {
        set({ error: 'Failed to fetch categories' })
      }
    } catch (error: any) {
      set({ error: error.message || 'Something went wrong, Failed to fetch categories' })
    } finally {
      set({ loading: false })
    }
  },
  
  // Get category by name
  getCategoryByName: async (name: string, excludeId?: string) => {
    try {
      const response = await window.context.categories.getByName(name, excludeId)
      return response
    } catch (error) {
      console.error('Error checking if category name exists:', error)
      return false
    }
  },

  // Add a new category
  addCategory: async (category) => {
    set({ loading: true, error: null })

    try {
      const response = await window.context.categories.add(category)

      if (response.success) {
        const newCategory = {...category, id: response.categoryId || category.id};
        set((state) => ({
          categories: [...state.categories, newCategory]
        }))
        
        // Create activity log after successful category creation
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'create',
            entityType: 'category',
            entityId: newCategory.id,
            details: `Created new category: ${category.name}`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
      } else {
        const errorMsg = response.message || 'Failed to add category'
        set({ error: errorMsg })
      }

      return response.success
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to add category'
      set({ error: errorMsg })
      return false
    } finally {
      set({ loading: false })
    }
  },

  // Update an existing category
  updateCategory: async (category) => {
    set({ loading: true, error: null })

    try {
      const response = await window.context.categories.update(category)

      if (response.success) {
        // Update local state only if backend operation succeeded
        set((state) => ({
          categories: state.categories.map((existingCategory) =>
            existingCategory.id === category.id ? category : existingCategory
          )
        }))
        
        // Create activity log after successful category update
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'update',
            entityType: 'category',
            entityId: category.id,
            details: `Updated category: ${category.name}`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
      } else {
        const errorMsg = response.message || 'Failed to update category'
        set({ error: errorMsg })
      }

      return response.success
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to update category'
      set({ error: errorMsg })
      return false
    } finally {
      set({ loading: false })
    }
  },

  // Delete a category
  deleteCategory: async (id) => {
    set({ loading: true, error: null })

    try {
      // Find category before deletion to include name in log
      const categoryToDelete = get().categories.find(category => category.id === id)
      
      const response = await window.context.categories.delete(id)

      if (response.success) {
        // Remove from local state only if backend operation succeeded
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== id)
        }))
        
        // Create activity log after successful category deletion
        const currentUser = useAuthStore.getState().user
        if (currentUser && categoryToDelete) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'delete',
            entityType: 'category',
            entityId: id,
            details: `Deleted category: ${categoryToDelete.name}`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
      } else {
        set({ error: response.message || 'Failed to delete category' })
      }

      return response.success
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to delete category'
      set({ error: errorMsg })
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
