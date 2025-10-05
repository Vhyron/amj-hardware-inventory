import { useState } from 'react'
import { Modal, Button, Typography, Tag, Space, Row, Col } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import StocksForm from '../pages/Stocks/components/StocksForm'
import { Stock } from '../pages/Stocks/types'

interface TableActionsProps<T> {
  selectedRecord: T | null
  onClose: () => void
  actionType: 'view' | 'edit' | 'delete' | null
}

export default function TableActions<T extends { name: string }>({
  selectedRecord,
  onClose,
  actionType
}: TableActionsProps<T>) {
  if (!selectedRecord || !actionType) return null

  const handleDeleteConfirm = () => {
    console.log('Deleting record:', selectedRecord)
    // Here you would implement the actual delete logic
    onClose()
  }

  const renderViewContent = () => (
    <div style={{ padding: 16 }}>
      <Typography.Title level={5}>
        {selectedRecord.name}
      </Typography.Title>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {Object.entries(selectedRecord).map(([key, value]) => {
          if (key === 'id' || key === 'name') return null
          
          return (
            <Col key={key} span={12}>
              <Typography.Text type="secondary" style={{ fontWeight: 500 }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Typography.Text>
              <div>
                {key === 'status' ? (
                  <Tag
                    color={
                      value === 'In Stock'
                        ? 'success'
                        : value === 'Out of Stock'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    {value}
                  </Tag>
                ) : (
                  <Typography.Text>{value}</Typography.Text>
                )}
              </div>
            </Col>
          )
        })}
      </Row>
    </div>
  )

  const getModalTitle = () => {
    if (actionType === 'view') return 'View Details';
    if (actionType === 'edit') return 'Edit Record';
    return 'Confirm Delete';
  }

  return (
    <Modal
      open={true}
      onCancel={onClose}
      width={actionType === 'view' || actionType === 'edit' ? 800 : 500}
      title={getModalTitle()}
      closeIcon={<CloseOutlined />}
      footer={actionType === 'delete' ? [
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button 
          key="delete" 
          danger 
          type="primary" 
          onClick={handleDeleteConfirm}
        >
          Delete
        </Button>
      ] : null}
    >
      {actionType === 'view' && renderViewContent()}
      {actionType === 'edit' && <StocksForm stock={selectedRecord as unknown as Stock} open={true} onClose={onClose} mode="edit" onSuccess={onClose} />}
      {actionType === 'delete' && (
        <Typography.Text>
          Are you sure you want to delete the record "{selectedRecord.name}"? This action cannot be undone.
        </Typography.Text>
      )}
    </Modal>
  )
}