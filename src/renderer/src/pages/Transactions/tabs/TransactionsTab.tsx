import SearchInput from '@/renderer/src/components/SearchInput'
import TableComponent, { generateColumns, TableActionOption } from '@/renderer/src/components/Table'
import { FormMode } from '@/renderer/src/lib/types'
import { Flex, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTransactionStore } from '@/renderer/src/store/transactionStore'
import { Transaction } from '../types'
import { formatCurrency, formatDate, hasPermission } from '@/renderer/src/lib/utils'
import { useAuthStore } from '@/renderer/src/store/authStore'

interface Props {
  onAction: (transaction: Transaction | null, mode: FormMode) => void
}

export default function TransactionsTab({ onAction }: Props) {
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')

  const { transactions, loading, fetchTransactions } = useTransactionStore()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    showSizeChanger: false,
    onChange: (page: number, pageSize: number) => {
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize: pageSize
      }))
    }
  })

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        const searchLower = searchTerm.toLowerCase()
        return (
          searchTerm === '' ||
          transaction.id.toLowerCase().includes(searchLower) ||
          (transaction.customerName && transaction.customerName.toLowerCase().includes(searchLower))
        )
      })
      .map((transaction) => ({ ...transaction, key: transaction.id }))
  }, [transactions, searchTerm])

  const handleAction = (record: Transaction, actionType: string | number) => {
    if (typeof actionType === 'string') {
      if (actionType === 'edit' && !hasPermission(user?.permissions, 'transactions:edit')) return
      if (actionType === 'delete' && !hasPermission(user?.permissions, 'transactions:delete')) return

      onAction(record, actionType as FormMode)
    }
  }

  // Define action options
  const getOptions = () => {
    const options: TableActionOption[] = []

    if (hasPermission(user?.permissions, 'transactions:edit')) {
      options.push({
        label: 'Edit',
        key: 'edit',
        icon: <EditOutlined style={{ color: '#1890ff' }} />
      })
    }

    if (hasPermission(user?.permissions, 'transactions:delete')) {
      options.push({
        label: 'Delete',
        key: 'delete',
        icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />
      })
    }

    return options
  }

  const columns = () => {
    // Get base columns from the generator
    const baseColumns = generateColumns<Transaction>(
      filteredTransactions,
      handleAction,
      getOptions(),
      ['id', 'createdAt', 'customerName', 'totalAmount', 'status'],
      'id'
    )

    // Add custom rendering for the id column (used as transaction number)
    const idColumnIndex = baseColumns.findIndex((col) => col.key === 'id')
    if (idColumnIndex !== -1) {
      baseColumns[idColumnIndex].title = 'Transaction Number'
      baseColumns[idColumnIndex].render = (text: string, record: Transaction) => (
        <a
          onClick={() => {
            if (hasPermission(user?.permissions, 'transactions:view')) {
              onAction(record, 'view')
            }
          }}
          style={{
            cursor: hasPermission(user?.permissions, 'transactions:view') ? 'pointer' : 'default',
            color: hasPermission(user?.permissions, 'transactions:view') ? undefined : 'inherit',
            textDecoration: hasPermission(user?.permissions, 'transactions:view') ? undefined : 'none'
          }}
        >
          {text}
        </a>
      )
    }

    // Add custom rendering for date column
    const dateColumnIndex = baseColumns.findIndex((col) => col.key === 'createdAt')
    if (dateColumnIndex !== -1) {
      baseColumns[dateColumnIndex].title = 'Transaction Date'
      baseColumns[dateColumnIndex].render = (date: string) => formatDate(date)
    }

    // Add custom rendering for total column
    const totalColumnIndex = baseColumns.findIndex((col) => col.key === 'totalAmount')
    if (totalColumnIndex !== -1) {
      baseColumns[totalColumnIndex].title = 'Total'
      baseColumns[totalColumnIndex].render = (total: number) => formatCurrency(total)
    }

    // Add custom rendering for status column
    const statusColumnIndex = baseColumns.findIndex((col) => col.key === 'status')
    if (statusColumnIndex !== -1) {
      baseColumns[statusColumnIndex].render = (status: string) => {
        let color = 'blue'
        if (status === 'completed') color = 'green'
        if (status === 'cancelled') color = 'red'
        if (status === 'pending') color = 'orange'

        // Capitalize first letter for display
        const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1)
        return <Tag color={color}>{statusDisplay}</Tag>
      }
    }

    return baseColumns
  }

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <SearchInput title="Transactions (id, name)" onChange={setSearchTerm} />
      </Flex>

      <TableComponent
        data={filteredTransactions}
        columns={columns()}
        size="small"
        bordered={true}
        loading={loading}
        pagination={pagination}
      />
    </>
  )
}
