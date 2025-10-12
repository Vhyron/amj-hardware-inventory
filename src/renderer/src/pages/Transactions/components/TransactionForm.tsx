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
  Tag
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
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
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
  const [tempItems, setTempItems] = useState<TransactionItemFormData[]>([])

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
    fetchTransactionById
  } = useTransactionStore()

  const isViewMode = mode === 'view'
  const isEditMode = mode === 'edit'
  const isDeleteMode = mode === 'delete'
  const isAddMode = mode === 'add'

  useEffect(() => {
    fetchStocks()
  }, [fetchStocks])

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

  const calculateTotalAmount = () => {
    return currentItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  }

  const handleSubmit = async () => {
    try {
      const values = await transactionForm.validateFields()
      setSubmitting(true)

      let success = false

      if (isDeleteMode && selected) {
        success = await deleteTransaction(selected.id)
        if (success) {
          notification.success({ message: 'Transaction deleted successfully' })
          onClose()
        }
      } else if (isEditMode && currentTransaction) {
        success = await updateTransaction(currentTransaction.id, values)
        if (success) {
          notification.success({ message: 'Transaction updated successfully' })
          onClose()
        }
      } else if (isAddMode) {
        const values = await transactionForm.validateFields()
        const newTransaction: TransactionFormData = {
          ...values,
          status: values.status || 'pending',
          totalAmount: tempItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
        }

        const transactionId = await createTransaction(newTransaction as Transaction)
        if (transactionId) {
          for (const item of tempItems) {
            await addTransactionItem({ ...item, transactionId })
          }

          notification.success({ message: 'Transaction created successfully with items' })
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

      const newItem: TransactionItemFormData = {
        transactionId: currentTransaction?.id || 'temp',
        stockId: values.stockId,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        unit: values.unit
      }

      if (isAddMode && !currentTransaction) {
        if (editingItem) {
          setTempItems((prev) =>
            prev.map((item, index) => {
              const itemKey = `${item.stockId}-${index}`
              if (item.stockId === editingItem || itemKey === editingItem) {
                return { ...item, quantity: newItem.quantity, unitPrice: newItem.unitPrice, unit: newItem.unit }
              }
              return item
            })
          )
          notification.success({ message: 'Item updated successfully' })
          setEditingItem(null)
        } else {
          setTempItems((prev) => [...prev, newItem])
          notification.success({ message: 'Item added temporarily' })
        }
        setAddingItem(false)
        itemForm.resetFields()
        setSelectedStock(null)
        return
      }

      let success = false
      if (editingItem) {
        success = await updateTransactionItem(editingItem, newItem)
        if (success) {
          notification.success({ message: 'Item updated successfully' })
        }
      } else {
        const itemId = await addTransactionItem(newItem)
        if (itemId) {
          notification.success({ message: 'Item added successfully' })
        }
      }

      setAddingItem(false)
      setEditingItem(null)
      itemForm.resetFields()
      setSelectedStock(null)
      if (currentTransaction?.id) fetchTransactionItems(currentTransaction.id)
    } catch (error) {
      console.error('Item form validation error:', error)
    }
  }

  const handleEditItem = (item: TransactionItem | any) => {
    const itemId = item.id || item.key
    setEditingItem(itemId)
    setAddingItem(true)

    const stock = stocks.find((s) => s.id === item.stockId)
    setSelectedStock(stock || null)

    itemForm.setFieldsValue({
      stockId: item.stockId, 
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice
    })
  }

  const handleDeleteItem = async (itemId: string) => {
    if (isAddMode && !currentTransaction) {
      setTempItems((prev) => prev.filter((item, index) => {
        const itemKey = `${item.stockId}-${index}`
        return item.stockId !== itemId && itemKey !== itemId
      }))
      notification.success({ message: 'Item removed from temporary list' })
      return
    }

    const success = await deleteTransactionItem(itemId)
    if (success) {
      notification.success({ message: 'Item removed successfully' })
      if (currentTransaction?.id) fetchTransactionItems(currentTransaction.id)
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
      render: (_: any, record: any) =>
        formatCurrency(record.quantity * record.unitPrice)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) =>
        !isViewMode && !isDeleteMode ? (
          <Space>
            <Button icon={<EditOutlined />} type="text" onClick={() => handleEditItem(record)} />
            <Button
              icon={<DeleteOutlined />}
              type="text"
              danger
              onClick={() => handleDeleteItem(record.key)}
            />
          </Space>
        ) : null
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'processing'
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  const modalTitle = () => {
    if (isViewMode) return `View Transaction - ${currentTransaction?.id || ''}`
    if (isEditMode) return `Edit Transaction - ${currentTransaction?.id || ''}`
    if (isDeleteMode) return `Delete Transaction - ${currentTransaction?.id || ''}`
    return 'Create New Transaction'
  }

  const hasItems = currentItems.length > 0

  const displayItems: any[] = (isAddMode ? tempItems : currentItems).map((item, index) => {
    const itemKey = item.id || `${item.stockId}-${index}`
    return {
      key: itemKey,
      id: item.id,
      stockId: item.stockId,
      stockName:
        'stockName' in item
          ? (item as any).stockName
          : stocks.find((s) => s.id === item.stockId)?.name || 'Unknown',
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice
    }
  })

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
      <Form form={transactionForm} layout="vertical" disabled={isViewMode || isDeleteMode}>
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
              <Select>
                <Option value="pending">Pending</Option>
                <Option value="completed">Completed</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Notes">
          <TextArea rows={2} />
        </Form.Item>
      </Form>

      {(isViewMode || isEditMode || isDeleteMode || isAddMode) && (
        <div style={{ marginTop: 24 }}>
          <Divider orientation="left">Transaction Items</Divider>
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
                  setSelectedStock(null)
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
                    <strong>
                      {formatCurrency(
                        (isAddMode ? tempItems : currentItems).reduce(
                          (total, item) => total + item.quantity * item.unitPrice,
                          0
                        )
                      )}
                    </strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </div>
      )}

      {addingItem && (isEditMode || isAddMode) && (
        <Modal
          title={editingItem ? 'Edit Item' : 'Add Item'}
          open={addingItem}
          onCancel={() => {
            setAddingItem(false)
            setEditingItem(null)
            itemForm.resetFields()
            setSelectedStock(null)
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setAddingItem(false)
                setEditingItem(null)
                itemForm.resetFields()
                setSelectedStock(null)
              }}
            >
              Cancel
            </Button>,
            <Button key="submit" type="primary" onClick={handleAddItem}>
              {editingItem ? 'Update' : 'Add'}
            </Button>
          ]}
        >
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
                disabled={!!editingItem}
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

      {isAddMode && tempItems.length === 0 && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Title level={5}>No items added yet</Title>
          <p>Click "Add Item" to add your first product to this transaction.</p>
        </div>
      )}

      {isDeleteMode && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="danger" strong>
            Warning: This will permanently delete the transaction and all its associated items. This
            action cannot be undone.
          </Typography.Text>
        </div>
      )}
    </Modal>
  )
}