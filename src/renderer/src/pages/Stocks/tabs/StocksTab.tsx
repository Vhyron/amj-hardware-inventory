import { useEffect, useMemo, useState } from 'react'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
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
  const { stocks, loading, fetchStocks } = useStockStore()
  const { fetchSuppliers } = useSupplierStore()
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
    fetchStocks()
    fetchSuppliers()
  }, [fetchStocks, fetchSuppliers])

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

    if (hasPermission(user?.permissions, 'stocks:delete')) {
      options.push({
        label: 'Delete',
        key: 'delete',
        icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />
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

  // Handle stock action (view, edit, delete)
  const handleStockAction = (record: Stock, actionType: string | number) => {
    if (typeof actionType === 'string') {
      if (actionType === 'edit' && !hasPermission(user?.permissions, 'stocks:edit')) return
      if (actionType === 'delete' && !hasPermission(user?.permissions, 'stocks:delete')) return

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
        const color = status === 'In Stock' ? 'green' : status === 'Out of Stock' ? 'red' : 'orange'
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
