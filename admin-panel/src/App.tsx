import React, { useEffect, useRef } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Can from './components/Can'
import Layout from './layouts/Layout'
import { AuthProvider } from './contexts/AuthContext'
import ToastProvider from './components/ToastProvider'
import { socketService } from './services/socket'
import { 
  Dashboard, Orders, Customers, Users, Categories, Settings, Products,
  Analytics, Marketing, MetaAds, WhatsAppSubscriptions, Discounts, FacebookInstagram, OnlineStore, GoogleYouTube, Forms,
  Invoice, InvoiceSettings, Tax, Returns, Payment, UserProfiles, UserNotifications, LoyaltyProgramManagement,
  StaticPagesManagement, CommunityManagement, CartCheckoutManagement, AffiliateManagement, AffiliateRequests,
  Staff, RolesPermissions, AuditLogs, AlertSettings, HomepageLayoutManager, ProductCollections
} from './pages'
import UserDetail from './pages/users/UserDetail'
import Shipments from './pages/sales/Shipments'
import OrderDetails from './pages/sales/OrderDetails'
import LoginPage from './pages/Login'
import CMS from './pages/CMS'
import CMSManagement from './pages/cms/CMSManagement'
import BlogRequestManagement from './pages/blog/BlogRequestManagement'

// Import all the new components
import LoyaltyProgram from './components/LoyaltyProgram'
import AffiliateMarketing from './components/AffiliateMarketing'
import CashbackSystem from './components/CashbackSystem'
import WhatsAppNotifications from './pages/notifications/WhatsAppNotifications'
import WhatsAppChat from './components/WhatsAppChat'
import WhatsAppManagement from './pages/whatsapp/WhatsAppManagement'
import LiveChat from './components/LiveChat'
import AdvancedAnalytics from './components/AdvancedAnalytics'
import FormBuilder from './components/FormBuilder'
import FormSubmissions from './pages/FormSubmissions'
import WorkflowAutomation from './components/WorkflowAutomation'
import CustomerSegmentation from './components/CustomerSegmentation'
import CustomerJourneyTracking from './components/CustomerJourneyTracking'
import ActionableAnalytics from './components/ActionableAnalytics'
import AIBox from './components/AIBox'
import JourneyFunnel from './components/JourneyFunnel'
import AIPersonalization from './components/AIPersonalization'
import CustomAudience from './components/CustomAudience'
import OmniChannel from './components/OmniChannel'
import APICodeManager from './components/APICodeManager'
import PaymentOptions from './components/PaymentOptions'
import VideoManager from './components/VideoManager'
import ContactMessages from './pages/ContactMessages'
import CoinWithdrawals from './pages/CoinWithdrawals'

// Phase 1-4 New Pages
import ProductVariants from './pages/ProductVariants'
import InventoryManagement from './pages/InventoryManagement'
import MarketplaceIntegrations from './pages/MarketplaceIntegrations'
import Warehouses from './pages/Warehouses'
import POSSystem from './pages/POSSystem'
import FBShopIntegration from './pages/FBShopIntegration'

