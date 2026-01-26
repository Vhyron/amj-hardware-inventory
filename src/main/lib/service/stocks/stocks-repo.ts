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

      const supplierId =
        stock.supplierId && stock.supplierId.trim() !== '' ? stock.supplierId : null

      const info = stmt.run(
        stock.id,
        stock.name,
        stock.description,
        stock.category,
        stock.quantity,
        stock.unit,
        stock.unitPrice,
        stock.costPrice,
        supplierId,
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
      throw new Error(`Failed to get stock by id: ${error.message}`)
    }
  }

  checkStockNameExists(name: string, excludeId?: string): boolean {
    try {
      let query = 'SELECT COUNT(*) as count FROM stocks WHERE LOWER(name) = LOWER(?)'
      const params = [name]

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
      throw new Error(`Failed to check if stock name exists: ${error.message}`)
    }
  }

  getAllStocks(): Stock[] {
    const stmt = this.db.prepare('SELECT * FROM stocks')
    const stocks = stmt.all() as unknown as Stock[]
    assert(Array.isArray(stocks), 'Expected stocks to be an array')
    return stocks
  }

  getActiveStocks(): Stock[] {
    const stmt = this.db.prepare(
      "SELECT * FROM stocks WHERE status IS NULL OR status != 'Archived'"
    )
    const stocks = stmt.all() as unknown as Stock[]
    assert(Array.isArray(stocks), 'Expected active stocks to be an array')
    return stocks
  }

  getArchivedStocks(): Stock[] {
    const stmt = this.db.prepare("SELECT * FROM stocks WHERE status = 'Archived'")
    const stocks = stmt.all() as unknown as Stock[]
    assert(Array.isArray(stocks), 'Expected archived stocks to be an array')
    return stocks
  }

  updateStock(stock: Stock): boolean {
    try {
      assert(stock.id, 'ID is required for updating stock')
      const stmt = this.db.prepare(
        'UPDATE stocks SET name = ?, description = ?, category = ?, quantity = ?, unit = ?, unitPrice = ?, costPrice = ?, supplierId = ?, location = ?, sku = ?, status = ?, reorderPoint = ? WHERE id = ?'
      )

      const supplierId =
        stock.supplierId && stock.supplierId.trim() !== '' ? stock.supplierId : null

      const result = stmt.run(
        stock.name,
        stock.description,
        stock.category,
        stock.quantity,
        stock.unit,
        stock.unitPrice,
        stock.costPrice,
        supplierId,
        stock.location,
        stock.sku,
        stock.status,
        stock.reorderPoint,
        stock.id
      )

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

  archiveStock(id: string): boolean {
    try {
      assert(id, 'ID is required for archiving stock')
      const stmt = this.db.prepare("UPDATE stocks SET status = 'Archived' WHERE id = ?")
      const result = stmt.run(id)
      return result.changes > 0
    } catch (error) {
      console.log('Error archiveStock: ', error)
      return false
    }
  }

  restoreStock(id: string, status: string): boolean {
    try {
      assert(id, 'ID is required for restoring stock')
      assert(status, 'Status is required for restoring stock')
      const stmt = this.db.prepare('UPDATE stocks SET status = ? WHERE id = ?')
      const result = stmt.run(status, id)
      return result.changes > 0
    } catch (error) {
      console.log('Error restoreStock: ', error)
      return false
    }
  }
}

export const stocksRepo = new StocksRepository()
