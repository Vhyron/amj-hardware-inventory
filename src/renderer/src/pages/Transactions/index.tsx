import { FormMode } from '@/renderer/src/lib/types'
import { Typography } from 'antd'
import { useState } from 'react'
import PageTabs, { TabItem } from '../../components/PageTabs'
import TransactionsTab from './tabs/TransactionsTab'
import TransactionForm from './components/TransactionForm'
import { Transaction } from './types'
import { useAuthStore } from '../../store/authStore'
import { hasPermission } from '../../lib/utils'

export default function Transactions() {
  const { user } = useAuthStore()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('add')
  const [selected, setSelected] = useState<Transaction | null>(null)

  const handleAction = (transaction: Transaction | null, mode: FormMode) => {
    setSelected(transaction)
    setFormMode(mode)
    setFormOpen(true)
  }

  const handleAddTransaction = () => {
    handleAction(null, 'add')
  }

  const handleFormClose = () => {
    setSelected(null)
    setFormOpen(false)
  }

  const tabItems: TabItem[] = [
    {
      label: 'Transactions',
      content: <TransactionsTab onAction={handleAction} />,
      actionButton: {
        label: 'New Transaction',
        onClick: handleAddTransaction,
        disabled: !hasPermission(user?.permissions, 'transactions:create')
      }
    }
  ]

  return (
    <div style={{ margin: '0 auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={2}>Transactions</Typography.Title>
        <PageTabs items={tabItems} />
      </div>

      <TransactionForm
        open={formOpen}
        onClose={handleFormClose}
        mode={formMode}
        selected={selected}
      />
    </div>
  )
}
