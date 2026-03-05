import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import LandingView from './LandingView'
import ChatView from './ChatView'
import JobsView from './JobsView'
import ProductsView from './ProductsView'
import CartView from './CartView'
import CheckoutView from './CheckoutView'
import MyOrdersView from './MyOrdersView'

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
      </Routes>
    </Router>
  )
}

export default App
