import { ipcMain } from 'electron'
import { SupplyOrdersService } from './supplyOrders-service'
import DatabaseManager from '../../database/database'
import { SupplyOrder, OrderItem, SupplyOrdersRepository } from './supplyOrders-repo'

export function registerSupplyOrdersIpc(supplyOrdersService: SupplyOrdersService) {
  // Get all orders
  ipcMain.handle('supplyOrders:getAll', async () => {
    try {
      const orders = await supplyOrdersService.getAllOrders()
      return { success: true, orders }
    } catch (error) {
      console.error('IPC Error - supplyOrders:getAll:', error)
      return { success: false, message: 'Failed to fetch orders' }
    }
  })

  // Get order by ID
  ipcMain.handle('supplyOrders:getById', async (_, id: string) => {
    try {
      const order = await supplyOrdersService.getOrderById(id)
      return { success: true, order }
    } catch (error) {
      console.error('IPC Error - supplyOrders:getById:', error)
      return { success: false, message: 'Failed to fetch order' }
    }
  })

  // Get items by order ID
  ipcMain.handle('supplyOrders:getItems', async (_, orderId: string) => {
    try {
      const items = await supplyOrdersService.getItemsByOrderId(orderId)
      return { success: true, items }
    } catch (error) {
      console.error('IPC Error - supplyOrders:getItems:', error)
      return { success: false, message: 'Failed to fetch order items' }
    }
  })

  // Create a new order
  ipcMain.handle(
    'supplyOrders:create',
    async (_, order: Omit<SupplyOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const result = await supplyOrdersService.createOrder(order)
        return result
      } catch (error) {
        console.error('IPC Error - supplyOrders:create:', error)
        return { success: false, message: 'Failed to create order' }
      }
    }
  )

  // Add an item to an order
  ipcMain.handle(
    'supplyOrders:addItem',
    async (_, item: Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const result = await supplyOrdersService.createOrderItem(item)
        return result
      } catch (error) {
        console.error('IPC Error - supplyOrders:addItem:', error)
        return { success: false, message: 'Failed to add order item' }
      }
    }
  )

  // Update an order
  ipcMain.handle('supplyOrders:update', async (_, id: string, order: Partial<SupplyOrder>) => {
    try {
      const success = await supplyOrdersService.updateOrder(id, order)
      return {
        success,
        message: success ? 'Order updated successfully' : 'Failed to update order'
      }
    } catch (error) {
      console.error('IPC Error - supplyOrders:update:', error)
      return { success: false, message: 'Failed to update order' }
    }
  })

  // Update an order item
  ipcMain.handle('supplyOrders:updateItem', async (_, id: string, item: Partial<OrderItem>) => {
    try {
      const success = await supplyOrdersService.updateOrderItem(id, item)
      return {
        success,
        message: success ? 'Order item updated successfully' : 'Failed to update order item'
      }
    } catch (error) {
      console.error('IPC Error - supplyOrders:updateItem:', error)
      return { success: false, message: 'Failed to update order item' }
    }
  })

  // Delete an order
  ipcMain.handle('supplyOrders:delete', async (_, id: string) => {
    try {
      const success = await supplyOrdersService.deleteOrder(id)
      return {
        success,
        message: success ? 'Order deleted successfully' : 'Failed to delete order'
      }
    } catch (error) {
      console.error('IPC Error - supplyOrders:delete:', error)
      return { success: false, message: 'Failed to delete order' }
    }
  })

  // Delete an order item
  ipcMain.handle('supplyOrders:deleteItem', async (_, id: string) => {
    try {
      const success = await supplyOrdersService.deleteOrderItem(id)
      return {
        success,
        message: success ? 'Order item deleted successfully' : 'Failed to delete order item'
      }
    } catch (error) {
      console.error('IPC Error - supplyOrders:deleteItem:', error)
      return { success: false, message: 'Failed to delete order item' }
    }
  })
}

export function setupSupplyOrdersIPC(): void {
  const db = DatabaseManager.getInstance().getDatabase()
  const supplyOrdersRepo = new SupplyOrdersRepository(db)
  const supplyOrdersService = new SupplyOrdersService(supplyOrdersRepo)

  registerSupplyOrdersIpc(supplyOrdersService)
}
