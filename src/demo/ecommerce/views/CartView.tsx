import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCart, removeFromCart, updateCartItemQuantity, clearCart } from '../../../utils/cartUtils';
import type { CartItem } from '../../../utils/cartUtils';
import EcommerceHeader from '../components/EcommerceHeader';

const STORAGE_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL || '';
const PLACEHOLDER_IMAGE_URL = 'https://placehold.net/default.png';

function CartView() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>(getCart());

  useEffect(() => {
    // Refresh cart items when component mounts
    setCartItems(getCart());
  }, []);

  const formatPrice = (price: string | null) => {
    if (!price) return 'N/A';
    return `€${parseFloat(price).toFixed(2)}`;
  };

  const buildStorageUrl = (path: string | null | undefined) => {
    if (!path) return PLACEHOLDER_IMAGE_URL;
    if (!STORAGE_BASE_URL) return path;
    const base = STORAGE_BASE_URL.replace(/\/+$/, '');
    const endpoint = path.replace(/^\/+/, '');
    return `${base}/${endpoint}`;
  };

  const handleRemove = (productId: number) => {
    removeFromCart(productId);
    setCartItems(getCart());
  };

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    updateCartItemQuantity(productId, newQuantity);
    setCartItems(getCart());
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart();
      setCartItems([]);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price);
      return total + price * item.quantity;
    }, 0);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <EcommerceHeader
        title="Shopping Cart"
        backTo="/demo/ecommerce/products"
        backLabel="Back to products"
        cartCount={cartCount}
        activeNav="cart"
        actions={
          cartItems.length > 0 ? (
            <button
              onClick={handleClearCart}
              className="rounded-lg border border-red-500/60 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-600/20 transition-colors"
            >
              Clear Cart
            </button>
          ) : null
        }
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-24 w-24 text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-xl text-gray-400 mb-6">No products added</p>
            <button
              onClick={() => navigate('/demo/ecommerce/products')}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-750 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Subtotal
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Remove
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {cartItems.map((item) => (
                    <tr key={item.productId} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gray-900/40">
                            <img
                              src={buildStorageUrl(item.featuredImage)}
                              alt={item.title}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          </div>
                          <div className="font-medium text-white">{item.title}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-300">
                        {formatPrice(item.price)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                            className="rounded bg-gray-700 px-2 py-1 text-white hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.maxQuantity}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              handleQuantityChange(item.productId, val);
                            }}
                            className="w-16 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                            className="rounded bg-gray-700 px-2 py-1 text-white hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={item.quantity >= item.maxQuantity}
                          >
                            +
                          </button>
                        </div>
                        <div className="mt-1 text-center text-xs text-gray-500">
                          Max: {item.maxQuantity}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-400">
                        {formatPrice((parseFloat(item.price) * item.quantity).toFixed(2))}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRemove(item.productId)}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-red-400 hover:bg-red-600/20 transition-colors"
                          aria-label="Remove item"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.productId}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-4"
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gray-900/40">
                      <img
                        src={buildStorageUrl(item.featuredImage)}
                        alt={item.title}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{item.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {formatPrice(item.price)} each
                      </p>
                      <p className="text-sm font-semibold text-green-400 mt-1">
                        Subtotal: {formatPrice((parseFloat(item.price) * item.quantity).toFixed(2))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        className="rounded bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={item.quantity <= 1}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.maxQuantity}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          handleQuantityChange(item.productId, val);
                        }}
                        className="w-16 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        className="rounded bg-gray-700 px-3 py-1 text-white hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={item.quantity >= item.maxQuantity}
                      >
                        +
                      </button>
                      <span className="text-xs text-gray-500 ml-2">
                        Max: {item.maxQuantity}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(item.productId)}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-600/20 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold text-white">Total:</span>
                <span className="text-2xl font-bold text-green-400">
                  {formatPrice(calculateTotal().toFixed(2))}
                </span>
              </div>
              <button
                onClick={() => navigate('/demo/ecommerce/checkout')}
                className="mt-4 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default CartView;
