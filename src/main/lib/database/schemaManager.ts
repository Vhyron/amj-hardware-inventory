import Database from 'better-sqlite3'
import { usersSchema } from './schemas/users'
import { categoriesSchema } from './schemas/categories'
import { stocksSchema } from './schemas/stocks'
import { suppliersSchema } from './schemas/supplier'
import { supplyOrdersSchema, supplyOrderItemsSchema } from './schemas/supplyOrder'
import { transactionItemsSchema, transactionSchema } from './schemas/transactions'
import { activityLogsSchema } from './schemas/activityLogs'

export class SchemaManager {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  public async createTables() {
    try {
      // Create tables in the correct order to handle foreign key constraints
      this.db.exec(usersSchema)
      this.db.exec(categoriesSchema)
      this.db.exec(suppliersSchema)
      this.db.exec(stocksSchema)
      this.db.exec(supplyOrdersSchema)
      this.db.exec(supplyOrderItemsSchema)
      this.db.exec(transactionSchema)
      this.db.exec(transactionItemsSchema)
      this.db.exec(activityLogsSchema)
    } catch (error) {
      console.error('Error creating tables:', error)
      throw error
    }
  }
}
