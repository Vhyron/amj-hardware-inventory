import { SupplyOrder, OrderItem, SupplyOrdersRepository } from './supplyOrders-repo'

export class SupplyOrdersService {
  constructor(private repo: SupplyOrdersRepository) {}

  async getAllOrders(): Promise<SupplyOrder[]> {
    return this.repo.getAll()
  }

  async getOrderById(id: string): Promise<SupplyOrder | null> {
    return this.repo.getById(id)
  }

  async getItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    return this.repo.getItemsByOrderId(orderId)
  }

  async createOrder(
    order: Omit<SupplyOrder, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; orderId?: string; message?: string }> {
    return this.repo.createOrder(order)
  }

  async createOrderItem(
    item: Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; itemId?: string; message?: string }> {
    return this.repo.createOrderItem(item)
  }

  async updateOrder(id: string, order: Partial<SupplyOrder>): Promise<boolean> {
    return this.repo.updateOrder(id, order)
  }

  async updateOrderItem(id: string, item: Partial<OrderItem>): Promise<boolean> {
    return this.repo.updateOrderItem(id, item)
  }

  async deleteOrder(id: string): Promise<boolean> {
    return this.repo.deleteOrder(id)
  }

  async deleteOrderItem(id: string): Promise<boolean> {
    return this.repo.deleteOrderItem(id)
  }
}
