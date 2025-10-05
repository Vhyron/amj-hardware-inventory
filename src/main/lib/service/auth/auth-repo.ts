import { assert } from 'console'
import DatabaseManager from '../../database/database'

export interface User {
  id?: string
  name: string
  username: string
  password: string
  role: string
  permissions: string
  profile_image?: string
}

interface RunResult {
  lastID: number
  changes: number
}

export class AuthRepository {
  private db = DatabaseManager.getInstance().getDatabase()

  insertUser(user: User): number | null {
    try {
      assert(user.id, 'User ID is required')
      assert(user.name, 'Name is required')
      assert(user.username, 'Username is required')
      assert(user.password, 'Password is required')
      assert(user.role, 'Role is required')
      assert(user.permissions, 'Permissions are required')

      const stmt = this.db.prepare(
        'INSERT INTO users (id, name, username, password, role, permissions, profile_image) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      const info = stmt.run(
        user.id,
        user.name,
        user.username,
        user.password,
        user.role,
        user.permissions,
        user.profile_image || null
      ) as unknown as RunResult
      return info.lastID
    } catch (error) {
      console.log('Error insertUser: ', error)
      return null
    }
  }

  getAllUsers(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users')
    const users = stmt.all() as unknown as User[]
    assert(Array.isArray(users), 'Expected users to be an array')
    return users
  }

  getUserByUsername(username: string): User | null {
    assert(username, 'Username is required')
    const stmt = this.db.prepare(
      'SELECT id, name, username, password, role, permissions, profile_image FROM users WHERE username = ?'
    )
    const result = stmt.get(username) as unknown as User | undefined
    return result || null
  }

  getUserById(id: string): User | null {
    assert(id, 'User ID is required')
    const stmt = this.db.prepare(
      'SELECT id, name, username, password, role, permissions, profile_image FROM users WHERE id = ?'
    )
    const result = stmt.get(id) as unknown as User | undefined
    return result || null
  }

  checkUsernameExists(name: string, excludeId?: string): boolean {
    try {
      let query = 'SELECT COUNT(*) as count FROM users WHERE LOWER(username) = LOWER(?)'
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
      throw new Error(`Failed to check if stock name exists: ${error.message}`)
    }
  }

  updateUser(id: string, userData: Partial<User>): boolean {
    assert(id, 'User ID is required')
    assert(userData, 'User data is required')

    const fields: any = []
    const values: any = []

    if (userData?.name) {
      fields.push('name = ?')
      values.push(userData.name)
    }
    if (userData?.username) {
      fields.push('username = ?')
      values.push(userData.username)
    }
    if (userData?.password) {
      fields.push('password = ?')
      values.push(userData.password)
    }
    if (userData?.role) {
      fields.push('role = ?')
      values.push(userData.role)
    }
    if (userData?.permissions) {
      fields.push('permissions = ?')
      values.push(userData.permissions)
    }
    if (userData?.profile_image) {
      fields.push('profile_image = ?')
      values.push(userData.profile_image)
    }

    // If no fields to update, return true as it's not an error
    if (fields.length === 0) {
      return true
    }

    try {
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
      const stmt = this.db.prepare(query)
      const info = stmt.run(...values, id) as unknown as RunResult
      return info.changes > 0
    } catch (error) {
      console.error('Error updating user:', error)
      return false
    }
  }

  deleteUser(id: string): boolean {
    assert(id, 'User ID is required')
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?')
    const info = stmt.run(id) as unknown as RunResult
    return info.changes > 0
  }
}

export const authRepo = new AuthRepository()
