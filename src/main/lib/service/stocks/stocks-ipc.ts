import { ipcMain } from 'electron'
import { StocksService } from './stocks-service'

const stocksService = new StocksService()

export function setupStocksIPC() {
  ipcMain.handle('stocks:getAll', async () => {
    try {
      const stocks = await stocksService.getStocks()
      return { success: true, stocks }
    } catch (error) {
      console.error('Error fetching stocks:', error)
      return { success: false, message: 'Failed to fetch stocks' }
    }
  })

  ipcMain.handle('stocks:getById', async (_, id: string) => {
    try {
      const stock = await stocksService.getStockById(id)
      return { success: true, stock }
    } catch (error) {
      console.error('Error checking stock name:', error)
      return { success: false, message: 'Failed to check stock name' }
    }
  })

  ipcMain.handle('stocks:getByName', async (_, name: string, excludeId?: string) => {
    try {
      const exists = await stocksService.getStockByName(name, excludeId)
      return { success: true, exists }
    } catch (error) {
      console.error('Error checking stock name:', error)
      return { success: false, message: 'Failed to check stock name' }
    }
  })

  ipcMain.handle('stocks:add', async (_, stock) => {
    try {
      // First check if the name exists
      if (stocksService.getStockByName(stock.name)) {
        return {
          success: false,
          message: 'A stock with this name already exists'
        }
      }

      const stockId = await stocksService.addStock(stock)

      if (stockId) {
        return { success: true, stockId }
      } else {
        return { success: false, message: 'Failed to add stock' }
      }
    } catch (error) {
      console.error('Error adding stock:', error)
      return { success: false, message: 'Something went wrong. Failed to add stock' }
    }
  })

  ipcMain.handle('stocks:update', async (_, stock) => {
    try {
      if (stocksService.getStockByName(stock.name, stock.id)) {
        return {
          success: false,
          message: 'A stock with this name already exists'
        }
      }

      const response = await stocksService.updateStock(stock)

      if (!response) {
        return { success: false, message: 'Failed to update stock' }
      }

      return { success: true, message: "Update stock successful!" }
    } catch (error) {
      console.error('Error updating stock:', error)
      return { success: false, message: 'Failed to update stock' }
    }
  })

  ipcMain.handle('stocks:delete', async (_, id) => {
    try {
      const success = await stocksService.deleteStock(id)
      return { success }
    } catch (error) {
      console.error('Error deleting stock:', error)
      return { success: false, message: 'Failed to delete stock' }
    }
  })
}
