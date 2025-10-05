export interface Supplier {
  id: string
  name: string
  contactName: string
  email: string
  phone: string
  address?: string
  description?: string
  isActive: number // 1 = active, 0 = inactive
  createdAt: string
  updatedAt: string
}

export interface SupplierFormData {
  id?: string // Optional for new entries
  name: string
  contactName: string
  email: string
  phone: string
  address?: string
  description?: string
  isActive?: number // Optional with default value from database
}

export interface SupplyOrder {
  id: string
  supplierId: string
  orderedBy: string
  status: 'Pending' | 'Approved' | 'Delivered' | 'Cancelled'
  totalCost: number
  notes?: string
  deliveredAt?: string
  createdAt: string
  updatedAt: string
  supplierName?: string // Virtual field for display purposes
}

export interface OrderItem {
  id: string
  orderId: string
  stockId?: string
  name: string
  sku: string
  description?: string
  category?: string
  quantity: number
  unit: string
  unitPrice: number
  createdAt: string
  updatedAt: string
}

export interface SupplyOrderFormData {
  id?: string
  supplierId: string
  notes?: string
  status?: 'Pending' | 'Approved' | 'Delivered' | 'Cancelled'
}

export interface OrderItemFormData {
  id?: string
  orderId: string
  stockId?: string
  name: string
  sku: string
  description?: string
  category?: string
  quantity: number
  unit: string
  unitPrice: number
}
