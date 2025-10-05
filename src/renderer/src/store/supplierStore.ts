import { create } from 'zustand'
import { Supplier } from '../pages/Supply/types'
import { useLogStore } from './activityLogStore'
import { useAuthStore } from './authStore'
import { generatePrefixedUUID } from '../lib/uuid'

interface SupplierState {
  suppliers: Supplier[]
  loading: boolean
  error: string | null | any

  setSuppliers: (suppliers: Supplier[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  fetchSuppliers: () => Promise<void>
  addSupplier: (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<boolean>
  deleteSupplier: (id: string) => Promise<boolean>
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  loading: false,
  error: null,

  setSuppliers: (suppliers) => set({ suppliers }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchSuppliers: async () => {
    set({ loading: true, error: null })
    try {
      const response = await window.context.suppliers.getAll()
      if (response.success) {
        set({ suppliers: response.suppliers })
      } else {
        set({ error: response.message || 'Failed to fetch suppliers' })
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
      set({ error: 'Failed to fetch suppliers' })
    } finally {
      set({ loading: false })
    }
  },

  addSupplier: async (data) => {
    set({ loading: true })
    try {
      const response = await window.context.suppliers.add(data)
      if (response.success) {
        const newSupplier = { 
          ...data, 
          id: response.supplierId!,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        set((state) => ({ 
          suppliers: [...state.suppliers, newSupplier] 
        }))
        
        // Create activity log after successful supplier creation
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'create',
            entityType: 'supplier',
            entityId: newSupplier.id,
            details: `Added new supplier: ${data.name}`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
        
        return true
      } else {
        set({ error: response.message })
        return false
      }
    } catch (error) {
      set({ error: 'Failed to add supplier' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  updateSupplier: async (id, data) => {
    set({ loading: true })
    try {
      const response = await window.context.suppliers.update(id, data)
      if (response.success) {
        const existingSupplier = get().suppliers.find(supplier => supplier.id === id);
        if (!existingSupplier) {
          throw new Error(`Supplier with id ${id} not found`);
        }
        
        const updatedSupplier = { 
          ...existingSupplier,
          ...data, 
          updatedAt: new Date().toISOString() 
        } as Supplier;
        
        set((state) => ({
          suppliers: state.suppliers.map((supplier) => 
            supplier.id === id ? updatedSupplier : supplier
          )
        }))
        
        // Create activity log after successful supplier update
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'update',
            entityType: 'supplier',
            entityId: id,
            details: `Updated supplier: ${updatedSupplier.name}`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
        
        return true
      } else {
        set({ error: response.message || "Failed to update supplier" })
        return false
      }
    } catch (error) {
      set({ error: 'Failed to update supplier' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  deleteSupplier: async (id) => {
    set({ loading: true })
    try {
      // Find supplier before deletion to include name in log
      const supplierToDelete = get().suppliers.find(supplier => supplier.id === id)
      
      const response = await window.context.suppliers.delete(id)
      if (response.success) {
        set((state) => ({
          suppliers: state.suppliers.filter((supplier) => supplier.id !== id)
        }))
        
        // Create activity log after successful supplier deletion
        const currentUser = useAuthStore.getState().user
        if (currentUser && supplierToDelete) {
          const logEntry = {
            id: generatePrefixedUUID('log'),
            userId: currentUser.id,
            username: currentUser.username,
            action: 'delete',
            entityType: 'supplier',
            entityId: id,
            details: `Deleted supplier: ${supplierToDelete.name}`,
            timestamp: new Date().toISOString()
          }
          useLogStore.getState().createLog(logEntry)
        }
        
        return true
      } else {
        set({ error: response.message || "Failed to delete supplier" })
        return false
      }
    } catch (error) {
      set({ error: 'Failed to delete supplier' })
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
