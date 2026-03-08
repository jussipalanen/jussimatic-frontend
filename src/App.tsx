import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import LandingView from './LandingView'
import ChatView from './ChatView'
import JobsView from './JobsView'
import ProductsView from './ProductsView'
import CartView from './CartView'
import CheckoutView from './CheckoutView'
import MyOrdersView from './MyOrdersView'
import MyProfileView from './MyProfileView'
import AdminOrdersView from './AdminOrdersView'
import AdminDashboardView from './AdminDashboardView'
import AdminUsersView from './AdminUsersView'
import ResetPasswordView from './ResetPasswordView'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/jobs" element={<JobsView />} />
        <Route path="/demo/ecommerce/products" element={<ProductsView />} />
        <Route path="/demo/ecommerce/cart" element={<CartView />} />
        <Route path="/demo/ecommerce/checkout" element={<CheckoutView />} />
        <Route path="/demo/ecommerce/my-orders" element={<MyOrdersView />} />
        <Route path="/demo/ecommerce/my-profile" element={<MyProfileView />} />
        <Route path="/demo/ecommerce/admin" element={<AdminDashboardView />} />
        <Route path="/demo/ecommerce/admin/orders" element={<AdminOrdersView />} />
        <Route path="/demo/ecommerce/admin/users" element={<AdminUsersView />} />
        <Route path="/reset-password" element={<ResetPasswordView />} />
      </Routes>
    </Router>
  )
}

export default App
