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
import { useAuthStore } from '@/renderer/src/store/authStore'
import { useStockStore } from '@/renderer/src/store/stockStore'
import {
  Transaction,
  TransactionItem,
  TransactionFormData,
  TransactionItemFormData
} from '../types'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  WarningOutlined,
  LockOutlined
} from '@ant-design/icons'
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

export default function TransactionForm({ open, onClose, mode, selected }: TransactionFormProps) {
  const [transactionForm] = Form.useForm()
  const [itemForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [statusChanged, setStatusChanged] = useState(false)

  const { user } = useAuthStore()
  const { stocks, fetchStocks } = useStockStore()
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
    fetchTransactionById,
    error
  } = useTransactionStore()

  const isViewMode = mode === 'view'
  const isEditMode = mode === 'edit'
  const isDeleteMode = mode === 'delete'
  const isAddMode = mode === 'add'
  const isCompleted = currentTransaction?.status === 'completed'

  // Fetch stocks for dropdown
  useEffect(() => {
    fetchStocks()
  }, [fetchStocks])

  // Fetch transaction details when selected transaction changes
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

  // Reset forms when modal opens/closes or selected item changes
  useEffect(() => {
    setStatusChanged(false)
    if (open) {
      if (currentTransaction && (isEditMode || isViewMode || isDeleteMode)) {
        transactionForm.setFieldsValue({
          customerName: currentTransaction.customerName,
          referenceNo: currentTransaction.referenceNo,
          status: currentTransaction.status,
          notes: currentTransaction.notes
        })
      } else if (isAddMode) {
        transactionForm.resetFields()
        transactionForm.setFieldsValue({
          status: 'pending'
        })
      }
    }
  }, [open, currentTransaction, isEditMode, isViewMode, isDeleteMode, isAddMode, transactionForm])

  // Show error notifications
  useEffect(() => {
    if (error) {
      notification.error({
        message: 'Error',
        description: error
      })
    }
  }, [error])

  const calculateTotalAmount = () => {
    return currentItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  }

  const handleStatusChange = (newStatus: string) => {
    const oldStatus = currentTransaction?.status
    if (oldStatus && oldStatus !== newStatus) {
      setStatusChanged(true)
    } else {
      setStatusChanged(false)
    }
  }

  const getStatusChangeMessage = () => {
    const oldStatus = currentTransaction?.status
    const newStatus = transactionForm.getFieldValue('status')

    if (oldStatus === 'pending' && newStatus === 'cancelled') {
      return {
        type: 'info' as const,
        message: 'Stock quantities will be restored when this transaction is cancelled.'
      }
    } else if (oldStatus === 'cancelled' && newStatus === 'pending') {
      return {
        type: 'warning' as const,
        message: 'Stock quantities will be deducted again when this transaction is set to pending.'
      }
    } else if (oldStatus === 'pending' && newStatus === 'completed') {
      return {
        type: 'warning' as const,
        message:
          'Marking as completed will finalize this transaction. Once completed, it cannot be modified or cancelled.'
      }
    } else if (oldStatus === 'cancelled' && newStatus === 'completed') {
      return {
        type: 'warning' as const,
        message:
          'Stock will be deducted and the transaction will be finalized. Once completed, it cannot be modified.'
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
              currentTransaction?.status === 'pending'
                ? 'Stock quantities have been restored.'
                : undefined
          })
          onClose()
        }
      } else if (isEditMode && currentTransaction) {
        const oldStatus = currentTransaction.status
        const newStatus = values.status

        success = await updateTransaction(currentTransaction.id, values)
        if (success) {
          let description = 'Transaction updated successfully'

          if (oldStatus !== newStatus) {
            if (newStatus === 'completed') {
              description =
                'Transaction completed and finalized. This transaction can no longer be modified.'
            } else if (newStatus === 'cancelled') {
              description = 'Transaction cancelled. Stock quantities have been restored.'
            } else if (oldStatus === 'cancelled' && newStatus === 'pending') {
              description = 'Transaction restored to pending. Stock quantities have been deducted.'
            }
          }

          notification.success({
            message: 'Success',
            description
          })
          onClose()
        }
      } else if (isAddMode) {
        const newTransaction: TransactionFormData = {
          ...values,
          status: values.status || 'pending',
          totalAmount: 0
        }

        const transactionId = await createTransaction(newTransaction as Transaction)
        if (transactionId) {
          notification.success({
            message: 'Transaction created successfully',
            description:
              'You can now add items to this transaction. Stock will be deducted as items are added.'
          })
          onClose()
        } else {
          notification.error({ message: 'Failed to create transaction' })
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

      if (!currentTransaction && !values.transactionId) {
        notification.error({ message: 'Cannot add item: No transaction ID specified' })
        return
      }

      const transactionId = currentTransaction?.id || values.transactionId
      const newItem: TransactionItemFormData = {
        transactionId,
        stockId: values.stockId,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        unit: values.unit
      }

      let success = false
      if (editingItem) {
        success = await updateTransactionItem(editingItem, newItem)
        if (success) {
          notification.success({
            message: 'Item updated successfully',
            description:
              currentTransaction?.status !== 'cancelled'
                ? 'Stock quantities have been adjusted.'
                : undefined
          })
          setAddingItem(false)
          setEditingItem(null)
          itemForm.resetFields()
          fetchStocks()
        }
      } else {
        const itemId = await addTransactionItem(newItem)
        if (itemId) {
          notification.success({
            message: 'Item added successfully',
            description:
              currentTransaction?.status !== 'cancelled'
                ? 'Stock quantity has been deducted.'
                : undefined
          })
          setAddingItem(false)
          itemForm.resetFields()
          fetchStocks()
        }
      }
    } catch (error) {
      console.error('Item form validation error:', error)
    }
  }

  const handleEditItem = (item: TransactionItem) => {
    setEditingItem(item.id)
    setAddingItem(true)
    itemForm.setFieldsValue({
      stockId: item.stockId,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice
    })
  }

  const handleDeleteItem = async (itemId: string) => {
    const success = await deleteTransactionItem(itemId)
    if (success) {
      notification.success({
        message: 'Item removed successfully',
        description:
          currentTransaction?.status !== 'cancelled'
            ? 'Stock quantity has been restored.'
            : undefined
      })
      fetchStocks()
    }
  }

  const handleStockChange = (value: string) => {
    const selected = stocks.find((s) => s.id === value)
    if (selected) {
      setSelectedStock(selected)
      itemForm.setFieldsValue({
        unit: selected.unit,
        unitPrice: selected.unitPrice
      })
    }
  }

  const itemColumns = [
    {
      title: 'Item',
      dataIndex: 'stockName',
      key: 'stockName'
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
      render: (_: any, record: TransactionItem) =>
        formatCurrency(record.quantity * record.unitPrice)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: TransactionItem) =>
        !isViewMode && !isDeleteMode && !isCompleted ? (
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

  const modalTitle = () => {
    if (isViewMode) return `View Transaction - ${currentTransaction?.id || ''}`
    if (isEditMode) return `Edit Transaction - ${currentTransaction?.id || ''}`
    if (isDeleteMode) return `Delete Transaction - ${currentTransaction?.id || ''}`
    return 'Create New Transaction'
  }

  const statusChangeInfo = getStatusChangeMessage()

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
        !isViewMode && !isCompleted && (
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
      {/* Completed Transaction Lock Notice */}
      {isCompleted && (isEditMode || isDeleteMode) && (
        <Alert
          message="Transaction Completed"
          description="This transaction is completed and cannot be modified or deleted. Completed transactions are final."
          type="info"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Transaction Form */}
      <Form
        form={transactionForm}
        layout="vertical"
        disabled={isViewMode || isDeleteMode || isCompleted}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="customerName" label="Customer Name">
              <Input placeholder="Your Customer Name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="referenceNo" label="Reference Number">
              <Input placeholder="Optional reference number" />
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
              <Select disabled={isAddMode || isCompleted} onChange={handleStatusChange}>
                <Option value="pending">Pending</Option>
                <Option value="completed">Completed</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Status Change Alert */}
        {statusChanged && statusChangeInfo && !isCompleted && (
          <Alert
            message="Stock Update Notice"
            description={statusChangeInfo.message}
            type={statusChangeInfo.type}
            showIcon
            icon={<WarningOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item name="notes" label="Notes">
          <TextArea rows={2} />
        </Form.Item>
      </Form>

      {/* Show Transaction Items Section for View/Edit/Delete modes */}
      {(isViewMode || isEditMode || isDeleteMode) && (
        <div style={{ marginTop: 24 }}>
          <Divider orientation="left">Transaction Items</Divider>

          {currentTransaction?.status === 'pending' && isEditMode && (
            <Alert
              message="Stock Management Active"
              description="Stock is deducted immediately when items are added. Items can be modified until the transaction is completed or cancelled."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {currentTransaction?.status === 'cancelled' && (
            <Alert
              message="Transaction Cancelled"
              description="Stock quantities have been restored. You can restore this transaction to pending status to reactivate it."
              type="warning"
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
            {!isViewMode && !isDeleteMode && !isCompleted && (
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
            dataSource={currentItems.map((item) => ({ ...item, key: item.id }))}
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
      )}

      {/* Item Form (Add/Edit items) */}
      {addingItem && isEditMode && !isCompleted && (
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
          {currentTransaction?.status !== 'cancelled' && (
            <Alert
              message="Stock will be updated"
              description={
                editingItem
                  ? 'Modifying this item will adjust stock quantities based on the quantity change.'
                  : 'Adding this item will immediately deduct the quantity from stock.'
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
                  .filter((stock) => stock.quantity > 0)
                  .map((stock) => (
                    <Option key={stock.id} value={stock.id}>
                      {stock.name} - {stock.sku} ({stock.quantity} {stock.unit} available)
                    </Option>
                  ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="quantity"
                  label="Quantity"
                  rules={[{ required: true, message: 'Please enter quantity' }]}
                >
                  <InputNumber
                    min={1}
                    max={selectedStock ? selectedStock.quantity : undefined}
                    style={{ width: '100%' }}
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

      {/* Create Item UI for adding mode */}
      {isAddMode && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Title level={5}>Please save the transaction first to add items</Title>
          <p>
            After creating the transaction, you can add items. Stock will be deducted as you add
            each item.
          </p>
        </div>
      )}

      {/* Warning for delete mode */}
      {isDeleteMode && !isCompleted && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="danger" strong>
            Warning: This will permanently delete the transaction and all its associated items.
            {currentTransaction?.status === 'pending' && ' Stock quantities will be restored.'} This
            action cannot be undone.
          </Typography.Text>
        </div>
      )}
    </Modal>
  )
}
