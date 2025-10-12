import { create } from 'zustand'
import { Transaction, TransactionItem } from '../pages/Transactions/types'
import { useLogStore } from './activityLogStore'
import { useAuthStore } from './authStore'
import { generatePrefixedUUID } from '../lib/uuid'
import { useStockStore } from './stockStore'

interface TransactionState {
  transactions: Transaction[]
  currentTransaction: Transaction | null
  currentItems: TransactionItem[]
  loading: boolean
  error: string | null

  setTransactions: (transactions: Transaction[]) => void
  setCurrentTransaction: (transaction: Transaction | null) => void
  setCurrentItems: (items: TransactionItem[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  fetchTransactions: () => Promise<void>
  fetchTransactionById: (id: string) => Promise<void>
  fetchTransactionItems: (transactionId: string) => Promise<void>
  createTransaction: (transaction: Transaction) => Promise<string | null>
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<boolean>
  deleteTransaction: (id: string) => Promise<boolean>
  addTransactionItem: (item: Omit<TransactionItem, 'id'>) => Promise<string | null>
  updateTransactionItem: (id: string, item: Partial<TransactionItem>) => Promise<boolean>
  deleteTransactionItem: (id: string) => Promise<boolean>
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  currentTransaction: null,
  currentItems: [],
  loading: false,
  error: null,

  setTransactions: (transactions) => set({ transactions }),
  setCurrentTransaction: (transaction) => set({ currentTransaction: transaction }),
  setCurrentItems: (items) => set({ currentItems: items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch all transactions
  fetchTransactions: async () => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.transactions.getAll()
      if (response.success) {
        set({ transactions: response.transactions })
      } else {
        set({ error: 'Failed to fetch transactions' })
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch transactions' })
    } finally {
      set({ loading: false })
    }
  },

  // Fetch transaction by ID
  fetchTransactionById: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.transactions.getById(id)
      if (response.success) {
        set({ currentTransaction: response.transaction })
      } else {
        set({ error: 'Failed to fetch transaction' })
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch transaction' })
    } finally {
      set({ loading: false })
    }
  },

  // Fetch transaction items
  fetchTransactionItems: async (transactionId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.transactions.getItems(transactionId)
      if (response.success) {
        set({ currentItems: response.items })
      } else {
        set({ error: 'Failed to fetch transaction items' })
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch transaction items' })
    } finally {
      set({ loading: false })
    }
  },

  createTransaction: async (transaction: Transaction): Promise<string | null> => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.transactions.create(transaction)
      if (response.success) {
        await get().fetchTransactions()

        // Log creation
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'create',
            entityType: 'transaction',
            entityId: transaction.id,
            details: `Created transaction for ${transaction.customerName || 'N/A'} - Status: ${transaction.status}`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }

        return response.transactionId || null // ✅ always returns string | null
      } else {
        set({ error: response.message || 'Failed to create transaction' })
        return null
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to create transaction' })
      return null // ✅ ensures consistent return type
    } finally {
      set({ loading: false })
    }
  },

