import { useState } from 'react'
import { Typography } from 'antd'
import PageTabs, { TabItem } from '@/renderer/src/components/PageTabs'
import StocksTab from './tabs/StocksTab'
import ArchivedTab from './tabs/ArchivedTab'
import CategoriesTab from './tabs/CategoriesTab'
import StocksForm from './components/StocksForm'
import CategoriesForm from './components/CategoriesForm'
import { Stock, Category } from './types'
import { FormMode } from '../../lib/types'
import { useAuthStore } from '../../store/authStore'
import { hasPermission } from '../../lib/utils'

/**
 * Stocks page - Main entry point for stock management
 * Manages state and coordinates between child components
 */
export default function Stocks() {
  // Get current user for permission checks
  const { user } = useAuthStore()

  // Unified form state
  const [formState, setFormState] = useState({
    stockForm: {
      open: false,
      mode: 'add' as FormMode,
      selected: null as Stock | null
    },
    categoryForm: {
      open: false,
      mode: 'add' as FormMode,
      selected: null as Category | null
    }
  })

  // Handle stock actions (view, add, edit, delete)
  const handleStockAction = (stock: Stock | null, mode: FormMode) => {
    setFormState((prev) => ({
      ...prev,
      stockForm: {
        open: true,
        mode,
        selected: stock
      }
    }))
  }

  // Handle category actions (view, add, edit, delete)
  const handleCategoryAction = (category: Category | null, mode: FormMode) => {
    setFormState((prev) => ({
      ...prev,
      categoryForm: {
        open: true,
        mode,
        selected: category
      }
    }))
  }

  // Handle "Add Stock" button click
  const handleAddStock = () => {
    handleStockAction(null, 'add')
  }

  // Handle "Add Category" button click
  const handleAddCategory = () => {
    handleCategoryAction(null, 'add')
  }

  // Handle stock form close
  const handleStockFormClose = () => {
    setFormState((prev) => ({
      ...prev,
      stockForm: {
        ...prev.stockForm,
        open: false,
        selected: null
      }
    }))
  }

  // Handle category form close
  const handleCategoryFormClose = () => {
    setFormState((prev) => ({
      ...prev,
      categoryForm: {
        ...prev.categoryForm,
        open: false,
        selected: null
      }
    }))
  }

  // Define tab items with their content and action buttons
  const tabItems: TabItem[] = [
    {
      label: 'Stocks',
      content: <StocksTab onStockAction={handleStockAction} />,
      actionButton: {
        label: 'Add Stock',
        onClick: handleAddStock,
        disabled: !hasPermission(user?.permissions, 'stocks:create')
      }
    },
    {
      label: 'Archived',
      content: <ArchivedTab onStockAction={handleStockAction} />
    },
    {
      label: 'Categories',
      content: <CategoriesTab onCategoryAction={handleCategoryAction} />,
      actionButton: {
        label: 'Add Category',
        onClick: handleAddCategory,
        disabled: !hasPermission(user?.permissions, 'categories:create')
      }
    }
  ]

  return (
    <div style={{ margin: '0 auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={2}>Stock Management</Typography.Title>
        <PageTabs items={tabItems} />
      </div>

      {/* Unified Stock Form for all operations */}
      <StocksForm
        stock={formState.stockForm.selected}
        open={formState.stockForm.open}
        mode={formState.stockForm.mode}
        onClose={handleStockFormClose}
        onSuccess={handleStockFormClose}
      />

      {/* Unified Category Form for all operations */}
      <CategoriesForm
        category={formState.categoryForm.selected}
        mode={formState.categoryForm.mode}
        open={formState.categoryForm.open}
        onClose={handleCategoryFormClose}
        onSuccess={handleCategoryFormClose}
      />
    </div>
  )
}
