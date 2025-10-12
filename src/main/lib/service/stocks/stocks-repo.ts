import { assert } from 'console'
import DatabaseManager from '../../database/database'

export interface Stock {
  id: string
  name: string
  description?: string
  category: string
  quantity: number
  unit: string
  unitPrice: number
  costPrice: number
  supplierId?: string
  location?: string
  sku?: string
  status: string
  reorderPoint?: number
}

interface RunResult {
  lastID: number
  changes: number
}

export class StocksRepository {
  private db = DatabaseManager.getInstance().getDatabase()

  insertStock(stock: Stock): string | null {
    try {
      assert(stock.name, 'Name is required')
      assert(stock.category, 'Category is required')
      assert(stock.quantity >= 0, 'Quantity must be non-negative')
      assert(stock.unitPrice >= 0, 'Unit price must be non-negative')
      assert(stock.costPrice >= 0, 'Cost price must be non-negative')

      const stmt = this.db.prepare(
        'INSERT INTO stocks (id, name, description, category, quantity, unit, unitPrice, costPrice, supplierId, location, sku, status, reorderPoint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
      )

      const info = stmt.run(
        stock.id,
        stock.name,
        stock.description,
        stock.category,
        stock.quantity,
        stock.unit,
        stock.unitPrice,
        stock.costPrice,
        stock.supplierId,
        stock.location,
        stock.sku,
        stock.status,
        stock.reorderPoint
      ) as unknown as RunResult

      console.log(info)

      return stock.id
    } catch (error) {
      console.log('Error insertStock: ', error)
      return null
    }
  }

  getById(id: string): Stock | null {
    try {
      const query = 'SELECT * FROM stocks WHERE id = ?'
      const stmt = this.db.prepare(query)
      const result = stmt.get(id) as Stock | null
      
      return result
    } catch (error: any) {
      console.error('Error in getById:', error)
      throw new Error(`Failed to get stock by id: ${error.message}`);
    }
  }

  checkStockNameExists(name: string, excludeId?: string): boolean {
    try {
      let query = 'SELECT COUNT(*) as count FROM stocks WHERE LOWER(name) = LOWER(?)'
      let params = [name]

      // If we're updating an existing stock, exclude its ID from the check
      if (excludeId) {
        query += ' AND id != ?'
        params.push(excludeId)
      }

      const stmt = this.db.prepare(query)
      const result = stmt.get(...params) as { count: number }
      
      return result && result.count > 0
    } catch (error: any) {
      console.error('Error in checkStockNameExists:', error)
      throw new Error(`Failed to check if stock name exists: ${error.message}`);
    }
  }

  getAllStocks(): Stock[] {
    const stmt = this.db.prepare('SELECT * FROM stocks')
    const stocks = stmt.all() as unknown as Stock[]
    assert(Array.isArray(stocks), 'Expected stocks to be an array')
    return stocks
  }

  updateStock(stock: Stock): boolean {
    try {
      assert(stock.id, 'ID is required for updating stock')
      const stmt = this.db.prepare(
        'UPDATE stocks SET name = ?, description = ?, category = ?, quantity = ?, unit = ?, unitPrice = ?, costPrice = ?, supplierId = ?, location = ?, sku = ?, status = ?, reorderPoint = ? WHERE id = ?'
      )
      const result = stmt.run(
        stock.name,
        stock.description,
        stock.category,
        stock.quantity,
        stock.unit,
        stock.unitPrice,
        stock.costPrice,
        stock.supplierId,
        stock.location,
        stock.sku,
        stock.status,
        stock.reorderPoint,
        stock.id
      )

      console.log(result.changes)

      return result.changes > 0
    } catch (error) {
      console.log('Error updateStock: ', error)
      return false
    }
  }

  deleteStock(id: string): boolean {
    try {
      assert(id, 'ID is required for deleting stock')
      const stmt = this.db.prepare('DELETE FROM stocks WHERE id = ?')
      const result = stmt.run(id)
      return result.changes > 0
    } catch (error) {
      console.log('Error deleteStock: ', error)
      return false
    }
  }

  /**
   * Update stock quantity by adding or subtracting
   * Also updates the stock status based on quantity and reorder point
   */
  updateQuantity(stockId: string, quantity: number, operation: 'add' | 'subtract'): boolean {
    try {
      assert(stockId, 'Stock ID is required')
      assert(quantity >= 0, 'Quantity must be non-negative')

      // First, get the current stock
      const stock = this.getById(stockId)
      if (!stock) {
        throw new Error(`Stock with ID ${stockId} not found`)
      }

      // Calculate new quantity
      let newQuantity = stock.quantity
      if (operation === 'add') {
        newQuantity += quantity
      } else if (operation === 'subtract') {
        newQuantity -= quantity
        // Prevent negative quantity
        if (newQuantity < 0) {
          throw new Error(`Insufficient stock. Available: ${stock.quantity}, Requested: ${quantity}`)
        }
      }

      // Calculate new status based on quantity and reorder point
      let newStatus: 'In Stock' | 'Out of Stock' | 'Critical Low'
      if (newQuantity <= 0) {
        newStatus = 'Out of Stock'
      } else if (stock.reorderPoint && newQuantity <= stock.reorderPoint) {
        newStatus = 'Critical Low'
      } else {
        newStatus = 'In Stock'
      }

      // Update the stock with new quantity and status
      const stmt = this.db.prepare(
        'UPDATE stocks SET quantity = ?, status = ? WHERE id = ?'
      )
      const result = stmt.run(newQuantity, newStatus, stockId)

      console.log(`Stock ${stockId} quantity updated: ${stock.quantity} -> ${newQuantity} (${operation})`)

      return result.changes > 0
    } catch (error: any) {
      console.error('Error updateQuantity:', error)
      throw error
    }
  }
}

export const stocksRepo = new StocksRepository()