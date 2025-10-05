import { create } from 'zustand'
import { SupplyOrder, OrderItem } from '../pages/Supply/types'
import { useStockStore } from './stockStore'
import { generatePrefixedUUID } from '../lib/uuid'
import { useLogStore } from './activityLogStore'
import { useAuthStore } from './authStore'
import { Stock } from '../pages/Stocks/types'

interface SupplyOrderState {
  orders: SupplyOrder[]
  currentOrder: SupplyOrder | null
  orderItems: OrderItem[]
  loading: boolean
  error: string | null | any

  setOrders: (orders: SupplyOrder[]) => void
  setCurrentOrder: (order: SupplyOrder | null) => void
  setOrderItems: (items: OrderItem[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  fetchOrders: () => Promise<void>
  fetchOrderById: (id: string) => Promise<SupplyOrder | null>
  fetchOrderItems: (orderId: string) => Promise<void>
  createOrder: (
    order: Omit<SupplyOrder, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string | null>
  createOrderItem: (
    item: Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string | null>
  updateOrder: (id: string, data: Partial<SupplyOrder>) => Promise<boolean>
  updateOrderItem: (id: string, data: Partial<OrderItem>) => Promise<boolean>
  deleteOrder: (id: string) => Promise<boolean>
  deleteOrderItem: (id: string) => Promise<boolean>
}

export const useSupplyOrderStore = create<SupplyOrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  orderItems: [],
  loading: false,
  error: null,

  setOrders: (orders) => set({ orders }),
  setCurrentOrder: (order) => set({ currentOrder: order }),
  setOrderItems: (items) => set({ orderItems: items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchOrders: async () => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.supplyOrders.getAll()
      if (response.success) {
        set({ orders: response.orders })
      } else {
        set({ error: response.message || 'Failed to fetch orders' })
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      set({ error: 'Failed to fetch orders' })
    } finally {
      set({ loading: false })
    }
  },

  fetchOrderById: async (id) => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.supplyOrders.getById(id)
      if (response.success && response.order) {
        set({ currentOrder: response.order })
        return response.order
      } else {
        set({ error: response.message || 'Failed to fetch order' })
        return null
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
      set({ error: 'Failed to fetch order' })
      return null
    } finally {
      set({ loading: false })
    }
  },

  fetchOrderItems: async (orderId) => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.supplyOrders.getItems(orderId)
      if (response.success) {
        set({ orderItems: response.items })
      } else {
        set({ error: response.message || 'Failed to fetch order items' })
      }
    } catch (error) {
      console.error('Failed to fetch order items:', error)
      set({ error: 'Failed to fetch order items' })
    } finally {
      set({ loading: false })
    }
  },

  createOrder: async (order) => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.supplyOrders.create(order)
      if (response.success && response.orderId) {
        // Fetch the supplier name
        const supplierResponse = await window.context.suppliers.getById(order.supplierId)
        const supplierName = supplierResponse.success
          ? supplierResponse.supplier?.name
          : 'Unknown Supplier'

        // Update the orders list with the new order
        const newOrder = {
          ...order,
          id: response.orderId,
          supplierName: supplierName, // Include the supplier name
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as SupplyOrder

        set((state) => ({
          orders: [newOrder, ...state.orders]
        }))

        // Create activity log after successful order creation
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'create',
            entityType: 'supplyOrder',
            entityId: response.orderId,
            details: `Created new supply order: from ${supplierName}`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }

        return response.orderId
      } else {
        set({ error: response.message || 'Failed to create order' })
        return null
      }
    } catch (error) {
      console.error('Failed to create order:', error)
      set({ error: 'Failed to create order' })
      return null
    } finally {
      set({ loading: false })
    }
  },

  createOrderItem: async (item) => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.supplyOrders.addItem(item)
      if (response.success && response.itemId) {
        // Add the new item to the items list
        const newItem = {
          ...item,
          id: response.itemId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as OrderItem

        set((state) => ({
          orderItems: [...state.orderItems, newItem]
        }))

        // Update the current order's total cost
        if (get().currentOrder) {
          const updatedTotalCost = get().currentOrder!.totalCost + item.quantity * item.unitPrice
          get().updateOrder(get().currentOrder!.id, { totalCost: updatedTotalCost })
        }

        return response.itemId
      } else {
        set({ error: response.message || 'Failed to add order item' })
        return null
      }
    } catch (error) {
      console.error('Failed to add order item:', error)
      set({ error: 'Failed to add order item' })
      return null
    } finally {
      set({ loading: false })
    }
  },

  updateOrder: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.supplyOrders.update(id, data)
      if (response.success) {
        // Check if status is being updated to "Delivered"
        if (data.status === 'Delivered') {
          // Get the order items to update the stock
          const orderItems = get().orderItems
          const currentOrder = get().currentOrder

          if (orderItems.length > 0) {
            // Get stockStore to update stock quantities
            const stockStore = useStockStore.getState()
            const { stocks, updateStock, addStock } = stockStore

            // Process each order item
            for (const item of orderItems) {
              if (item.stockId) {
                // Case 1: Item has a stockId - Update existing stock
                const stockToUpdate = stocks.find((stock) => stock.id === item.stockId)
                if (stockToUpdate) {
                  // Update stock quantity by adding the ordered quantity
                  const updatedStock = {
                    ...stockToUpdate,
                    quantity: stockToUpdate.quantity + item.quantity,
                    // Update status based on new quantity
                    status:
                      stockToUpdate.quantity + item.quantity <= 0
                        ? 'Out of Stock'
                        : stockToUpdate.quantity + item.quantity <= stockToUpdate.reorderPoint
                          ? 'Critical Low'
                          : 'In Stock'
                  }
                  // Update the stock in the database
                  await updateStock(updatedStock as Stock)
                }
              } else {
                // Case 2: Item doesn't have stockId - Create new stock entry
                const now = new Date().toISOString()

                // Create a new stock entry based on the order item
                const newStock: Stock = {
                  id: generatePrefixedUUID('stk'),
                  name: item.name,
                  description: item.description || '',
                  category: item.category || 'Uncategorized',
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPrice: item.unitPrice, // Set selling price same as buying price initially
                  costPrice: item.unitPrice,
                  supplierId: currentOrder?.supplierId || '',
                  location: '',
                  sku: item.sku,
                  status: item.quantity <= 0 ? 'Out of Stock' : 'In Stock',
                  reorderPoint: Math.ceil(item.quantity * 0.2), // Setting a default reorder point at 20% of initial quantity
                  createdAt: now,
                  updatedAt: now
                }

                // Add the new stock to the database
                await addStock(newStock)
              }
            }
          }

          // Update deliveredAt timestamp for the order
          data.deliveredAt = new Date().toISOString()
        }

        // Get order details for logging
        const existingOrder = get().orders.find((o) => o.id === id) || get().currentOrder
        const updatedOrder = { ...existingOrder, ...data }

        // Update the order in the list and current order if it's the same
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, ...data, updatedAt: new Date().toISOString() } : order
          ),
          currentOrder:
            state.currentOrder?.id === id
              ? { ...state.currentOrder, ...data, updatedAt: new Date().toISOString() }
              : state.currentOrder
        }))

        // Create activity log after successful order update
        const currentUser = useAuthStore.getState().user
        if (currentUser && updatedOrder) {
          let logDetails = `Updated supply order: #${id}`

          // Add status change details if applicable
          if (data.status) {
            logDetails += ` - Status changed to: ${data.status}`

            // Special note for delivered orders
            if (data.status === 'Delivered') {
              logDetails += ` - Stock quantities have been updated`
            }
          }

          // Add total cost change if applicable
          if (data.totalCost !== undefined) {
            logDetails += ` - Total cost: ${data.totalCost}`
          }

          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'update',
            entityType: 'supplyOrder',
            entityId: id,
            details: logDetails,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }

        return true
      } else {
        set({ error: response.message || 'Failed to update order' })
        return false
      }
    } catch (error) {
      console.error('Failed to update order:', error)
      set({ error: 'Failed to update order' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  updateOrderItem: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.supplyOrders.updateItem(id, data)
      if (response.success) {
        // Update the item in the list
        set((state) => ({
          orderItems: state.orderItems.map((item) =>
            item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item
          )
        }))

        // If price or quantity has changed, update total cost
        if (get().currentOrder && (data.quantity !== undefined || data.unitPrice !== undefined)) {
          // Recalculate total cost based on all items
          const items = get().orderItems.map((item) =>
            item.id === id ? { ...item, ...data } : item
          )
          const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
          get().updateOrder(get().currentOrder!.id, { totalCost })
        }

        return true
      } else {
        set({ error: response.message || 'Failed to update order item' })
        return false
      }
    } catch (error) {
      console.error('Failed to update order item:', error)
      set({ error: 'Failed to update order item' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  deleteOrder: async (id) => {
    set({ loading: true, error: null })
    try {
      // Find order before deletion to include details in log
      const orderToDelete = get().orders.find((order) => order.id === id) || get().currentOrder

      const response = await window.context.supplyOrders.delete(id)
      if (response.success) {
        // Remove the order from the list
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id),
          // Reset currentOrder if it was the one deleted
          currentOrder: state.currentOrder?.id === id ? null : state.currentOrder,
          // Clear items if they belonged to the deleted order
          orderItems: state.currentOrder?.id === id ? [] : state.orderItems
        }))

        // Create activity log after successful order deletion
        const currentUser = useAuthStore.getState().user
        if (currentUser && orderToDelete) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'delete',
            entityType: 'supplyOrder',
            entityId: id,
            details: `Deleted supply order: #${id} from ${orderToDelete.supplierName || 'supplier'}`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }

        return true
      } else {
        set({ error: response.message || 'Failed to delete order' })
        return false
      }
    } catch (error) {
      console.error('Failed to delete order:', error)
      set({ error: 'Failed to delete order' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  deleteOrderItem: async (id) => {
    set({ loading: true, error: null })
    try {
      // Find the item to be removed for total cost calculation and logging
      const itemToRemove = get().orderItems.find((item) => item.id === id)
      const currentOrder = get().currentOrder

      const response = await window.context.supplyOrders.deleteItem(id)
      if (response.success) {
        // Remove the item from the list
        set((state) => ({
          orderItems: state.orderItems.filter((item) => item.id !== id)
        }))

        // Update the total cost of the current order
        if (currentOrder && itemToRemove) {
          const itemCost = itemToRemove.quantity * itemToRemove.unitPrice
          const updatedTotalCost = currentOrder.totalCost - itemCost
          get().updateOrder(currentOrder.id, { totalCost: Math.max(0, updatedTotalCost) })

          // Create activity log after successful item deletion
          const currentUser = useAuthStore.getState().user
          if (currentUser) {
            const logEntry = {
              id: generatePrefixedUUID('log'),
              userId: currentUser.id,
              username: currentUser.username,
              action: 'delete',
              entityType: 'orderItem',
              entityId: id,
              details: `Removed item from order #${currentOrder.id}: ${itemToRemove.name} (${itemToRemove.quantity} ${itemToRemove.unit})`,
              timestamp: new Date().toISOString()
            }
            useLogStore.getState().createLog(logEntry)
          }
        }

        return true
      } else {
        set({ error: response.message || 'Failed to delete order item' })
        return false
      }
    } catch (error) {
      console.error('Failed to delete order item:', error)
      set({ error: 'Failed to delete order item' })
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
