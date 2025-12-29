import { useEffect, useMemo, useState } from 'react'
import { Card, DatePicker, Flex, Typography, Statistic, Table, Tag, Button, Empty, Select } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatCurrency } from '@/renderer/src/lib/utils'
import { useTransactionStore } from '@/renderer/src/store/transactionStore'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function SalesTab() {
  const { transactions, fetchTransactions, loading } = useTransactionStore()

  // Default to today's date range
  const todayStart = dayjs().startOf('day')
  const todayEnd = dayjs().endOf('day')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([todayStart, todayEnd])
  // Selected transaction statuses to display and include in totals
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['completed'])

  // Fetch transactions when the component mounts
  useEffect(() => {
    fetchTransactions().then(() => {
      console.log('Fetched transaction:', transactions[0])
    })
  }, [fetchTransactions])

  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return []

    return transactions.filter((t) => {
      const transactionDate = dayjs(t.createdAt)
      const inDateRange =
        transactionDate.isAfter(dateRange[0].startOf('day')) &&
        transactionDate.isBefore(dateRange[1].endOf('day'))
      // If no statuses selected, show no transactions. Otherwise include only selected statuses.
      const matchesStatus = selectedStatuses.length === 0 ? false : selectedStatuses.includes(t.status)
      return inDateRange && matchesStatus
    })
  }, [transactions, dateRange, selectedStatuses])

  // Compute total income
  const totalIncome = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0)
  }, [filteredTransactions])

  // Handle reset back to today’s date
  const handleReset = () => {
    setDateRange([todayStart, todayEnd])
  }

  // Define columns for the transaction table
  const columns = [
    {
      title: 'Transaction ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <Text strong>{id}</Text>
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string) => name || <Text type="secondary">N/A</Text>
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('MMM D, YYYY h:mm A')
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'blue'
        if (status === 'completed') color = 'green'
        if (status === 'cancelled') color = 'red'
        if (status === 'pending') color = 'orange'
        return <Tag color={color}>{status.toUpperCase()}</Tag>
      }
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right' as const,
      render: (amount: number) => formatCurrency(amount)
    }
  ]

  return (
    <div style={{ margin: '0 auto', padding: '0 24px' }}>
      <Title level={2}>Sales History</Title>

      {/* Filter Controls */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Flex gap={8} align="center">
          <RangePicker
            value={dateRange}
            onChange={(values) => {
              if (values && values[0] && values[1])
                setDateRange(values as [dayjs.Dayjs, dayjs.Dayjs])
            }}
            allowClear={false}
          />
          <Select
            mode="multiple"
            placeholder="Select statuses"
            value={selectedStatuses}
            onChange={(vals) => setSelectedStatuses(vals as string[])}
            style={{ minWidth: 220 }}
            options={[
              { label: 'Completed', value: 'completed' },
              { label: 'Pending', value: 'pending' },
              { label: 'Cancelled', value: 'cancelled' }
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Today
          </Button>
        </Flex>

        <Statistic
          title="Total Income"
          value={formatCurrency(totalIncome)}
          valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
        />
      </Flex>

      {/* Table Section */}
      <Card bordered>
        <Table
          dataSource={filteredTransactions.map((t) => ({ ...t, key: t.id }))}
          columns={columns}
          loading={loading}
          size="small"
          bordered
          pagination={{
            pageSize: 10,
            showSizeChanger: false
          }}
          locale={{
            emptyText: loading ? (
              'Loading sales...'
            ) : (
              <Empty description="No transactions found for this date" />
            )
          }}
        />
      </Card>
    </div>
  )
}
