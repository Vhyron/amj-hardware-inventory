import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import App from './App'

// Add a style element to fix overflow issues
const styleElement = document.createElement('style')
styleElement.innerHTML = `
  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
  }
  #root {
    position: relative;
  }
`
document.head.appendChild(styleElement)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm
        // You can customize theme tokens here
        // token: {
        //   colorPrimary: '#00b96b',
        // }
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>
)
