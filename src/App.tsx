import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import Layout from './components/Layout'
import LandingView from './LandingView'
import ChatView from './ChatView'
import BrowseJobsView from './demo/browse-jobs'
import ProductsView from './demo/ecommerce/views/ProductsView'
import CartView from './demo/ecommerce/views/CartView'
import CheckoutView from './demo/ecommerce/views/CheckoutView'
import MyOrdersView from './profile/MyOrdersView'
import MyProfileView from './profile/MyProfileView'
import AdminOrdersView from './admin/AdminOrdersView'
import AdminDashboardView from './admin/AdminDashboardView'
import AdminUsersView from './admin/AdminUsersView'
import AdminInvoicesView from './admin/AdminInvoicesView'
import AdminBlogsView from './admin/AdminBlogsView'
import AdminProjectsView from './admin/AdminProjectsView'
import ProjectCategoriesView from './projects/ProjectCategoriesView'
import ProjectTagsView from './projects/ProjectTagsView'
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
import BlogCategoriesView from './blogs/BlogCategoriesView'
import NotFoundView from './NotFoundView'
import { setStoredLanguage, getLanguageFromPath, type Language } from './i18n'

// Component to handle language from URL and update stored language
function LanguageHandler({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const lang = getLanguageFromPath(location.pathname);
    // Update stored language when URL language changes
    setStoredLanguage(lang);
    // Dispatch event for components to update their language state
    window.dispatchEvent(new CustomEvent<Language>('jussimatic-language-change', { detail: lang }));
  }, [location.pathname]);

  // Handle redirects: if someone visits /fi path (Finnish as default), redirect to /
  useEffect(() => {
    const lang = getLanguageFromPath(location.pathname);

    // If we're on Finnish (default) path but URL starts with /fi, redirect to /
    if (lang === 'fi' && location.pathname.startsWith('/fi')) {
      const newPath = location.pathname.replace(/^\/fi/, '') || '/';
      navigate(newPath, { replace: true });
    }
  }, [location.pathname, navigate]);

  return <>{children}</>;
}

// Common route definitions
const commonRoutes = [
  { path: 'cv', element: <CVView /> },
  { path: 'chat', element: <ChatView /> },
  { path: 'logout', element: <LogoutView /> },
  { path: 'profile/resumes', element: <ResumesView /> },
  { path: 'profile/resumes/new', element: <ResumeFormView /> },
  { path: 'profile/resumes/:id', element: <ResumeFormView /> },
  { path: 'profile/resumes/:id/edit', element: <ResumeFormView /> },
  { path: 'profile/invoices', element: <MyInvoicesView /> },
  { path: 'demo/browse-jobs', element: <BrowseJobsView /> },
  { path: 'demo/ai-cv-review', element: <AICVReviewView /> },
  { path: 'demo/resume-tool', element: <ResumeToolView /> },
  { path: 'demo/invoice-tool', element: <InvoiceToolView /> },
  { path: 'demo/ecommerce/products', element: <ProductsView /> },
  { path: 'demo/ecommerce/cart', element: <CartView /> },
  { path: 'demo/ecommerce/checkout', element: <CheckoutView /> },
  { path: 'demo/ecommerce/my-orders', element: <MyOrdersView /> },
  { path: 'demo/ecommerce/my-profile', element: <MyProfileView /> },
  { path: 'admin', element: <AdminDashboardView /> },
  { path: 'admin/orders', element: <AdminOrdersView /> },
  { path: 'admin/users', element: <AdminUsersView /> },
  { path: 'admin/invoices', element: <AdminInvoicesView /> },
  { path: 'admin/blogs', element: <AdminBlogsView /> },
  { path: 'admin/blog-categories', element: <BlogCategoriesView /> },
  { path: 'admin/projects', element: <AdminProjectsView /> },
  { path: 'admin/project-categories', element: <ProjectCategoriesView /> },
  { path: 'admin/project-tags', element: <ProjectTagsView /> },
  { path: 'blogs', element: <BlogsView /> },
  { path: 'blogs/:id', element: <BlogView /> },
  { path: 'reset-password', element: <ResetPasswordView /> },
];

// Main App component
function App() {
  return (
    <Router>
      <LanguageHandler>
        <>
          <div className="stars-layer-1" aria-hidden="true" />
          <div className="stars-layer-2" aria-hidden="true" />
          <div className="stars-layer-3" aria-hidden="true" />
          <Routes>
            {/* English routes with /en prefix */}
            <Route path="/en" element={<Layout />}>
              <Route index element={<LandingView />} />
              {commonRoutes.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
              ))}
              <Route path="*" element={<NotFoundView />} />
            </Route>
            {/* Default Finnish routes (no prefix) */}
            <Route path="/" element={<Layout />}>
              <Route index element={<LandingView />} />
              {commonRoutes.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
              ))}
              <Route path="*" element={<NotFoundView />} />
            </Route>
          </Routes>
        </>
      </LanguageHandler>
    </Router>
  )
}

export default App
