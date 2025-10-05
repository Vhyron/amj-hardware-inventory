import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useStockStore } from '../../store/stockStore'
import { useSupplyOrderStore } from '../../store/supplyOrderStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useLogStore } from '../../store/activityLogStore'
import {
  Card,
  Col,
  Row,
  Typography,
  Progress,
  Divider,
  Tag,
  Space,
  Empty,
  Select,
  Descriptions,
  Button,
  Modal,
  Input,
  DatePicker,
  Table
} from 'antd'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  LineElement,
  PointElement
} from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import { SearchOutlined } from '@ant-design/icons'

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  LineElement,
  PointElement
)

const { Title, Text } = Typography
const { Option } = Select

export default function Dashboard() {
  const { user } = useAuthStore()
  const { stocks, fetchStocks } = useStockStore()
  const { orders, fetchOrders } = useSupplyOrderStore()
  const { transactions, fetchTransactions } = useTransactionStore()
  const { logs, fetchLogs } = useLogStore()

  // Add state for selected stock and view mode
  const [selectedStockId, setSelectedStockId] = useState<string | 'overview'>('overview')
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [stockPerformance, setStockPerformance] = useState<any[]>([])
  // Add state for month filtering with all months
  const [allStockPerformance, setAllStockPerformance] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [availableMonthsData, setAvailableMonthsData] = useState<Set<string>>(new Set())

  // Activity log modal states
  const [activityLogModalVisible, setActivityLogModalVisible] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterMonth, setFilterMonth] = useState<string | null>(null)

  // Stock stats state
  const [stockStats, setStockStats] = useState({
    total: 0,
    lowStock: 0,
    inStock: 0,
    lowInStock: 0,
    outOfStock: 0
  })

  // Order stats state
  const [orderStats, setOrderStats] = useState({
    pending: 0,
    successful: 0
  })

  // Fetch all necessary data when component mounts
  useEffect(() => {
    fetchStocks()
    fetchOrders()
    fetchTransactions()
    fetchLogs()
  }, [fetchStocks, fetchOrders, fetchTransactions, fetchLogs])

  // Calculate stock statistics when stocks change
  useEffect(() => {
    if (stocks.length > 0) {
      const totalStocks = stocks.length
      const lowStock = stocks.filter(
        (stock) =>
          stock.quantity <= stock.reorderPoint ||
          stock.status === 'Critical Low' ||
          stock.status === 'Out of Stock'
      ).length

      // Calculate stock status metrics for chart with proper naming
      const inStock = stocks.filter(
        (stock) => stock.status === 'In Stock' && stock.quantity > stock.reorderPoint
      ).length
      const lowInStock = stocks.filter(
        (stock) =>
          stock.status === 'Critical Low' ||
          (stock.quantity <= stock.reorderPoint && stock.quantity > 0)
      ).length
      const outOfStock = stocks.filter(
        (stock) => stock.status === 'Out of Stock' || stock.quantity <= 0
      ).length

      setStockStats({
        total: totalStocks,
        lowStock,
        inStock,
        lowInStock,
        outOfStock
      })
    }
  }, [stocks])

  // Update selected stock when stock ID changes and fetch its performance data from transactions
  useEffect(() => {
    if (selectedStockId !== 'overview') {
      const stock = stocks.find((s) => s.id === selectedStockId)
      setSelectedStock(stock || null)

      // If stock found, fetch its performance data from transactions
      if (stock) {
        const fetchStockPerformanceData = async () => {
          try {
            // Get all transactions that are completed
            const completedTransactions = transactions.filter(
              (transaction) => transaction.status === 'completed'
            )

            // Create a map to store monthly performance data
            const monthlyData = {}

            // Process each completed transaction
            for (const transaction of completedTransactions) {
              try {
                // Fetch transaction items for this transaction
                const response = await window.context.transactions.getItems(transaction.id)

                if (response.success && response.items) {
                  // Filter items for the selected stock
                  const stockItems = response.items.filter((item) => item.stockId === stock.id)

                  if (stockItems.length > 0) {
                    const date = new Date(transaction.createdAt)
                    const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`
                    const monthLabel = new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      1
                    ).toLocaleString('default', { month: 'short', year: '2-digit' })

                    if (!monthlyData[monthYear]) {
                      monthlyData[monthYear] = {
                        month: monthLabel,
                        quantitySold: 0,
                        revenue: 0
                      }
                    }

                    // Sum up quantity and revenue for this stock in this transaction
                    stockItems.forEach((item) => {
                      monthlyData[monthYear].quantitySold += item.quantity
                      monthlyData[monthYear].revenue += item.quantity * item.unitPrice
                    })
                  }
                }
              } catch (error) {
                console.error(`Error processing transaction ${transaction.id}:`, error)
              }
            }

            // Convert to array and sort by date
            const performanceData = Object.values(monthlyData) as Array<{
              month: string
              quantitySold: number
              revenue: number
            }>

            if (performanceData.length > 0) {
              // Sort by month/year
              performanceData.sort((a, b) => {
                const monthA = new Date(a.month)
                const monthB = new Date(b.month)
                return monthA.getTime() - monthB.getTime()
              })

              setStockPerformance(performanceData)
              setAllStockPerformance(performanceData)
              setAvailableMonthsData(new Set(performanceData.map((item) => item.month)))
            } else {
              // No performance data found for this stock, set empty arrays
              setStockPerformance([])
              setAllStockPerformance([])
              setAvailableMonthsData(new Set())
            }
          } catch (error) {
            console.error('Error fetching stock performance data:', error)
            // Set empty arrays on error instead of generating sample data
            setStockPerformance([])
            setAllStockPerformance([])
            setAvailableMonthsData(new Set())
          }
        }

        fetchStockPerformanceData()
      }
    } else {
      setSelectedStock(null)
      setStockPerformance([])
      setAvailableMonthsData(new Set())
    }
  }, [selectedStockId, stocks, transactions])

  // Calculate order statistics when orders change
  useEffect(() => {
    if (orders.length > 0) {
      const pending = transactions.filter((order) => order.status === 'pending').length
      const successful = transactions.filter((order) => order.status === 'completed').length

      setOrderStats({
        pending,
        successful
      })
    }
  }, [orders, transactions])

  // Calculate date for recent activities
  const formatRelativeDate = (dateString: string) => {
    const today = new Date()
    const date = new Date(dateString)
    const diffTime = Math.abs(today.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  // Get recent activity - now using logs from activityLogStore
  const getRecentActivities = () => {
    // Use activity logs, sorted by date, newest first and limit to 5 items
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }

  // Chart data for stock overview with corrected labels
  const chartData = {
    labels: ['In Stock', 'Low in Stock', 'Out of Stock'],
    datasets: [
      {
        data: [stockStats.inStock, stockStats.lowInStock, stockStats.outOfStock],
        backgroundColor: ['#1890ff', '#faad14', '#ff4d4f'],
        borderWidth: 1
      }
    ]
  }

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          padding: 15
        }
      }
    }
  }

  // Performance chart data for selected stock
  const performanceChartData = useMemo(() => {
    if (!stockPerformance.length) return null

    return {
      labels: stockPerformance.map((item) => item.month),
      datasets: [
        {
          label: 'Quantity Sold',
          data: stockPerformance.map((item) => item.quantitySold),
          borderColor: '#1890ff',
          backgroundColor: 'rgba(24, 144, 255, 0.2)',
          yAxisID: 'y'
        },
        {
          label: 'Revenue (₱)',
          data: stockPerformance.map((item) => item.revenue),
          borderColor: '#52c41a',
          backgroundColor: 'rgba(82, 196, 26, 0.2)',
          yAxisID: 'y1'
        }
      ]
    }
  }, [stockPerformance])

  const performanceChartOptions = {
    responsive: true,
    stacked: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      title: {
        display: true,
        text: selectedStock ? `Performance Metrics for ${selectedStock.name}` : 'Stock Performance'
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Quantity'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false
        },
        title: {
          display: true,
          text: 'Revenue (₱)'
        }
      }
    }
  }

  // Low stock items for table display
  const lowStockItems = stocks
    .filter((stock) => stock.quantity <= stock.reorderPoint || stock.status === 'Out of Stock')
    .map((stock) => ({
      key: stock.id,
      name: stock.name,
      sku: stock.sku,
      quantity: stock.quantity,
      reorderPoint: stock.reorderPoint,
      status: stock.status
    }))

  // Critical items (Out of Stock)
  const criticalItems = lowStockItems.filter(
    (item) => item.status === 'Out of Stock' || item.quantity <= 0
  )

  // Warning items (Critical Low)
  const warningItems = lowStockItems.filter(
    (item) =>
      item.status === 'Critical Low' || (item.quantity <= item.reorderPoint && item.quantity > 0)
  )

  // Filter stock performance data based on selected month
  useEffect(() => {
    if (selectedMonth === 'all') {
      setStockPerformance(allStockPerformance)
    } else {
      setStockPerformance(allStockPerformance.filter((item) => item.month === selectedMonth))
    }
  }, [selectedMonth, allStockPerformance])

  // Filter logs based on search query and filter month
  const getFilteredLogs = () => {
    return logs.filter((log) => {
      // Check if the log matches the search query (username, action, or details)
      const matchesSearchQuery =
        searchQuery === '' ||
        log.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))

      // Check if the log matches the selected month
      const matchesFilterMonth =
        !filterMonth ||
        (log.timestamp && new Date(log.timestamp).toISOString().substring(0, 7) === filterMonth)

      return matchesSearchQuery && matchesFilterMonth
    })
  }

  return (
    <div style={{ padding: '0px 5px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col
          xs={24}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <Title level={2}>Dashboard</Title>
            <Text>{`Welcome, ${user?.name}!`}</Text>
          </div>
          <Select
            style={{ width: 300 }}
            placeholder="Select Stock to View Performance"
            value={selectedStockId}
            onChange={setSelectedStockId}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children?.toString() || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            allowClear
          >
            <Option value="overview">All Overview</Option>
            <Option value="" disabled style={{ borderBottom: '1px solid #f0f0f0' }}>
              Individual Stocks
            </Option>
            {stocks.map((stock) => (
              <Option key={stock.id} value={stock.id}>
                {stock.name}
              </Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card style={{ background: '#f6ffed', height: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>
              {selectedStock ? 1 : stockStats.total}
            </Title>
            <Text>{selectedStock ? 'Selected Stock Item' : 'Total Stock Items'}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={{ background: '#fff7e6', height: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>
              {selectedStock
                ? selectedStock.quantity <= selectedStock.reorderPoint
                  ? 1
                  : 0
                : stockStats.lowStock}
            </Title>
            <Text>Low Stock {selectedStock ? 'Status' : 'Items'}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={{ background: '#f0f5ff', height: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>
              {selectedStock ? selectedStock.quantity : orderStats.pending}
            </Title>
            <Text>{selectedStock ? 'Current Quantity' : 'Pending Orders'}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={{ background: '#f6ffed', height: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>
              {selectedStock ? selectedStock.reorderPoint : orderStats.successful}
            </Title>
            <Text>{selectedStock ? 'Reorder Point' : 'Successful Orders'}</Text>
          </Card>
        </Col>
      </Row>

      {/* Stock Performance Chart (shows when a specific stock is selected) */}
      {selectedStock && (
        <Card title="Stock Performance Analytics" style={{ marginBottom: 16 }}>
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            {stockPerformance.length > 0 ? (
              <>
                <div>
                  <Text strong style={{ marginRight: 12 }}>
                    Filter by Month:
                  </Text>
                  <Select
                    value={selectedMonth}
                    onChange={(value) => setSelectedMonth(value)}
                    style={{ width: 200 }}
                  >
                    <Option value="all">All Months</Option>
                    {Array.from(availableMonthsData).map((month) => (
                      <Option key={month} value={month}>
                        {month}
                      </Option>
                    ))}
                  </Select>
                </div>
                {selectedMonth !== 'all' && (
                  <Button type="link" onClick={() => setSelectedMonth('all')}>
                    Show All Months
                  </Button>
                )}
              </>
            ) : (
              <Text>No transaction data available for this stock</Text>
            )}
          </div>
          {performanceChartData ? (
            <div style={{ height: 300 }}>
              <Line data={performanceChartData} options={performanceChartOptions} />
            </div>
          ) : (
            <Empty description="No sales data available for this stock" />
          )}
          <div style={{ marginTop: 24, background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
            {selectedStock && (
              <Descriptions
                title="Stock Details"
                bordered
                column={{ xs: 1, sm: 2, md: 3 }}
                labelStyle={{ fontWeight: 'bold' }}
              >
                <Descriptions.Item label="SKU">{selectedStock.sku}</Descriptions.Item>
                <Descriptions.Item label="Category">{selectedStock.category}</Descriptions.Item>
                <Descriptions.Item label="Unit">{selectedStock.unit}</Descriptions.Item>
                <Descriptions.Item label="Unit Price">
                  ₱ {selectedStock.unitPrice.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="Cost Price">
                  ₱ {selectedStock.costPrice.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag
                    color={
                      selectedStock.status === 'In Stock'
                        ? 'success'
                        : selectedStock.status === 'Critical Low'
                          ? 'warning'
                          : 'error'
                    }
                  >
                    {selectedStock.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            )}
          </div>
        </Card>
      )}

      {/* Chart and Recent Activities (shown in overview mode) */}
      {selectedStockId === 'overview' && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12}>
            <Card title="Stock Overview" style={{ height: '100%' }}>
              <div style={{ height: 220, position: 'relative' }}>
                <Doughnut data={chartData} options={chartOptions} />
              </div>
              <div style={{ marginTop: 16 }}>
                <Row gutter={[8, 8]}>
                  <Col span={8}>
                    <Text type="secondary">In Stock</Text>
                    <br />
                    <Text strong>{stockStats.inStock}</Text>
                    <Progress
                      percent={
                        stocks.length ? Math.round((stockStats.inStock / stocks.length) * 100) : 0
                      }
                      size="small"
                      showInfo={false}
                      strokeColor="#1890ff"
                    />
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">Low in Stock</Text>
                    <br />
                    <Text strong>{stockStats.lowInStock}</Text>
                    <Progress
                      percent={
                        stocks.length
                          ? Math.round((stockStats.lowInStock / stocks.length) * 100)
                          : 0
                      }
                      size="small"
                      showInfo={false}
                      strokeColor="#faad14"
                    />
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">Out of Stock</Text>
                    <br />
                    <Text strong>{stockStats.outOfStock}</Text>
                    <Progress
                      percent={
                        stocks.length
                          ? Math.round((stockStats.outOfStock / stocks.length) * 100)
                          : 0
                      }
                      size="small"
                      showInfo={false}
                      strokeColor="#ff4d4f"
                    />
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              title="Activity Logs"
              style={{ height: '100%' }}
              extra={
                <Button type="link" onClick={() => setActivityLogModalVisible(true)}>
                  See All
                </Button>
              }
            >
              {getRecentActivities().map((log, index) => (
                <div key={log.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>
                      {log.username}
                      <Text type="secondary" style={{ marginLeft: 5 }}>
                        {log.action === 'create'
                          ? 'created'
                          : log.action === 'update'
                            ? 'updated'
                            : 'deleted'}{' '}
                        a {log.entityType}
                      </Text>
                    </Text>
                    <Text type="secondary">{formatRelativeDate(log.timestamp)}</Text>
                  </div>
                  <div>
                    <Space>
                      <Tag
                        color={
                          log.action === 'create'
                            ? 'success'
                            : log.action === 'update'
                              ? 'processing'
                              : 'error'
                        }
                      >
                        {log.action.toUpperCase()}
                      </Tag>
                      <Text>{log.details}</Text>
                    </Space>
                  </div>
                  {index < getRecentActivities().length - 1 && (
                    <Divider style={{ margin: '8px 0' }} />
                  )}
                </div>
              ))}

              {getRecentActivities().length === 0 && <Empty description="No activity logs found" />}
            </Card>
          </Col>
        </Row>
      )}

      {/* Low Stock Alert Reports - Only show in overview mode */}
      {selectedStockId === 'overview' && (
        <Card title="Low Stock Alert Reports" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card
                title="Critical Items"
                bordered={false}
                style={{ background: '#fff1f0', height: '100%' }}
              >
                <Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                  {criticalItems.length}
                </Title>
                <Text type="danger" style={{ display: 'block', textAlign: 'center' }}>
                  Out of Stock
                </Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card
                title="Warning Items"
                bordered={false}
                style={{ background: '#fffbe6', height: '100%' }}
              >
                <Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                  {warningItems.length}
                </Title>
                <Text type="warning" style={{ display: 'block', textAlign: 'center' }}>
                  Below Reorder Point
                </Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card
                title="Low Stock Items"
                bordered={false}
                style={{ background: '#f9f0ff', height: '100%' }}
              >
                <Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                  {lowStockItems.length}
                </Title>
                <Text style={{ display: 'block', textAlign: 'center' }}>
                  Total Items to Restock
                </Text>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* Activity Log Modal */}
      <Modal
        title="Activity Logs"
        open={activityLogModalVisible}
        onCancel={() => setActivityLogModalVisible(false)}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input
            placeholder="Search by action, username or details..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
          <DatePicker
            onChange={(date) => setFilterMonth(date ? date.format('YYYY-MM') : null)}
            picker="month"
            placeholder="Filter by month"
            allowClear
            style={{ width: 150 }}
          />
        </div>

        <Table
          dataSource={getFilteredLogs()}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: 'User',
              dataIndex: 'username',
              key: 'username',
              width: '15%'
            },
            {
              title: 'Action',
              dataIndex: 'action',
              key: 'action',
              width: '10%',
              render: (action) => (
                <Tag
                  color={
                    action === 'create' ? 'success' : action === 'update' ? 'processing' : 'error'
                  }
                >
                  {action.toUpperCase()}
                </Tag>
              )
            },
            {
              title: 'Entity Type',
              dataIndex: 'entityType',
              key: 'entityType',
              width: '12%',
              render: (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '')
            },
            {
              title: 'Details',
              dataIndex: 'details',
              key: 'details',
              width: '43%'
            },
            {
              title: 'Date',
              dataIndex: 'timestamp',
              key: 'timestamp',
              width: '20%',
              render: (date) => new Date(date).toLocaleString(),
              sorter: (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
              defaultSortOrder: 'descend'
            }
          ]}
        />
      </Modal>
    </div>
  )
}
