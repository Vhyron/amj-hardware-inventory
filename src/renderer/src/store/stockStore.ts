import { create } from 'zustand'
import { Stock, StockStatus } from '../pages/Stocks/types'
import { useLogStore } from './activityLogStore'
import { useAuthStore } from './authStore'
import { generatePrefixedUUID } from '../lib/uuid'

export const determineStatus = (quantity: number, reorderPoint?: number): StockStatus => {
  if (quantity <= 0) return 'Out of Stock'
  if (typeof reorderPoint === 'number' && quantity <= reorderPoint) {
    return 'Critical Low'
  }
  return 'In Stock'
}

interface StockState {
  stocks: Stock[]
  archivedStocks: Stock[]
  loading: boolean
  activeLoading: boolean
  archivedLoading: boolean
  error: string | null | any

  // Basic state setters
  setStocks: (stocks: Stock[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // API operations that also update state
  fetchStocks: () => Promise<void>
  fetchActiveStocks: () => Promise<void>
  fetchArchivedStocks: () => Promise<void>
  addStock: (stock: Stock) => Promise<boolean>
  updateStock: (stock: Stock) => Promise<boolean>
  deleteStock: (id: string) => Promise<boolean>
  archiveStock: (id: string) => Promise<boolean>
  restoreStock: (id: string) => Promise<boolean>
}

export const useStockStore = create<StockState>((set, get) => ({
  stocks: [],
  archivedStocks: [],
  loading: false,
  activeLoading: false,
  archivedLoading: false,
  error: null,

  // Basic state setters
  setStocks: (stocks) => set({ stocks }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch active stocks
  fetchStocks: async () => {
    await get().fetchActiveStocks()
  },

  fetchActiveStocks: async () => {
    set({ activeLoading: true, error: null })

    try {
      const response = await (window.context.stocks.getActive
        ? window.context.stocks.getActive()
        : window.context.stocks.getAll())

      if (response.success) {
        set({ stocks: response.stocks })
      } else {
        set({ error: 'Failed to fetch stocks' })
      }
    } catch (error: any) {
      set({ error: error.message || 'Something went wrong, Failed to fetch stocks' })
    } finally {
      set({ activeLoading: false })
    }
  },

  fetchArchivedStocks: async () => {
    set({ archivedLoading: true, error: null })

    try {
      if (!window.context.stocks.getArchived) {
        set({ archivedStocks: [] })
        set({ archivedLoading: false })
        return
      }

      const response = await window.context.stocks.getArchived()

      if (response.success) {
        set({ archivedStocks: response.stocks })
      } else {
        set({ error: 'Failed to fetch archived stocks' })
      }
    } catch (error: any) {
      set({ error: error.message || 'Something went wrong, Failed to fetch archived stocks' })
    } finally {
      set({ archivedLoading: false })
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
  },

  archiveStock: async (id) => {
    set({ loading: true, error: null })

    const stockToArchive = get().stocks.find((stock) => stock.id === id)

    try {
      if (!window.context.stocks.archive) {
        set({ error: 'Archive action unavailable' })
        return false
      }

      const response = await window.context.stocks.archive(id)

      if (!response.success) {
        set({ error: response.message || 'Failed to archive stock' })
        return false
      }

      set((state) => ({
        stocks: state.stocks.filter((stock) => stock.id !== id)
      }))

      await get().fetchArchivedStocks()

      const currentUser = useAuthStore.getState().user
      if (currentUser && stockToArchive) {
        const logEntry = {
          id: generatePrefixedUUID('log'),
          userId: currentUser.id,
          username: currentUser.username,
          action: 'update',
          entityType: 'stock',
          entityId: id,
          details: `Archived stock: ${stockToArchive.name} (${stockToArchive.sku})`,
          timestamp: new Date().toISOString()
        }
        useLogStore.getState().createLog(logEntry)
      }

      return true
    } catch (error: any) {
      set({ error: error.message || 'Failed to archive stock' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  restoreStock: async (id) => {
    set({ loading: true, error: null })

    const stockToRestore = get().archivedStocks.find((stock) => stock.id === id)

    if (!stockToRestore) {
      set({ error: 'Stock not found in archived list' })
      set({ loading: false })
      return false
    }

    const nextStatus = determineStatus(stockToRestore.quantity, stockToRestore.reorderPoint)

    try {
      if (!window.context.stocks.restore) {
        set({ error: 'Restore action unavailable' })
        return false
      }

      const response = await window.context.stocks.restore(id, nextStatus)

      if (!response.success) {
        set({ error: response.message || 'Failed to restore stock' })
        return false
      }

      set((state) => ({
        archivedStocks: state.archivedStocks.filter((stock) => stock.id !== id),
        stocks: [...state.stocks, { ...stockToRestore, status: nextStatus }]
      }))

      const currentUser = useAuthStore.getState().user
      if (currentUser) {
        const logEntry = {
          id: generatePrefixedUUID('log'),
          userId: currentUser.id,
          username: currentUser.username,
          action: 'update',
          entityType: 'stock',
          entityId: id,
          details: `Restored stock: ${stockToRestore.name} (${nextStatus})`,
          timestamp: new Date().toISOString()
        }
        useLogStore.getState().createLog(logEntry)
      }

      return true
    } catch (error: any) {
      set({ error: error.message || 'Failed to restore stock' })
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
