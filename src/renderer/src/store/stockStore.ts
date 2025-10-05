import { create } from 'zustand'
import { Stock } from '../pages/Stocks/types'
import { useLogStore } from './activityLogStore'
import { useAuthStore } from './authStore'
import { generatePrefixedUUID } from '../lib/uuid'

interface StockState {
  stocks: Stock[]
  loading: boolean
  error: string | null | any

  // Basic state setters
  setStocks: (stocks: Stock[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // API operations that also update state
  fetchStocks: () => Promise<void>
  addStock: (stock: Stock) => Promise<boolean>
  updateStock: (stock: Stock) => Promise<boolean>
  deleteStock: (id: string) => Promise<boolean>
}

export const useStockStore = create<StockState>((set, get) => ({
  stocks: [],
  loading: false,
  error: null,

  // Basic state setters
  setStocks: (stocks) => set({ stocks }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch all stocks
  fetchStocks: async () => {
    set({ loading: true, error: null })

    try {
      const response = await window.context.stocks.getAll()

      if (response.success) {
        set({ stocks: response.stocks })
      } else {
        set({ error: 'Failed to fetch stocks' })
      }
    } catch (error: any) {
      set({ error: error.message || 'Something went wrong, Failed to fetch stocks' })
    } finally {
      set({ loading: false })
    }
  },

  // Add a new stock
  addStock: async (stock) => {
    set({ loading: true, error: null })

    try {
      const response = await window.context.stocks.add(stock)

      if (response.success) {
        set((state) => ({
          stocks: [...state.stocks, stock]
        }))
        
        // Create activity log after successful stock addition
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'create',
            entityType: 'stock',
            entityId: stock.id,
            details: `Added new stock: ${stock.name} (${stock.quantity} ${stock.unit})`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
      } else {
        const errorMsg = response.message || 'Failed to add stock'
        set({ error: errorMsg })
      }

      return response.success
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to add stock'
      set({ error: errorMsg })
      return false
    } finally {
      set({ loading: false })
    }
  },

  // Update an existing stock
  updateStock: async (stock) => {
    set({ loading: true, error: null })

    try {
      const response = await window.context.stocks.update(stock)

      if (response.success) {
        // Update local state only if backend operation succeeded
        set((state) => ({
          stocks: state.stocks.map((existingStock) =>
            existingStock.id === stock.id ? stock : existingStock
          )
        }))
        
        // Create activity log after successful stock update
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'update',
            entityType: 'stock',
            entityId: stock.id,
            details: `Updated stock: ${stock.name} (Quantity: ${stock.quantity} ${stock.unit})`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
      } else {
        const errorMsg = response.message || 'Failed to update stock'
        set({ error: errorMsg })
      }

      return response.success
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to update stock'
      set({ error: errorMsg })
      return false
    } finally {
      set({ loading: false })
    }
  },

  // Delete a stock
  deleteStock: async (id) => {
    set({ loading: true, error: null })

    try {
      // Find stock before deletion to include name in log
      const stockToDelete = get().stocks.find(stock => stock.id === id)
      
      const response = await window.context.stocks.delete(id)

      if (response.success) {
        // Remove from local state only if backend operation succeeded
        set((state) => ({
          stocks: state.stocks.filter((stock) => stock.id !== id)
        }))
        
        // Create activity log after successful stock deletion
        const currentUser = useAuthStore.getState().user
        if (currentUser && stockToDelete) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'delete',
            entityType: 'stock',
            entityId: id,
            details: `Deleted stock: ${stockToDelete.name}`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
      } else {
        set({ error: response.message || 'Failed to delete stock' })
      }

      return response.success
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to delete stock'
      set({ error: errorMsg })
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
