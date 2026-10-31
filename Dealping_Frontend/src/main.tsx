import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { DEALPING_LOGO_URI, DEALPING_FAVICON_URI } from './constants/logo'

// Đảm bảo Favicon & Apple Touch Icon luôn hiển thị 100% trên mọi trình duyệt và link deploy
if (typeof document !== 'undefined') {
  const applyIcon = (rel: string, href: string, sizes?: string) => {
    let link = document.querySelector(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = rel
      if (sizes) link.sizes = sizes
      document.head.appendChild(link)
    }
    link.type = 'image/png'
    link.href = href
  }

  applyIcon('icon', DEALPING_FAVICON_URI, '32x32')
  applyIcon('shortcut icon', DEALPING_FAVICON_URI)
  applyIcon('apple-touch-icon', DEALPING_LOGO_URI, '180x180')
  applyIcon('apple-touch-icon-precomposed', DEALPING_LOGO_URI)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
