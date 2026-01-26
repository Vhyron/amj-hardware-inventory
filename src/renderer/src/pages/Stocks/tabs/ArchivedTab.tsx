import { useEffect, useMemo, useState } from 'react'
import { RollbackOutlined } from '@ant-design/icons'
import { App as AntdApp, Tag, notification } from 'antd'
import SearchInput from '@/renderer/src/components/SearchInput'
import CategoryDropdown from '@/renderer/src/components/CategoryDropdown'
import TableComponent, { generateColumns, TableActionOption } from '@/renderer/src/components/Table'
import { Stock } from '../types'
import { useStockStore, determineStatus } from '@/renderer/src/store/stockStore'
import { useAuthStore } from '@/renderer/src/store/authStore'
import { hasPermission } from '@/renderer/src/lib/utils'
import { FormMode } from '@/renderer/src/lib/types'

interface ArchivedTabProps {
  onStockAction: (stock: Stock | null, mode: FormMode) => void
}

export default function ArchivedTab({ onStockAction }: ArchivedTabProps) {
  const { user } = useAuthStore()
  const { archivedStocks, loading, archivedLoading, fetchArchivedStocks, restoreStock } = useStockStore()
  const { modal } = AntdApp.useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    showSizeChanger: false,
    onChange: (page: number, pageSize: number) => {
      setPagination((prev) => ({
        ...prev,
        current: page,
        pageSize
      }))
    }
  })

  useEffect(() => {
    fetchArchivedStocks()
  }, [fetchArchivedStocks])

  const getOptions = () => {
    const options: TableActionOption[] = []

    if (hasPermission(user?.permissions, 'stocks:archive')) {
      options.push({
        label: 'Restore',
        key: 'restore',
        icon: <RollbackOutlined style={{ color: '#52c41a' }} />
      })
    }

    return options
  }

  const filteredStocks = useMemo(() => {
    return archivedStocks
      .filter((stock) => {
        const matchesCategory =
          selectedCategory === 'All Categories' || stock.category === selectedCategory
        const matchesSearch =
          searchTerm === '' ||
          stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stock.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stock.category.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesCategory && matchesSearch
      })
      .map((stock) => ({ ...stock, key: stock.id }))
  }, [archivedStocks, searchTerm, selectedCategory])

  const handleRestore = (record: Stock) => {
    const nextStatus = determineStatus(record.quantity, record.reorderPoint)

    modal.confirm({
      title: 'Restore Stock',
      content: `Restore ${record.name}? It will return to active stocks with status "${nextStatus}".`,
      okText: 'Restore',
      okType: 'primary',
      cancelText: 'Cancel',
      async onOk() {
        const success = await restoreStock(record.id)
        if (success) {
          notification.success({
            message: 'Stock restored',
            description: `${record.name} is now ${nextStatus}.`
          })
        } else {
          const { error } = useStockStore.getState()
          notification.error({
            message: 'Failed to restore stock',
            description: error || 'Please try again.'
          })
        }
      }
    })
  }

  const handleStockAction = (record: Stock, actionType: string | number) => {
    if (typeof actionType === 'string') {
      if (actionType === 'restore') {
        if (!hasPermission(user?.permissions, 'stocks:archive')) return
        handleRestore(record)
        return
      }

      if (actionType === 'view') {
        if (!hasPermission(user?.permissions, 'stocks:view')) return
        onStockAction(record, 'view')
        return
      }
    }
  }

  const columns = () => {
    const baseColumns = generateColumns<Stock>(
      filteredStocks,
      handleStockAction,
      getOptions(),
      ['sku', 'name', 'category', 'quantity', 'unit', 'reorderPoint', 'status', 'updatedAt'],
      'name'
    )

    const nameColumnIndex = baseColumns.findIndex((col) => col.key === 'name')
    if (nameColumnIndex !== -1) {
      baseColumns[nameColumnIndex].render = (text: string, record: Stock) => (
        <a
          onClick={() => {
            if (hasPermission(user?.permissions, 'stocks:view')) {
              onStockAction(record, 'view')
            }
          }}
          style={{
            cursor: hasPermission(user?.permissions, 'stocks:view') ? 'pointer' : 'default',
            color: hasPermission(user?.permissions, 'stocks:view') ? undefined : 'inherit',
            textDecoration: hasPermission(user?.permissions, 'stocks:view') ? undefined : 'none'
          }}
        >
          {text}
        </a>
      )
    }

    const statusColumnIndex = baseColumns.findIndex((col) => col.key === 'status')
    if (statusColumnIndex !== -1) {
      baseColumns[statusColumnIndex].render = (status: string) => (
        <Tag color="default">{status}</Tag>
      )
    }

    return baseColumns
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
        <SearchInput title="Archived Stocks (name, sku, category)" onChange={setSearchTerm} />
        <CategoryDropdown
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
          style={{ width: 250 }}
        />
      </div>

      <TableComponent<Stock>
        data={filteredStocks}
        columns={columns()}
        size="small"
        bordered={true}
        loading={loading || archivedLoading}
        pagination={pagination}
      />
    </div>
  )
}
