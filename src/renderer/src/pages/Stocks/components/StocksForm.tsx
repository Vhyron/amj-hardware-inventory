import { useEffect } from 'react'
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Typography,
  Divider,
  Row,
  Col,
  Modal,
  Popconfirm
} from 'antd'
import { useStockStore } from '@/renderer/src/store/stockStore'
import { useCategoryStore } from '@/renderer/src/store/categoryStore'
import { useSupplierStore } from '@/renderer/src/store/supplierStore'
import { generatePrefixedUUID } from '@/renderer/src/lib/uuid'
import { Stock, emptyStock, units } from '../types'
import { FormMode } from '@/renderer/src/lib/types'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

interface StocksFormProps {
  stock: Stock | null
  open: boolean
  mode: FormMode
  onClose: () => void
  onSuccess: () => void
}

/**
 * StocksForm - A unified form component for handling all stock operations (view, add, edit, delete)
 */
export default function StocksForm({ stock, open, mode, onClose, onSuccess }: StocksFormProps) {
  const [form] = Form.useForm()
  const { addStock, updateStock, deleteStock } = useStockStore()
  const { categories, fetchCategories } = useCategoryStore()
  const { suppliers, fetchSuppliers } = useSupplierStore()

  // Fetch categories and suppliers when component mounts
  useEffect(() => {
    fetchCategories()
    fetchSuppliers()
  }, [fetchCategories, fetchSuppliers])

  // Reset form when opening with different stock or mode
  useEffect(() => {
    if (open) {
      if (stock) {
        form.setFieldsValue(stock)
      } else {
        form.setFieldsValue(emptyStock)
      }
    }
  }, [form, stock, open])

  // Function to generate SKU based on name and category
  const generateSKU = (name?: string, category?: string) => {
    if (!name || !category || mode !== 'add') return

    const namePrefix = name.substring(0, 3).toUpperCase()
    const catPrefix = category.replace(/\s+/g, '-').substring(0, 3).toUpperCase()
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    const sku = `${namePrefix}-${catPrefix}-${randomNum}`

    form.setFieldValue('sku', sku)
  }

  // Handle changes to form values
  const handleValuesChange = (changedValues: any) => {
    // If name or category changed, and we're in add mode, update SKU
    if ((changedValues.name || changedValues.category) && mode === 'add') {
      const name = changedValues.name || form.getFieldValue('name')
      const category = changedValues.category || form.getFieldValue('category')
      generateSKU(name, category)
    }

    // If supplierId changed, update location with supplier address
    if (changedValues.supplierId !== undefined) {
      const supplierId = changedValues.supplierId
      // Only update if a supplier was selected and we're not in readonly mode
      if (supplierId && !isReadOnly) {
        const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId)

        if (selectedSupplier && selectedSupplier.address) {
          // Check if current location is empty or if it was previously auto-filled
          const currentLocation = form.getFieldValue('location')
          const isEmpty = !currentLocation || currentLocation.trim() === ''

          // Get the previous supplierId to check if we should override the location
          // const previousSupplierId = stock?.supplierId
          // const supplierChanged = previousSupplierId !== supplierId

          // Update location if it's empty or the supplier was changed
          if (isEmpty || mode === 'edit') {
            form.setFieldValue('location', selectedSupplier.address)
          }
        }
      } else if (!supplierId && mode === 'add') {
        // If supplier is cleared and we're in add mode, clear the location too
        form.setFieldValue('location', '')
      }
    }
  }

  // Generate initial SKU when form is first opened in add mode
  useEffect(() => {
    if (mode === 'add' && open) {
      // Small delay to ensure form is initialized
      setTimeout(() => {
        const name = form.getFieldValue('name')
        const category = form.getFieldValue('category')
        generateSKU(name, category)
      }, 100)
    }
  }, [mode, open])

  // Function to handle form submission
  const handleSubmit = async (values: any) => {
    try {
      // Calculate status based on quantity and reorder point
      let status: Stock['status']
      if (values.quantity <= 0) {
        status = 'Out of Stock'
      } else if (values.quantity <= values.reorderPoint) {
        status = 'Critical Low'
      } else {
        status = 'In Stock'
      }

      const currentDate = new Date().toISOString()
      const stockData = {
        ...values,
        status,
        updatedAt: currentDate,
        id: stock?.id || generatePrefixedUUID('stk'),
        createdAt: stock?.createdAt || currentDate
      }

      if (mode === 'add') {
        await addStock(stockData)
      } else if (mode === 'edit') {
        await updateStock(stockData)
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving stock:', error)
      alert(`Failed to ${mode === 'add' ? 'add' : 'update'} stock. Please try again.`)
    }
  }

  // Function to handle stock deletion
  const handleDelete = async () => {
    if (!stock?.id) return

    try {
      await deleteStock(stock.id)
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
        return 'Stock Details'
      case 'add':
        return 'Add New Stock'
      case 'edit':
        return 'Edit Stock'
      case 'delete':
        return 'Delete Stock'
      default:
        return 'Stock'
    }
  }

  // Determine if form fields should be disabled
  const isReadOnly = mode === 'view' || mode === 'delete'

  // Render form actions based on mode
  const renderActions = () => {
    return (
      <Row justify="space-between" align="middle" style={{ marginTop: 24 }}>
        <Col>
          {stock && (
            <Text type="secondary" italic>
              Last updated: {new Date(stock.updatedAt).toLocaleString()}
            </Text>
          )}
        </Col>

        <Col>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>

          {mode === 'view' ? null : mode === 'delete' ? (
            <Popconfirm
              title="Delete this stock"
              description="Are you sure you want to delete this stock? This action cannot be undone."
              onConfirm={handleDelete}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button type="primary" danger>
                Delete Stock
              </Button>
            </Popconfirm>
          ) : (
            <Button type="primary" htmlType="submit" style={{ background: '#476ed9' }}>
              {mode === 'add' ? 'Add Stock' : 'Update Stock'}
            </Button>
          )}
        </Col>
      </Row>
    )
  }

  return (
    <Modal
      open={open}
      title={getTitle()}
      onCancel={onClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      {/* For delete mode, we'll just wrap the Form in a div */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        disabled={isReadOnly}
        initialValues={stock || emptyStock}
      >
        {/* Stock Information Section */}
        <Title level={5}>Stock Information</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter stock name' }]}
            >
              <Input placeholder="Enter stock name" autoFocus />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="category"
              label="Category"
              rules={[{ required: true, message: 'Please select a category' }]}
            >
              <Select placeholder="Select category">
                {categories.map((category) => (
                  <Option key={category.id} value={category.name}>
                    {category.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Description">
          <TextArea rows={2} placeholder="Enter description" />
        </Form.Item>

        <Divider />

        {/* Quantity & Pricing Section */}
        <Title level={5}>Quantity & Pricing</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[{ required: true, message: 'Please enter quantity' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="Enter quantity" />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              name="unit"
              label="Unit"
              rules={[{ required: true, message: 'Please select a unit' }]}
            >
              <Select placeholder="Select unit">
                {units.map((unit) => (
                  <Option key={unit} value={unit}>
                    {unit}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={10}>
            <Form.Item name="reorderPoint" label="Reorder Point">
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="Minimum level before reorder"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="costPrice"
              label="Cost Price"
              rules={[{ required: true, message: 'Please enter cost price' }]}
            >
              <InputNumber
                min={0}
                step="0.01"
                style={{ width: '100%' }}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="unitPrice"
              label="Unit Price"
              rules={[{ required: true, message: 'Please enter unit price' }]}
            >
              <InputNumber
                min={0}
                step="0.01"
                style={{ width: '100%' }}
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        {/* Additional Information Section */}
        <Title level={5}>Additional Information</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="supplierId" label="Supplier">
              <Select placeholder="Select supplier" allowClear>
                {suppliers.map((supplier) => (
                  <Option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="location" label="Supplier Location">
              <Input placeholder="Storage location (e.g., Warehouse A-12)" allowClear />
            </Form.Item>
          </Col>
        </Row>

        {/* SKU Field - Now at the bottom and clearly disabled */}
        <Row>
          <Col span={24}>
            <Form.Item name="sku" label="SKU">
              <Input
                placeholder="Auto-generated SKU"
                disabled={true}
                style={{
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed',
                  color: '#666'
                }}
              />
            </Form.Item>
            {mode === 'add' && (
              <Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginTop: -16, marginBottom: 16 }}
              >
                SKU is automatically generated based on the product name and category
              </Text>
            )}
          </Col>
        </Row>

        {/* Only render action buttons inside form for add/edit modes */}
        {(mode === 'add' || mode === 'edit') && renderActions()}
      </Form>

      {/* For view/delete modes, render actions outside the form */}
      {(mode === 'view' || mode === 'delete') && renderActions()}
    </Modal>
  )
}
