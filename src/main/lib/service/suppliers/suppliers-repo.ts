import Database from 'better-sqlite3'

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  description?: string;
  isActive: number; // 1 = active, 0 = inactive
  createdAt: string;
  updatedAt: string;
}

export class SuppliersRepository {
  constructor(private db: Database.Database) {}

  getAll(): Supplier[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM suppliers ORDER BY name ASC
      `)
      return stmt.all() as Supplier[]
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      return []
    }
  }

  getById(id: string): Supplier | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM suppliers WHERE id = ?')
      return stmt.get(id) as Supplier || null
    } catch (error) {
      console.error('Error fetching supplier by ID:', error)
      return null
    }
  }

  getByName(name: string): Supplier | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM suppliers WHERE name = ?')
      return stmt.get(name) as Supplier || null
    } catch (error) {
      console.error('Error fetching supplier by name:', error)
      return null
    }
  }

  create(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): { success: boolean; supplierId?: string; message?: string } {
    try {
      // Check if supplier with the same name already exists
      const existing = this.getByName(supplier.name)
      if (existing) {
        return { success: false, message: 'A supplier with this name already exists' }
      }

      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      const stmt = this.db.prepare(`
        INSERT INTO suppliers (id, name, contactName, email, phone, address, description, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        id,
        supplier.name,
        supplier.contactName,
        supplier.email,
        supplier.phone,
        supplier.address || null,
        supplier.description || null,
        supplier.isActive || 1,
        now,
        now
      )

      return { success: true, supplierId: id }
    } catch (error) {
      console.error('Error creating supplier:', error)
      return { success: false, message: 'Failed to create supplier' }
    }
  }

  update(id: string, supplier: Partial<Supplier>): boolean {
    try {
      // Check if supplier exists
      const existing = this.getById(id)
      if (!existing) {
        return false
      }

      // If updating name, check for duplicates
      if (supplier.name && supplier.name !== existing.name) {
        const nameExists = this.getByName(supplier.name)
        if (nameExists) {
          return false
        }
      }

      const now = new Date().toISOString()

      // Build dynamic update fields
      const fields: string[] = []
      const values: any[] = []

      // Add each field that needs updating
      if (supplier.name !== undefined) {
        fields.push('name = ?')
        values.push(supplier.name)
      }
      if (supplier.contactName !== undefined) {
        fields.push('contactName = ?')
        values.push(supplier.contactName)
      }
      if (supplier.email !== undefined) {
        fields.push('email = ?')
        values.push(supplier.email)
      }
      if (supplier.phone !== undefined) {
        fields.push('phone = ?')
        values.push(supplier.phone)
      }
      if (supplier.address !== undefined) {
        fields.push('address = ?')
        values.push(supplier.address)
      }
      if (supplier.description !== undefined) {
        fields.push('description = ?')
        values.push(supplier.description)
      }
      if (supplier.isActive !== undefined) {
        fields.push('isActive = ?')
        values.push(supplier.isActive)
      }
      
      // Always update the updatedAt timestamp
      fields.push('updatedAt = ?')
      values.push(now)
      
      // Add id as the last parameter
      values.push(id)

      const query = `UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`
      const stmt = this.db.prepare(query)
      const result = stmt.run(...values)

      return result.changes > 0
    } catch (error) {
      console.error('Error updating supplier:', error)
      return false
    }
  }

  delete(id: string): boolean {
    try {
      // Check if supplier exists
      const existing = this.getById(id)
      if (!existing) {
        return false
      }

      const stmt = this.db.prepare('DELETE FROM suppliers WHERE id = ?')
      const result = stmt.run(id)

      return result.changes > 0
    } catch (error) {
      console.error('Error deleting supplier:', error)
      return false
    }
  }
}