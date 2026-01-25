import { useEffect, useMemo, useState } from 'react'
import { EditOutlined, InboxOutlined } from '@ant-design/icons'
import { App as AntdApp, Tag, notification } from 'antd'
import SearchInput from '@/renderer/src/components/SearchInput'
import CategoryDropdown from '@/renderer/src/components/CategoryDropdown'
import TableComponent, { generateColumns, TableActionOption } from '@/renderer/src/components/Table'
import { useStockStore } from '@/renderer/src/store/stockStore'
import { useSupplierStore } from '@/renderer/src/store/supplierStore'
import { Stock } from '../types'
import { FormMode } from '@/renderer/src/lib/types'
import { useAuthStore } from '@/renderer/src/store/authStore'
import { hasPermission } from '@/renderer/src/lib/utils'

interface StocksTabProps {
  onStockAction: (stock: Stock | null, mode: FormMode) => void
}

/**
 * StocksTab - Displays a filterable, searchable table of stock items
 */
export default function StocksTab({ onStockAction }: StocksTabProps) {
  const { user } = useAuthStore()
  const { stocks, loading, fetchActiveStocks, archiveStock } = useStockStore()
  const { fetchSuppliers } = useSupplierStore()
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
        pageSize: pageSize
      }))
    }
  })

  // Fetch data when component mounts
  useEffect(() => {
    fetchActiveStocks()
    fetchSuppliers()
  }, [fetchActiveStocks, fetchSuppliers])

  // Generate options for actions column
  const getOptions = () => {
    const options: TableActionOption[] = []

    if (hasPermission(user?.permissions, 'stocks:edit')) {
      options.push({
        label: 'Edit',
        key: 'edit',
        icon: <EditOutlined style={{ color: '#1890ff' }} />
      })
    }

    if (hasPermission(user?.permissions, 'stocks:archive')) {
      options.push({
        label: 'Archive',
        key: 'archive',
        icon: <InboxOutlined style={{ color: '#8c8c8c' }} />
      })
    }

    return options
  }

  // Filter stocks based on search term and category filter
  const filteredStocks = useMemo(() => {
    return stocks
      .filter((stock) => {
        const matchesCategory =
          selectedCategory === 'All Categories' || stock.category === selectedCategory
        const matchesSearch =
          searchTerm === '' ||
          stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stock.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stock.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stock.category.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesCategory && matchesSearch
      })
      .map((stock) => ({ ...stock, key: stock.id })) // Add key for Table component
  }, [stocks, searchTerm, selectedCategory])

  const handleArchive = (record: Stock) => {
    modal.confirm({
      title: 'Archive Stock',
      content: `Archive ${record.name}? Archived stocks move to the Archived tab and stay out of active workflows.`,
      okText: 'Archive',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        const success = await archiveStock(record.id)
        if (success) {
          notification.success({
            message: 'Stock archived',
            description: `${record.name} is now archived.`
          })
        } else {
          const { error } = useStockStore.getState()
          notification.error({
            message: 'Failed to archive stock',
            description: error || 'Please try again.'
          })
        }
      }
    })
  }

  // Handle stock action (view, edit, archive)
  const handleStockAction = (record: Stock, actionType: string | number) => {
    if (typeof actionType === 'string') {
      if (actionType === 'edit' && !hasPermission(user?.permissions, 'stocks:edit')) return
      if (actionType === 'archive') {
        if (!hasPermission(user?.permissions, 'stocks:archive')) return
        handleArchive(record)
        return
      }

      onStockAction(record, actionType as FormMode)
    }
  }

  // Generate columns for the table
  const columns = () => {
    // Get base columns from the generator
    const baseColumns = generateColumns<Stock>(
      filteredStocks,
      handleStockAction,
      getOptions(),
      ['sku', 'name', 'category', 'quantity', 'unit', 'unitPrice', 'status'],
      'name'
    )

    // Add custom rendering for the name column
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

    // Add custom rendering for unit price column
    const priceColumnIndex = baseColumns.findIndex((col) => col.key === 'unitPrice')
    if (priceColumnIndex !== -1) {
      baseColumns[priceColumnIndex].render = (price: number) => (
        <span>₱ {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      )
    }

    // Add custom rendering for category column with tags
    const categoryColumnIndex = baseColumns.findIndex((col) => col.key === 'category')
    if (categoryColumnIndex !== -1) {
      baseColumns[categoryColumnIndex].render = (category: string) => (
        <Tag color="blue">{category}</Tag>
      )
    }

    const statusColumnIndex = baseColumns.findIndex((col) => col.key === 'status')
    if (statusColumnIndex !== -1) {
      baseColumns[statusColumnIndex].render = (status: string) => {
        const color =
          status === 'In Stock'
            ? 'green'
            : status === 'Out of Stock'
              ? 'red'
              : status === 'Critical Low'
                ? 'orange'
                : 'default'
        return <Tag color={color}>{status}</Tag>
      }
    }

    return baseColumns
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
        <SearchInput title="Stocks (name, sku, status, category)" onChange={setSearchTerm} />
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
        loading={loading}
        pagination={pagination}
      />
    </div>
  )
}