export default function App() {
  const socketInitialized = useRef(false)
  
  useEffect(() => {
    // Prevent duplicate initialization logs in React StrictMode
    if (socketInitialized.current) return
    socketInitialized.current = true
    
    console.log('🔌 Initializing admin socket connection...')
    // Initialize Socket.IO connection for real-time updates
    socketService.connect()
    
    // Subscribe to order updates (consolidated to avoid duplicates)
    const unsubscribeOrderCreated = socketService.subscribe('order_created', (data: any) => {
      console.log('✅ New order created:', data)
      // You can add notification logic here
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order!', {
          body: `Order #${data.order_number || data.id || 'N/A'} received`,
          icon: '/favicon.ico'
        })
      }
    })
    
    // Also listen for orders_created (backend may emit either)
    const unsubscribeOrdersCreated = socketService.subscribe('orders_created', (data: any) => {
      // Deduplicate: only log if not already handled by order_created
      // This prevents duplicate notifications
      console.log('✅ Order created (batch):', data)
    })
    
    const unsubscribeOrderUpdated = socketService.subscribe('order_updated', (data: any) => {
      console.log('🔄 Order updated:', data)
    })
    
    const unsubscribeOrdersUpdated = socketService.subscribe('orders_updated', (data: any) => {
      console.log('🔄 Order updated (batch):', data)
    })
    
    const unsubscribeUserProfileUpdated = socketService.subscribe('user_profile_updated', (data: any) => {
      console.log('👤 User profile updated:', data)
    })
    
    const unsubscribeUsersCreated = socketService.subscribe('users_created', (data: any) => {
      console.log('👤 New user registered:', data)
    })
    
    const unsubscribeProductsCreated = socketService.subscribe('products_created', (data: any) => {
      console.log('🛍️ Product created:', data)
    })
    
    const unsubscribeProductsUpdated = socketService.subscribe('products_updated', (data: any) => {
      console.log('🛍️ Product updated:', data)
    })
    
    const unsubscribeProductsDeleted = socketService.subscribe('products_deleted', (data: any) => {
      console.log('🗑️ Product deleted:', data)
    })
    
    const unsubscribeDeliveryStatusUpdated = socketService.subscribe('delivery_status_updated', (data: any) => {
      console.log('🚚 Delivery status updated:', data)
    })
    
    const unsubscribeContactMessageCreated = socketService.subscribe('contact_message_created', (data: any) => {
      console.log('💬 New contact message:', data)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Contact Message!', {
          body: `Message from ${data.name}`,
          icon: '/favicon.ico'
        })
      }
    })
    
    const unsubscribeContactMessageUpdated = socketService.subscribe('contact_message_updated', (data: any) => {
      console.log('💬 Contact message updated:', data)
    })
    
    // Subscribe to WhatsApp subscription updates
    const unsubscribeUpdate = socketService.subscribe('update', (data: any) => {
      if (data.type === 'whatsapp-subscription') {
        console.log('📱 New WhatsApp subscription:', data.data)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New WhatsApp Subscription!', {
            body: data.data.message || `New subscription: ${data.data.subscription?.phone}`,
            icon: '/favicon.ico'
          })
        }
      }
    })
    
    // Ask for notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    
    return () => {
      // Clean up all subscriptions
      unsubscribeOrderCreated()
      unsubscribeOrdersCreated()
      unsubscribeOrderUpdated()
      unsubscribeOrdersUpdated()
      unsubscribeUserProfileUpdated()
      unsubscribeUsersCreated()
      unsubscribeProductsCreated()
      unsubscribeProductsUpdated()
      unsubscribeProductsDeleted()
      unsubscribeDeliveryStatusUpdated()
      unsubscribeContactMessageCreated()
      unsubscribeContactMessageUpdated()
      unsubscribeUpdate()
      // Note: We don't disconnect the socket here to avoid issues with React StrictMode
      // The socket service will handle reconnection automatically
    }
  }, [])

  return (
    <AuthProvider>
      <ToastProvider>
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:orderNumber" element={<OrderDetails />} />
            <Route path="invoices" element={<Invoice />} />
            <Route path="invoice-settings" element={<InvoiceSettings />} />
            <Route path="shipments" element={<Shipments />} />
            <Route path="customers" element={<Customers />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="categories" element={<Categories />} />
            <Route path="tax" element={<Tax />} />
            <Route path="returns" element={<Returns />} />
            <Route path="payment" element={<Payment />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="meta-ads" element={<MetaAds />} />
            <Route path="whatsapp-subscriptions" element={<WhatsAppSubscriptions />} />
            <Route path="discounts" element={<Discounts />} />
            <Route path="facebook" element={<FacebookInstagram />} />
            <Route path="store" element={<OnlineStore />} />
            <Route path="google" element={<GoogleYouTube />} />
            <Route path="forms" element={<Forms />} />
            <Route path="settings" element={<Settings />} />
            <Route path="system/alerts" element={<Can role="admin"><AlertSettings /></Can>} />
            <Route path="system/staff" element={<Can role="admin"><Staff /></Can>} />
            <Route path="system/roles" element={<Can role="admin"><RolesPermissions /></Can>} />
            <Route path="system/audit-logs" element={<Can role="admin"><AuditLogs /></Can>} />
            
            {/* New User Management Routes */}
            <Route path="user-profiles" element={<UserProfiles />} />
            <Route path="user-notifications" element={<UserNotifications />} />
            <Route path="loyalty-program-management" element={<LoyaltyProgramManagement />} />
            
            {/* WhatsApp Notifications */}
            <Route path="whatsapp-notifications" element={<WhatsAppNotifications />} />
            <Route path="whatsapp-chat" element={<WhatsAppChat />} />
            <Route path="whatsapp-management" element={<WhatsAppManagement />} />
            
            {/* New Content Management Routes */}
            <Route path="static-pages" element={<StaticPagesManagement />} />
            <Route path="community-management" element={<CommunityManagement />} />
            <Route path="homepage-layout" element={<HomepageLayoutManager />} />
            <Route path="product-collections" element={<ProductCollections />} />
            
            {/* New E-commerce Management Routes */}
            <Route path="cart-checkout" element={<CartCheckoutManagement />} />
            
            {/* New Customer Engagement Features */}
            <Route path="loyalty-program" element={<LoyaltyProgram />} />
            <Route path="affiliate-program" element={<AffiliateManagement />} />
            <Route path="cashback" element={<CashbackSystem />} />
            <Route path="live-chat" element={<LiveChat />} />
            <Route path="advanced-analytics" element={<AdvancedAnalytics />} />
            <Route path="form-builder" element={<FormBuilder />} />
            <Route path="form-submissions" element={<FormSubmissions />} />
            <Route path="workflow-automation" element={<WorkflowAutomation />} />
            <Route path="customer-segmentation" element={<CustomerSegmentation />} />
            <Route path="journey-tracking" element={<CustomerJourneyTracking />} />
            <Route path="actionable-analytics" element={<ActionableAnalytics />} />
            <Route path="ai-box" element={<AIBox />} />
            <Route path="journey-funnel" element={<JourneyFunnel />} />
            <Route path="ai-personalization" element={<AIPersonalization />} />
            <Route path="custom-audience" element={<CustomAudience />} />
            <Route path="omni-channel" element={<OmniChannel />} />
            <Route path="api-manager" element={<APICodeManager />} />
            <Route path="payment-options" element={<PaymentOptions />} />
            <Route path="video-manager" element={<VideoManager />} />
            <Route path="cms" element={<CMSManagement />} />
            <Route path="blog-requests" element={<BlogRequestManagement />} />
            <Route path="affiliate-requests" element={<AffiliateRequests />} />
            <Route path="contact-messages" element={<ContactMessages />} />
            <Route path="coin-withdrawals" element={<CoinWithdrawals />} />
            
            {/* Phase 1-4 New Routes */}
            <Route path="product-variants" element={<ProductVariants />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="marketplaces" element={<Can role="admin"><MarketplaceIntegrations /></Can>} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="pos" element={<Can anyOf={["pos:read","pos:update"]}><POSSystem /></Can>} />
            <Route path="fb-shop" element={<FBShopIntegration />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
