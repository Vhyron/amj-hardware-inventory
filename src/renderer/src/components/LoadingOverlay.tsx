import {  Spin, Typography } from 'antd'
import { useLoadingStore } from '../store/loadingStore'
import { LoadingOutlined } from '@ant-design/icons'

export default function LoadingOverlay() {
  const { loading, message } = useLoadingStore()

  if (!loading) return null

  const antIcon = <LoadingOutlined style={{ fontSize: 40, color: 'white' }} spin />

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
			<Spin size="large" style={{ marginBottom: 16 }} />
      {message && (
        <Typography.Text
          style={{
            color: 'white',
            marginTop: 16,
            fontSize: '1rem'
          }}
        >
          {message}
        </Typography.Text>
      )}
    </div>
  )
}