import { assert } from 'console'
import DatabaseManager from '../../database/database'
import { generatePrefixedUUID } from '../../database/utils/uuid'

export interface Category {
  id: string
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

interface RunResult {
  lastID: number
  changes: number
}

export class CategoriesRepository {
  private db = DatabaseManager.getInstance().getDatabase()

  insertCategory(category: Category): string | null {
    try {
      assert(category.name, 'Name is required')
      
      // Generate ID if not provided
      if (!category.id) {
        category.id = generatePrefixedUUID('cat')
      }
      
      const now = new Date().toISOString()
      
      const stmt = this.db.prepare(
        'INSERT INTO categories (id, name, description, createdAt, updatedAt) VALUES (?,?,?,?,?)'
      )

      const info = stmt.run(
        category.id,
        category.name,
        category.description || '',
        category.createdAt || now,
        category.updatedAt || now
      ) as unknown as RunResult

      console.log(info)
      
      return category.id
    } catch (error) {
      console.log('Error insertCategory: ', error)
      return null
    }
  }

  checkCategoryNameExists(name: string, excludeId?: string): boolean {
    try {
      let query = 'SELECT COUNT(*) as count FROM categories WHERE LOWER(name) = LOWER(?)'
      let params = [name]

      // If we're updating an existing category, exclude its ID from the check
      if (excludeId) {
        query += ' AND id != ?'
        params.push(excludeId)
      }

      const stmt = this.db.prepare(query)
      const result = stmt.get(...params) as { count: number }
      
      return result && result.count > 0
    } catch (error: any) {
      console.error('Error in checkCategoryNameExists:', error)
      throw new Error(`Failed to check if category name exists: ${error.message}`);
    }
  }

  getAllCategories(): Category[] {
    const stmt = this.db.prepare('SELECT * FROM categories')
    const categories = stmt.all() as unknown as Category[]
    assert(Array.isArray(categories), 'Expected categories to be an array')
    return categories
  }

  updateCategory(category: Category): boolean {
    try {
      assert(category.id, 'ID is required for updating category')
      const now = new Date().toISOString()
      
      const stmt = this.db.prepare(
        'UPDATE categories SET name = ?, description = ?, updatedAt = ? WHERE id = ?'
      )
      
      const result = stmt.run(
        category.name,
        category.description || '',
        category.updatedAt || now,
        category.id
      ) as unknown as RunResult

      return result.changes > 0
    } catch (error) {
      console.log('Error updateCategory: ', error)
      return false
    }
  }

  deleteCategory(id: string): boolean {
    try {
      assert(id, 'ID is required for deleting category')
      const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?')
      const result = stmt.run(id) as unknown as RunResult
      return result.changes > 0
    } catch (error) {
      console.log('Error deleteCategory: ', error)
      return false
    }
  }
}

export const categoriesRepo = new CategoriesRepository()