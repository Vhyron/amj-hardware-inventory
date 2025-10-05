import { Typography } from 'antd'
import PageTabs, { TabItem } from '../../components/PageTabs'
import UsersTab from './tabs/UsersTab'
import { User } from '../../store/userStore'
import { FormMode } from '../../lib/types'
import { useState } from 'react'
import UsersForm from './components/UsersForm'
import { useAuthStore } from '../../store/authStore'
import { hasPermission } from '../../lib/utils'

export default function Users() {
  const { user } = useAuthStore()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [userFormMode, setUserFormMode] = useState<FormMode>('add')

  const handleUserAction = (user: User | null, mode: FormMode) => {
    setSelectedUser(user)
    setUserFormMode(mode)
    setUserFormOpen(true)
  }

  const handleAddUser = () => {
    handleUserAction(null, 'add')
  }

  const handleUserFormClose = () => {
    setSelectedUser(null)
    setUserFormOpen(false)
  }

  const tabItems: TabItem[] = [
    {
      label: 'Users',
      content: <UsersTab onAction={handleUserAction} />,
      actionButton: {
        label: 'Add New User',
        onClick: handleAddUser,
        disabled: !hasPermission(user?.permissions, 'users:create')
      }
    }
  ]

  return (
    <div style={{ margin: '0 auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={2}>User Management</Typography.Title>
        <PageTabs items={tabItems} />
      </div>

      <UsersForm
        user={selectedUser}
        open={userFormOpen}
        mode={userFormMode}
        onClose={handleUserFormClose}
        onSuccess={handleUserFormClose}
      />
    </div>
  )
}
