import { Card, Col, Image, Row, Typography, Button, Tag, Flex, Modal, List } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'
import { useState } from 'react'
import UserEditForm from './components/UserEditForm'
import LoadingOverlay from '../../components/LoadingOverlay'

const { Title, Text } = Typography

export default function Account() {
  const { user } = useAuthStore()
  const [editMode, setEditMode] = useState(false)
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false)

  if (!user) {
    return <LoadingOverlay />
  }

  const handleEditClick = () => {
    setEditMode(true)
  }

  const handleCloseEdit = () => {
    setEditMode(false)
  }

  const showPermissionsModal = () => {
    setPermissionsModalVisible(true)
  }

  const hidePermissionsModal = () => {
    setPermissionsModalVisible(false)
  }

  const formatPermission = (permission: string) => {
    return permission
      .split(':')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const defaultProfile = '/src/assets/profile_default.jpg'

  return (
    <div style={{ margin: '0 auto', padding: '0 24px', overflowY: 'hidden' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>My Profile</Title>

        {/* User profile header card */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[24, 24]} align="middle">
            <Col style={{ marginRight: 15 }}>
              <div
                style={{
                  padding: 5,
                  backgroundColor: '#f9f9f9',
                  borderRadius: 100,
                  border: '1px solid #e6e6e6'
                }}
              >
                <Image
                  src={user?.profile_image || defaultProfile}
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover', borderRadius: 100 }}
                  preview={false}
                />
              </div>
            </Col>
            <Flex align="start" gap={4} vertical>
              <Title level={3} style={{ margin: 0 }}>
                {user.name}
              </Title>
              <Tag
                color={user.role === 'admin' ? 'red' : user.role === 'secretary' ? 'blue' : 'green'}
              >
                {user.role}
              </Tag>
              <span style={{ fontStyle: 'italic' }}>@{user.username}</span>
            </Flex>
          </Row>
        </Card>

        {/* Personal Information card */}
        <Card
          title="Personal Information"
          style={{ marginBottom: 24 }}
          extra={
            <Button type="primary" icon={<EditOutlined />} onClick={handleEditClick}>
              Edit
            </Button>
          }
        >
          <Row gutter={[16, 24]}>
            <Col xs={24} sm={12}>
              <Text type="secondary">First Name</Text>
              <div>
                {/* Add check for user.name before splitting */}
                <Text strong>{(user?.name || '').split(' ')[0] || ''}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">Last Name</Text>
              <div>
                {/* Add check for user.name before splitting */}
                <Text strong>{(user?.name || '').split(' ').slice(1).join(' ') || ''}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">User Role</Text>
              <div>
                <Text strong>
                  {user.role === 'super_admin'
                    ? user.role.split('_').join(' ').toUpperCase()
                    : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">Permissions:</Text>
              <br />
              {user.permissions.includes('*') ? (
                <Text strong>All Permissions (Admin)</Text>
              ) : user.permissions.length > 0 ? (
                <>
                  <Text>
                    {user.permissions.length === 1
                      ? formatPermission(user.permissions[0])
                      : `${user.permissions.length} Permissions`}
                  </Text>
                  {user.permissions.length > 1 && (
                    <Button type="link" onClick={showPermissionsModal}>
                      View All
                    </Button>
                  )}
                </>
              ) : (
                <Text strong>No permissions</Text>
              )}
            </Col>
          </Row>
        </Card>
      </div>

      {/* Permissions Modal */}
      <Modal
        title="User Permissions"
        open={permissionsModalVisible}
        onCancel={hidePermissionsModal}
        footer={[
          <Button key="close" type="primary" onClick={hidePermissionsModal}>
            Close
          </Button>
        ]}
      >
        <List
          dataSource={Array.isArray(user.permissions) ? user.permissions : []}
          renderItem={(permission) => (
            <List.Item>
              <Text>{formatPermission(permission)}</Text>
            </List.Item>
          )}
        />
      </Modal>

      <UserEditForm open={editMode} onClose={handleCloseEdit} />
    </div>
  )
}
