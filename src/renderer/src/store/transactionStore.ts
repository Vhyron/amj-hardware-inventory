import { create } from 'zustand'
import { Transaction, TransactionItem } from '../pages/Transactions/types'
import { devtools } from 'zustand/middleware'
import * as stockStore from './stockStore'
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
          const stockStore = window.context.stocks ? await window.context.stocks.getById(item.stockId) : null
          const stockName = stockStore?.stock?.name || 'Unknown Item'
          
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
            get().updateTransaction(item.transactionId, {
              totalAmount: currentTotal + itemTotal
            })
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

    updateTransaction: async (id: string, transaction: Partial<Transaction>) => {
      set({ loading: true, error: null })
      try {
        const response = await window.context.transactions.update(id, transaction)
        if (response.success) {
          // Check if status is being changed to 'completed'
          const isChangingToCompleted = 
            get().currentTransaction?.status !== 'completed' && 
            transaction.status === 'completed';
          
          // Update stock quantities if status is changing to 'completed'
          if (isChangingToCompleted) {
            // Get current items to update stock quantities
            const items = get().currentItems;
            
            // Only proceed if there are items to process
            if (items.length > 0) {
              // Get stockStore to update quantities
              const { stocks, updateStock } = stockStore.useStockStore.getState();
              
              // Process each transaction item
              for (const item of items) {
                // Find the corresponding stock
                const stockToUpdate = stocks.find(s => s.id === item.stockId);
                
                if (stockToUpdate) {
                  // Calculate new quantity (subtract the sold quantity)
                  const newQuantity = Math.max(0, stockToUpdate.quantity - item.quantity);
                  
                  // Calculate new status based on quantity and reorder point
                  let newStatus = 'In Stock';
                  if (newQuantity <= 0) {
                    newStatus = 'Out of Stock';
                  } else if (newQuantity <= (stockToUpdate.reorderPoint || 0)) {
                    newStatus = 'Critical Low';
                  }
                  
                  // Update the stock in the database
                  await updateStock({
                    ...stockToUpdate,
                    quantity: newQuantity,
                    status: newStatus as StockStatus
                  });
                }
              }
            }
          }

          // Get transaction details for logging
          const existingTransaction = get().transactions.find(t => t.id === id) || get().currentTransaction;
          const updatedTransaction = { ...existingTransaction, ...transaction };
          
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
          const currentUser = useAuthStore.getState().user;
          if (currentUser && updatedTransaction) {
            // Generate appropriate log message based on what was updated
            let details = `Updated transaction: ${id}`;
            
            // Add status change to details if status was updated
            if (transaction.status) {
              details += ` - Status changed to: ${transaction.status}`;
            }
            
            // Add amount change to details if amount was updated
            if (transaction.totalAmount !== undefined) {
              details += ` - Amount: ${transaction.totalAmount}`;
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
              get().updateTransaction(get().currentTransaction!.id, { totalAmount })
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
        const transactionToDelete = get().transactions.find(t => t.id === id) || get().currentTransaction;
        
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
        const response = await window.context.transactions.deleteItem(id)
        if (response.success) {
          // Find the item to be removed for total calculation
          const itemToRemove = get().currentItems.find((i) => i.id === id)

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
              get().updateTransaction(get().currentTransaction!.id, {
                totalAmount: Math.max(0, updatedTotal)
              })
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
