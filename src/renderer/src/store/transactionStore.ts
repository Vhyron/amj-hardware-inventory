import { create } from 'zustand'
import { Transaction, TransactionItem } from '../pages/Transactions/types'
import { devtools } from 'zustand/middleware'
import { useStockStore } from './stockStore'
import { StockStatus } from '../pages/Stocks/types'
import { useLogStore } from './activityLogStore'
import { useAuthStore } from './authStore'
import { generatePrefixedUUID } from '../lib/uuid'

interface TransactionStore {
  transactions: Transaction[]
  currentTransaction: Transaction | null
  currentItems: TransactionItem[]
  loading: boolean
  error: string | null | any

  // State setters
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  fetchTransactions: () => Promise<void>
  fetchTransactionById: (id: string) => Promise<Transaction | null>
  fetchTransactionItems: (transactionId: string) => Promise<TransactionItem[]>
  createTransaction: (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string | null>
  addTransactionItem: (
    item: Omit<TransactionItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string | null>
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<boolean>
  updateTransactionItem: (id: string, item: Partial<TransactionItem>) => Promise<boolean>
  deleteTransaction: (id: string) => Promise<boolean>
  deleteTransactionItem: (id: string) => Promise<boolean>

  // New method for updating stock quantities
  updateStockQuantities: (
    transactionId: string,
    oldStatus?: string,
    newStatus?: string
  ) => Promise<boolean>
}

export const useTransactionStore = create<TransactionStore>()(
  devtools((set, get) => ({
    transactions: [],
    currentTransaction: null,
    currentItems: [],
    loading: false,
    error: null,

    // State setters
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    fetchTransactions: async () => {
      set({ loading: true, error: null })
      try {
        const response = await window.context.transactions.getAll()
        if (response.success && response.transactions) {
          set({ transactions: response.transactions })
        } else {
          set({ error: response.message || 'Failed to fetch transactions' })
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        set({ error: 'Failed to fetch transactions' })
      } finally {
        set({ loading: false })
      }
    },

    fetchTransactionById: async (id: string) => {
      set({ loading: true, error: null })
      try {
        const response = await window.context.transactions.getById(id)
        if (response.success && response.transaction) {
          set({ currentTransaction: response.transaction })
          return response.transaction
        } else {
          set({ error: response.message || 'Failed to fetch transaction' })
          return null
        }
      } catch (error) {
        console.error('Failed to fetch transaction:', error)
        set({ error: 'Failed to fetch transaction' })
        return null
      } finally {
        set({ loading: false })
      }
    },

    fetchTransactionItems: async (transactionId: string) => {
      set({ loading: true, error: null })
      try {
        const response = await window.context.transactions.getItems(transactionId)
        if (response.success && response.items) {
          set({ currentItems: response.items })
          return response.items
        } else {
          set({ error: response.message || 'Failed to fetch transaction items' })
          return []
        }
      } catch (error) {
        console.error('Failed to fetch transaction items:', error)
        set({ error: 'Failed to fetch transaction items' })
        return []
      } finally {
        set({ loading: false })
      }
    },

    createTransaction: async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      set({ loading: true, error: null })
      try {
        const response = await window.context.transactions.create(transaction)
        if (response.success && response.transactionId) {
          // Add the new transaction to the list with timestamps
          const newTransaction = {
            ...transaction,
            id: response.transactionId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Transaction

          set((state) => ({
            transactions: [newTransaction, ...state.transactions]
          }))

          // Create activity log after successful transaction creation
          const currentUser = useAuthStore.getState().user
          if (currentUser) {
            const logEntry = {
              id: generatePrefixedUUID('log'),
              userId: currentUser.id,
              username: currentUser.username,
              action: 'create',
              entityType: 'transaction',
              entityId: response.transactionId,
              details: `Created new transaction: ${response.transactionId}`,
              timestamp: new Date().toISOString()
            }
            useLogStore.getState().createLog(logEntry)
          }

          return response.transactionId
        } else {
          set({ error: response.message || 'Failed to create transaction' })
          return null
        }
      } catch (error) {
        console.error('Failed to create transaction:', error)
        set({ error: 'Failed to create transaction' })
        return null
      } finally {
        set({ loading: false })
      }
    },

    addTransactionItem: async (item: Omit<TransactionItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      set({ loading: true, error: null })
      try {
        const response = await window.context.transactions.addItem(item)
        if (response.success && response.itemId) {
          // Find the stock to get the name
          const stockResponse = window.context.stocks
            ? await window.context.stocks.getById(item.stockId)
            : null
          const stockName = stockResponse?.stock?.name || 'Unknown Item'

          // Add the new item to the items list with timestamps and stock name
          const newItem = {
            ...item,
            id: response.itemId,
            stockName: stockName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as TransactionItem

          set((state) => ({
            currentItems: [...state.currentItems, newItem]
          }))

          // Update transaction total amount if we have a current transaction
          if (get().currentTransaction && item.transactionId === get().currentTransaction!.id) {
            const currentTotal = get().currentTransaction?.totalAmount || 0
            const itemTotal = item.quantity * item.unitPrice
            await get().updateTransaction(item.transactionId, {
              totalAmount: currentTotal + itemTotal
            })
          }

          // ALWAYS deduct stock immediately when adding item (regardless of status)
          const currentTransaction = get().currentTransaction
          if (currentTransaction?.status !== 'cancelled') {
            const { stocks, updateStock, fetchStocks } = useStockStore.getState()
            const stockToUpdate = stocks.find((s) => s.id === item.stockId)

            if (stockToUpdate) {
              const newQuantity = Math.max(0, stockToUpdate.quantity - item.quantity)
              let newStatus: StockStatus = 'In Stock'

              if (newQuantity <= 0) {
                newStatus = 'Out of Stock'
              } else if (newQuantity <= (stockToUpdate.reorderPoint || 0)) {
                newStatus = 'Critical Low'
              }

              await updateStock({
                ...stockToUpdate,
                quantity: newQuantity,
                status: newStatus
              })

              // Refresh stocks to get updated data
              await fetchStocks()
            }
          }

          return response.itemId
        } else {
          set({ error: response.message || 'Failed to add transaction item' })
          return null
        }
      } catch (error) {
        console.error('Failed to add transaction item:', error)
        set({ error: 'Failed to add transaction item' })
        return null
      } finally {
        set({ loading: false })
      }
    },

    updateStockQuantities: async (
      transactionId: string,
      oldStatus?: string,
      newStatus?: string
    ) => {
      try {
        // Fetch transaction items
        const items = get().currentItems
        if (items.length === 0) {
          return true // No items to process
        }

        // Stock update logic based on status transitions:
        // - Pending/Completed → Cancelled: Restore stock (+)
        // - Cancelled → Pending/Completed: Deduct stock (-)
        // - Completed cannot be changed to anything else (locked state)

        let multiplier = 0

        // From pending to cancelled: restore stock
        if (oldStatus === 'pending' && newStatus === 'cancelled') {
          multiplier = 1
        }
        // From cancelled to pending: deduct stock
        else if (oldStatus === 'cancelled' && newStatus === 'pending') {
          multiplier = -1
        }
        // From pending to completed: no change (already deducted)
        else if (oldStatus === 'pending' && newStatus === 'completed') {
          multiplier = 0
        }
        // From cancelled to completed: deduct stock
        else if (oldStatus === 'cancelled' && newStatus === 'completed') {
          multiplier = -1
        }

        // Update stock quantities if there's a change
        if (multiplier !== 0) {
          const { stocks, updateStock, fetchStocks } = useStockStore.getState()

          for (const item of items) {
            const stockToUpdate = stocks.find((s) => s.id === item.stockId)

            if (stockToUpdate) {
              const newQuantity = Math.max(0, stockToUpdate.quantity + item.quantity * multiplier)
              let newStatus: StockStatus = 'In Stock'

              if (newQuantity <= 0) {
                newStatus = 'Out of Stock'
              } else if (newQuantity <= (stockToUpdate.reorderPoint || 0)) {
                newStatus = 'Critical Low'
              }

              await updateStock({
                ...stockToUpdate,
                quantity: newQuantity,
                status: newStatus
              })
            }
          }

          // Refresh stocks to get updated data
          await fetchStocks()
        }

        return true
      } catch (error) {
        console.error('Error updating stock quantities:', error)
        return false
      }
    },

    updateTransaction: async (id: string, transaction: Partial<Transaction>) => {
      set({ loading: true, error: null })
      try {
        const currentTx = get().currentTransaction
        const oldStatus = currentTx?.status
        const newStatus = transaction.status

        // Prevent changes if current status is 'completed'
        if (oldStatus === 'completed' && newStatus && newStatus !== 'completed') {
          set({ error: 'Cannot modify a completed transaction. Completed transactions are final.' })
          return false
        }

        const response = await window.context.transactions.update(id, transaction)
        if (response.success) {
          // Handle stock quantity updates based on status change
          if (oldStatus !== newStatus && newStatus) {
            await get().updateStockQuantities(id, oldStatus, newStatus)
          }

          // Get transaction details for logging
          const existingTransaction =
            get().transactions.find((t) => t.id === id) || get().currentTransaction
          const updatedTransaction = { ...existingTransaction, ...transaction }

          // Update the transaction in the list and current transaction
          set((state) => ({
            transactions: state.transactions.map((t) =>
              t.id === id ? { ...t, ...transaction, updatedAt: new Date().toISOString() } : t
            ),
            currentTransaction:
              state.currentTransaction?.id === id
                ? {
                    ...state.currentTransaction,
                    ...transaction,
                    updatedAt: new Date().toISOString()
                  }
                : state.currentTransaction
          }))

          // Create activity log after successful transaction update
          const currentUser = useAuthStore.getState().user
          if (currentUser && updatedTransaction) {
            // Generate appropriate log message based on what was updated
            let details = `Updated transaction: ${id}`

            // Add status change to details if status was updated
            if (transaction.status) {
              details += ` - Status changed to: ${transaction.status}`
            }

            // Add amount change to details if amount was updated
            if (transaction.totalAmount !== undefined) {
              details += ` - Amount: ${transaction.totalAmount}`
            }

            const logEntry = {
              id: generatePrefixedUUID('log'),
              userId: currentUser.id,
              username: currentUser.username,
              action: 'update',
              entityType: 'transaction',
              entityId: id,
              details: details,
              timestamp: new Date().toISOString()
            }
            useLogStore.getState().createLog(logEntry)
          }

          return true
        } else {
          set({ error: response.message || 'Failed to update transaction' })
          return false
        }
      } catch (error) {
        console.error('Failed to update transaction:', error)
        set({ error: 'Failed to update transaction' })
        return false
      } finally {
        set({ loading: false })
      }
    },

    updateTransactionItem: async (id: string, item: Partial<TransactionItem>) => {
      set({ loading: true, error: null })
      try {
        const currentTransaction = get().currentTransaction

        // Prevent item updates if transaction is completed
        if (currentTransaction?.status === 'completed') {
          set({ error: 'Cannot modify items in a completed transaction.' })
          return false
        }

        // Get the old item to calculate quantity difference
        const oldItem = get().currentItems.find((i) => i.id === id)

        const response = await window.context.transactions.updateItem(id, item)
        if (response.success) {
          // Update the item in the items list
          set((state) => ({
            currentItems: state.currentItems.map((i) =>
              i.id === id ? { ...i, ...item, updatedAt: new Date().toISOString() } : i
            )
          }))

          // If quantity or price changed, update transaction total
          if (
            get().currentTransaction &&
            (item.quantity !== undefined || item.unitPrice !== undefined)
          ) {
            // Recalculate total based on all items
            const items = get().currentItems.map((i) => (i.id === id ? { ...i, ...item } : i))
            const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

            // Only trigger update if there's a current transaction
            if (get().currentTransaction) {
              await get().updateTransaction(get().currentTransaction!.id, { totalAmount })
            }
          }

          // If transaction is not cancelled and quantity changed, adjust stock
          if (
            currentTransaction?.status !== 'cancelled' &&
            oldItem &&
            item.quantity !== undefined
          ) {
            const quantityDiff = item.quantity - oldItem.quantity

            if (quantityDiff !== 0) {
              const { stocks, updateStock, fetchStocks } = useStockStore.getState()
              const stockToUpdate = stocks.find((s) => s.id === oldItem.stockId)

              if (stockToUpdate) {
                const newQuantity = Math.max(0, stockToUpdate.quantity - quantityDiff)
                let newStatus: StockStatus = 'In Stock'

                if (newQuantity <= 0) {
                  newStatus = 'Out of Stock'
                } else if (newQuantity <= (stockToUpdate.reorderPoint || 0)) {
                  newStatus = 'Critical Low'
                }

                await updateStock({
                  ...stockToUpdate,
                  quantity: newQuantity,
                  status: newStatus
                })

                // Refresh stocks to get updated data
                await fetchStocks()
              }
            }
          }

          return true
        } else {
          set({ error: response.message || 'Failed to update transaction item' })
          return false
        }
      } catch (error) {
        console.error('Failed to update transaction item:', error)
        set({ error: 'Failed to update transaction item' })
        return false
      } finally {
        set({ loading: false })
      }
    },

    deleteTransaction: async (id: string) => {
      set({ loading: true, error: null })
      try {
        // Find transaction before deletion to include details in log
        const transactionToDelete =
          get().transactions.find((t) => t.id === id) || get().currentTransaction

        // Prevent deletion of completed transactions
        if (transactionToDelete?.status === 'completed') {
          set({ error: 'Cannot delete a completed transaction. Completed transactions are final.' })
          return false
        }

        // If transaction is pending, restore stock before deletion
        if (transactionToDelete?.status === 'pending') {
          await get().updateStockQuantities(id, 'pending', 'cancelled')
        }

        const response = await window.context.transactions.delete(id)
        if (response.success) {
          // Remove the transaction from the list
          set((state) => ({
            transactions: state.transactions.filter((t) => t.id !== id),
            // Reset currentTransaction if it was the one deleted
            currentTransaction:
              state.currentTransaction?.id === id ? null : state.currentTransaction,
            // Clear items if they belonged to the deleted transaction
            currentItems: state.currentTransaction?.id === id ? [] : state.currentItems
          }))

          // Create activity log after successful transaction deletion
          const currentUser = useAuthStore.getState().user
          if (currentUser && transactionToDelete) {
            const logEntry = {
              id: generatePrefixedUUID('log'),
              userId: currentUser.id,
              username: currentUser.username,
              action: 'delete',
              entityType: 'transaction',
              entityId: id,
              details: `Deleted transaction: ${id} - (${transactionToDelete.totalAmount || 0})`,
              timestamp: new Date().toISOString()
            }
            useLogStore.getState().createLog(logEntry)
          }

          return true
        } else {
          set({ error: response.message || 'Failed to delete transaction' })
          return false
        }
      } catch (error) {
        console.error('Failed to delete transaction:', error)
        set({ error: 'Failed to delete transaction' })
        return false
      } finally {
        set({ loading: false })
      }
    },

    deleteTransactionItem: async (id: string) => {
      set({ loading: true, error: null })
      try {
        const currentTransaction = get().currentTransaction

        // Prevent item deletion if transaction is completed
        if (currentTransaction?.status === 'completed') {
          set({ error: 'Cannot delete items from a completed transaction.' })
          return false
        }

        // Find the item to be removed for total calculation
        const itemToRemove = get().currentItems.find((i) => i.id === id)

        const response = await window.context.transactions.deleteItem(id)
        if (response.success) {
          // Remove the item from the list
          set((state) => ({
            currentItems: state.currentItems.filter((i) => i.id !== id)
          }))

          // Update the transaction total amount
          if (get().currentTransaction && itemToRemove) {
            const itemTotal = itemToRemove.quantity * itemToRemove.unitPrice
            const updatedTotal = get().currentTransaction!.totalAmount - itemTotal

            // Only proceed if we have a valid transaction ID
            if (get().currentTransaction?.id) {
              await get().updateTransaction(get().currentTransaction!.id, {
                totalAmount: Math.max(0, updatedTotal)
              })
            }
          }

          // If transaction is not cancelled, restore stock
          if (currentTransaction?.status !== 'cancelled' && itemToRemove) {
            const { stocks, updateStock, fetchStocks } = useStockStore.getState()
            const stockToUpdate = stocks.find((s) => s.id === itemToRemove.stockId)

            if (stockToUpdate) {
              const newQuantity = stockToUpdate.quantity + itemToRemove.quantity
              let newStatus: StockStatus = 'In Stock'

              if (newQuantity <= 0) {
                newStatus = 'Out of Stock'
              } else if (newQuantity <= (stockToUpdate.reorderPoint || 0)) {
                newStatus = 'Critical Low'
              }

              await updateStock({
                ...stockToUpdate,
                quantity: newQuantity,
                status: newStatus
              })

              // Refresh stocks to get updated data
              await fetchStocks()
            }
          }

          return true
        } else {
          set({ error: response.message || 'Failed to delete transaction item' })
          return false
        }
      } catch (error) {
        console.error('Failed to delete transaction item:', error)
        set({ error: 'Failed to delete transaction item' })
        return false
      } finally {
        set({ loading: false })
      }
    }
  }))
)
