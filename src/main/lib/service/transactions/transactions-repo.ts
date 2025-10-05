import Database from 'better-sqlite3'
import DatabaseManager from '../../database/database'
import crypto from 'crypto'

export interface Transaction {
  id: string
  customerName?: string
  referenceNo?: string
  status: 'pending' | 'completed' | 'cancelled'
  totalAmount: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TransactionItem {
  id: string
  transactionId: string
  stockId: string
  quantity: number
  unitPrice: number
  unit: string
  stockName?: string // Virtual field for display purposes
  createdAt: string
  updatedAt: string
}

export class TransactionsRepository {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db || DatabaseManager.getInstance().getDatabase()
  }

  getAll(): Transaction[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM transactions
        ORDER BY createdAt DESC
      `)
      return stmt.all() as Transaction[]
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }

  getById(id: string): Transaction | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM transactions WHERE id = ?')
      return (stmt.get(id) as Transaction) || null
    } catch (error) {
      console.error('Error fetching transaction by ID:', error)
      return null
    }
  }

  getItemsByTransactionId(transactionId: string): TransactionItem[] {
    try {
      const stmt = this.db.prepare(`
        SELECT ti.*, s.name as stockName 
        FROM transactionItems ti
        LEFT JOIN stocks s ON ti.stockId = s.id
        WHERE ti.transactionId = ?
      `)
      return stmt.all(transactionId) as TransactionItem[]
    } catch (error) {
      console.error('Error fetching transaction items:', error)
      return []
    }
  }

  createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): {
    success: boolean
    transactionId?: string
    message?: string
  } {
    try {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      const stmt = this.db.prepare(`
        INSERT INTO transactions (id, customerName, referenceNo, status, notes, totalAmount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        id,
        transaction.customerName || null,
        transaction.referenceNo || null,
        transaction.status || 'pending',
        transaction.notes || null,
        transaction.totalAmount || 0,
        now,
        now
      )

      return { success: true, transactionId: id }
    } catch (error) {
      console.error('Error creating transaction:', error)
      return { success: false, message: 'Failed to create transaction' }
    }
  }

  createTransactionItem(item: Omit<TransactionItem, 'id' | 'createdAt' | 'updatedAt'>): {
    success: boolean
    itemId?: string
    message?: string
  } {
    try {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      const stmt = this.db.prepare(`
        INSERT INTO transactionItems (id, transactionId, stockId, quantity, unitPrice, unit, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        id,
        item.transactionId,
        item.stockId,
        item.quantity,
        item.unitPrice,
        item.unit,
        now,
        now
      )

      return { success: true, itemId: id }
    } catch (error) {
      console.error('Error creating transaction item:', error)
      return { success: false, message: 'Failed to create transaction item' }
    }
  }

  updateTransaction(id: string, transaction: Partial<Transaction>): boolean {
    try {
      // Check if transaction exists
      const existing = this.getById(id)
      if (!existing) {
        return false
      }

      const now = new Date().toISOString()

      // Build dynamic update fields
      const fields: string[] = []
      const values: any[] = []

      if (transaction.customerName !== undefined) {
        fields.push('customerName = ?')
        values.push(transaction.customerName)
      }
      if (transaction.referenceNo !== undefined) {
        fields.push('referenceNo = ?')
        values.push(transaction.referenceNo)
      }
      if (transaction.status !== undefined) {
        fields.push('status = ?')
        values.push(transaction.status)
      }
      if (transaction.totalAmount !== undefined) {
        fields.push('totalAmount = ?')
        values.push(transaction.totalAmount)
      }
      if (transaction.notes !== undefined) {
        fields.push('notes = ?')
        values.push(transaction.notes)
      }

      // Always update the updatedAt timestamp
      fields.push('updatedAt = ?')
      values.push(now)

      // Add id as the last parameter
      values.push(id)

      // If there's nothing to update, return success
      if (fields.length === 1) {
        return true
      }

      const query = `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`
      const stmt = this.db.prepare(query)
      const result = stmt.run(...values)

      return result.changes > 0
    } catch (error) {
      console.error('Error updating transaction:', error)
      return false
    }
  }

  updateTransactionItem(id: string, item: Partial<TransactionItem>): boolean {
    try {
      const now = new Date().toISOString()

      // Build dynamic update fields
      const fields: string[] = []
      const values: any[] = []

      if (item.stockId !== undefined) {
        fields.push('stockId = ?')
        values.push(item.stockId)
      }
      if (item.quantity !== undefined) {
        fields.push('quantity = ?')
        values.push(item.quantity)
      }
      if (item.unitPrice !== undefined) {
        fields.push('unitPrice = ?')
        values.push(item.unitPrice)
      }
      if (item.unit !== undefined) {
        fields.push('unit = ?')
        values.push(item.unit)
      }

      // Always update the updatedAt timestamp
      fields.push('updatedAt = ?')
      values.push(now)

      // Add id as the last parameter
      values.push(id)

      // If there's nothing to update, return success
      if (fields.length === 1) {
        return true
      }

      const query = `UPDATE transactionItems SET ${fields.join(', ')} WHERE id = ?`
      const stmt = this.db.prepare(query)
      const result = stmt.run(...values)

      return result.changes > 0
    } catch (error) {
      console.error('Error updating transaction item:', error)
      return false
    }
  }

  deleteTransaction(id: string): boolean {
    try {
      // Check if transaction exists
      const existing = this.getById(id)
      if (!existing) {
        return false
      }

      // First delete all associated items (due to foreign key constraint)
      const deleteItemsStmt = this.db.prepare(
        'DELETE FROM transactionItems WHERE transactionId = ?'
      )
      deleteItemsStmt.run(id)

      // Then delete the transaction
      const deleteTransactionStmt = this.db.prepare('DELETE FROM transactions WHERE id = ?')
      const result = deleteTransactionStmt.run(id)

      return result.changes > 0
    } catch (error) {
      console.error('Error deleting transaction:', error)
      return false
    }
  }

  deleteTransactionItem(id: string): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM transactionItems WHERE id = ?')
      const result = stmt.run(id)

      return result.changes > 0
    } catch (error) {
      console.error('Error deleting transaction item:', error)
      return false
    }
  }
}

export const transactionsRepo = new TransactionsRepository()
