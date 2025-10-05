// Stock related types
export interface Stock {
  id: string
  name: string
  description?: string
  category: string
  quantity: number
  unit: string
  unitPrice: number
  costPrice: number
  supplierId?: string
  location?: string
  sku: string
  reorderPoint: number
  status: StockStatus
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

// Stock status types
export type StockStatus = 'In Stock' | 'Out of Stock' | 'Critical Low'

// All available stock categories
export const categories = [
  'All Categories',
  'Raw Materials',
  'Components',
  'Packaging',
  'Office Supplies',
  'Tools',
  'Finished Products',
  'Electronics',
  'Consumables'
]

// Available units for stock items
export const units = ['pcs', 'kg', 'g', 'lbs', 'oz', 'l', 'ml', 'box', 'pack', 'set']

// Empty stock object for initialization
export const emptyStock: Omit<Stock, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  category: '',
  quantity: 0,
  unit: '',
  unitPrice: 0,
  costPrice: 0,
  supplierId: '',
  location: '',
  sku: '',
  reorderPoint: 0
}

export const emptyCategory: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> = {
  name: "",
  description: "",
}
