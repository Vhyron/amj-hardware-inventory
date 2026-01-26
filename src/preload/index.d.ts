import { Stock, Category, StockStatus } from '@/renderer/src/pages/Stocks/types'
import { User } from '@/renderer/src/store/userStore'
import { ElectronAPI } from '@electron-toolkit/preload'
import { Supplier, SupplyOrder, OrderItem } from '@/renderer/src/pages/Supply/types'
import { Transaction, TransactionItem } from '@/renderer/src/pages/Transactions/types'
import { ActivityLog } from '@/renderer/src/lib/types'

declare global {
  interface Window {
    // electron: ElectronAPI
    context: {
      locale: string
      auth: {
        authTest: () => void
        login: (
          username: string,
          password: string
        ) => Promise<{
          success: boolean
          message?: string
          user?: {
            id: string
            name: string
            username: string
            role: string
            permissions: string[]
            profile_image?: string
          }
        }>
        register: (
          name: string,
          username: string,
          password: string,
          role: string,
          permissions: string
        ) => Promise<{ success: boolean; message?: string }>
        checkAuth: () => Promise<{
          success: boolean
          user?: {
            id: string
            name: string
            username: string
            role: string
            permissions: string[]
          }
        }>
        logout: () => boolean
        getUser: (id) => Promise<User | null>,
        refreshToken: (id: string) =>  Promise<{ success: boolean; message?: string }>
      }
      users: {
        getAll: () => User[]
        add: (
          userData: Omit<User, 'id'>
        ) => Promise<{ success: boolean; userId: string | null; message?: string }>
        update: (id: string, user: User) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
      }
      // Stocks IPC methods
      stocks: {
        getAll: () => Promise<{
          success: boolean
          stocks: Stock[]
        }>
        getActive: () => Promise<{
          success: boolean
          stocks: Stock[]
        }>
        getArchived: () => Promise<{
          success: boolean
          stocks: Stock[]
        }>
        getById: (id: string) => Promise<{  success: boolean; stock: Stock | null; message?: string }>
        getByName: (name: string, excludeId?: string) => Promise<boolean>
        add: (
          stock: Stock
        ) => Promise<{ success: boolean; stockId?: number | null; message?: string }>
        update: (stock: Stock) => Promise<{ success: boolean; message?: string }>
        delete: (id: string) => Promise<{ success: boolean; message?: string }>
        archive: (id: string) => Promise<{ success: boolean; message?: string }>
        restore: (id: string, status: StockStatus) => Promise<{ success: boolean; message?: string }>
      }
      // Categories IPC methods
      categories: {
        getAll: () => Promise<{
          success: boolean
          categories: Category[]
        }>
        getByName: (name: string, excludeId?: string) => Promise<boolean>
        add: (
          category: Category
        ) => Promise<{ success: boolean; categoryId?: string | null; message?: string }>
        update: (category: Category) => Promise<{ success: boolean; message?: string }>
        delete: (id: string) => Promise<{ success: boolean; message?: string }>
      }
      // Suppliers IPC methods
      suppliers: {
        getAll: () => Promise<{
          success: boolean
          suppliers: Supplier[]
          message?: string
        }>
        getById: (id: string) => Promise<{
          success: boolean
          supplier: Supplier | null
        }>
        add: (
          supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>
        ) => Promise<{ success: boolean; supplierId?: string | null; message?: string }>
        update: (
          id: string,
          supplier: Partial<Supplier>
        ) => Promise<{ success: boolean; message?: string }>
        delete: (id: string) => Promise<{ success: boolean; message?: string }>
      }
      // Supply Orders IPC methods
      supplyOrders: {
        getAll: () => Promise<{
          success: boolean
          orders: SupplyOrder[]
          message?: string
        }>
        getById: (id: string) => Promise<{
          success: boolean
          order: SupplyOrder | null
          message?: string
        }>
        getItems: (orderId: string) => Promise<{
          success: boolean
          items: OrderItem[]
          message?: string
        }>
        create: (
          order: Omit<SupplyOrder, 'id' | 'createdAt' | 'updatedAt'>
        ) => Promise<{ success: boolean; orderId?: string; message?: string }>
        addItem: (
          item: Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt'>
        ) => Promise<{ success: boolean; itemId?: string; message?: string }>
        update: (
          id: string,
          order: Partial<SupplyOrder>
        ) => Promise<{
          success: boolean
          message?: string
        }>
        updateItem: (
          id: string,
          item: Partial<OrderItem>
        ) => Promise<{
          success: boolean
          message?: string
        }>
        delete: (id: string) => Promise<{ success: boolean; message?: string }>
        deleteItem: (id: string) => Promise<{ success: boolean; message?: string }>
      }
      // Transactions IPC methods
      transactions: {
        getAll: () => Promise<{
          success: boolean
          transactions: Transaction[]
          message?: string
        }>
        getById: (id: string) => Promise<{
          success: boolean
          transaction: Transaction | null
          message?: string
        }>
        getItems: (transactionId: string) => Promise<{
          success: boolean
          items: TransactionItem[]
          message?: string
        }>
        create: (
          transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
        ) => Promise<{ success: boolean; transactionId?: string; message?: string }>
        addItem: (
          item: Omit<TransactionItem, 'id' | 'createdAt' | 'updatedAt'>
        ) => Promise<{ success: boolean; itemId?: string; message?: string }>
        update: (
          id: string,
          transaction: Partial<Transaction>
        ) => Promise<{
          success: boolean
          message?: string
        }>
        updateItem: (
          id: string,
          item: Partial<TransactionItem>
        ) => Promise<{
          success: boolean
          message?: string
        }>
        delete: (id: string) => Promise<{ success: boolean; message?: string }>
        deleteItem: (id: string) => Promise<{ success: boolean; message?: string }>
      },
      log: {
        create: (log: ActivityLog) => { success: boolean; message?: string; }
        getAll: () => { success: boolean; message?: string; logs?: ActivityLog[] }
      }
    }
  }
}