  // Update transaction with stock quantity management
  updateTransaction: async (id: string, updates: Partial<Transaction>) => {
    set({ loading: true, error: null })
    try {
      const currentTransaction = get().currentTransaction
      const currentItems = get().currentItems

      // Check if status changed from pending/completed to cancelled
      const statusChanged =
        currentTransaction && updates.status && currentTransaction.status !== updates.status

      const wasCancelled =
        statusChanged &&
        (currentTransaction.status === 'pending' || currentTransaction.status === 'completed') &&
        updates.status === 'cancelled'

      const wasReactivated =
        statusChanged &&
        currentTransaction.status === 'cancelled' &&
        (updates.status === 'pending' || updates.status === 'completed')

      // If transaction is being cancelled, restock items
      if (wasCancelled && currentItems.length > 0) {
        for (const item of currentItems) {
          await window.context.stocks.updateQuantity(item.stockId, item.quantity, 'add')
        }
        // Refresh stocks in store
        await useStockStore.getState().fetchStocks()
      }

      // If transaction is being reactivated from cancelled, deduct stock again
      if (wasReactivated && currentItems.length > 0) {
        for (const item of currentItems) {
          await window.context.stocks.updateQuantity(item.stockId, item.quantity, 'subtract')
        }
        // Refresh stocks in store
        await useStockStore.getState().fetchStocks()
      }

      const response = await window.context.transactions.update(id, updates)

      if (response.success) {
        await get().fetchTransactions()
        await get().fetchTransactionById(id)

        // Create activity log
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          let details = `Updated transaction ${id}`
          if (wasCancelled) {
            details += ' - Status changed to Cancelled (Stock restocked)'
          } else if (wasReactivated) {
            details += ` - Status changed to ${updates.status} (Stock deducted)`
          } else if (updates.status) {
            details += ` - Status: ${updates.status}`
          }

          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'update',
            entityType: 'transaction',
            entityId: id,
            details,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }

        return true
      } else {
        set({ error: response.message || 'Failed to update transaction' })
        return false
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update transaction' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  // Delete transaction
  deleteTransaction: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const currentTransaction = get().currentTransaction
      const currentItems = get().currentItems

      // If transaction is pending or completed, restock items before deletion
      if (
        currentTransaction &&
        (currentTransaction.status === 'pending' || currentTransaction.status === 'completed') &&
        currentItems.length > 0
      ) {
        for (const item of currentItems) {
          await window.context.stocks.updateQuantity(item.stockId, item.quantity, 'add')
        }
        // Refresh stocks in store
        await useStockStore.getState().fetchStocks()
      }

      const response = await window.context.transactions.delete(id)

      if (response.success) {
        await get().fetchTransactions()
        set({ currentTransaction: null, currentItems: [] })

        // Create activity log
        const currentUser = useAuthStore.getState().user
        if (currentUser && currentTransaction) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'delete',
            entityType: 'transaction',
            entityId: id,
            details: `Deleted transaction for ${currentTransaction.customerName || 'N/A'} (Stock restocked)`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }

        return true
      } else {
        set({ error: response.message || 'Failed to delete transaction' })
        return false
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete transaction' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  // Add transaction item with stock deduction
  addTransactionItem: async (item: Omit<TransactionItem, 'id'>) => {
    set({ loading: true, error: null })
    try {
      const itemWithId = {
        ...item,
        id: generatePrefixedUUID('itm')
      }

      const response = await window.context.transactions.addItem(itemWithId)

      if (response.success) {
        // Deduct stock quantity for pending/completed transactions
        const currentTransaction = get().currentTransaction
        if (
          currentTransaction &&
          (currentTransaction.status === 'pending' || currentTransaction.status === 'completed')
        ) {
          await window.context.stocks.updateQuantity(item.stockId, item.quantity, 'subtract')
          // Refresh stocks in store
          await useStockStore.getState().fetchStocks()
        }

        await get().fetchTransactionItems(item.transactionId)
        return itemWithId.id
      } else {
        set({ error: response.message || 'Failed to add item' })
        return null
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to add item' })
      return null
    } finally {
      set({ loading: false })
    }
  },

  // Update transaction item with stock adjustment
  updateTransactionItem: async (id: string, updates: Partial<TransactionItem>) => {
    set({ loading: true, error: null })
    try {
      const currentItems = get().currentItems
      const currentTransaction = get().currentTransaction
      const existingItem = currentItems.find((item) => item.id === id)

      if (!existingItem) {
        set({ error: 'Item not found' })
        return false
      }

      // Only adjust stock for pending/completed transactions
      if (
        currentTransaction &&
        (currentTransaction.status === 'pending' || currentTransaction.status === 'completed')
      ) {
        // If quantity changed, adjust stock
        if (updates.quantity !== undefined && updates.quantity !== existingItem.quantity) {
          const quantityDiff = updates.quantity - existingItem.quantity

          if (quantityDiff > 0) {
            // Increased quantity - deduct more from stock
            await window.context.stocks.updateQuantity(
              existingItem.stockId,
              quantityDiff,
              'subtract'
            )
          } else if (quantityDiff < 0) {
            // Decreased quantity - add back to stock
            await window.context.stocks.updateQuantity(
              existingItem.stockId,
              Math.abs(quantityDiff),
              'add'
            )
          }

          // Refresh stocks in store
          await useStockStore.getState().fetchStocks()
        }
      }

      const response = await window.context.transactions.updateItem(id, updates)

      if (response.success) {
        await get().fetchTransactionItems(existingItem.transactionId)
        return true
      } else {
        set({ error: response.message || 'Failed to update item' })
        return false
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update item' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  // Delete transaction item with stock restoration
  deleteTransactionItem: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const currentItems = get().currentItems
      const currentTransaction = get().currentTransaction
      const itemToDelete = currentItems.find((item) => item.id === id)

      if (!itemToDelete) {
        set({ error: 'Item not found' })
        return false
      }

      const response = await window.context.transactions.deleteItem(id)

      if (response.success) {
        // Add stock back for pending/completed transactions
        if (
          currentTransaction &&
          (currentTransaction.status === 'pending' || currentTransaction.status === 'completed')
        ) {
          await window.context.stocks.updateQuantity(
            itemToDelete.stockId,
            itemToDelete.quantity,
            'add'
          )
          // Refresh stocks in store
          await useStockStore.getState().fetchStocks()
        }

        await get().fetchTransactionItems(itemToDelete.transactionId)
        return true
      } else {
        set({ error: response.message || 'Failed to delete item' })
        return false
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete item' })
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
