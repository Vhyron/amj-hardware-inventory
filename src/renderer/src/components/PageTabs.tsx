// components/PageTabs.tsx
import { useState, ReactNode } from 'react'
import { Tabs, Typography, Button, Space } from 'antd'

export interface TabItem {
  label: string
  content: ReactNode
  disabled?: boolean
  actionButton?: ActionButton
}

interface ActionButton {
  label: string
  onClick: () => void
  color?: string
  disabled?: boolean
}

interface PageTabsProps {
  items: TabItem[]
  actionButton?: ActionButton
}

export default function PageTabs({ items, actionButton }: PageTabsProps) {
  const [activeKey, setActiveKey] = useState('0')

  const handleTabChange = (key: string) => {
    setActiveKey(key)
  }

  // Get the current tab's action button or fall back to the global one
  const currentIndex = parseInt(activeKey)
  const currentActionButton = items[currentIndex]?.actionButton || actionButton

  return (
    <>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
      >
        <Tabs
          activeKey={activeKey}
          onChange={handleTabChange}
          items={items.map((item, index) => ({
            key: index.toString(),
            label: item.label,
            disabled: item.disabled,
            children: null
          }))}
          style={{
            marginBottom: 0
          }}
          tabBarStyle={{
            minWidth: '100%'
          }}
          className="custom-tabs"
        />
        {currentActionButton && (
          <Button
            onClick={currentActionButton.onClick}
            type="primary"
            disabled={currentActionButton.disabled}
            style={{
              borderRadius: 16,
              padding: '18px 24px',
              cursor: currentActionButton.disabled ? 'not-allowed' : 'pointer',
              opacity: currentActionButton.disabled ? 0.7 : 1
            }}
          >
            <Typography.Text
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: 'white'
              }}
            >
              {currentActionButton.label}
            </Typography.Text>
          </Button>
        )}
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          style={{
            display: parseInt(activeKey) === index ? 'block' : 'none',
            paddingTop: 16
          }}
        >
          {item.content}
        </div>
      ))}
    </>
  )
}
