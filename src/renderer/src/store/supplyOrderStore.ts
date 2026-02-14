import { create } from 'zustand'
import { generatePrefixedUUID } from '../lib/uuid'
import { Stock } from '../pages/Stocks/types'
import { OrderItem, SupplyOrder } from '../pages/Supply/types'
import { useLogStore } from './activityLogStore'
import { useAuthStore } from './authStore'
import { useStockStore } from './stockStore'

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
  createOrderWithItems: (
    order: Omit<SupplyOrder, 'id' | 'createdAt' | 'updatedAt'>,
    items: Omit<OrderItem, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>[]
  ) => Promise<{ orderId: string | null; error?: string }>
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
        const supplierResponse = await window.context.suppliers.getById(order.supplierId)
        const supplierName = supplierResponse.success
          ? supplierResponse.supplier?.name
          : 'Unknown Supplier'

        const newOrder = {
          ...order,
          id: response.orderId,
          supplierName: supplierName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as SupplyOrder

        set((state) => ({
          orders: [newOrder, ...state.orders]
        }))

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

  createOrderWithItems: async (order, items) => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.supplyOrders.create(order)
      if (!response.success || !response.orderId) {
        set({ error: response.message || 'Failed to create order' })
        return { orderId: null, error: response.message || 'Failed to create order' }
      }

      const orderId = response.orderId

      const createdItems: OrderItem[] = []
      for (const item of items) {
        const itemResponse = await window.context.supplyOrders.addItem({
          ...item,
          orderId
        })
        if (itemResponse.success && itemResponse.itemId) {
          createdItems.push({
            ...item,
            id: itemResponse.itemId,
            orderId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as OrderItem)
        }
      }

      if (order.status === 'Delivered' && createdItems.length > 0) {
        const stockStore = useStockStore.getState()
        const { updateStock, addStock, fetchStocks } = stockStore

        await fetchStocks()
        const freshStocks = useStockStore.getState().stocks

        for (const item of createdItems) {
          if (item.stockId) {
            const stock = freshStocks.find((s) => s.id === item.stockId)
            if (stock) {
              const newQuantity = (stock.quantity || 0) + item.quantity
              await updateStock({
                ...stock,
                quantity: newQuantity,
                costPrice: item.unitPrice,
                status:
                  newQuantity <= 0
                    ? 'Out of Stock'
                    : newQuantity <= stock.reorderPoint
                      ? 'Critical Low'
                      : 'In Stock'
              } as Stock)
            }
          } else {
            const now = new Date().toISOString()
            const newStock: Stock = {
              id: generatePrefixedUUID('stk'),
              name: item.name,
              description: item.description || '',
              category: item.category || 'Uncategorized',
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              costPrice: item.unitPrice,
              supplierId: order.supplierId,
              location: '',
              sku: item.sku,
              status: item.quantity <= 0 ? 'Out of Stock' : 'In Stock',
              reorderPoint: Math.ceil(item.quantity * 0.2),
              createdAt: now,
              updatedAt: now
            }
            await addStock(newStock)
          }
        }
      }

      const supplierResponse = await window.context.suppliers.getById(order.supplierId)
      const supplierName = supplierResponse.success
        ? supplierResponse.supplier?.name
        : 'Unknown Supplier'

      const newOrder = {
        ...order,
        id: orderId,
        supplierName: supplierName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as SupplyOrder

      set((state) => ({
        orders: [newOrder, ...state.orders]
      }))

      const currentUser = useAuthStore.getState().user
      if (currentUser) {
        const logEntry = {
          id: generatePrefixedUUID('log'),
          userId: currentUser.id,
          username: currentUser.username,
          action: 'create',
          entityType: 'supplyOrder',
          entityId: orderId,
          details: `Created supply order with ${items.length} items from ${supplierName}`,
          timestamp: new Date().toISOString()
        }
        useLogStore.getState().createLog(logEntry)
      }

      return { orderId }
    } catch (error) {
      console.error('Failed to create order with items:', error)
      set({ error: 'Failed to create order with items' })
      return { orderId: null, error: 'Failed to create order with items' }
    } finally {
      set({ loading: false })
    }
  },

  createOrderItem: async (item) => {
    set({ loading: true, error: null })
    try {
      // **SMART MERGE: Check if item already exists with same stockId AND unitPrice**
      const existingItems = get().orderItems
      const existingItem = existingItems.find(
        (existing) =>
          existing.orderId === item.orderId &&
          existing.stockId === item.stockId &&
          existing.unitPrice === item.unitPrice // ← Also check price
      )

      if (existingItem) {
        // **MERGE: Same item, same price (same batch)**
        const updatedQuantity = existingItem.quantity + item.quantity
        const updateSuccess = await get().updateOrderItem(existingItem.id, {
          quantity: updatedQuantity
        })

        if (updateSuccess) {
          const currentUser = useAuthStore.getState().user
          if (currentUser) {
            const logEntry = {
              id: generatePrefixedUUID('log'),
              userId: currentUser.id,
              username: currentUser.username,
              action: 'update',
              entityType: 'orderItem',
              entityId: existingItem.id,
              details: `Merged item quantity: ${item.name} (${existingItem.quantity} + ${item.quantity} = ${updatedQuantity} ${item.unit} @ ₱${item.unitPrice.toFixed(2)})`,
              timestamp: new Date().toISOString()
            }
            useLogStore.getState().createLog(logEntry)
          }
          return existingItem.id
        } else {
          return null
        }
      }

      // **ADD NEW: Item doesn't exist OR different price (different batch)**
      const response = await window.context.supplyOrders.addItem(item)
      if (response.success && response.itemId) {
        const newItem = {
          ...item,
          id: response.itemId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as OrderItem

        set((state) => ({
          orderItems: [...state.orderItems, newItem]
        }))

        if (get().currentOrder) {
          const totalCost = get().currentOrder!.totalCost + item.quantity * item.unitPrice
          get().updateOrder(get().currentOrder!.id, { totalCost })
        }

        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'create',
            entityType: 'orderItem',
            entityId: response.itemId,
            details: `Added new item to order: ${item.name} (${item.quantity} ${item.unit} @ ₱${item.unitPrice.toFixed(2)})`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
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
      const currentOrder = get().currentOrder
      const oldStatus = currentOrder?.status

      if (data.status === 'Delivered' && oldStatus !== 'Delivered') {
        const orderItems = get().orderItems
        if (orderItems.length > 0) {
          const stockStore = useStockStore.getState()
          const { updateStock, addStock, fetchStocks } = stockStore

          await fetchStocks()
          const stocks = useStockStore.getState().stocks

          for (const item of orderItems) {
            if (item.stockId) {
              const stockToUpdate = stocks.find((stock) => stock.id === item.stockId)
              if (stockToUpdate) {
                const updatedStock = {
                  ...stockToUpdate,
                  quantity: stockToUpdate.quantity + item.quantity,
                  costPrice: item.unitPrice,
                  status:
                    stockToUpdate.quantity + item.quantity <= 0
                      ? 'Out of Stock'
                      : stockToUpdate.quantity + item.quantity <= stockToUpdate.reorderPoint
                        ? 'Critical Low'
                        : 'In Stock'
                }
                await updateStock(updatedStock as Stock)
              }
            } else {
              const now = new Date().toISOString()
              const newStock: Stock = {
                id: generatePrefixedUUID('stk'),
                name: item.name,
                description: item.description || '',
                category: item.category || 'Uncategorized',
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                costPrice: item.unitPrice,
                supplierId: currentOrder?.supplierId || '',
                location: '',
                sku: item.sku,
                status: item.quantity <= 0 ? 'Out of Stock' : 'In Stock',
                reorderPoint: Math.ceil(item.quantity * 0.2),
                createdAt: now,
                updatedAt: now
              }
              await addStock(newStock)
            }
          }
        }

        data.deliveredAt = new Date().toISOString()
      }

      const response = await window.context.supplyOrders.update(id, data)
      if (response.success) {
        const existingOrder = get().orders.find((o) => o.id === id) || get().currentOrder
        const updatedOrder = { ...existingOrder, ...data }

        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, ...data, updatedAt: new Date().toISOString() } : order
          ),
          currentOrder:
            state.currentOrder?.id === id
              ? { ...state.currentOrder, ...data, updatedAt: new Date().toISOString() }
              : state.currentOrder
        }))

        const currentUser = useAuthStore.getState().user
        if (currentUser && updatedOrder) {
          let logDetails = `Updated supply order: #${id}`

          if (data.status) {
            logDetails += ` - Status changed to: ${data.status}`
            if (data.status === 'Delivered') {
              logDetails += ` - Stock quantities have been updated`
            }
          }

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
      const currentOrder = get().currentOrder
      const oldItem = get().orderItems.find((item) => item.id === id)

      const response = await window.context.supplyOrders.updateItem(id, data)
      if (response.success) {
        set((state) => ({
          orderItems: state.orderItems.map((item) =>
            item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item
          )
        }))

        if (get().currentOrder && (data.quantity !== undefined || data.unitPrice !== undefined)) {
          const items = get().orderItems.map((item) =>
            item.id === id ? { ...item, ...data } : item
          )
          const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
          get().updateOrder(get().currentOrder!.id, { totalCost })
        }

        const currentUser = useAuthStore.getState().user
        if (currentUser && oldItem) {
          const itemName = oldItem.name || 'Unknown'
          let details = `Updated item in order ${currentOrder?.id} | Product: ${itemName}`

          if (data.quantity !== undefined && oldItem.quantity !== data.quantity) {
            details += ` | Qty: ${oldItem.quantity} → ${data.quantity} ${oldItem.unit}`
          }

          if (data.unitPrice !== undefined && oldItem.unitPrice !== data.unitPrice) {
            details += ` | Price: ₱${oldItem.unitPrice.toFixed(2)} → ₱${data.unitPrice.toFixed(2)}`
          }

          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'update',
            entityType: 'orderItem',
            entityId: id,
            details: details,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
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
      const orderToDelete = get().orders.find((order) => order.id === id) || get().currentOrder
      const response = await window.context.supplyOrders.delete(id)
      if (response.success) {
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id),
          currentOrder: state.currentOrder?.id === id ? null : state.currentOrder,
          orderItems: state.currentOrder?.id === id ? [] : state.orderItems
        }))

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
      const itemToRemove = get().orderItems.find((item) => item.id === id)
      const currentOrder = get().currentOrder

      const response = await window.context.supplyOrders.deleteItem(id)
      if (response.success) {
        set((state) => ({
          orderItems: state.orderItems.filter((item) => item.id !== id)
        }))

        if (currentOrder && itemToRemove) {
          const itemCost = itemToRemove.quantity * itemToRemove.unitPrice
          const updatedTotalCost = currentOrder.totalCost - itemCost
          get().updateOrder(currentOrder.id, { totalCost: Math.max(0, updatedTotalCost) })

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
