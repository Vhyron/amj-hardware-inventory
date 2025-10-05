import Database from 'better-sqlite3'
import bcryptjs from 'bcryptjs'
import { usersSeeds } from './schemas/users'
import { categoriesSeed } from './schemas/categories'
import { stocksSeed } from './schemas/stocks'
import { suppliersSeed } from './schemas/supplier'

export class SeedManager {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  public async seedData() {
    try {
      await this.seedUsers()
      await this.seedCategories()
      await this.seedSuppliers()
      await this.seedStocks()
    } catch (error) {
      console.error('Error seeding data:', error)
      throw error
    }
  }

  private async seedUsers() {
    // Check if we already have users in the table
    const countResult = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as {
      count: number
    }

    // Only seed if no users exist
    if (countResult.count === 0) {
      const stmt = this.db.prepare(`
        INSERT INTO users (id, name, username, password, role, permissions) 
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      // Insert additional users
      usersSeeds.forEach((user) => {
        stmt.run(
          user.id,
          user.name,
          user.username,
          bcryptjs.hashSync(user.password, 10),
          user.role,
          user.permissions
        )
      })
    }
  }

  private async seedCategories() {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `)

    categoriesSeed.forEach((category) => {
      stmt.run(
        category.id,
        category.name,
        category.description,
        category.createdAt,
        category.updatedAt
      )
    })
  }

  private async seedSuppliers() {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO suppliers (
        id, name, contactName, email, phone, address, description, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

    suppliersSeed.forEach((supplier) => {
      stmt.run(
        supplier.id,
        supplier.name,
        supplier.contactName,
        supplier.email,
        supplier.phone,
        supplier.address,
        supplier.description,
        supplier.isActive,
        supplier.createdAt,
        supplier.updatedAt
      )
    })
  }

  private async seedStocks() {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO stocks (
        id, name, description, category, quantity, unit, unitPrice, costPrice,
        supplierId, location, sku, status, reorderPoint, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stocksSeed.forEach((stock) => {
      stmt.run(
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
        stock.reorderPoint,
        stock.createdAt,
        stock.updatedAt
      )
    })
  }
}
