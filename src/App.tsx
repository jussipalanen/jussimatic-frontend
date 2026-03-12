import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import LandingView from './LandingView'
import ChatView from './ChatView'
import BrowseJobsView from './demo/browse-jobs'
import ProductsView from './demo/ecommerce/views/ProductsView'
import CartView from './demo/ecommerce/views/CartView'
import CheckoutView from './demo/ecommerce/views/CheckoutView'
import MyOrdersView from './demo/ecommerce/views/MyOrdersView'
import MyProfileView from './demo/ecommerce/views/MyProfileView'
import AdminOrdersView from './demo/ecommerce/views/AdminOrdersView'
import AdminDashboardView from './demo/ecommerce/views/AdminDashboardView'
import AdminUsersView from './demo/ecommerce/views/AdminUsersView'
import AdminInvoicesView from './demo/ecommerce/views/AdminInvoicesView'
import ResetPasswordView from './ResetPasswordView'
import AICVReviewView from './demo/ai-cv-review'
import LogoutView from './profile/LogoutView'
import ResumesView from './profile/resumes/ResumesView'
import ResumeFormView from './profile/resumes/ResumeFormView'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/logout" element={<LogoutView />} />
        <Route path="/profile/resumes" element={<ResumesView />} />
        <Route path="/profile/resumes/new" element={<ResumeFormView />} />
        <Route path="/profile/resumes/:id" element={<ResumeFormView />} />
        <Route path="/demo/browse-jobs" element={<BrowseJobsView />} />
        <Route path="/demo/ai-cv-review" element={<AICVReviewView />} />
        <Route path="/demo/ecommerce/products" element={<ProductsView />} />
        <Route path="/demo/ecommerce/cart" element={<CartView />} />
        <Route path="/demo/ecommerce/checkout" element={<CheckoutView />} />
        <Route path="/demo/ecommerce/my-orders" element={<MyOrdersView />} />
        <Route path="/demo/ecommerce/my-profile" element={<MyProfileView />} />
        <Route path="/demo/ecommerce/admin" element={<AdminDashboardView />} />
        <Route path="/demo/ecommerce/admin/orders" element={<AdminOrdersView />} />
        <Route path="/demo/ecommerce/admin/users" element={<AdminUsersView />} />
        <Route path="/demo/ecommerce/admin/invoices" element={<AdminInvoicesView />} />
        <Route path="/reset-password" element={<ResetPasswordView />} />
      </Routes>
    </Router>
  )
}

export default App
