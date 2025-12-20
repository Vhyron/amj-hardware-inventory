import { Layout, Menu, Typography } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  DashboardSquare01Icon,
  Invoice01Icon,
  Logout03Icon,
  PackageIcon,
  ShippingTruck01Icon,
  UserSharingIcon,
  UserStatusIcon
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
} from '@hugeicons/core-free-icons'
import { useAuthStore } from '../store/authStore'
import logo from '@/renderer/src/assets/tempo-amj.png'

const { Sider, Content } = Layout
const drawerWidth = 270

const mainMenu = [
  {
    key: '/dashboard',
    label: 'Dashboard',
    icon: <HugeiconsIcon icon={DashboardSquare01Icon} />
  },
  {
    key: '/stocks',
    label: 'Stocks',
    icon: <HugeiconsIcon icon={PackageIcon} />
  },
  {
    key: '/supply',
    label: 'Supply',
    icon: <HugeiconsIcon icon={ShippingTruck01Icon} />
  },
  {
    key: '/transactions',
    label: 'Transactions',
    icon: <HugeiconsIcon icon={Invoice01Icon} />
  },
  {
    key: '/users',
    label: 'Users',
    icon: <HugeiconsIcon icon={UserSharingIcon} />
  },
  {
    key: '/sales',
    label: 'Sales',
    icon: <HugeiconsIcon icon={PackageIcon} />
  }
]

const footerMenu = [
  {
    key: '/account',
    label: 'Account',
    icon: <HugeiconsIcon icon={UserStatusIcon} />
  },
  {
    key: 'logout',
    label: 'Logout',
    icon: <HugeiconsIcon icon={Logout03Icon} />
  }
]

export default function DashboardLayout() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleMenuClick = (key: string) => {
    if (key === 'logout') {
      logout()
      navigate('/')
    } else {
      navigate(key)
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={drawerWidth}
        style={{
          backgroundColor: '#f9f9f9',
          overflow: 'auto',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        {/* Top section with logo */}
        <div
          style={{
            borderBottom: '1px solid #e9e9e9',
            padding: '16px 16px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <img
            src={logo}
            style={{
              objectFit: 'contain',
              width: 50,
              height: 40
            }}
          />
          <Typography.Text style={{ fontSize: 17, whiteSpace: 'nowrap', fontWeight: 500 }}>
            AMJ Hardware IMS
          </Typography.Text>
        </div>

        {/* Main navigation menu - takes available space */}
        {/* calc - 160px here is the height of the top section */}
        <div
          style={{ flex: 1, overflow: 'auto', maxHeight: 'calc(100vh - 160px)', height: '100%' }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={mainMenu}
            onClick={({ key }) => handleMenuClick(key)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: 16
            }}
            theme="light"
            className="custom-menu"
          />
        </div>

        {/* Footer menu with account and logout - fixed at bottom */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={footerMenu}
          onClick={({ key }) => handleMenuClick(key)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            marginBottom: 8,
            fontSize: 16
          }}
          theme="light"
          className="custom-menu"
        />
      </Sider>

      <Layout style={{ marginLeft: drawerWidth }}>
        <Content
          style={{
            padding: 8,
            backgroundColor: '#f9f9f9'
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 0 10px rgba(0,0,0,0.05)',
              width: '100%',
              height: '100%'
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
