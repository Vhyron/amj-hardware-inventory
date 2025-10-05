import Database from 'better-sqlite3'
import DatabaseManager from '../../database/database'
import crypto from 'crypto'

export interface SupplyOrder {
  id: string
  supplierId: string
  orderedBy: string
  status: 'Pending' | 'Approved' | 'Delivered' | 'Cancelled'
  totalCost: number
  notes?: string
  deliveredAt?: string
  createdAt: string
  updatedAt: string
  supplierName?: string // Virtual field for display purposes
}

export interface OrderItem {
  id: string
  orderId: string
  stockId?: string
  name: string
  sku: string
  description?: string
  category?: string
  quantity: number
  unit: string
  unitPrice: number
  createdAt: string
  updatedAt: string
}

export class SupplyOrdersRepository {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db || DatabaseManager.getInstance().getDatabase()
  }

  getAll(): SupplyOrder[] {
    try {
      // Join with suppliers to get the supplier name
      const stmt = this.db.prepare(`
        SELECT so.*, s.name as supplierName 
        FROM supplyOrders so 
        LEFT JOIN suppliers s ON so.supplierId = s.id
        ORDER BY so.createdAt DESC
      `)
      return stmt.all() as SupplyOrder[]
    } catch (error) {
      console.error('Error fetching supply orders:', error)
      return []
    }
  }

  getById(id: string): SupplyOrder | null {
    try {
      const stmt = this.db.prepare(`
        SELECT so.*, s.name as supplierName 
        FROM supplyOrders so 
        LEFT JOIN suppliers s ON so.supplierId = s.id
        WHERE so.id = ?
      `)
      return (stmt.get(id) as SupplyOrder) || null
    } catch (error) {
      console.error('Error fetching supply order by ID:', error)
      return null
    }
  }

  getItemsByOrderId(orderId: string): OrderItem[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM orderItems WHERE orderId = ?')
      return stmt.all(orderId) as OrderItem[]
    } catch (error) {
      console.error('Error fetching order items:', error)
      return []
    }
  }

  createOrder(order: Omit<SupplyOrder, 'id' | 'createdAt' | 'updatedAt'>): {
    success: boolean
    orderId?: string
    message?: string
  } {
    try {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      const stmt = this.db.prepare(`
        INSERT INTO supplyOrders (id, supplierId, orderedBy, status, totalCost, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        id,
        order.supplierId,
        order.orderedBy,
        order.status || 'Pending',
        order.totalCost,
        order.notes || null,
        now,
        now
      )

      return { success: true, orderId: id }
    } catch (error) {
      console.error('Error creating supply order:', error)
      return { success: false, message: 'Failed to create supply order' }
    }
  }

  createOrderItem(item: Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt'>): {
    success: boolean
    itemId?: string
    message?: string
  } {
    try {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      const stmt = this.db.prepare(`
        INSERT INTO orderItems (id, orderId, stockId, name, sku, description, category, quantity, unit, unitPrice, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        id,
        item.orderId,
        item.stockId || null,
        item.name,
        item.sku,
        item.description || null,
        item.category || null,
        item.quantity,
        item.unit,
        item.unitPrice,
        now,
        now
      )

      return { success: true, itemId: id }
    } catch (error) {
      console.error('Error creating order item:', error)
      return { success: false, message: 'Failed to create order item' }
    }
  }

  updateOrder(id: string, order: Partial<SupplyOrder>): boolean {
    try {
      // Check if order exists
      const existing = this.getById(id)
      if (!existing) {
        return false
      }

      const now = new Date().toISOString()

      // Build dynamic update fields
      const fields: string[] = []
      const values: any[] = []

      if (order.supplierId !== undefined) {
        fields.push('supplierId = ?')
        values.push(order.supplierId)
      }
      if (order.orderedBy !== undefined) {
        fields.push('orderedBy = ?')
        values.push(order.orderedBy)
      }
      if (order.status !== undefined) {
        fields.push('status = ?')
        values.push(order.status)
      }
      if (order.totalCost !== undefined) {
        fields.push('totalCost = ?')
        values.push(order.totalCost)
      }
      if (order.notes !== undefined) {
        fields.push('notes = ?')
        values.push(order.notes)
      }
      if (order.status === 'Delivered') {
        // Set deliveredAt when status changes to Delivered
        fields.push('deliveredAt = ?')
        values.push(now)
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

      const query = `UPDATE supplyOrders SET ${fields.join(', ')} WHERE id = ?`
      const stmt = this.db.prepare(query)
      const result = stmt.run(...values)

      return result.changes > 0
    } catch (error) {
      console.error('Error updating supply order:', error)
      return false
    }
  }

  updateOrderItem(id: string, item: Partial<OrderItem>): boolean {
    try {
      const now = new Date().toISOString()

      // Build dynamic update fields
      const fields: string[] = []
      const values: any[] = []

      if (item.stockId !== undefined) {
        fields.push('stockId = ?')
        values.push(item.stockId)
      }
      if (item.name !== undefined) {
        fields.push('name = ?')
        values.push(item.name)
      }
      if (item.sku !== undefined) {
        fields.push('sku = ?')
        values.push(item.sku)
      }
      if (item.description !== undefined) {
        fields.push('description = ?')
        values.push(item.description)
      }
      if (item.category !== undefined) {
        fields.push('category = ?')
        values.push(item.category)
      }
      if (item.quantity !== undefined) {
        fields.push('quantity = ?')
        values.push(item.quantity)
      }
      if (item.unit !== undefined) {
        fields.push('unit = ?')
        values.push(item.unit)
      }
      if (item.unitPrice !== undefined) {
        fields.push('unitPrice = ?')
        values.push(item.unitPrice)
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

      const query = `UPDATE orderItems SET ${fields.join(', ')} WHERE id = ?`
      const stmt = this.db.prepare(query)
      const result = stmt.run(...values)

      return result.changes > 0
    } catch (error) {
      console.error('Error updating order item:', error)
      return false
    }
  }

  deleteOrder(id: string): boolean {
    try {
      // Check if order exists
      const existing = this.getById(id)
      if (!existing) {
        return false
      }

      // First delete all associated items (due to foreign key constraint)
      const deleteItemsStmt = this.db.prepare('DELETE FROM orderItems WHERE orderId = ?')
      deleteItemsStmt.run(id)

      // Then delete the order
      const deleteOrderStmt = this.db.prepare('DELETE FROM supplyOrders WHERE id = ?')
      const result = deleteOrderStmt.run(id)

      return result.changes > 0
    } catch (error) {
      console.error('Error deleting supply order:', error)
      return false
    }
  }

  deleteOrderItem(id: string): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM orderItems WHERE id = ?')
      const result = stmt.run(id)

      return result.changes > 0
    } catch (error) {
      console.error('Error deleting order item:', error)
      return false
    }
  }
}

export const supplyOrdersRepo = new SupplyOrdersRepository()
