import { FormMode } from '@/renderer/src/lib/types'
import { Typography } from 'antd'
import { useState } from 'react'
import PageTabs, { TabItem } from '../../components/PageTabs'
import SupplierTab from './tabs/SupplierTab'
import SupplierForm from './components/SupplierForm'
import { Supplier, SupplyOrder } from './types'
import SupplyOrderTab from './tabs/SupplyOrderTab'
import SupplyOrderForm from './components/SupplyOrderForm'
import { useAuthStore } from '../../store/authStore'
import { hasPermission } from '../../lib/utils'

export default function Supply() {
  const { user } = useAuthStore()
  const [supplierFormOpen, setSupplierFormOpen] = useState(false)
  const [supplierFormMode, setSupplierFormMode] = useState<FormMode>('add')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const [orderFormOpen, setOrderFormOpen] = useState(false)
  const [orderFormMode, setOrderFormMode] = useState<FormMode>('add')
  const [selectedOrder, setSelectedOrder] = useState<SupplyOrder | null>(null)

  const handleSupplierAction = (supplier: Supplier | null, mode: FormMode) => {
    setSelectedSupplier(supplier)
    setSupplierFormMode(mode)
    setSupplierFormOpen(true)
  }

  const handleOrderAction = (order: SupplyOrder | null, mode: FormMode) => {
    setSelectedOrder(order)
    setOrderFormMode(mode)
    setOrderFormOpen(true)
  }

  const handleAddSupplier = () => {
    handleSupplierAction(null, 'add')
  }

  const handleAddOrder = () => {
    handleOrderAction(null, 'add')
  }

  const handleSupplierFormClose = () => {
    setSelectedSupplier(null)
    setSupplierFormOpen(false)
  }

  const handleOrderFormClose = () => {
    setSelectedOrder(null)
    setOrderFormOpen(false)
  }

  const tabItems: TabItem[] = [
    {
      label: 'Suppliers',
      content: <SupplierTab onAction={handleSupplierAction} />,
      actionButton: {
        label: 'Add Supplier',
        onClick: handleAddSupplier,
        disabled: !hasPermission(user?.permissions, 'suppliers:create')
      }
    },
    {
      label: 'Supply Orders',
      content: <SupplyOrderTab onAction={handleOrderAction} />,
      actionButton: {
        label: 'Create Order',
        onClick: handleAddOrder,
        disabled: !hasPermission(user?.permissions, 'supplyOrders:create')
      }
    }
  ]

  return (
    <div style={{ margin: '0 auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={2}>Supply Management</Typography.Title>
        <PageTabs items={tabItems} />
      </div>

      <SupplierForm
        open={supplierFormOpen}
        onClose={handleSupplierFormClose}
        mode={supplierFormMode}
        selected={selectedSupplier}
      />

      <SupplyOrderForm
        open={orderFormOpen}
        onClose={handleOrderFormClose}
        mode={orderFormMode}
        selected={selectedOrder}
      />
    </div>
  )
}
