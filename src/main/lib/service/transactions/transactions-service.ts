import { transactionsRepo, Transaction, TransactionItem } from './transactions-repo'

export class TransactionsService {
  getAllTransactions = async () => {
    try {
      const transactions = await transactionsRepo.getAll()
      return { success: true, transactions }
    } catch (error) {
      console.error('Error in TransactionsService.getAllTransactions:', error)
      return { success: false, message: 'Failed to fetch transactions' }
    }
  }

  getTransactionById(id: string): {
    success: boolean
    transaction?: Transaction
    message?: string
  } {
    try {
      const transaction = transactionsRepo.getById(id)
      if (!transaction) {
        return { success: false, message: 'Transaction not found' }
      }
      return { success: true, transaction }
    } catch (error) {
      console.error('Error in TransactionsService.getTransactionById:', error)
      return { success: false, message: 'Failed to fetch transaction' }
    }
  }

  getTransactionItems(transactionId: string): {
    success: boolean
    items?: TransactionItem[]
    message?: string
  } {
    try {
      const items = transactionsRepo.getItemsByTransactionId(transactionId)
      return { success: true, items }
    } catch (error) {
      console.error('Error in TransactionsService.getTransactionItems:', error)
      return { success: false, message: 'Failed to fetch transaction items' }
    }
  }

  createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): {
    success: boolean
    transactionId?: string
    message?: string
  } {
    try {
      const result = transactionsRepo.createTransaction(transaction)
      return result
    } catch (error) {
      console.error('Error in TransactionsService.createTransaction:', error)
      return { success: false, message: 'Failed to create transaction' }
    }
  }

  addTransactionItem(item: Omit<TransactionItem, 'id' | 'createdAt' | 'updatedAt'>): {
    success: boolean
    itemId?: string
    message?: string
  } {
    try {
      const result = transactionsRepo.createTransactionItem(item)
      return result
    } catch (error) {
      console.error('Error in TransactionsService.addTransactionItem:', error)
      return { success: false, message: 'Failed to add transaction item' }
    }
  }

  updateTransaction(
    id: string,
    data: Partial<Transaction>
  ): {
    success: boolean
    message?: string
  } {
    try {
      const updated = transactionsRepo.updateTransaction(id, data)
      if (!updated) {
        return { success: false, message: 'Failed to update transaction' }
      }
      return { success: true }
    } catch (error) {
      console.error('Error in TransactionsService.updateTransaction:', error)
      return { success: false, message: 'Failed to update transaction' }
    }
  }

  updateTransactionItem(
    id: string,
    data: Partial<TransactionItem>
  ): {
    success: boolean
    message?: string
  } {
    try {
      const updated = transactionsRepo.updateTransactionItem(id, data)
      if (!updated) {
        return { success: false, message: 'Failed to update transaction item' }
      }
      return { success: true }
    } catch (error) {
      console.error('Error in TransactionsService.updateTransactionItem:', error)
      return { success: false, message: 'Failed to update transaction item' }
    }
  }

  deleteTransaction(id: string): {
    success: boolean
    message?: string
  } {
    try {
      const deleted = transactionsRepo.deleteTransaction(id)
      if (!deleted) {
        return { success: false, message: 'Failed to delete transaction' }
      }
      return { success: true }
    } catch (error) {
      console.error('Error in TransactionsService.deleteTransaction:', error)
      return { success: false, message: 'Failed to delete transaction' }
    }
  }

  deleteTransactionItem(id: string): {
    success: boolean
    message?: string
  } {
    try {
      const deleted = transactionsRepo.deleteTransactionItem(id)
      if (!deleted) {
        return { success: false, message: 'Failed to delete transaction item' }
      }
      return { success: true }
    } catch (error) {
      console.error('Error in TransactionsService.deleteTransactionItem:', error)
      return { success: false, message: 'Failed to delete transaction item' }
    }
  }
}

export const transactionsService = new TransactionsService()
