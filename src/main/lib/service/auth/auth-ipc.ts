import { ipcMain } from 'electron'
import { authService } from './auth-service'
import { session } from 'electron'
import { User } from './auth-repo'

export function setupAuthIPC() {
  ipcMain.handle('auth:test', () => console.log('Auth Test'))

  // Login handler
  ipcMain.handle('auth:login', async (_, username, password) => {
    try {
      // Validate user
      const user = await authService.validateUser(username, password)
      if (!user) {
        return { success: false, message: 'Invalid username or password' }
      }

      // Generate token
      const token = authService.generateToken(user)

      // Store token in cookie
      await session.defaultSession.cookies.set({
        url: 'http://localhost',
        name: 'token',
        value: token,
        httpOnly: true
      })

      // Return success with user info
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
          profile_image: user.profile_image || ''
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Authentication failed' }
    }
  })

  ipcMain.handle('auth:check', async () => {
    try {
      const cookie = await session.defaultSession.cookies.get({
        name: 'token',
        url: 'http://localhost'
      })

      if (cookie.length > 0) {
        const token = cookie[0].value
        const decoded = authService.verifyToken(token)
        if (decoded) {
          // Return user info from token
          return {
            success: true,
            user: {
              id: decoded.userId,
              username: decoded.username,
              role: decoded.role,
              permissions: decoded.permissions
            }
          }
        }
      }
      return { success: false }
    } catch (error) {
      console.error('Auth check error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('auth:refreshToken', async () => {
    try {
      const cookie = await session.defaultSession.cookies.get({
        name: 'token',
        url: 'http://localhost'
      })

      if (cookie.length > 0) {
        const token = cookie[0].value
        const decoded = authService.verifyToken(token)

        if (decoded && decoded.userId) {
          // Generate a new token
          const newToken = await authService.refreshToken(decoded.userId)

          if (newToken) {
            // Update token in cookie
            await session.defaultSession.cookies.set({
              url: 'http://localhost',
              name: 'token',
              value: newToken,
              httpOnly: true
            })

            // Return success with updated user info
            const updatedUser = authService.verifyToken(newToken)

            if (updatedUser) {
              return { success: true }
            } else {
              return { success: false, message: 'Failed to decode new token' }
            }
          }
        }
      }

      return { success: false, message: 'Failed to refresh token' }
    } catch (error) {
      console.error('Token refresh error:', error)
      return { success: false, message: 'Token refresh failed' }
    }
  })

  ipcMain.handle('auth:logout', async () => {
    try {
      const cookie = await session.defaultSession.cookies.get({
        name: 'token',
        url: 'http://localhost'
      })

      if (cookie.length > 0) {
        await session.defaultSession.cookies.remove('http://localhost', 'token')
        return true
      }

      return false
    } catch (error) {
      return false
    }
  })

  ipcMain.handle('auth:getUser', async (_, id: string) => {
    return await authService.getUserById(id)
  })

  ipcMain.handle('users:getAll', () => {
    return authService.getUsers()
  })

  ipcMain.handle('users:add', async (_, userData: Omit<User, 'id'>) => {
    return await authService.createUser(userData)
  })

  ipcMain.handle('users:update', async (_, id: string, userData: User) => {
    return await authService.updateUser(id, userData)
  })

  ipcMain.handle('users:delete', (_, id: string) => {
    return authService.deleteUser(id)
  })
}
