import { useEffect, useRef, useState } from 'react'
import { Form, Input, Button, Modal, Typography, Select, notification } from 'antd'
import { User, useUserStore } from '@/renderer/src/store/userStore'
import { useAuthStore } from '@/renderer/src/store/authStore'
import { EditOutlined } from '@mui/icons-material'

const { Text } = Typography
const { Option } = Select

interface UserEditFormProps {
  open: boolean
  onClose: () => void
}

export default function UserEditForm({ open, onClose }: UserEditFormProps) {
  const [form] = Form.useForm()
  const [isLoading, setIsLoading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null) // Keep this state
  const fileInputRef = useRef<HTMLInputElement | any>(null)

  const { user, setUser } = useAuthStore()
  const { updateUser } = useUserStore()

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        fname: (user?.name || '').split(' ')[0] || '',
        lname: (user?.name || '').split(' ').slice(1).join(' ') || '',
        username: user.username || '',
        password: '',
        role: user.role || '',
        permissions: user.permissions || []
      })
      setProfileImage(user.profile_image || null)
    }
  }, [form, user, open])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string) // base64 string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    try {
      if (!user) return

      const values = await form.validateFields()
      setIsLoading(true)

      values.name = `${values.fname} ${values?.lname || ''}`

      const userData: User = {
        ...user,
        name: values.name,
        username: values.username,
        role: user.role,
        profile_image: profileImage || '',
        ...(values.password && values.password.trim() !== '' ? { password: values.password } : {})
      }

      console.log(userData)

      const success = await updateUser(user.id, userData)

      if (success) {
        // Update local state
        setUser({
          id: user.id,
          name: values.name,
          username: values.username,
          role: user.role,
          profile_image: profileImage || '',
          permissions: user.permissions
        })

        try {
          // Refresh the auth token to include the updated user information
          const tokenResult = await window.context.auth.refreshToken(user.id)

          if (tokenResult?.success) {
            notification.success({ message: 'Profile updated successfully' })
          } else {
            notification.warning({
              message: 'Profile updated, but session token refresh failed',
              description: 'You may need to log in again to see your changes.'
            })
          }
        } catch (error) {
          console.error('Token refresh error:', error)
          notification.warning({
            message: 'Profile updated, but session token refresh failed',
            description: 'You may need to log in again to see your changes.'
          })
        }
        onClose()
      } else {
        notification.error({ message: 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const defaultProfile = '/src/assets/profile_default.jpg'

  return (
    <Modal
      title="Edit Profile"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={isLoading} onClick={handleSubmit}>
          Update Profile
        </Button>
      ]}
      maskClosable={false}
      destroyOnClose
    >
      <Form form={form} layout="vertical" disabled={isLoading}>
        <Form.Item label="Profile Image">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
            hidden
          />
          {/* TODO: fix the image upload to show in the Image src  */}

          <div style={{ marginBottom: 8, position: 'relative', width: 80, height: 80 }}>
            <img
              src={profileImage || defaultProfile}
              alt="Profile Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
                marginBottom: 8
              }}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 0,
                right: -15,
                width: 30,
                height: 30,
                borderRadius: '100%',
                padding: 20,
                scale: 0.8
              }}
            >
              <EditOutlined />
            </Button>
          </div>
        </Form.Item>

        <Form.Item
          name="fname"
          label="First Name"
          rules={[{ required: true, message: 'First name is required' }]}
        >
          <Input placeholder="Enter first name" />
        </Form.Item>

        <Form.Item
          name="lname"
          label="Last Name"
          // rules={[{ required: true, message: 'Last name is required' }]}
        >
          <Input placeholder="Enter last name" />
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

        <Form.Item
          name="password"
          label="Password"
          rules={[
            {
              min: 6,
              message: 'Password must be at least 6 characters',
              warningOnly: true
            }
          ]}
        >
          <Input.Password placeholder="Leave blank to keep current password" />
        </Form.Item>

        <Form.Item name="role" label="Role">
          <Input disabled value={user?.role} />
        </Form.Item>
        {user?.permissions.includes('*') ? (
          <Form.Item label="Permissions">
            <Text type="success">Admin has all permissions (*)</Text>
          </Form.Item>
        ) : (
          <Form.Item name="permissions" label="Permissions">
            <Select mode="multiple" disabled style={{ width: '100%' }}>
              {Array.isArray(user?.permissions) &&
                user?.permissions.map((permission) => (
                  <Option key={permission} value={permission}>
                    {permission && typeof permission === 'string'
                      ? permission
                          .split(':')
                          .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
                          .join(' ')
                      : permission}
                  </Option>
                ))}
            </Select>
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}
