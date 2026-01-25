import logo from '@/renderer/src/assets/amj-logo.png'
import { Alert, Button, Card, Form, Input } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLoadingStore } from '../store/loadingStore'

export default function Login() {
  const [form] = Form.useForm()
  const [errors, setErrors] = useState<any>({})
  const { user, setUser } = useAuthStore()
  const { setLoading, waitForLoadingComplete } = useLoadingStore()

  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleLogin = async (values: { username: string; password: string }) => {
    try {
      setLoading(true, 'Logging in...')
      await waitForLoadingComplete()

      const result = await window.context.auth.login(values.username, values.password)

      if (!result.success) {
        setErrors({ ...errors, result: result.message })
        return
      }

      setUser({
        id: result.user?.id || '',
        name: result.user?.name || '',
        username: result.user?.username || '',
        role: result.user?.role || '',
        permissions: result.user?.permissions || [],
        profile_image: result.user?.profile_image || ''
      })

      navigate('/dashboard')
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#f9f9f9',
        height: '100%',
        width: '100%',
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: 12,
          position: 'relative'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <img
            src={logo}
            style={{
              objectFit: 'contain',
              width: '100%',
              height: 140,
              marginBottom: 8
            }}
          />
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>AMJ HARDWARE INVENTORY</div>
        </div>
        {errors?.result && (
          <Alert message={errors.result} type="error" showIcon style={{ marginBottom: 16 }} />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleLogin}
          initialValues={{ username: '', password: '' }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input placeholder="Username" size="large" autoFocus />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              style={{
                marginTop: 10,
                backgroundColor: '#d32f2f'
              }}
            >
              Login
            </Button>
          </Form.Item>
        </Form>
        <p
          style={{
            position: 'absolute',
            bottom: -50,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 13,
            color: '404040',
            whiteSpace: 'nowrap'
          }}
        >
          © {new Date().getFullYear()} Team Cognito. All rights reserved.
        </p>
      </Card>
    </div>
  )
}
