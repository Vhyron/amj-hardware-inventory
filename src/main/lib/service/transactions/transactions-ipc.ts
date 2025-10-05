import { ipcMain } from 'electron'
import { transactionsService } from './transactions-service'
import { Transaction, TransactionItem } from './transactions-repo'

export function setupTransactionsIPC(): void {
  ipcMain.handle('transactions:getAll', async () => {
    return transactionsService.getAllTransactions()
  })

  ipcMain.handle('transactions:getById', async (_, id: string) => {
    return transactionsService.getTransactionById(id)
  })

  ipcMain.handle('transactions:getItems', async (_, transactionId: string) => {
    return transactionsService.getTransactionItems(transactionId)
  })

  ipcMain.handle(
    'transactions:create',
    async (_, transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      return transactionsService.createTransaction(transaction)
    }
  )

  ipcMain.handle(
    'transactions:addItem',
    async (_, item: Omit<TransactionItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      return transactionsService.addTransactionItem(item)
    }
  )

  ipcMain.handle('transactions:update', async (_, id: string, data: Partial<Transaction>) => {
    return transactionsService.updateTransaction(id, data)
  })

  ipcMain.handle(
    'transactions:updateItem',
    async (_, id: string, data: Partial<TransactionItem>) => {
      return transactionsService.updateTransactionItem(id, data)
    }
  )

  ipcMain.handle('transactions:delete', async (_, id: string) => {
    return transactionsService.deleteTransaction(id)
  })

  ipcMain.handle('transactions:deleteItem', async (_, id: string) => {
    return transactionsService.deleteTransactionItem(id)
  })
}
