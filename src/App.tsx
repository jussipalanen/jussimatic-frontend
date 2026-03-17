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
import AdminBlogsView from './demo/ecommerce/views/AdminBlogsView'
import ResetPasswordView from './ResetPasswordView'
import AICVReviewView from './demo/ai-cv-review'
import ResumeToolView from './demo/resume-tool'
import InvoiceToolView from './demo/invoice-tool'
import LogoutView from './profile/LogoutView'
import ResumesView from './profile/resumes/ResumesView'
import ResumeFormView from './profile/resumes/ResumeFormView'
import MyInvoicesView from './profile/invoices/MyInvoicesView'
import CVView from './CVView'
import BlogsView from './blogs/BlogsView'
import BlogView from './blogs/BlogView'

function App() {
  return (
    <Router>
      <>
        <div className="stars-layer-1" aria-hidden="true" />
        <div className="stars-layer-2" aria-hidden="true" />
        <div className="stars-layer-3" aria-hidden="true" />
        <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/cv" element={<CVView />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/logout" element={<LogoutView />} />
        <Route path="/profile/resumes" element={<ResumesView />} />
        <Route path="/profile/resumes/new" element={<ResumeFormView />} />
        <Route path="/profile/resumes/:id" element={<ResumeFormView />} />
        <Route path="/profile/resumes/:id/edit" element={<ResumeFormView />} />
        <Route path="/profile/invoices" element={<MyInvoicesView />} />
        <Route path="/demo/browse-jobs" element={<BrowseJobsView />} />
        <Route path="/demo/ai-cv-review" element={<AICVReviewView />} />
        <Route path="/demo/resume-tool" element={<ResumeToolView />} />
        <Route path="/demo/invoice-tool" element={<InvoiceToolView />} />
        <Route path="/demo/ecommerce/products" element={<ProductsView />} />
        <Route path="/demo/ecommerce/cart" element={<CartView />} />
        <Route path="/demo/ecommerce/checkout" element={<CheckoutView />} />
        <Route path="/demo/ecommerce/my-orders" element={<MyOrdersView />} />
        <Route path="/demo/ecommerce/my-profile" element={<MyProfileView />} />
        <Route path="/admin" element={<AdminDashboardView />} />
        <Route path="/admin/orders" element={<AdminOrdersView />} />
        <Route path="/admin/users" element={<AdminUsersView />} />
        <Route path="/admin/invoices" element={<AdminInvoicesView />} />
        <Route path="/admin/blogs" element={<AdminBlogsView />} />
        <Route path="/blogs" element={<BlogsView />} />
        <Route path="/blogs/:id" element={<BlogView />} />
        <Route path="/reset-password" element={<ResetPasswordView />} />
        </Routes>
      </>
    </Router>
  )
}

export default App
