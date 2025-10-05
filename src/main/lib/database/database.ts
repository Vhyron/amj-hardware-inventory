import Database from 'better-sqlite3'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { SchemaManager } from './schemaManager'
import { SeedManager } from './seedManager'

class DatabaseManager {
  private static instance: DatabaseManager
  private db: Database.Database
  private schemaManager: SchemaManager
  private seedManager: SeedManager
  private readonly REQUIRED_TABLES = [
    'users',
    'stocks',
    'categories',
    'suppliers',
    'supplyOrders',
    'orderItems',
    'transactions',
    'transactionItems',
    'activityLogs'
  ]

  private constructor() {
    // Use app.getPath('userData') to get the correct path for the database in packaged apps
    // DB will be saved to: .config/<AppName> (linux path)
    // for Windows it'll be stored in /Users/<username>/AppData/Roaming/project-name directory
    // if unsure just console.log the userDataPath below
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'inventory.db')

    // Ensure the directory exists
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.db.pragma('foreign_keys = ON')

    this.schemaManager = new SchemaManager(this.db)
    this.seedManager = new SeedManager(this.db)

    // Initialize database and tables
    this.initializeDatabase()
  }

  private initializeDatabase() {
    try {
      // Check if tables exist
      const tablesExist = this.checkTablesExist()

      if (!tablesExist) {
        // Only create tables and seed data if they don't exist
        this.schemaManager.createTables()
        this.seedManager.seedData() // comment this out if you want a clean db
      }
    } catch (error) {
      console.error('Error initializing database:', error)
      throw error
    }
  }

  private checkTablesExist(): boolean {
    try {
      // Check for the existence of all required tables in a single query
      const result = this.db
        .prepare(
          `
        SELECT COUNT(*) as count
        FROM sqlite_master
        WHERE type='table' AND name IN (${this.REQUIRED_TABLES.map(() => '?').join(',')})
      `
        )
        .get(...this.REQUIRED_TABLES) as { count: number }

      // All tables exist if the count matches the number of required tables
      return result.count === this.REQUIRED_TABLES.length
    } catch (error) {
      console.error('Error checking tables:', error)
      return false
    }
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  public getDatabase(): Database.Database {
    return this.db
  }

  public close(): void {
    this.db.close()
  }
}

export default DatabaseManager
