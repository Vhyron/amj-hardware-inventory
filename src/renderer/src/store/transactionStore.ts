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

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  fetchTransactions: () => Promise<void>
  fetchTransactionById: (id: string) => Promise<Transaction | null>
  fetchTransactionItems: (transactionId: string) => Promise<TransactionItem[]>
  createTransaction: (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    items?: any[]
  ) => Promise<string | null>
  addTransactionItem: (
    item: Omit<TransactionItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string | null>
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<boolean>
  updateTransactionItem: (id: string, item: Partial<TransactionItem>) => Promise<boolean>
  deleteTransaction: (id: string) => Promise<boolean>
  deleteTransactionItem: (id: string) => Promise<boolean>
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

    createTransaction: async (
      transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
      items: any[] = []
    ) => {
      set({ loading: true, error: null })
      try {
        const response = await window.context.transactions.create(transaction)
        if (response.success && response.transactionId) {
          const newTransaction = {
            ...transaction,
            id: response.transactionId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Transaction

          set((state) => ({
            transactions: [newTransaction, ...state.transactions]
          }))

          const currentUser = useAuthStore.getState().user
          if (currentUser) {
            const logEntry = {
              id: generatePrefixedUUID('log'),
              userId: currentUser.id,
              username: currentUser.username,
              action: 'create',
              entityType: 'transaction',
              entityId: response.transactionId,
              details: `Created transaction ${response.transactionId} | Customer: ${transaction.customerName || 'N/A'} | Status: ${transaction.status} | Total: ₱${transaction.totalAmount?.toFixed(2) || '0.00'}`,
              timestamp: new Date().toISOString()
            }
            useLogStore.getState().createLog(logEntry)
          }

          if (items && items.length > 0) {
            const { stocks, fetchStocks } = useStockStore.getState()

            for (const item of items) {
              const itemData = {
                transactionId: response.transactionId,
                stockId: item.stockId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                unit: item.unit
              }

              const itemResponse = await window.context.transactions.addItem(itemData)

              if (itemResponse.success && itemResponse.itemId) {
                if (currentUser) {
                  const stock = stocks.find((s) => s.id === item.stockId)
                  const itemLogEntry = {
                    id: generatePrefixedUUID('log'),
                    userId: currentUser.id,
                    username: currentUser.username,
                    action: 'create',
                    entityType: 'transaction_item',
                    entityId: itemResponse.itemId,
                    details: `Added item to transaction ${response.transactionId} | Product: ${stock?.name || item.stockName} | Qty: ${item.quantity} ${item.unit} | Price: ₱${item.unitPrice.toFixed(2)}`,
                    timestamp: new Date().toISOString()
                  }
                  useLogStore.getState().createLog(itemLogEntry)
                }

                if (transaction.status === 'completed') {
                  const stockToUpdate = stocks.find((s) => s.id === item.stockId)

                  if (stockToUpdate) {
                    const newQuantity = Math.max(0, stockToUpdate.quantity - item.quantity)
                    let newStatus: StockStatus = 'In Stock'

                    if (newQuantity <= 0) {
                      newStatus = 'Out of Stock'
                    } else if (newQuantity <= (stockToUpdate.reorderPoint || 0)) {
                      newStatus = 'Critical Low'
                    }

                    await useStockStore.getState().updateStock({
                      ...stockToUpdate,
                      quantity: newQuantity,
                      status: newStatus
                    })
                  }
                }
              }
            }

            await fetchStocks()
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
          const stockResponse = window.context.stocks
            ? await window.context.stocks.getById(item.stockId)
            : null
          const stockName = stockResponse?.stock?.name || 'Unknown Item'

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

          if (get().currentTransaction && item.transactionId === get().currentTransaction!.id) {
            const currentTotal = get().currentTransaction?.totalAmount || 0
            const itemTotal = item.quantity * item.unitPrice
            await get().updateTransaction(item.transactionId, {
              totalAmount: currentTotal + itemTotal
            })
          }

          const currentUser = useAuthStore.getState().user
          if (currentUser) {
            const logEntry = {
              id: generatePrefixedUUID('log'),
              userId: currentUser.id,
              username: currentUser.username,
              action: 'create',
              entityType: 'transaction_item',
              entityId: response.itemId,
              details: `Added item to transaction ${item.transactionId} | Product: ${stockName} | Qty: ${item.quantity} ${item.unit} | Price: ₱${item.unitPrice.toFixed(2)}`,
              timestamp: new Date().toISOString()
            }
            useLogStore.getState().createLog(logEntry)
          }

          const currentTransaction = get().currentTransaction
          if (currentTransaction?.status === 'completed') {
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
      oldStatus?: string,
      newStatus?: string
    ) => {
      try {
        const items = get().currentItems
        if (items.length === 0) {
          return true
        }

        let multiplier = 0

        // Pending → Completed: deduct stock
        if (oldStatus === 'pending' && newStatus === 'completed') {
          multiplier = -1
        }
        // Pending → Cancelled: no change (never deducted)
        else if (oldStatus === 'pending' && newStatus === 'cancelled') {
          multiplier = 0
        }
        // Completed → Cancelled: restore stock
        else if (oldStatus === 'completed' && newStatus === 'cancelled') {
          multiplier = 1
        }
        // Completed → Pending: restore stock
        else if (oldStatus === 'completed' && newStatus === 'pending') {
          multiplier = 1
        }
        // Cancelled → Pending: no change
        else if (oldStatus === 'cancelled' && newStatus === 'pending') {
          multiplier = 0
        }
        // Cancelled → Completed: deduct stock
        else if (oldStatus === 'cancelled' && newStatus === 'completed') {
          multiplier = -1
        }

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

        const response = await window.context.transactions.update(id, transaction)
        if (response.success) {
          if (oldStatus !== newStatus && newStatus) {
            await get().updateStockQuantities(id, oldStatus, newStatus)
          }

          const existingTransaction =
            get().transactions.find((t) => t.id === id) || get().currentTransaction
          const updatedTransaction = { ...existingTransaction, ...transaction }

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

          const currentUser = useAuthStore.getState().user
          if (currentUser && updatedTransaction) {
            let details = `Updated transaction ${id}`

            if (transaction.status && oldStatus !== newStatus) {
              details += ` | Status: ${oldStatus} → ${transaction.status}`
            }

            if (transaction.totalAmount !== undefined) {
              details += ` | Amount: ₱${transaction.totalAmount.toFixed(2)}`
            }

            if (transaction.customerName) {
              details += ` | Customer: ${transaction.customerName}`
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
        const oldItem = get().currentItems.find((i) => i.id === id)

        const response = await window.context.transactions.updateItem(id, item)
        if (response.success) {
          set((state) => ({
            currentItems: state.currentItems.map((i) =>
              i.id === id ? { ...i, ...item, updatedAt: new Date().toISOString() } : i
            )
          }))

          if (
            get().currentTransaction &&
            (item.quantity !== undefined || item.unitPrice !== undefined)
          ) {
            const items = get().currentItems.map((i) => (i.id === id ? { ...i, ...item } : i))
            const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

            if (get().currentTransaction) {
              await get().updateTransaction(get().currentTransaction!.id, { totalAmount })
            }
          }

          const currentUser = useAuthStore.getState().user
          if (currentUser && oldItem) {
            const stockName = oldItem.stockName || 'Unknown'
            let details = `Updated item in transaction ${currentTransaction?.id} | Product: ${stockName}`

            if (item.quantity !== undefined && oldItem.quantity !== item.quantity) {
              details += ` | Qty: ${oldItem.quantity} → ${item.quantity}`
            }

            if (item.unitPrice !== undefined && oldItem.unitPrice !== item.unitPrice) {
              details += ` | Price: ₱${oldItem.unitPrice.toFixed(2)} → ₱${item.unitPrice.toFixed(2)}`
            }

            const logEntry = {
              id: generatePrefixedUUID('log'),
              userId: currentUser.id,
              username: currentUser.username,
              action: 'update',
              entityType: 'transaction_item',
              entityId: id,
              details: details,
              timestamp: new Date().toISOString()
            }
            useLogStore.getState().createLog(logEntry)
          }

          if (
            currentTransaction?.status === 'completed' &&
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
        const transactionToDelete =
          get().transactions.find((t) => t.id === id) || get().currentTransaction

        if (transactionToDelete?.status === 'completed') {
          await get().updateStockQuantities(id, 'completed', 'cancelled')
        }

        const response = await window.context.transactions.delete(id)
        if (response.success) {
          set((state) => ({
            transactions: state.transactions.filter((t) => t.id !== id),
            currentTransaction:
              state.currentTransaction?.id === id ? null : state.currentTransaction,
            currentItems: state.currentTransaction?.id === id ? [] : state.currentItems
          }))

          const currentUser = useAuthStore.getState().user
          if (currentUser && transactionToDelete) {
            const logEntry = {
              id: generatePrefixedUUID('log'),
              userId: currentUser.id,
              username: currentUser.username,
              action: 'delete',
              entityType: 'transaction',
              entityId: id,
              details: `Deleted transaction ${id} | Customer: ${transactionToDelete.customerName || 'N/A'} | Status: ${transactionToDelete.status} | Amount: ₱${(transactionToDelete.totalAmount || 0).toFixed(2)}`,
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
        const itemToRemove = get().currentItems.find((i) => i.id === id)

        const response = await window.context.transactions.deleteItem(id)
        if (response.success) {
          set((state) => ({
            currentItems: state.currentItems.filter((i) => i.id !== id)
          }))

          if (get().currentTransaction && itemToRemove) {
            const itemTotal = itemToRemove.quantity * itemToRemove.unitPrice
            const updatedTotal = get().currentTransaction!.totalAmount - itemTotal

            if (get().currentTransaction?.id) {
              await get().updateTransaction(get().currentTransaction!.id, {
                totalAmount: Math.max(0, updatedTotal)
              })
            }
          }

          const currentUser = useAuthStore.getState().user
          if (currentUser && itemToRemove) {
            const logEntry = {
              id: generatePrefixedUUID('log'),
              userId: currentUser.id,
              username: currentUser.username,
              action: 'delete',
              entityType: 'transaction_item',
              entityId: id,
              details: `Removed item from transaction ${currentTransaction?.id} | Product: ${itemToRemove.stockName || 'Unknown'} | Qty: ${itemToRemove.quantity} ${itemToRemove.unit}`,
              timestamp: new Date().toISOString()
            }
            useLogStore.getState().createLog(logEntry)
          }

          if (currentTransaction?.status === 'completed' && itemToRemove) {
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
