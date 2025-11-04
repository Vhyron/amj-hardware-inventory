import Database from 'better-sqlite3'
import { usersSchema } from './schemas/users.ts'
import { categoriesSchema } from './schemas/categories.ts'
import { stocksSchema } from './schemas/stocks.ts'
import { suppliersSchema } from './schemas/supplier.ts'
import { supplyOrdersSchema, supplyOrderItemsSchema } from './schemas/supplyOrder.ts'
import { transactionItemsSchema, transactionSchema } from './schemas/transactions.ts'
import { activityLogsSchema } from './schemas/activityLogs.ts'


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
