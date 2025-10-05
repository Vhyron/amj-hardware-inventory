import SearchInput from '@/renderer/src/components/SearchInput'
import TableComponent, { generateColumns, TableActionOption } from '@/renderer/src/components/Table'
import { FormMode } from '@/renderer/src/lib/types'
import { User, useUserStore } from '@/renderer/src/store/userStore'
import { Flex } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/renderer/src/store/authStore'
import { hasPermission } from '@/renderer/src/lib/utils'

interface Props {
  onAction: (user: User | null, mode: FormMode) => void
}

export default function UsersTab({ onAction }: Props) {
  const [searchTerm, setSearchTerm] = useState('')

  const { user } = useAuthStore()
  const { users, fetchUsers, loading } = useUserStore()
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
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = useMemo(() => {
    return users
      .filter((userItem) => {
        // Filter out current user
        if (user && userItem.id === user.id) return false

        // Hide admin users if current user is not an super_admin
        // because super_admins can see all users including admins
        if (userItem.role === 'admin' && user?.role !== 'super_admin') return false
        if (userItem.role === 'super_admin' && user?.role !== 'super_admin') return false

        // Filter based on search term
        const searchLower = searchTerm.toLowerCase()
        return (
          searchTerm === '' ||
          userItem.username.toLowerCase().includes(searchLower) ||
          userItem.name.toLowerCase().includes(searchLower) ||
          userItem.role.toLowerCase().includes(searchLower)
        )
      })
      .map((category) => ({ ...category, key: category.id }))
  }, [users, searchTerm, user])

  const handleAction = (record: User, actionType: string | number) => {
    if (typeof actionType === 'string') {
      if (actionType === 'edit' && !hasPermission(user?.permissions, 'users:edit')) return
      if (actionType === 'delete' && !hasPermission(user?.permissions, 'users:delete')) return

      onAction(record, actionType as FormMode)
    }
  }

  // Define action options
  const getOptions = () => {
    const options: TableActionOption[] = []

    if (hasPermission(user?.permissions, 'users:edit')) {
      options.push({
        label: 'Edit',
        key: 'edit',
        icon: <EditOutlined style={{ color: '#1890ff' }} />
      })
    }

    if (hasPermission(user?.permissions, 'users:delete')) {
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
    const baseColumns = generateColumns<User | any>(
      filteredUsers,
      handleAction,
      getOptions(),
      ['username', 'name', 'role'],
      'username'
    )

    const nameColumnIndex = baseColumns.findIndex((col) => col.key === 'username')
    if (nameColumnIndex !== -1) {
      baseColumns[nameColumnIndex].render = (text: string, record: User) => (
        <a
          onClick={() => {
            if (hasPermission(user?.permissions, 'users:view')) {
              onAction(record, 'view')
            }
          }}
          style={{
            cursor: hasPermission(user?.permissions, 'users:view') ? 'pointer' : 'default',
            color: hasPermission(user?.permissions, 'users:view') ? undefined : 'inherit',
            textDecoration: hasPermission(user?.permissions, 'users:view') ? undefined : 'none'
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
        <SearchInput title="Users (name, username, role)" onChange={setSearchTerm} />
      </Flex>

      <TableComponent<User>
        data={filteredUsers}
        columns={columns()}
        size="small"
        bordered={true}
        loading={loading}
        pagination={pagination}
      />
    </>
  )
}
