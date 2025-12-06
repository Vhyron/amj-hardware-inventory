export interface Transaction {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  category?: string
  createdAt: string
  updatedAt: string
}
