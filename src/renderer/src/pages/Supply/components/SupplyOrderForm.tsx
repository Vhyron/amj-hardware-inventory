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
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [tempItems, setTempItems] = useState<OrderItem[]>([])

  const { user } = useAuthStore()
  const { suppliers, fetchSuppliers } = useSupplierStore()
  const { stocks, fetchActiveStocks } = useStockStore()
  const { categories, fetchCategories } = useCategoryStore()
  const {
    createOrderWithItems,
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

  // Computed values
  const isViewMode = mode === 'view'
  const isEditMode = mode === 'edit'
  const isDeleteMode = mode === 'delete'
  const isAddMode = mode === 'add'
  const canEdit = !isViewMode && !isDeleteMode
  const activeSuppliers = suppliers.filter((s) => s.isActive === 1)
  const currentSupplierId = Form.useWatch('supplierId', orderForm)
  const displayItems = isAddMode ? tempItems : orderItems
  const supplierStocks = stocks.filter(
    (s) => currentSupplierId && s.supplierId === currentSupplierId && s.status !== 'Archived'
  )

  useEffect(() => {
    fetchSuppliers()
    fetchActiveStocks()
    fetchCategories()
  }, [fetchSuppliers, fetchActiveStocks, fetchCategories])

  useEffect(() => {
    if (!open) return

    if (selected && !isAddMode) {
      fetchOrderById(selected.id)
      fetchOrderItems(selected.id)
    }
  }, [open, selected, isAddMode, fetchOrderById, fetchOrderItems])

  useEffect(() => {
    if (!open) return

    if (currentOrder && !isAddMode) {
      orderForm.setFieldsValue({
        supplierId: currentOrder.supplierId,
        status: currentOrder.status,
        notes: currentOrder.notes
      })
    } else if (isAddMode) {
      orderForm.setFieldsValue({ status: 'Pending' })
    }
  }, [open, currentOrder, isAddMode, orderForm])

  useEffect(() => {
    if (!open) {
      orderForm.resetFields()
      itemForm.resetFields()
      setTempItems([])
      setItemModalOpen(false)
      setEditingItemId(null)
    }
  }, [open, orderForm, itemForm])

  const handleOrderSubmit = async () => {
    try {
      const values = await orderForm.validateFields()
      setSubmitting(true)

      if (isDeleteMode && selected) {
        await handleDeleteOrder(selected.id)
      } else if (isEditMode && currentOrder) {
        await handleUpdateOrder(currentOrder.id, values)
      } else if (isAddMode) {
        await handleCreateOrder(values)
      }
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateOrder = async (values: any) => {
    const totalCost = calculateTotalCost(tempItems)
    const newOrder = {
      ...values,
      orderedBy: user?.username || 'unknown',
      totalCost
    }

    const { orderId, error } = await createOrderWithItems(newOrder, tempItems)

    if (!orderId) {
      notification.error({
        message: 'Failed to create order',
        description: error
      })
      return
    }

    // Success notification
    if (values.status === 'Delivered') {
      notification.success({
        message: 'Order created successfully',
        description: 'Items have been added to inventory'
      })
    } else {
      notification.success({
        message: 'Order created successfully',
        description: tempItems.length > 0 ? `${tempItems.length} item(s) added` : undefined
      })
    }

    onClose()
  }

  const handleUpdateOrder = async (orderId: string, values: any) => {
    const totalCost = calculateTotalCost(orderItems)

    const success = await updateOrder(orderId, {
      ...values,
      totalCost
    })

    if (success) {
      notification.success({
        message: 'Order updated successfully',
        description:
          values.status === 'Delivered' ? 'Items have been added to inventory' : undefined
      })
      onClose()
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    const success = await deleteOrder(orderId)
    if (success) {
      notification.success({ message: 'Order deleted successfully' })
      onClose()
    }
  }

  const openItemModal = (item?: OrderItem) => {
    if (item) {
      setEditingItemId(item.id)
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
    } else {
      setEditingItemId(null)
      itemForm.resetFields()
    }
    setItemModalOpen(true)
  }

  const closeItemModal = () => {
    setItemModalOpen(false)
    setEditingItemId(null)
    itemForm.resetFields()
  }

  const handleItemSubmit = async () => {
    try {
      const values = await itemForm.validateFields()

      if (isAddMode) {
        await handleTempItemSave(values)
      } else {
        await handleDatabaseItemSave(values)
      }

      closeItemModal()
    } catch (error) {
      console.error('Item form validation error:', error)
    }
  }

  const handleTempItemSave = async (values: any) => {
    const item: OrderItem = {
      id: editingItemId || `temp-${Date.now()}`,
      orderId: '',
      ...values,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (editingItemId) {
      setTempItems(tempItems.map((i) => (i.id === editingItemId ? item : i)))
      notification.success({ message: 'Item updated' })
    } else {
      // **FIX: Check for duplicate items by stockId**
      const existingItemIndex = tempItems.findIndex(
        (i) => i.stockId && values.stockId && i.stockId === values.stockId
      )

      if (existingItemIndex !== -1) {
        // **Merge with existing item**
        const existingItem = tempItems[existingItemIndex]
        const updatedItem: OrderItem = {
          ...existingItem,
          quantity: existingItem.quantity + values.quantity,
          unitPrice: values.unitPrice, // Use latest price
          updatedAt: new Date().toISOString()
        }

        const newTempItems = [...tempItems]
        newTempItems[existingItemIndex] = updatedItem

        setTempItems(newTempItems)
        notification.success({
          message: 'Item quantity updated',
          description: `${existingItem.name}: ${existingItem.quantity} + ${values.quantity} = ${updatedItem.quantity} ${values.unit}`
        })
      } else {
        // **Add as new item**
        setTempItems([...tempItems, item])
        notification.success({ message: 'Item added' })
      }
    }
  }

  const handleDatabaseItemSave = async (values: any) => {
    const itemData: OrderItemFormData = {
      orderId: currentOrder?.id || '',
      ...values
    }

    if (editingItemId) {
      const success = await updateOrderItem(editingItemId, itemData)
      if (success) {
        notification.success({ message: 'Item updated' })
        await updateOrderTotalCost()
      }
    } else {
      const itemId = await createOrderItem(itemData)
      if (itemId) {
        notification.success({ message: 'Item added' })
        await updateOrderTotalCost()
      }
    }
  }

  const handleItemDelete = async (itemId: string) => {
    Modal.confirm({
      title: 'Delete Item',
      content: 'Are you sure you want to delete this item?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        if (isAddMode) {
          setTempItems(tempItems.filter((item) => item.id !== itemId))
          notification.success({ message: 'Item removed' })
        } else {
          const success = await deleteOrderItem(itemId)
          if (success) {
            notification.success({ message: 'Item removed' })
            await updateOrderTotalCost()
          }
        }
      }
    })
  }

  const updateOrderTotalCost = async () => {
    if (!currentOrder) return
    const totalCost = calculateTotalCost(orderItems.filter((item) => item.id !== editingItemId))
    await updateOrder(currentOrder.id, { totalCost })
  }

  const calculateTotalCost = (items: OrderItem[]) => {
    return items.reduce((total, item) => {
      return total + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    }, 0)
  }

  const generateSKU = (name?: string, category?: string) => {
    if (!name || !category) return ''

    const namePrefix = name.substring(0, 3).toUpperCase()
    const catPrefix = category.replace(/\s+/g, '-').substring(0, 3).toUpperCase()
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')

    return `${namePrefix}-${catPrefix}-${randomNum}`
  }

  const handleItemFormChange = (changedValues: any) => {
    if (changedValues.name || changedValues.category) {
      const name = changedValues.name || itemForm.getFieldValue('name')
      const category = changedValues.category || itemForm.getFieldValue('category')
      const sku = generateSKU(name, category)
      if (sku) itemForm.setFieldValue('sku', sku)
    }
  }

  const handleStockSelect = (stockId: string) => {
    const stock = stocks.find((s) => s.id === stockId)
    if (stock) {
      itemForm.setFieldsValue({
        name: stock.name,
        sku: stock.sku || '',
        description: stock.description,
        category: stock.category,
        unit: stock.unit,
        unitPrice: stock.costPrice
      })
    }
  }

  const handleSupplierChange = (newSupplierId: string) => {
    const itemsToCheck = isAddMode ? tempItems : orderItems

    if (itemsToCheck.length > 0) {
      Modal.confirm({
        title: 'Supplier Change Warning',
        content: 'Changing the supplier will remove all items from this order. Continue?',
        okText: 'Continue',
        okType: 'danger',
        onOk: async () => {
          if (isAddMode) {
            setTempItems([])
          } else if (currentOrder) {
            // Delete all items from database
            for (const item of orderItems) {
              await deleteOrderItem(item.id)
            }

            // Update order with new supplier
            await updateOrder(currentOrder.id, {
              supplierId: newSupplierId,
              totalCost: 0
            })

            await fetchOrderById(currentOrder.id)
            await fetchOrderItems(currentOrder.id)
          }

          notification.info({
            message: 'Items removed',
            description: 'You can now add items from the new supplier'
          })
        },
        onCancel: () => {
          // Revert supplier selection
          orderForm.setFieldValue('supplierId', currentOrder?.supplierId)
        }
      })
    }

    // Clear stock selection in item form if open
    if (itemModalOpen) {
      itemForm.setFieldValue('stockId', undefined)
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
      render: (_: any, record: OrderItem) => formatCurrency(record.quantity * record.unitPrice)
    },
    {
      title: 'Actions',
      key: 'actions',
      hidden: !canEdit,
      render: (_: any, record: OrderItem) => (
        <Space>
          <Button icon={<EditOutlined />} type="text" onClick={() => openItemModal(record)} />
          <Button
            icon={<DeleteOutlined />}
            type="text"
            danger
            onClick={() => handleItemDelete(record.id)}
          />
        </Space>
      )
    }
  ].filter((col) => !col.hidden)

  const getModalTitle = () => {
    if (isViewMode) return `View Order - ${currentOrder?.id || ''}`
    if (isEditMode) return `Edit Order - ${currentOrder?.id || ''}`
    if (isDeleteMode) return `Delete Order - ${currentOrder?.id || ''}`
    return 'Create New Order'
  }

  return (
    <>
      <Modal
        title={getModalTitle()}
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
              type="primary"
              danger={isDeleteMode}
              loading={submitting}
              onClick={handleOrderSubmit}
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
                      {supplier.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select disabled={isViewMode}>
                  <Option value="Pending">Pending</Option>
                  <Option value="Approved">Approved</Option>
                  <Option value="Delivered">Delivered</Option>
                  {!isAddMode && <Option value="Cancelled">Cancelled</Option>}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} />
          </Form.Item>
        </Form>

        {/* Order Items Section */}
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
            {canEdit && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openItemModal()}>
                Add Item
              </Button>
            )}
          </div>

          <Table
            columns={itemColumns}
            dataSource={displayItems.map((item) => ({ ...item, key: item.id }))}
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
                    <strong>{formatCurrency(calculateTotalCost(displayItems))}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </div>

        {isDeleteMode && (
          <div style={{ marginTop: 16 }}>
            <Typography.Text type="danger" strong>
              Warning: This will permanently delete the order and all its items. This action cannot
              be undone.
            </Typography.Text>
          </div>
        )}
      </Modal>

      {/* Item Add/Edit Modal */}
      <Modal
        title={editingItemId ? 'Edit Item' : 'Add Item'}
        open={itemModalOpen}
        onCancel={closeItemModal}
        footer={[
          <Button key="cancel" onClick={closeItemModal}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleItemSubmit}>
            {editingItemId ? 'Update' : 'Add'}
          </Button>
        ]}
      >
        <Form form={itemForm} layout="vertical" onValuesChange={handleItemFormChange}>
          <Form.Item name="stockId" label="Select from Stock (Optional)">
            {!currentSupplierId ? (
              <Alert message="Please select a supplier first" type="info" showIcon />
            ) : supplierStocks.length === 0 ? (
              <Alert
                message="No existing products from this supplier in inventory"
                type="warning"
                showIcon
              />
            ) : (
              <Select
                allowClear
                placeholder="Select from existing stock"
                onChange={handleStockSelect}
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
                rules={[
                  { required: true, message: 'Please select a category' },
                  { whitespace: true, message: 'Category cannot be empty' }
                ]}
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
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

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
                  disabled
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
                      {unit}
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
    </>
  )
}
