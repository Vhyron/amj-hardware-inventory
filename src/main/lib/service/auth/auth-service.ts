import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { authRepo, User } from './auth-repo'
import { generatePrefixedUUID } from '../../database/utils/uuid'

const JWT_SECRET = 'your-secret-key'

export class AuthService {
  async validateUser(username: string, password: string) {
    const user = authRepo.getUserByUsername(username)
    if (!user) return null

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) return null

    const { password: _, ...result } = user

    return {
      ...result,
      permissions: result.permissions !== '*' ? JSON.parse(result.permissions) : result.permissions
    }
  }

  generateToken(user: Omit<User, 'password'>) {
    // Handle permissions properly whether they're a string or an array
    let permissions = user.permissions;
    
    // If permissions is a string but not the wildcard '*', parse it
    if (typeof permissions === 'string' && permissions !== '*') {
      try {
        permissions = JSON.parse(permissions);
      } catch (error) {
        // If it's not valid JSON, assume it's already the correct format
        // This handles the case where permissions might be a single string permission
        permissions = permissions;
      }
    }

    return jwt.sign(
      {
        userId: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        permissions
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    )
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return null
    }
  }

  async createUser(userData: Omit<User, 'id'>) {
    // Check if username exists
    const existingUser = authRepo.getUserByUsername(userData.username)
    if (existingUser) {
      return {
        success: false,
        userId: null,
        message: 'Username already exists'
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10)

    // Store permissions as JSON string
    let permissions = userData.permissions;
    if (permissions !== '*' && typeof permissions !== 'string') {
      permissions = JSON.stringify(permissions);
    }

    const userId = generatePrefixedUUID('usr')

    authRepo.insertUser({
      ...userData,
      id: userId,
      password: hashedPassword,
      permissions
    })

    return {
      success: true,
      userId: userId,
      message: 'User created successfully'
    }
  }

  getUsers() {
    const users = authRepo.getAllUsers()
    return users.map((user) => ({
      ...user,
      permissions: user.permissions !== '*' ? JSON.parse(user.permissions) : user.permissions
    }))
  }

  async updateUser(id: string, userData: Partial<User>) {
    // Only check username if it's being updated
    if (userData.username) {
      const existingUser = authRepo.checkUsernameExists(userData.username, id)
      if (existingUser) {
        return false
      }
    }

    // If password is being updated, hash it
    if (userData?.password) {
      userData.password = await bcrypt.hash(userData.password, 10)
    }

    // Convert permissions array to string if needed
    if (userData?.permissions && typeof userData.permissions !== 'string') {
      userData.permissions = JSON.stringify(userData.permissions)
    }

    return authRepo.updateUser(id, userData)
  }

  deleteUser(id: string) {
    return authRepo.deleteUser(id)
  }

  async refreshToken(userId: string) {
    // Get the user from database
    const user = await this.getUserById(userId)
    if (!user) return null
    
    // Generate a new token with updated user info
    const { password: _password, profile_image: _profileImage, ...userWithoutPassword } = user

    return this.generateToken(userWithoutPassword)
  }
  
  async getUserById(id: string) {
    // Get user by ID, similar to getUserByUsername
    const user = authRepo.getUserById(id)
    if (!user) return null
    
    return user
  }
}

export const authService = new AuthService()
