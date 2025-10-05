import { stocksRepo, Stock } from './stocks-repo'

export class StocksService {
  getStocks() {
    return stocksRepo.getAllStocks()
  }

  getStockById(id: string) {
    return stocksRepo.getById(id)
  }
  
  getStockByName(name: string, excludeId?: string) {
    return stocksRepo.checkStockNameExists(name, excludeId)
  }

  addStock(stock: Stock): string | null {
    return stocksRepo.insertStock(stock)
  }

  updateStock(stock: Stock): boolean {
    return stocksRepo.updateStock(stock)
  }

  deleteStock(id: string): boolean {
    return stocksRepo.deleteStock(id)
  }
}
