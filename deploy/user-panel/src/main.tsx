import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { initMetaPixel } from './utils/metaPixel'

// Initialize AOS
AOS.init({
  duration: 800,
  easing: 'ease-out',
  once: true,
  offset: 100,
  delay: 0
})

// Initialize Meta Pixel
initMetaPixel()

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope)
        
        // Check for updates every hour
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)





