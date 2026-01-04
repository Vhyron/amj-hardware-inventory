import SearchInput from '@/renderer/src/components/SearchInput'
import TableComponent, { generateColumns, TableActionOption } from '@/renderer/src/components/Table'
import { FormMode } from '@/renderer/src/lib/types'
import { formatCurrency, hasPermission } from '@/renderer/src/lib/utils'
import { useAuthStore } from '@/renderer/src/store/authStore'
import { useSupplyOrderStore } from '@/renderer/src/store/supplyOrderStore'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Flex, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { SupplyOrder } from '../types'

interface Props {
  onAction: (order: SupplyOrder | null, mode: FormMode) => void
}

export default function SupplyOrderTab({ onAction }: Props) {
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')

  const { orders, loading, fetchOrders } = useSupplyOrderStore()
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

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const searchLower = searchTerm.toLowerCase()
        return (
          searchTerm === '' ||
          order.id.toLowerCase().includes(searchLower) ||
          (order.supplierName && order.supplierName.toLowerCase().includes(searchLower))
        )
      })
      .map((order) => ({ ...order, key: order.id }))
  }, [orders, searchTerm])

  const handleAction = (record: SupplyOrder, actionType: string | number) => {
    if (typeof actionType === 'string') {
      if (actionType === 'edit' && !hasPermission(user?.permissions, 'supplyOrders:edit')) return
      if (actionType === 'delete' && !hasPermission(user?.permissions, 'supplyOrders:delete'))
        return

      onAction(record, actionType as FormMode)
    }
  }

  // Define action options
  const getOptions = (record: SupplyOrder) => {
    const options: TableActionOption[] = []

    // Only allow editing if status is not Delivered or Cancelled
    if (
      hasPermission(user?.permissions, 'supplyOrders:edit') &&
      record.status !== 'Delivered' &&
      record.status !== 'Cancelled'
    ) {
      options.push({
        label: 'Edit',
        key: 'edit',
        icon: <EditOutlined style={{ color: '#1890ff' }} />
      })
    }

    if (hasPermission(user?.permissions, 'supplyOrders:delete')) {
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
    const baseColumns = generateColumns<SupplyOrder>(
      filteredOrders,
      handleAction,
      getOptions,
      ['id', 'supplierName', 'createdAt', 'status', 'totalCost'],
      'id'
    )

    // Add custom rendering for the id column (used as order number)
    const idColumnIndex = baseColumns.findIndex((col) => col.key === 'id')
    if (idColumnIndex !== -1) {
      baseColumns[idColumnIndex].title = 'Order Number'
      baseColumns[idColumnIndex].render = (text: string, record: SupplyOrder) => (
        <a
          onClick={() => {
            if (hasPermission(user?.permissions, 'supplyOrders:view')) {
              onAction(record, 'view')
            }
          }}
          style={{
            cursor: hasPermission(user?.permissions, 'supplyOrders:view') ? 'pointer' : 'default',
            color: hasPermission(user?.permissions, 'supplyOrders:view') ? undefined : 'inherit',
            textDecoration: hasPermission(user?.permissions, 'supplyOrders:view')
              ? undefined
              : 'none'
          }}
        >
          {text}
        </a>
      )
    }

    // Rename created date column to Order Date
    const createdAtIndex = baseColumns.findIndex((col) => col.key === 'createdAt')
    if (createdAtIndex !== -1) {
      baseColumns[createdAtIndex].title = 'Order Date'
    }

    // Add custom rendering for status column
    const statusColumnIndex = baseColumns.findIndex((col) => col.key === 'status')
    if (statusColumnIndex !== -1) {
      baseColumns[statusColumnIndex].render = (status: string) => {
        let color = 'orange'
        if (status === 'Delivered') color = 'green'
        if (status === 'Cancelled') color = 'red'
        if (status === 'Approved') color = 'blue'

        return <Tag color={color}>{status}</Tag>
      }
    }

    // Add custom rendering for totalCost column
    const totalColumnIndex = baseColumns.findIndex((col) => col.key === 'totalCost')
    if (totalColumnIndex !== -1) {
      baseColumns[totalColumnIndex].title = 'Total'
      baseColumns[totalColumnIndex].render = (total: number) => formatCurrency(total)
    }

    return baseColumns
  }

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <SearchInput title="Supply Orders" onChange={setSearchTerm} />
      </Flex>

      <TableComponent
        data={filteredOrders}
        columns={columns()}
        size="small"
        bordered={true}
        loading={loading}
        pagination={pagination}
      />
    </>
  )
}
