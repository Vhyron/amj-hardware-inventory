import { ipcMain } from 'electron'
import { SuppliersService } from './suppliers-service'
import DatabaseManager from '../../database/database'
import { Supplier, SuppliersRepository } from './suppliers-repo'

export function registerSupplierIpc(supplierService: SuppliersService) {
  // Get all suppliers
  ipcMain.handle('suppliers:getAll', async () => {
    try {
      const suppliers = await supplierService.getAll()
      return { success: true, suppliers }
    } catch (error) {
      console.error('IPC Error - suppliers:getAll:', error)
      return { success: false, message: 'Failed to fetch suppliers' }
    }
  })

  // Get supplier by ID
  ipcMain.handle('suppliers:getById', async (_, id: string) => {
    try {
      const supplier = await supplierService.getById(id)
      return { success: true, supplier }
    } catch (error) {
      console.error('IPC Error - suppliers:getById:', error)
      return { success: false, message: 'Failed to fetch supplier' }
    }
  })

  // Add a new supplier
  ipcMain.handle('suppliers:add', async (_, supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await supplierService.create(supplier)
      return result
    } catch (error) {
      console.error('IPC Error - suppliers:add:', error)
      return { success: false, message: 'Failed to add supplier' }
    }
  })

  // Update a supplier
  ipcMain.handle('suppliers:update', async (_, id: string, supplier: Partial<Supplier>) => {
    try {
      const success = await supplierService.update(id, supplier)
      return { success, message: success ? 'Supplier updated' : 'Failed to update supplier' }
    } catch (error) {
      console.error('IPC Error - suppliers:update:', error)
      return { success: false, message: 'Failed to update supplier' }
    }
  })

  // Delete a supplier
  ipcMain.handle('suppliers:delete', async (_, id: string) => {
    try {
      const success = await supplierService.delete(id)
      return { success, message: success ? 'Supplier deleted' : 'Failed to delete supplier' }
    } catch (error) {
      console.error('IPC Error - suppliers:delete:', error)
      return { success: false, message: 'Failed to delete supplier' }
    }
  })
}

export function setupSuppliersIPC(): void {
  const db = DatabaseManager.getInstance().getDatabase()
  const suppliersRepo = new SuppliersRepository(db)
  const suppliersService = new SuppliersService(suppliersRepo)
  
  registerSupplierIpc(suppliersService)
}