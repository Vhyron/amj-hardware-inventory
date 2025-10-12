import { ActivityLog } from '@/main/lib/service/activityLogs/activity-repo'
import { User } from '@/main/lib/service/auth/auth-repo'
import { contextBridge, ipcRenderer } from 'electron'

if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in the BrowserWindow')
}

try {
  contextBridge.exposeInMainWorld('context', {
    // Auth IPC methods
    auth: {
      authTest: () => ipcRenderer.invoke('auth:test'),
      login: async (username: string, password: string) =>
        await ipcRenderer.invoke('auth:login', username, password),
      register: (userData: {
        name: string
        username: string
        password: string
        role: string
        permissions: string
      }) => ipcRenderer.invoke('auth:register', userData),
      checkAuth: () => ipcRenderer.invoke('auth:check'),
      logout: () => ipcRenderer.invoke('auth:logout'),
      getUser: (id: string) => ipcRenderer.invoke('auth:getUser', id),
      refreshToken: (userId: string) => ipcRenderer.invoke('auth:refreshToken', userId)
    },
    users: {
      getAll: () => ipcRenderer.invoke('users:getAll'),
      add: (user: User) => ipcRenderer.invoke('users:add', user),
      update: (id: string, user: User) => ipcRenderer.invoke('users:update', id, user),
      delete: (id: string) => ipcRenderer.invoke('users:delete', id)
    },
    // Stocks IPC methods
    stocks: {
      getAll: () => ipcRenderer.invoke('stocks:getAll'),
      getById: (id: string) =>
        ipcRenderer.invoke('stocks:getById', id),
      getByName: (name: string, excludeId?: string) =>
        ipcRenderer.invoke('stocks:getByName', name, excludeId),
      add: (stock: any) => ipcRenderer.invoke('stocks:add', stock),
      update: (stock: any) => ipcRenderer.invoke('stocks:update', stock),
      delete: (id: string) => ipcRenderer.invoke('stocks:delete', id),
      updateQuantity: (stockId: string, quantity: number, operation: 'add' | 'subtract') => 
    ipcRenderer.invoke('stocks:updateQuantity', stockId, quantity, operation)
    },
    // Categories IPC methods
    categories: {
      getAll: () => ipcRenderer.invoke('categories:getAll'),
      getByName: (name: string, excludeId?: string) =>
        ipcRenderer.invoke('categories:getByName', name, excludeId),
      add: (category: any) => ipcRenderer.invoke('categories:add', category),
      update: (category: any) => ipcRenderer.invoke('categories:update', category),
      delete: (id: string) => ipcRenderer.invoke('categories:delete', id)
    },
    // Suppliers IPC methods
    suppliers: {
      getAll: () => ipcRenderer.invoke('suppliers:getAll'),
      getById: (id: string) => ipcRenderer.invoke('suppliers:getById', id),
      add: (supplier: any) => ipcRenderer.invoke('suppliers:add', supplier),
      update: (id: string, supplier: any) => ipcRenderer.invoke('suppliers:update', id, supplier),
      delete: (id: string) => ipcRenderer.invoke('suppliers:delete', id)
    },
    // Supply Orders IPC methods
    supplyOrders: {
      getAll: () => ipcRenderer.invoke('supplyOrders:getAll'),
      getById: (id: string) => ipcRenderer.invoke('supplyOrders:getById', id),
      getItems: (orderId: string) => ipcRenderer.invoke('supplyOrders:getItems', orderId),
      create: (order: any) => ipcRenderer.invoke('supplyOrders:create', order),
      addItem: (item: any) => ipcRenderer.invoke('supplyOrders:addItem', item),
      update: (id: string, order: any) => ipcRenderer.invoke('supplyOrders:update', id, order),
      updateItem: (id: string, item: any) =>
        ipcRenderer.invoke('supplyOrders:updateItem', id, item),
      delete: (id: string) => ipcRenderer.invoke('supplyOrders:delete', id),
      deleteItem: (id: string) => ipcRenderer.invoke('supplyOrders:deleteItem', id)
    },
    // Transactions IPC methods
    transactions: {
      getAll: () => ipcRenderer.invoke('transactions:getAll'),
      getById: (id: string) => ipcRenderer.invoke('transactions:getById', id),
      getItems: (transactionId: string) =>
        ipcRenderer.invoke('transactions:getItems', transactionId),
      create: (transaction: any) => ipcRenderer.invoke('transactions:create', transaction),
      addItem: (item: any) => ipcRenderer.invoke('transactions:addItem', item),
      update: (id: string, transaction: any) =>
        ipcRenderer.invoke('transactions:update', id, transaction),
      updateItem: (id: string, item: any) =>
        ipcRenderer.invoke('transactions:updateItem', id, item),
      delete: (id: string) => ipcRenderer.invoke('transactions:delete', id),
      deleteItem: (id: string) => ipcRenderer.invoke('transactions:deleteItem', id)
    },
    log: {
      create: (log: ActivityLog) => ipcRenderer.invoke('log:create', log),
      getAll: () => ipcRenderer.invoke('log:getAll')
    }
  })
} catch (error) {
  console.log(error)
}
