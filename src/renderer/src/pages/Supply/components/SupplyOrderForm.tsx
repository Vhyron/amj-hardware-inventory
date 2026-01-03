import { FormMode } from '@/renderer/src/lib/types'
import { formatCurrency } from '@/renderer/src/lib/utils'
import { units } from '@/renderer/src/pages/Stocks/types'
import { useAuthStore } from '@/renderer/src/store/authStore'
import { useCategoryStore } from '@/renderer/src/store/categoryStore'
import { useStockStore } from '@/renderer/src/store/stockStore'
import { useSupplierStore } from '@/renderer/src/store/supplierStore'
import { useSupplyOrderStore } from '@/renderer/src/store/supplyOrderStore'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  notification,
  Row,
  Select,
  Space,
  Table,
  Typography
} from 'antd'
import { useEffect, useState } from 'react'
import { OrderItem, OrderItemFormData, SupplyOrder } from '../types'

const { TextArea } = Input
const { Title } = Typography
const { Option } = Select

interface SupplyOrderFormProps {
  open: boolean
  onClose: () => void
  mode: FormMode
  selected: SupplyOrder | null
}

export default function SupplyOrderForm({ open, onClose, mode, selected }: SupplyOrderFormProps) {
  const [orderForm] = Form.useForm()
  const [itemForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [currentSupplierId, setCurrentSupplierId] = useState<string>('')

  // New state variables for custom confirmation dialog
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [newSupplierId, setNewSupplierId] = useState<string | null>(null)
  const [previousSupplierId, setPreviousSupplierId] = useState<string | null>(null)

  const { user } = useAuthStore()
  const { suppliers, fetchSuppliers } = useSupplierStore()
  const { stocks, fetchStocks } = useStockStore()
  const { categories, fetchCategories } = useCategoryStore()
  const {
    createOrder,
    updateOrder,
    deleteOrder,
    orderItems,
    currentOrder,
    fetchOrderItems,
    createOrderItem,
    updateOrderItem,
    deleteOrderItem,
    fetchOrderById
  } = useSupplyOrderStore()

  // Filter suppliers to only include active ones
  const activeSuppliers = suppliers.filter((supplier) => supplier.isActive === 1)

  const isViewMode = mode === 'view'
  const isEditMode = mode === 'edit'
  const isDeleteMode = mode === 'delete'
  const isAddMode = mode === 'add'

  // Filter stocks based on the selected supplier
  const supplierStocks = stocks.filter(
    (stock) => currentSupplierId && stock.supplierId === currentSupplierId
  )
  const hasStocksFromSupplier = supplierStocks.length > 0

  // Fetch suppliers, stocks, and categories for dropdowns
  useEffect(() => {
    fetchSuppliers()
    fetchStocks()
    fetchCategories()
  }, [fetchSuppliers, fetchStocks, fetchCategories])

  // Fetch order details when selected order changes
  useEffect(() => {
    if (open && selected) {
      // Fetch order details if in edit, view, or delete mode
      if (isEditMode || isViewMode || isDeleteMode) {
        fetchOrderById(selected.id)
        fetchOrderItems(selected.id)
      }
    }
  }, [open, selected, isEditMode, isViewMode, isDeleteMode, fetchOrderById, fetchOrderItems])

  // Reset forms when modal opens/closes or selected item changes
  useEffect(() => {
    if (open) {
      if (currentOrder && (isEditMode || isViewMode || isDeleteMode)) {
        // Populate form with selected order data
        orderForm.setFieldsValue({
          supplierId: currentOrder.supplierId,
          status: currentOrder.status,
          notes: currentOrder.notes
        })
        setCurrentSupplierId(currentOrder.supplierId)
      } else if (isAddMode) {
        // Reset form for add mode with default values
        orderForm.resetFields()
        orderForm.setFieldsValue({
          status: 'Pending'
        })
        setCurrentSupplierId('')
      }
    }
  }, [open, currentOrder, isEditMode, isViewMode, isDeleteMode, isAddMode, orderForm])

  // Watch supplierId changes
  const handleSupplierChange = (value: string) => {
    const previousSupplierId = currentSupplierId

    // Clear stock selection when supplier changes
    if (addingItem) {
      itemForm.setFieldValue('stockId', undefined)
      setSelectedStock(null)
    }

    // If in edit mode and supplier has changed, check if there are items before showing confirmation
    if (isEditMode && previousSupplierId && value !== previousSupplierId) {
      // Only show confirmation if there are items to delete
      if (orderItems.length > 0) {
        setConfirmModalVisible(true)
        setNewSupplierId(value)
        setPreviousSupplierId(previousSupplierId)
        // Don't update currentSupplierId yet - wait for confirmation
      } else {
        // No items to delete, directly update the supplier
        setCurrentSupplierId(value)

        // First update the local state to show immediate UI changes
        if (currentOrder) {
          const supplierName = suppliers.find((s) => s.id === value)?.name || 'Unknown Supplier'

          // Update both the orders list and current order directly in the store
          const updatedOrder = {
            ...currentOrder,
            supplierId: value,
            supplierName: supplierName,
            updatedAt: new Date().toISOString()
          }

          // Update the store directly - this ensures immediate UI update
          const store = useSupplyOrderStore.getState()
          store.setCurrentOrder(updatedOrder)

          // Also update the orders list in the store to maintain consistency
          store.setOrders(
            store.orders.map((order) => (order.id === currentOrder.id ? updatedOrder : order))
          )

          // Then update the database (async operation)
          updateOrder(currentOrder.id, {
            supplierId: value
          }).then(() => {
            // Re-fetch the data to ensure everything is in sync
            fetchOrderById(currentOrder.id)
          })
        }
      }
    } else {
      // Not in edit mode or no change, just update the supplier ID directly
      setCurrentSupplierId(value)
    }
  }

  // Function to generate SKU based on name and category
  const generateSKU = (name?: string, category?: string) => {
    if (!name || !category) return

    const namePrefix = name.substring(0, 3).toUpperCase()
    const catPrefix = category.replace(/\s+/g, '-').substring(0, 3).toUpperCase()
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    const sku = `${namePrefix}-${catPrefix}-${randomNum}`

    itemForm.setFieldValue('sku', sku)
  }

  // Handle changes to item form values
  const handleItemValuesChange = (changedValues: any) => {
    // If name or category changed, update SKU
    if (changedValues.name || changedValues.category) {
      const name = changedValues.name || itemForm.getFieldValue('name')
      const category = changedValues.category || itemForm.getFieldValue('category')
      generateSKU(name, category)
    }
  }

  const calculateTotalCost = () => {
    return orderItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  }

  const handleSubmit = async () => {
    try {
      const values = await orderForm.validateFields()
      setSubmitting(true)

      let success = false

      if (isDeleteMode && selected) {
        // Handle delete order
        success = await deleteOrder(selected.id)
        if (success) {
          notification.success({ message: 'Order deleted successfully' })
          onClose()
        }
      } else if (isEditMode && currentOrder) {
        // Check if status is changing to Delivered
        const isChangingToDelivered =
          currentOrder.status !== 'Delivered' && values.status === 'Delivered'

        // Handle update order
        success = await updateOrder(currentOrder.id, values)
        if (success) {
          notification.success({
            message: 'Order updated successfully',
            description: isChangingToDelivered
              ? 'The ordered items have been added to your inventory.'
              : undefined
          })
          onClose()
        }
      } else if (isAddMode) {
        // Handle create order
        // Initialize with submitted values plus calculated total and user info
        const newOrder = {
          ...values,
          status: 'Pending',
          orderedBy: user?.username || 'unknown',
          totalCost: 0 // Initial cost is 0, will be updated as items are added
        }

        const orderId = await createOrder(newOrder)
        if (orderId) {
          notification.success({ message: 'Order created successfully' })
          onClose()
        } else {
          notification.error({ message: 'Failed to create order' })
        }
      }
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddItem = async () => {
    try {
      const values = await itemForm.validateFields()

      // Make sure we have the necessary data
      if (!currentOrder && !values.orderId) {
        notification.error({ message: 'Cannot add item: No order ID specified' })
        return
      }

      const orderId = currentOrder?.id || values.orderId
      const newItem: OrderItemFormData = {
        orderId,
        name: values.name,
        sku: values.sku,
        stockId: values.stockId || undefined,
        description: values.description,
        category: values.category,
        quantity: values.quantity,
        unit: values.unit,
        unitPrice: values.unitPrice
      }

      let success = false
      if (editingItem) {
        // Update existing item
        success = await updateOrderItem(editingItem, newItem)
        if (success) {
          notification.success({ message: 'Item updated successfully' })
          setAddingItem(false)
          setEditingItem(null)
          itemForm.resetFields()
        }
      } else {
        // Add new item
        const itemId = await createOrderItem(newItem)
        if (itemId) {
          notification.success({ message: 'Item added successfully' })
          setAddingItem(false)
          itemForm.resetFields()
        }
      }
    } catch (error) {
      console.error('Item form validation error:', error)
    }
  }

  const handleEditItem = (item: OrderItem) => {
    setEditingItem(item.id)
    setAddingItem(true)
    itemForm.setFieldsValue({
      name: item.name,
      sku: item.sku,
      stockId: item.stockId,
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice
    })
  }

  const handleDeleteItem = async (itemId: string) => {
    const success = await deleteOrderItem(itemId)
    if (success) {
      notification.success({ message: 'Item removed successfully' })
    }
  }

  // Handle stock selection to prefill item form
  const handleStockChange = (value: string) => {
    const selected = stocks.find((s) => s.id === value)
    if (selected) {
      setSelectedStock(selected)
      itemForm.setFieldsValue({
        name: selected.name,
        sku: selected.sku || '',
        description: selected.description,
        category: selected.category,
        unit: selected.unit,
        unitPrice: selected.costPrice // Use cost price as unit price
      })
    }
  }

  const itemColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku'
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity'
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit'
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price: number) => formatCurrency(price)
    },
    {
      title: 'Total',
      key: 'total',
      render: (_, record: OrderItem) => formatCurrency(record.quantity * record.unitPrice)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: OrderItem) =>
        !isViewMode && !isDeleteMode ? (
          <Space>
            <Button icon={<EditOutlined />} type="text" onClick={() => handleEditItem(record)} />
            <Button
              icon={<DeleteOutlined />}
              type="text"
              danger
              onClick={() => handleDeleteItem(record.id)}
            />
          </Space>
        ) : null
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'processing'
      case 'Approved':
        return 'warning'
      case 'Delivered':
        return 'success'
      case 'Cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  const modalTitle = () => {
    if (isViewMode) return `View Order - ${currentOrder?.id || ''}`
    if (isEditMode) return `Edit Order - ${currentOrder?.id || ''}`
    if (isDeleteMode) return `Delete Order - ${currentOrder?.id || ''}`
    return 'Create New Order'
  }

  // Determine if any items exist for the current order
  const hasItems = orderItems.length > 0

  return (
    <Modal
      title={modalTitle()}
      open={open}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        !isViewMode && (
          <Button
            key="submit"
            type={isDeleteMode ? 'primary' : 'primary'}
            danger={isDeleteMode}
            loading={submitting}
            onClick={handleSubmit}
          >
            {isDeleteMode ? 'Delete' : isEditMode ? 'Update' : 'Create'}
          </Button>
        )
      ]}
    >
      {/* Order Form */}
      <Form form={orderForm} layout="vertical" disabled={isViewMode || isDeleteMode}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="supplierId"
              label="Supplier"
              rules={[{ required: true, message: 'Please select a supplier' }]}
            >
              <Select
                placeholder="Select supplier"
                onChange={handleSupplierChange}
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {activeSuppliers.map((supplier) => (
                  <Option key={supplier.id} value={supplier.id}>
                    {`${supplier.name}`}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label="Status">
              <Select disabled={isAddMode}>
                <Option value="Pending">Pending</Option>
                <Option value="Approved">Approved</Option>
                <Option value="Delivered">Delivered</Option>
                <Option value="Cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Notes">
          <TextArea rows={2} />
        </Form.Item>
      </Form>

      {/* Show Order Items Section for View/Edit/Delete modes */}
      {(isViewMode || isEditMode || isDeleteMode) && (
        <div style={{ marginTop: 24 }}>
          <Divider orientation="left">Order Items</Divider>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}
          >
            <Title level={5}>Items</Title>
            {!isViewMode && !isDeleteMode && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setAddingItem(true)
                  setEditingItem(null)
                  itemForm.resetFields()
                }}
              >
                Add Item
              </Button>
            )}
          </div>
          <Table
            columns={itemColumns}
            dataSource={orderItems.map((item) => ({ ...item, key: item.id }))}
            size="small"
            bordered
            pagination={false}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}>
                    <strong>Total Cost</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} colSpan={2}>
                    <strong>{formatCurrency(calculateTotalCost())}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </div>
      )}

      {/* Item Form (Add/Edit items) */}
      {addingItem && (isEditMode || isAddMode) && (
        <Modal
          title={editingItem ? 'Edit Item' : 'Add Item'}
          open={addingItem}
          onCancel={() => {
            setAddingItem(false)
            setEditingItem(null)
            itemForm.resetFields()
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setAddingItem(false)
                setEditingItem(null)
                itemForm.resetFields()
              }}
            >
              Cancel
            </Button>,
            <Button key="submit" type="primary" onClick={handleAddItem}>
              {editingItem ? 'Update' : 'Add'}
            </Button>
          ]}
        >
          <Form form={itemForm} layout="vertical" onValuesChange={handleItemValuesChange}>
            {/* Show supplier stock selection with appropriate warning */}
            <Form.Item name="stockId" label="Select from Stock (Optional)">
              {!currentSupplierId ? (
                <Alert message="Please select a supplier first" type="info" showIcon />
              ) : !hasStocksFromSupplier ? (
                <Alert
                  message={`No existing products from this supplier in your inventory yet`}
                  type="warning"
                  showIcon
                />
              ) : (
                <Select
                  allowClear
                  placeholder="Select from existing stock"
                  onChange={handleStockChange}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)
                      ?.toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {supplierStocks.map((stock) => (
                    <Option key={stock.id} value={stock.id}>
                      {`${stock.name} - ${stock.sku}`}
                    </Option>
                  ))}
                </Select>
              )}
            </Form.Item>

            {/* First Row - Name and Category side by side */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Item Name"
                  rules={[{ required: true, message: 'Please enter item name' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="category"
                  label="Category"
                  rules={[{ required: true, message: 'Please select a category' }]}
                >
                  <Select
                    placeholder="Select category"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)
                        ?.toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {categories.map((category) => (
                      <Option key={category.id} value={category.name}>
                        {`${category.name}`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Second Row - Description and SKU side by side */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="description" label="Description">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="sku"
                  label="SKU"
                  rules={[{ required: true, message: 'SKU is required' }]}
                >
                  <Input
                    disabled={true}
                    placeholder="Auto-generated SKU"
                    style={{
                      backgroundColor: '#f5f5f5',
                      cursor: 'not-allowed',
                      color: '#666'
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Third Row - Quantity, Unit, and Unit Price */}
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="quantity"
                  label="Quantity"
                  rules={[{ required: true, message: 'Please enter quantity' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="unit"
                  label="Unit"
                  rules={[{ required: true, message: 'Please select a unit' }]}
                >
                  <Select
                    placeholder="Select unit"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)
                        ?.toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {units.map((unit) => (
                      <Option key={unit} value={unit}>
                        {`${unit}`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="unitPrice"
                  label="Unit Price"
                  rules={[{ required: true, message: 'Please enter unit price' }]}
                >
                  <InputNumber
                    min={0}
                    step={0.01}
                    formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      )}

      {/* Create Item UI for adding mode when no items exist yet */}
      {isAddMode && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Title level={5}>Please save the order first to add items</Title>
          <p>After creating the order, you can add items to it.</p>
        </div>
      )}

      {/* Warning for delete mode */}
      {isDeleteMode && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="danger" strong>
            Warning: This will permanently delete the order and all its associated items. This
            action cannot be undone.
          </Typography.Text>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <Modal
        title="Supplier Change Warning"
        open={confirmModalVisible}
        onOk={async () => {
          // Delete all current order items if confirmed
          for (const item of orderItems) {
            await deleteOrderItem(item.id)
          }

          // Update the order with the new supplier
          if (newSupplierId && currentOrder) {
            // Get the supplier name for UI update
            const supplierName =
              suppliers.find((s) => s.id === newSupplierId)?.name || 'Unknown Supplier'

            // First update the store directly to ensure immediate UI update
            const store = useSupplyOrderStore.getState()
            const updatedOrder = {
              ...currentOrder,
              supplierId: newSupplierId,
              supplierName: supplierName,
              updatedAt: new Date().toISOString(),
              totalCost: 0
            }

            // Update both currentOrder and orders list in the store for immediate UI refresh
            store.setCurrentOrder(updatedOrder)
            store.setOrders(
              store.orders.map((order) => (order.id === currentOrder.id ? updatedOrder : order))
            )

            // Update the local state
            setCurrentSupplierId(newSupplierId)

            // Then update the database (async operation)
            await updateOrder(currentOrder.id, {
              supplierId: newSupplierId,
              totalCost: 0 // Reset total cost since all items are removed
            })

            // Refresh the data from server to ensure everything is in sync
            await fetchOrderItems(currentOrder.id) // Clear items list in state
            await fetchOrderById(currentOrder.id)
          }

          notification.info({
            message: 'Order items removed',
            description: 'All items have been removed. You can now add items from the new supplier.'
          })

          setConfirmModalVisible(false)
        }}
        onCancel={() => {
          // Revert supplier selection if canceled
          if (previousSupplierId) {
            setCurrentSupplierId(previousSupplierId)
            orderForm.setFieldValue('supplierId', previousSupplierId)
          }
          setConfirmModalVisible(false)
        }}
        okText="Continue"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
      >
        <p>Changing the supplier will remove all items from this order. Do you want to continue?</p>
      </Modal>
    </Modal>
  )
}
