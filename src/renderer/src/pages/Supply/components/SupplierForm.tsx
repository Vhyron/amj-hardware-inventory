import { Button, Form, Input, Modal, Select, notification } from 'antd'
import { FormMode } from '@/renderer/src/lib/types'
import { useEffect, useState } from 'react'
import { useSupplierStore } from '@/renderer/src/store/supplierStore'
import { Supplier, SupplierFormData } from '../types'

interface SupplierFormProps {
  open: boolean
  onClose: () => void
  mode: FormMode
  selected: Supplier | null
}

export default function SupplierForm({ open, onClose, mode, selected }: SupplierFormProps) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const { addSupplier, updateSupplier, deleteSupplier } = useSupplierStore()

  const isViewMode = mode === 'view'
  const isEditMode = mode === 'edit'
  const isDeleteMode = mode === 'delete'

  // Reset form fields when modal is opened/closed or selected item changes
  useEffect(() => {
    if (open) {
      if (selected && (isEditMode || isViewMode || isDeleteMode)) {
        // Populate form with selected supplier data
        form.setFieldsValue({
          name: selected.name,
          contactName: selected.contactName,
          email: selected.email,
          phone: selected.phone,
          address: selected.address,
          description: selected.description,
          isActive: selected.isActive
        })
      } else {
        // Reset form for add mode
        form.resetFields()
        // Set default values
        form.setFieldsValue({
          isActive: 1
        })
      }
    }
  }, [open, selected, mode, form, isViewMode, isEditMode, isDeleteMode])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      
      let success = false
      
      if (isDeleteMode && selected) {
        // Handle delete
        success = await deleteSupplier(selected.id)
        if (success) {
          notification.success({ message: 'Supplier deleted successfully' })
        }
      } else if (isEditMode && selected) {
        // Handle update
        success = await updateSupplier(selected.id, values)
        if (success) {
          notification.success({ message: 'Supplier updated successfully' })
        }
      } else {
        // Handle create
        success = await addSupplier(values)
        if (success) {
          notification.success({ message: 'Supplier added successfully' })
        }
      }
      
      if (success) {
        onClose()
      }
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Get title and button text based on mode
  const getTitle = () => {
    switch (mode) {
      case 'add': return 'Add Supplier'
      case 'edit': return 'Edit Supplier'
      case 'delete': return 'Delete Supplier'
      default: return 'Supplier Details'
    }
  }
  
  const getButtonText = () => {
    switch (mode) {
      case 'add': return 'Add'
      case 'edit': return 'Save'
      case 'delete': return 'Delete'
      default: return ''
    }
  }

  return (
    <Modal
      title={getTitle()}
      open={open}
      onCancel={onClose}
      footer={isViewMode ? [
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ] : [
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type={isDeleteMode ? 'default' : 'primary'}
          danger={isDeleteMode}
          loading={submitting}
          onClick={handleSubmit}
        >
          {getButtonText()}
        </Button>
      ]}
      maskClosable={false}
      destroyOnClose
    >
      {isDeleteMode ? (
        <p>Are you sure you want to delete this supplier: <strong>{selected?.name}</strong>?</p>
      ) : (
        <Form
          form={form}
          layout="vertical"
          disabled={isViewMode || submitting}
        >
          <Form.Item
            name="name"
            label="Supplier Name"
            rules={[{ required: true, message: 'Please enter supplier name' }]}
          >
            <Input placeholder="Enter supplier name" />
          </Form.Item>

          <Form.Item
            name="contactName"
            label="Contact Person"
            rules={[{ required: true, message: 'Please enter contact person name' }]}
          >
            <Input placeholder="Enter contact person name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter email" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <Input placeholder="Enter phone number" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
          >
            <Input.TextArea placeholder="Enter address" rows={2} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea placeholder="Enter description" rows={3} />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Select.Option value={1}>Active</Select.Option>
              <Select.Option value={0}>Inactive</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}