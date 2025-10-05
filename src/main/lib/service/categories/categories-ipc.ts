import { ipcMain } from 'electron'
import { CategoriesService } from './categories-service'

const categoriesService = new CategoriesService()

export function setupCategoriesIPC() {
  ipcMain.handle('categories:getAll', async () => {
    try {
      const categories = await categoriesService.getCategories()
      return { success: true, categories }
    } catch (error) {
      console.error('Error fetching categories:', error)
      return { success: false, message: 'Failed to fetch categories' }
    }
  })

  ipcMain.handle('categories:getByName', async (_, name: string, excludeId?: string) => {
    try {
      const exists = await categoriesService.getCategoryByName(name, excludeId)
      return { success: true, exists }
    } catch (error) {
      console.error('Error checking category name:', error)
      return { success: false, message: 'Failed to check category name' }
    }
  })

  ipcMain.handle('categories:add', async (_, category) => {
    try {
      // First check if the name exists
      if (categoriesService.getCategoryByName(category.name)) {
        return {
          success: false,
          message: 'A category with this name already exists'
        }
      }

      const categoryId = await categoriesService.addCategory(category)

      if (categoryId) {
        return { success: true, categoryId }
      } else {
        return { success: false, message: 'Failed to add category' }
      }
    } catch (error) {
      console.error('Error adding category:', error)
      return { success: false, message: 'Something went wrong. Failed to add category' }
    }
  })

  ipcMain.handle('categories:update', async (_, category) => {
    try {
      if (categoriesService.getCategoryByName(category.name, category.id)) {
        return {
          success: false,
          message: 'A category with this name already exists'
        }
      }

      const response = await categoriesService.updateCategory(category)

      if (!response) {
        return { success: false, message: 'Failed to update category' }
      }

      return { success: true, message: "Update category successful!" }
    } catch (error) {
      console.error('Error updating category:', error)
      return { success: false, message: 'Failed to update category' }
    }
  })

  ipcMain.handle('categories:delete', async (_, id) => {
    try {
      const success = await categoriesService.deleteCategory(id)
      return { success }
    } catch (error) {
      console.error('Error deleting category:', error)
      return { success: false, message: 'Failed to delete category' }
    }
  })
}