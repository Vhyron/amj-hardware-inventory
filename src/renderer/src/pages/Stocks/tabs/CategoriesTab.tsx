import { useState, useMemo, useEffect } from 'react'
import { Flex } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import SearchInput from '../../../components/SearchInput'
import TableComponent, { generateColumns, TableActionOption } from '@/renderer/src/components/Table'
import { Category } from '../types'
import { useCategoryStore } from '@/renderer/src/store/categoryStore'
import { FormMode } from '@/renderer/src/lib/types'
import { useAuthStore } from '@/renderer/src/store/authStore'
import { hasPermission } from '@/renderer/src/lib/utils'

interface CategoriesTabProps {
  onCategoryAction: (category: Category | null, mode: 'view' | 'edit' | 'delete' | 'add') => void
}

export default function CategoriesTab({ onCategoryAction }: CategoriesTabProps) {
  const { user } = useAuthStore()
  const { categories, loading, fetchCategories } = useCategoryStore()
  const [searchTerm, setSearchTerm] = useState('')
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
    fetchCategories()
  }, [fetchCategories])

  const filteredCategories = useMemo(() => {
    return categories
      .filter((category) => {
        // Filter based on search term
        const searchLower = searchTerm.toLowerCase()
        return (
          searchTerm === '' ||
          category.name.toLowerCase().includes(searchLower) ||
          (category.description && category.description.toLowerCase().includes(searchLower))
        )
      })
      .map((category) => ({ ...category, key: category.id }))
  }, [categories, searchTerm])

  // Handle category actions (view, edit, delete)
  const handleCategoryAction = (record: Category, actionType: string | number) => {
    if (typeof actionType === 'string') {
      if (actionType === 'edit' && !hasPermission(user?.permissions, 'categories:edit')) return
      if (actionType === 'delete' && !hasPermission(user?.permissions, 'categories:delete')) return

      onCategoryAction(record, actionType as FormMode)
    }
  }

  // Define action options
  const getOptions = () => {
    const options: TableActionOption[] = []

    if (hasPermission(user?.permissions, 'categories:edit')) {
      options.push({
        label: 'Edit',
        key: 'edit',
        icon: <EditOutlined style={{ color: '#1890ff' }} />
      })
    }

    if (hasPermission(user?.permissions, 'categories:delete')) {
      options.push({
        label: 'Delete',
        key: 'delete',
        icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />
      })
    }

    return options
  }

  // Generate columns function
  const columns = () => {
    // Get base columns from the generator
    const baseColumns = generateColumns<Category | any>(
      filteredCategories,
      handleCategoryAction,
      getOptions(),
      ['name', 'description'],
      'name'
    )

    const nameColumnIndex = baseColumns.findIndex((col) => col.key === 'name')
    if (nameColumnIndex !== -1) {
      baseColumns[nameColumnIndex].render = (text: string, record: Category) => (
        <a
          onClick={() => {
            if (hasPermission(user?.permissions, 'categories:view')) {
              onCategoryAction(record, 'view')
            }
          }}
          style={{
            cursor: hasPermission(user?.permissions, 'categories:view') ? 'pointer' : 'default',
            color: hasPermission(user?.permissions, 'categories:view') ? undefined : 'inherit',
            textDecoration: hasPermission(user?.permissions, 'categories:view') ? undefined : 'none'
          }}
        >
          {text}
        </a>
      )
    }

    return baseColumns
  }

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <SearchInput title="Categories" onChange={setSearchTerm} />
      </Flex>

      <TableComponent<Category>
        data={filteredCategories}
        columns={columns()}
        size="small"
        bordered={true}
        loading={loading}
        pagination={pagination}
      />
    </>
  )
}
