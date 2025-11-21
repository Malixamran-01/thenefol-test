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

// Handle PWA install prompt
let deferredPrompt: any = null

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault()
  // Stash the event so it can be triggered later
  deferredPrompt = e
  console.log('📱 PWA install prompt available')
  
  // Show custom install button if needed
  // You can dispatch a custom event here to show install button in UI
  window.dispatchEvent(new CustomEvent('pwa-install-available'))
})

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installed successfully')
  deferredPrompt = null
  // Hide install button
  window.dispatchEvent(new CustomEvent('pwa-installed'))
})

// Export function to trigger install prompt (can be called from UI)
export const installPWA = async () => {
  if (!deferredPrompt) {
    return false
  }
  
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  console.log(`User response to install prompt: ${outcome}`)
  deferredPrompt = null
  return outcome === 'accepted'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)





