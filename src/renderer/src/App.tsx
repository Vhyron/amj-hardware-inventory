import { HashRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardLayout from './components/DashboardLayout'
import Stocks from './pages/Stocks'
import Supply from './pages/Supply'
import Transactions from './pages/Transactions'
import Users from './pages/Users'
import NotFound from './components/NotFound'
import Account from './pages/Account'
import SplashScreen from './components/SplashScreen'
import LoadingOverlay from './components/LoadingOverlay'
import { useAuthStore } from './store/authStore'
import './styles/custom.css'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const { setUser } = useAuthStore()

  useEffect(() => {
    // Timer for SplashScreen
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    // on-load checkAuth, checks the cookie if token is available
    const checkAuth = async () => {
      const result = await window.context.auth.checkAuth()
      if (result.success && result.user) {
        const user = await window.context.auth.getUser(result.user.id)

        if (user) {
          setUser(user)
        } else {
          setUser(result.user)
        }
      }
    }
    checkAuth()

    return () => {
      clearTimeout(timer)
    }
  }, [setUser])

  if (isLoading) {
    return <SplashScreen />
  }

  return (
    <>
      <LoadingOverlay />
      <HashRouter>
        <Routes>
          <Route index element={<Login />} />
          <Route path="/" element={<DashboardLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="stocks" element={<Stocks />} />
            <Route path="supply" element={<Supply />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="users" element={<Users />} />
            <Route path="account" element={<Account />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </>
  )
}
