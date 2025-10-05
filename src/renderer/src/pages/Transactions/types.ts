export interface Transaction {
  id: string
  customerName?: string
  referenceNo?: string
  status: 'pending' | 'completed' | 'cancelled'
  totalAmount: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TransactionItem {
  id: string
  transactionId: string
  stockId: string
  quantity: number
  unitPrice: number
  unit: string
  stockName?: string // Virtual field for display purposes
  createdAt: string
  updatedAt: string
}

export interface TransactionFormData {
  id?: string // Optional for new entries
  customerName?: string
  referenceNo?: string
  status?: 'pending' | 'completed' | 'cancelled'
  notes?: string
  totalAmount?: number // Added to match Transaction interface requirements
}

export interface TransactionItemFormData {
  id?: string
  transactionId: string
  stockId: string
  quantity: number
  unitPrice: number
  unit: string
}
