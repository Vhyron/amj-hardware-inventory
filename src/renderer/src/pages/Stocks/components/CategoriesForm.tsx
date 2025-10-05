import { Form, Input, Button, Modal, Row, Col, Popconfirm, Typography } from 'antd'
import { useCategoryStore } from '@/renderer/src/store/categoryStore'
import { Category, emptyCategory } from '../types'
import { generatePrefixedUUID } from '@/renderer/src/lib/uuid'
import { FormMode } from '@/renderer/src/lib/types'
import { useEffect } from 'react'

const { Text } = Typography
const { TextArea } = Input

interface CategoryFormProps {
  category: Category | null
  open: boolean
  mode: FormMode
  onClose: () => void
  onSuccess: () => void
}

export default function CategoriesForm({
  category,
  mode,
  open,
  onClose,
  onSuccess
}: CategoryFormProps) {
  const [form] = Form.useForm()
  const { addCategory, updateCategory, deleteCategory } = useCategoryStore()

  useEffect(() => {
    if (open) {
      if (category) {
        form.setFieldsValue(category)
      } else {
        form.setFieldsValue(emptyCategory)
      }
    }
  }, [form, category, open])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const currentDate = new Date().toISOString()

      const categoryData: Category = {
        ...values,
        updatedAt: currentDate,
        id: category?.id || values.id || generatePrefixedUUID('cat'),
        createdAt: category?.createdAt || currentDate
      }

      let success = false

      if (mode === 'add') {
        success = await addCategory(categoryData)
      } else if (mode === 'edit') {
        success = await updateCategory(categoryData)
      }

      if (success) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to submit category:', error)
    }
  }

  const handleDelete = async () => {
    if (!category?.id) return

    try {
      await deleteCategory(category.id)
      onSuccess()
    } catch (error) {
      console.error('Error deleting stock:', error)
      alert('Failed to delete stock. Please try again.')
    }
  }

  // Get title based on current mode
  const getTitle = () => {
    switch (mode) {
      case 'view':
        return 'Category Details'
      case 'add':
        return 'Add New Category'
      case 'edit':
        return 'Edit Category'
      case 'delete':
        return 'Delete Category'
      default:
        return 'Category'
    }
  }

  const renderActions = () => {
    return (
      <Row justify="space-between" align="middle" style={{ marginTop: 24 }}>
        <Col>
          {category && category.updatedAt && (
            <Text type="secondary" italic>
              Last updated: {new Date(category.updatedAt).toLocaleString()}
            </Text>
          )}
        </Col>

        <Col>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>

          {mode === 'view' ? null : mode === 'delete' ? (
            <Popconfirm
              title="Delete this category"
              description="Are you sure you want to delete this category? This action cannot be undone."
              onConfirm={handleDelete}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button type="primary" danger>
                Delete Category
              </Button>
            </Popconfirm>
          ) : (
            <Button type="primary" htmlType="submit" style={{ background: '#476ed9' }}>
              {mode === 'add' ? 'Add Category' : 'Update Category'}
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
      width={520}
    >
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        initialValues={category || {}}
        disabled={isReadOnly}
      >
        <Form.Item
          name="name"
          label="Category Name"
          rules={[{ required: true, message: 'Category name is required' }]}
        >
          <Input placeholder="Enter category name" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <TextArea rows={3} placeholder="Enter description (optional)" />
        </Form.Item>

        {(mode === 'add' || mode === 'edit') && renderActions()}
      </Form>
      {mode === 'delete' && renderActions()}
    </Modal>
  )
}
