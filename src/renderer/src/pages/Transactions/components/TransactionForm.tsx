import {
  Form,
  Modal,
  Input,
  Select,
  Button,
  Space,
  Table,
  Typography,
  Row,
  Col,
  InputNumber,
  Divider,
  notification,
  Tag,
  Alert
} from 'antd'
import { useState, useEffect } from 'react'
import { FormMode } from '@/renderer/src/lib/types'
import { useTransactionStore } from '@/renderer/src/store/transactionStore'
import { useStockStore } from '@/renderer/src/store/stockStore'
import { Transaction, TransactionFormData } from '../types'
import { EditOutlined, DeleteOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons'
import { formatCurrency } from '@/renderer/src/lib/utils'
import { units } from '@/renderer/src/pages/Stocks/types'

const { TextArea } = Input
const { Title } = Typography
const { Option } = Select

interface TransactionFormProps {
  open: boolean
  onClose: () => void
  mode: FormMode
  selected: Transaction | null
}

interface LocalItem {
  tempId: string
  stockId: string
  stockName: string
  quantity: number
  unit: string
  unitPrice: number
}

export default function TransactionForm({ open, onClose, mode, selected }: TransactionFormProps) {
  const [transactionForm] = Form.useForm()
  const [itemForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [statusChanged, setStatusChanged] = useState(false)
  const [stockWarnings, setStockWarnings] = useState<
    Array<{
      itemId: string
      productName: string
      required: number
      available: number
    }>
  >([])

  const [localItems, setLocalItems] = useState<LocalItem[]>([])
  const { stocks, fetchActiveStocks } = useStockStore()
  const {
    createTransaction,
    updateTransaction,
    deleteTransaction,
    currentItems,
    currentTransaction,
    fetchTransactionItems,
    addTransactionItem,
    updateTransactionItem,
    deleteTransactionItem,
    fetchTransactionById
  } = useTransactionStore()

  const isViewMode = mode === 'view'
  const isEditMode = mode === 'edit'
  const isDeleteMode = mode === 'delete'
  const isAddMode = mode === 'add'

  useEffect(() => {
    fetchActiveStocks()
  }, [fetchActiveStocks])

  useEffect(() => {
    if (open && selected) {
      if (isEditMode || isViewMode || isDeleteMode) {
        fetchTransactionById(selected.id)
        fetchTransactionItems(selected.id)
      }
    }
  }, [
    open,
    selected,
    isEditMode,
    isViewMode,
    isDeleteMode,
    fetchTransactionById,
    fetchTransactionItems
  ])

  useEffect(() => {
    setStatusChanged(false)
    setLocalItems([])
    setStockWarnings([])

    if (open) {
      if (currentTransaction && (isEditMode || isViewMode || isDeleteMode)) {
        transactionForm.setFieldsValue({
          customerName: currentTransaction.customerName,
          referenceNo: currentTransaction.referenceNo,
          status: currentTransaction.status,
          notes: currentTransaction.notes
        })

        if (currentTransaction.status === 'pending' || currentTransaction.status === 'cancelled') {
          setTimeout(() => checkStockAvailability(), 100)
        }
      } else if (isAddMode) {
        transactionForm.resetFields()
        transactionForm.setFieldsValue({
          status: 'pending'
        })
      }
    }
  }, [open, currentTransaction, isEditMode, isViewMode, isDeleteMode, isAddMode, transactionForm])

  useEffect(() => {
    if (open && transactionForm.getFieldValue('status') === 'completed') {
      checkStockAvailability()
    }
  }, [currentItems, localItems, stocks, open])

  const calculateTotalAmount = () => {
    if (isAddMode) {
      return localItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
    }
    return currentItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  }

  const checkStockAvailability = () => {
    const warnings: Array<{
      itemId: string
      productName: string
      required: number
      available: number
    }> = []

    const itemsToCheck = isAddMode ? localItems : currentItems

    itemsToCheck.forEach((item) => {
      const stock = stocks.find((s) => s.id === item.stockId)
      if (stock && stock.quantity < item.quantity) {
        warnings.push({
          itemId: isAddMode ? item.tempId : item.id,
          productName: item.stockName,
          required: item.quantity,
          available: stock.quantity
        })
      }
    })

    setStockWarnings(warnings)
    return warnings.length === 0
  }

  const handleStatusChange = (newStatus: string) => {
    if (isAddMode) {
      if (newStatus === 'completed') {
        checkStockAvailability()
      } else {
        setStockWarnings([])
      }
      return
    }

    const oldStatus = currentTransaction?.status
    if (oldStatus && oldStatus !== newStatus) {
      setStatusChanged(true)
      if (newStatus === 'completed') {
        checkStockAvailability()
      } else {
        setStockWarnings([])
      }
    } else {
      setStatusChanged(false)
      setStockWarnings([])
    }
  }

  const getStatusChangeMessage = () => {
    const oldStatus = currentTransaction?.status
    const newStatus = transactionForm.getFieldValue('status')

    if (oldStatus === 'completed' && newStatus === 'cancelled') {
      return {
        type: 'info' as const,
        message: 'Stock quantities will be restored when this transaction is cancelled.'
      }
    } else if (oldStatus === 'completed' && newStatus === 'pending') {
      return {
        type: 'info' as const,
        message: 'Stock quantities will be restored when this transaction is set to pending.'
      }
    } else if (
      (oldStatus === 'pending' || oldStatus === 'cancelled') &&
      newStatus === 'completed'
    ) {
      return {
        type: 'warning' as const,
        message: 'Stock quantities will be deducted when this transaction is marked as completed.'
      }
    }

    return null
  }

  const handleSubmit = async () => {
    try {
      const values = await transactionForm.validateFields()
      setSubmitting(true)

      let success = false

      if (isDeleteMode && selected) {
        success = await deleteTransaction(selected.id)
        if (success) {
          notification.success({
            message: 'Transaction deleted successfully',
            description:
              currentTransaction?.status === 'completed'
                ? 'Stock quantities have been restored.'
                : undefined
          })
          onClose()
        } else {
          const { error } = useTransactionStore.getState()
          if (error) {
            notification.error({
              message: 'Failed to delete transaction',
              description: error
            })
          }
        }
      } else if (isEditMode && currentTransaction) {
        const oldStatus = currentTransaction.status
        const newStatus = values.status

        success = await updateTransaction(currentTransaction.id, values)
        if (success) {
          let description = 'Transaction updated successfully'

          if (oldStatus !== newStatus) {
            if (newStatus === 'completed') {
              description = 'Transaction completed. Stock quantities have been deducted.'
            } else if (
              oldStatus === 'completed' &&
              (newStatus === 'cancelled' || newStatus === 'pending')
            ) {
              description = 'Stock quantities have been restored.'
            }
          }

          notification.success({
            message: 'Success',
            description
          })
          onClose()
        } else {
          const { error } = useTransactionStore.getState()
          if (error) {
            notification.error({
              message: 'Cannot complete transaction',
              description: error,
              duration: 8
            })
          }
        }
      } else if (isAddMode) {
        const totalAmount = calculateTotalAmount()
        const newTransaction: TransactionFormData = {
          ...values,
          status: values.status || 'pending',
          totalAmount
        }

        const transactionId = await createTransaction(newTransaction as Transaction, localItems)
        if (transactionId) {
          const statusMessage =
            values.status === 'completed' ? 'Stock quantities have been deducted.' : ''

          notification.success({
            message: 'Transaction created successfully',
            description: `Created with ${localItems.length} item(s). ${statusMessage}`
          })
          onClose()
        } else {
          const { error } = useTransactionStore.getState()
          if (error) {
            notification.error({
              message: 'Cannot create transaction',
              description: error,
              duration: 8
            })
          } else {
            notification.error({ message: 'Failed to create transaction' })
          }
        }
      }
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddLocalItem = async () => {
    try {
      const values = await itemForm.validateFields()
      const stock = stocks.find((s) => s.id === values.stockId)

      if (!stock) {
        notification.error({ message: 'Stock not found' })
        return
      }

      const tempId = `temp-${Date.now()}`
      const newItem: LocalItem = {
        tempId,
        stockId: values.stockId,
        stockName: stock.name,
        quantity: values.quantity,
        unit: values.unit || stock.unit,
        unitPrice: values.unitPrice
      }

      setLocalItems([...localItems, newItem])
      setAddingItem(false)
      itemForm.resetFields()
    } catch (error) {
      console.error('Validation error:', error)
    }
  }

  const handleEditLocalItem = async (tempId: string) => {
    try {
      const values = await itemForm.validateFields()
      const stock = stocks.find((s) => s.id === values.stockId)

      if (!stock) {
        notification.error({ message: 'Stock not found' })
        return
      }

      setLocalItems(
        localItems.map((item) =>
          item.tempId === tempId
            ? {
                ...item,
                stockId: values.stockId,
                stockName: stock.name,
                quantity: values.quantity,
                unit: values.unit || stock.unit,
                unitPrice: values.unitPrice
              }
            : item
        )
      )
      setAddingItem(false)
      setEditingItem(null)
      itemForm.resetFields()
    } catch (error) {
      console.error('Validation error:', error)
    }
  }

  const handleDeleteLocalItem = (tempId: string) => {
    setLocalItems(localItems.filter((item) => item.tempId !== tempId))
  }

  const handleEditDbItem = async (itemId: string) => {
    const item = currentItems.find((i) => i.id === itemId)
    if (!item) return

    const stock = stocks.find((s) => s.id === item.stockId)
    setSelectedStock(stock)

    setEditingItem(itemId)
    setAddingItem(true)
    itemForm.setFieldsValue({
      stockId: item.stockId,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice
    })
  }

  const handleAddDbItem = async () => {
    try {
      const values = await itemForm.validateFields()

      if (editingItem) {
        const success = await updateTransactionItem(editingItem, values)
        if (success) {
          notification.success({ message: 'Item updated successfully' })
          setAddingItem(false)
          setEditingItem(null)
          itemForm.resetFields()
        } else {
          const { error } = useTransactionStore.getState()
          if (error) {
            notification.error({
              message: 'Cannot update item',
              description: error,
              duration: 6
            })
          }
        }
      } else {
        if (!currentTransaction) {
          notification.error({ message: 'No transaction selected' })
          return
        }

        const itemData = {
          transactionId: currentTransaction.id,
          stockId: values.stockId,
          quantity: values.quantity,
          unit: values.unit,
          unitPrice: values.unitPrice
        }

        const itemId = await addTransactionItem(itemData)
        if (itemId) {
          notification.success({ message: 'Item added successfully' })
          setAddingItem(false)
          itemForm.resetFields()
        } else {
          const { error } = useTransactionStore.getState()
          if (error) {
            notification.error({
              message: 'Cannot add item',
              description: error,
              duration: 6
            })
          }
        }
      }
    } catch (error) {
      console.error('Validation error:', error)
    }
  }

  const handleAddItem = () => {
    if (isAddMode) {
      if (editingItem) {
        handleEditLocalItem(editingItem)
      } else {
        handleAddLocalItem()
      }
    } else {
      handleAddDbItem()
    }
  }

  const handleDeleteDbItem = async (itemId: string) => {
    const success = await deleteTransactionItem(itemId)
    if (success) {
      notification.success({ message: 'Item removed successfully' })
    }
  }

  const handleStockChange = (stockId: string) => {
    const stock = stocks.find((s) => s.id === stockId)
    setSelectedStock(stock)
    if (stock) {
      itemForm.setFieldsValue({
        unit: stock.unit,
        unitPrice: stock.unitPrice || 0
      })
    }
  }

  const statusChangeInfo = getStatusChangeMessage()

  const displayItems = isAddMode
    ? localItems.map((item) => ({ ...item, key: item.tempId }))
    : currentItems.map((item) => ({ ...item, key: item.id }))

  const itemColumns = [
    {
      title: 'Product',
      dataIndex: 'stockName',
      key: 'stockName',
      render: (name: string, record: any) => {
        const itemId = isAddMode ? record.tempId : record.id
        const hasWarning = stockWarnings.some((w) => w.itemId === itemId)
        return (
          <span
            style={{
              color: hasWarning ? '#ff4d4f' : 'inherit',
              fontWeight: hasWarning ? 'bold' : 'normal'
            }}
          >
            {hasWarning && '⚠️ '}
            {name}
          </span>
        )
      }
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number, record: any) => {
        const itemId = isAddMode ? record.tempId : record.id
        const warning = stockWarnings.find((w) => w.itemId === itemId)
        return (
          <span>
            <span
              style={{
                color: warning ? '#ff4d4f' : 'inherit',
                fontWeight: warning ? 'bold' : 'normal'
              }}
            >
              {qty} {record.unit}
            </span>
            {warning && (
              <div style={{ fontSize: '12px', color: '#ff4d4f' }}>
                Only {warning.available} available
              </div>
            )}
          </span>
        )
      }
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price: number) => formatCurrency(price)
    },
    {
      title: 'Subtotal',
      key: 'subtotal',
      render: (_: any, record: any) => formatCurrency(record.quantity * record.unitPrice)
    },
    {
      title: 'Actions',
      key: 'actions',
      hidden: isViewMode || isDeleteMode,
      render: (_: any, record: any) => {
        const isLocalItem = 'tempId' in record

        return (
          <Space>
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                if (isLocalItem) {
                  const item = localItems.find((i) => i.tempId === record.tempId)
                  if (item) {
                    const stock = stocks.find((s) => s.id === item.stockId)
                    setSelectedStock(stock)
                    setEditingItem(record.tempId)
                    setAddingItem(true)
                    itemForm.setFieldsValue({
                      stockId: item.stockId,
                      quantity: item.quantity,
                      unit: item.unit,
                      unitPrice: item.unitPrice
                    })
                  }
                } else {
                  handleEditDbItem(record.id)
                }
              }}
            />
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => {
                if (isLocalItem) {
                  handleDeleteLocalItem(record.tempId)
                } else {
                  handleDeleteDbItem(record.id)
                }
              }}
            />
          </Space>
        )
      }
    }
  ].filter((col) => !col.hidden)

  return (
    <Modal
      title={
        isViewMode
          ? 'View Transaction'
          : isEditMode
            ? 'Edit Transaction'
            : isDeleteMode
              ? 'Delete Transaction'
              : 'New Transaction'
      }
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
            onClick={handleSubmit}
            loading={submitting}
            disabled={
              stockWarnings.length > 0 && transactionForm.getFieldValue('status') === 'completed'
            }
            danger={
              stockWarnings.length > 0 && transactionForm.getFieldValue('status') === 'completed'
            }
          >
            {isDeleteMode ? 'Delete' : isEditMode ? 'Update' : 'Create'}
          </Button>
        )
      ]}
    >
      <Form form={transactionForm} layout="vertical" disabled={isViewMode || isDeleteMode}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="customerName" label="Customer Name">
              <Input placeholder="Enter customer name (optional)" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="referenceNo" label="Reference No.">
              <Input placeholder="Enter reference number (optional)" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select disabled={isViewMode || isDeleteMode} onChange={handleStatusChange}>
                <Option value="pending">Pending</Option>
                <Option value="completed">Completed</Option>
                {!isAddMode && <Option value="cancelled">Cancelled</Option>}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {isAddMode &&
          transactionForm.getFieldValue('status') === 'completed' &&
          localItems.length > 0 && (
            <Alert
              message="Stock Deduction Notice"
              description="This transaction will be created as completed. Stock quantities will be immediately deducted."
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}

        {statusChanged && statusChangeInfo && (
          <Alert
            message="Stock Update Notice"
            description={statusChangeInfo.message}
            type={statusChangeInfo.type}
            showIcon
            icon={<WarningOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

        {stockWarnings.length > 0 && transactionForm.getFieldValue('status') === 'completed' && (
          <Alert
            message="⚠️ Insufficient Stock - Cannot Complete Transaction"
            description={
              <div>
                <p style={{ marginBottom: 8, fontWeight: 'bold' }}>
                  The following items do not have enough stock available:
                </p>
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  {stockWarnings.map((warning, index) => (
                    <li key={index}>
                      <strong>{warning.productName}</strong>: Need {warning.required} units, only{' '}
                      {warning.available} available
                      {warning.available > 0 && (
                        <span style={{ color: '#1890ff' }}>
                          {' '}
                          (shortage: {warning.required - warning.available})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <p style={{ marginTop: 8, marginBottom: 0 }}>
                  <strong>Action required:</strong> Please reduce the quantities or change status to
                  "Pending" until stock becomes available.
                </p>
              </div>
            }
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item name="notes" label="Notes">
          <TextArea rows={2} />
        </Form.Item>
      </Form>

      <div style={{ marginTop: 24 }}>
        <Divider orientation="left">Transaction Items</Divider>

        {currentTransaction?.status === 'completed' && (isEditMode || isDeleteMode) && (
          <Alert
            message="Stock Management Active"
            description="This transaction is completed. Adding, editing, or removing items will automatically update stock quantities."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

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
          dataSource={displayItems}
          size="small"
          bordered
          pagination={false}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <strong>Total Amount</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} colSpan={2}>
                  <strong>{formatCurrency(calculateTotalAmount())}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>

      {addingItem && (
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
          {currentTransaction?.status === 'completed' && !isAddMode && (
            <Alert
              message="Stock will be updated"
              description={
                editingItem
                  ? 'Modifying this item will adjust stock quantities based on the quantity change.'
                  : 'Adding this item will immediately deduct the quantity from stock since this transaction is completed.'
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form form={itemForm} layout="vertical">
            <Form.Item
              name="stockId"
              label="Product"
              rules={[{ required: true, message: 'Please select a product' }]}
            >
              <Select
                placeholder="Select product"
                onChange={handleStockChange}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as unknown as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {stocks
                  .filter((stock) => stock.quantity > 0 && stock.status !== 'Archived')
                  .map((stock) => (
                    <Option key={stock.id} value={stock.id}>
                      {`${stock.name} - ${stock.sku} (${stock.quantity} ${stock.unit} available)`}
                    </Option>
                  ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="quantity"
                  label="Quantity"
                  rules={[
                    { required: true, message: 'Please enter quantity' },
                    {
                      validator: (_, value) => {
                        if (!selectedStock) {
                          return Promise.reject('Please select a product first')
                        }
                        if (value && value > selectedStock.quantity) {
                          return Promise.reject(
                            `Quantity cannot exceed available stock (${selectedStock.quantity} ${selectedStock.unit})`
                          )
                        }
                        return Promise.resolve()
                      }
                    }
                  ]}
                  validateTrigger={['onChange', 'onBlur']}
                  help={
                    selectedStock && (
                      <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                        Available: {selectedStock.quantity} {selectedStock.unit}
                      </span>
                    )
                  }
                >
                  <InputNumber
                    min={1}
                    max={selectedStock ? selectedStock.quantity : undefined}
                    style={{ width: '100%' }}
                    placeholder="Enter quantity"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="unit"
                  label="Unit"
                  rules={[{ required: true, message: 'Please select a unit' }]}
                >
                  <Select placeholder="Select unit" disabled>
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
      )}

      {isDeleteMode && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="danger" strong>
            Warning: This will permanently delete the transaction and all its associated items.
            {currentTransaction?.status === 'completed' &&
              ' Stock quantities will be restored.'}{' '}
            This action cannot be undone.
          </Typography.Text>
        </div>
      )}
    </Modal>
  )
}
