import SearchInput from '@/renderer/src/components/SearchInput'
import TableComponent, { generateColumns, TableActionOption } from '@/renderer/src/components/Table'
import { FormMode } from '@/renderer/src/lib/types'
import { Flex, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useSupplierStore } from '@/renderer/src/store/supplierStore'
import { Supplier } from '../types'
import { useAuthStore } from '@/renderer/src/store/authStore'
import { hasPermission } from '@/renderer/src/lib/utils'

interface Props {
  onAction: (supplier: Supplier | null, mode: FormMode) => void
}

export default function SupplierTab({ onAction }: Props) {
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')

  const { suppliers, loading, fetchSuppliers } = useSupplierStore()
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
    fetchSuppliers()
  }, [fetchSuppliers])

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((supplier) => {
        const searchLower = searchTerm.toLowerCase()
        return (
          searchTerm === '' ||
          supplier.name.toLowerCase().includes(searchLower) ||
          supplier.contactName.toLowerCase().includes(searchLower) ||
          supplier.email.toLowerCase().includes(searchLower)
        )
      })
      .map((supplier) => ({ ...supplier, key: supplier.id }))
  }, [suppliers, searchTerm])

  const handleAction = (record: Supplier, actionType: string | number) => {
    if (typeof actionType === 'string') {
      if (actionType === 'edit' && !hasPermission(user?.permissions, 'suppliers:edit')) return
      if (actionType === 'delete' && !hasPermission(user?.permissions, 'suppliers:delete')) return

      onAction(record, actionType as FormMode)
    }
  }

  // Define action options
  const getOptions = () => {
    const options: TableActionOption[] = []

    if (hasPermission(user?.permissions, 'suppliers:edit')) {
      options.push({
        label: 'Edit',
        key: 'edit',
        icon: <EditOutlined style={{ color: '#1890ff' }} />
      })
    }

    if (hasPermission(user?.permissions, 'suppliers:delete')) {
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
    const baseColumns = generateColumns<Supplier>(
      filteredSuppliers,
      handleAction,
      getOptions(),
      ['name', 'contactName', 'email', 'phone', 'isActive'],
      'name'
    )

    // Add custom rendering for the name column
    const nameColumnIndex = baseColumns.findIndex((col) => col.key === 'name')
    if (nameColumnIndex !== -1) {
      baseColumns[nameColumnIndex].render = (text: string, record: Supplier) => (
        <a
          onClick={() => {
            if (hasPermission(user?.permissions, 'suppliers:view')) {
              onAction(record, 'view')
            }
          }}
          style={{
            cursor: hasPermission(user?.permissions, 'suppliers:view') ? 'pointer' : 'default',
            color: hasPermission(user?.permissions, 'suppliers:view') ? undefined : 'inherit',
            textDecoration: hasPermission(user?.permissions, 'suppliers:view') ? undefined : 'none'
          }}
        >
          {text}
        </a>
      )
    }

    // Add custom rendering for isActive column
    const activeColumnIndex = baseColumns.findIndex((col) => col.key === 'isActive')
    if (activeColumnIndex !== -1) {
      baseColumns[activeColumnIndex].render = (isActive: number) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Inactive'}</Tag>
      )
    }

    return baseColumns
  }

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <SearchInput title="Suppliers (name, email)" onChange={setSearchTerm} />
      </Flex>

      <TableComponent
        data={filteredSuppliers}
        columns={columns()}
        size="small"
        bordered={true}
        loading={loading}
        pagination={pagination}
      />
    </>
  )
}
