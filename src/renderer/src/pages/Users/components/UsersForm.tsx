import {
  Form,
  Input,
  Button,
  Modal,
  Row,
  Col,
  Popconfirm,
  Typography,
  Select,
  Checkbox
} from 'antd'
import { generatePrefixedUUID } from '@/renderer/src/lib/uuid'
import { FormMode } from '@/renderer/src/lib/types'
import { useEffect, useState } from 'react'
import { useUserStore } from '@/renderer/src/store/userStore'
import { permissionOptions } from '@/renderer/src/lib/permissions'

const { Text } = Typography
const { Option } = Select
const { Password } = Input

// Define User interface
export interface User {
  id: string
  name: string
  username: string
  password?: string
  role: string
  permissions: string[]
  createdAt?: string
  updatedAt?: string
}

// Define role options
const roleOptions = [
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Secretary', value: 'secretary' },
  { label: 'Staff', value: 'staff' }
]

interface Props {
  user: User | null
  open: boolean
  mode: FormMode
  onClose: () => void
  onSuccess: () => void
}

export default function UsersForm({ user, mode, open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm()
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || 'staff')

  const { addUser, updateUser, deleteUser } = useUserStore()

  useEffect(() => {
    if (open) {
      if (user) {
        form.setFieldsValue({
          ...user,
          password: '' // Don't show the password
        })
        setSelectedRole(user.role)
      } else {
        form.setFieldsValue({
          name: '',
          username: '',
          role: 'staff',
          permissions: []
        })
        setSelectedRole('staff')
      }
    }
  }, [form, user, open])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const currentDate = new Date().toISOString()

      // If admin, grant all permissions
      const permissions =
        values.role === 'admin' || values.role === 'super_admin'
          ? ['*']
          : Array.isArray(values.permissions)
            ? values.permissions
            : []

      const userData: User = {
        ...values,
        permissions,
        updatedAt: currentDate,
        id: user?.id || values.id || generatePrefixedUUID('usr'),
        createdAt: user?.createdAt || currentDate
      }

      let success = false

      console.log(userData)

      if (mode === 'add') {
        // Call the API to add the user
        success = await addUser(userData)
      } else if (mode === 'edit') {
        // Call the API to update the user
        success = await updateUser(userData.id, userData)
      }

      if (success) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to submit user:', error)
    }
  }

  const handleDelete = async () => {
    if (!user?.id) return

    try {
      const result = await deleteUser(user.id)
      if (result) {
        onSuccess()
      } else {
        console.error('Error deleting user:', result)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const handleRoleChange = (value: string) => {
    setSelectedRole(value)
    // Clear permissions when switching to admin
    if (value === 'admin' || value === 'super_admin') {
      form.setFieldValue('permissions', ['*'])
    } else {
      form.setFieldValue('permissions', [])
    }
  }

  // Get title based on current mode
  const getTitle = () => {
    switch (mode) {
      case 'view':
        return 'User Details'
      case 'add':
        return 'Create New User'
      case 'edit':
        return 'Edit User'
      case 'delete':
        return 'Delete User'
      default:
        return 'User'
    }
  }

  const renderActions = () => {
    return (
      <Row justify="end" align="middle" style={{ marginTop: 24 }}>
        <Col>
          {user && user.updatedAt && (
            <Text type="secondary" italic style={{ marginRight: 16 }}>
              Last updated: {new Date(user.updatedAt).toLocaleString()}
            </Text>
          )}

          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>

          {mode === 'view' ? null : mode === 'delete' ? (
            <Popconfirm
              title="Delete this user"
              description="Are you sure you want to delete this user? This action cannot be undone."
              onConfirm={handleDelete}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button type="primary" danger>
                Delete User
              </Button>
            </Popconfirm>
          ) : (
            <Button type="primary" htmlType="submit" style={{ background: '#476ed9' }}>
              {mode === 'add' ? 'Create User' : 'Update User'}
            </Button>
          )}
        </Col>
      </Row>
    )
  }

  const isReadOnly = mode === 'view' || mode === 'delete'

  return (
    <Modal
      open={open}
      title={getTitle()}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={500}
    >
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        initialValues={user || { role: 'staff', permissions: [] }}
        disabled={isReadOnly}
      >
        <Form.Item
          name="name"
          label="Full Name"
          rules={[{ required: true, message: 'Full name is required' }]}
        >
          <Input placeholder="Enter full name" />
        </Form.Item>

        <Form.Item
          name="username"
          label="Username"
          rules={[
            { required: true, message: 'Username is required' },
            { min: 3, message: 'Username must be at least 3 characters' }
          ]}
        >
          <Input placeholder="Enter username" />
        </Form.Item>

        {/* Only show password field in add mode or edit mode (optional in edit) */}
        {mode === 'add' || mode === 'edit' ? (
          <Form.Item
            name="password"
            label="Password"
            rules={[
              {
                required: mode === 'add',
                message: 'Password is required'
              },
              {
                min: 6,
                message: 'Password must be at least 6 characters',
                warningOnly: mode === 'edit' // Only warning in edit mode
              }
            ]}
          >
            <Password
              placeholder={
                mode === 'add' ? 'Enter password' : 'Leave blank to keep current password'
              }
            />
          </Form.Item>
        ) : null}

        <Form.Item
          name="role"
          label="Role"
          rules={[{ required: true, message: 'Role is required' }]}
        >
          <Select onChange={handleRoleChange}>
            {roleOptions.map((role) => (
              <Option key={role.value} value={role.value}>
                {role.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedRole !== 'admin' && (
          <Form.Item name="permissions" label="Permissions">
            <Checkbox.Group
              options={permissionOptions}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px'
              }}
            />
          </Form.Item>
        )}

        {selectedRole === 'admin' && (
          <Form.Item label="Permissions">
            <Text type="success">Admin has all permissions (*)</Text>
          </Form.Item>
        )}

        {(mode === 'add' || mode === 'edit') && renderActions()}
      </Form>
      {mode === 'delete' && renderActions()}
    </Modal>
  )
}
