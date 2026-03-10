import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrdersByUserId } from '../../../api/ordersApi';
import { getMe } from '../../../api/authApi';
import { getRoleAccess, PERMISSION_MESSAGE } from '../../../utils/authUtils';
import { fetchProductById } from '../../../api/productsApi';
import { getCart } from '../../../utils/cartUtils';
import type { Order } from '../../../api/ordersApi';
import EcommerceHeader from '../components/EcommerceHeader';

const STORAGE_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL || '';
const PLACEHOLDER_IMAGE_URL = 'https://placehold.net/default.png';

function formatDate(dateString?: string) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function formatPrice(price: string | number | null | undefined) {
  if (!price) return '€0.00';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `€${numPrice.toFixed(2)}`;
}

function buildStorageUrl(path: string | null | undefined) {
  if (!path) return PLACEHOLDER_IMAGE_URL;
  if (!STORAGE_BASE_URL) return path;
  const base = STORAGE_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

function getEffectivePrice(item: { unit_price?: string | number; sale_price?: string | number; price?: string | number }): number {
  if (item.sale_price !== undefined && item.sale_price !== null) {
    return typeof item.sale_price === 'string' ? parseFloat(item.sale_price) : item.sale_price;
  }
  if (item.unit_price !== undefined && item.unit_price !== null) {
    return typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price;
  }
  if (item.price !== undefined && item.price !== null) {
    return typeof item.price === 'string' ? parseFloat(item.price) : item.price;
  }
  return 0;
}

function calculateOrderTotal(order: Order): number {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return 0;
  }
  
  return order.items.reduce((total, item) => {
    let itemSubtotal = 0;
    
    if (item.subtotal !== undefined && item.subtotal !== null) {
      itemSubtotal = typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : item.subtotal;
    } else {
      itemSubtotal = getEffectivePrice(item) * item.quantity;
    }
    
    return total + itemSubtotal;
  }, 0);
}

function MyOrdersView() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const loadUserAndOrders = async () => {
      setLoading(true);
      setAuthError(null);
      setOrdersError(null);

      try {
        // Get authenticated user
        const user = await getMe();
        const token = localStorage.getItem('auth_token');

        if (!token) {
          setAuthError('Authentication required. Please log in to view your orders.');
          setLoading(false);
          return;
        }

        const access = getRoleAccess(user);

        if (access.isCustomer) {
          setAuthError(PERMISSION_MESSAGE);
          setLoading(false);
          return;
        }

        // Fetch orders for the authenticated user
        try {
          const data = await fetchOrdersByUserId(user.user_id, token);
          
          // Enrich order items with product image data
          const enrichedOrders = await Promise.all(
            data.map(async (order) => {
              if (!Array.isArray(order.items) || order.items.length === 0) {
                return order;
              }

              // Fetch product details for all items in parallel
              const enrichedItems = await Promise.all(
                order.items.map(async (item) => {
                  // Skip if image data already exists
                  if (item.featured_image) {
                    return item;
                  }

                  try {
                    const product = await fetchProductById(item.product_id);
                    return {
                      ...item,
                      featured_image: product.featured_image,
                      images: product.images,
                    };
                  } catch (err) {
                    console.error(`Failed to fetch product ${item.product_id}:`, err);
                    return item; // Return original item if fetch fails
                  }
                })
              );

              return {
                ...order,
                items: enrichedItems,
              };
            })
          );

          setOrders(enrichedOrders);
        } catch (err) {
          console.error('Failed to load orders:', err);
          setOrdersError('Failed to load orders. Please try again.');
          setOrders([]);
        }
      } catch (err) {
        console.error('Authentication failed:', err);
        setAuthError('Authentication required. Please log in to view your orders.');
      } finally {
        setLoading(false);
      }
    };

    loadUserAndOrders();
  }, []);

  const handleLoginClick = () => {
    navigate('/demo/ecommerce/products');
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  const cartCount = getCart().reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <EcommerceHeader
        title="My Orders"
        backTo="/demo/ecommerce/products"
        backLabel="Products"
        cartCount={cartCount}
        activeNav="my-orders"
      />

      <main className="container mx-auto px-4 py-8">
        {authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-6 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-16 w-16 text-yellow-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <p className="text-lg text-yellow-300 mb-4">{authError}</p>
            {authError !== PERMISSION_MESSAGE && (
              <button
                onClick={handleLoginClick}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Go to Products
              </button>
            )}
          </div>
        )}

        {loading && !authError && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-300">Loading your orders...</p>
          </div>
        )}

        {ordersError && !authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-center">
            <p className="text-red-300">{ordersError}</p>
          </div>
        )}

        {!loading && !authError && !ordersError && orders.length === 0 && (
          <div className="text-center py-10 text-gray-400">No orders found.</div>
        )}

        {!loading && !authError && orders.length > 0 && (
          <div className="mx-auto max-w-6xl space-y-4">
            {orders.map((order, index) => (
              <div
                key={order.id ?? index}
                className="rounded-lg border border-gray-700 bg-gray-800 p-6 hover:border-gray-600 transition-colors cursor-pointer"
                onClick={() => handleOrderClick(order)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-500">Order #</span>
                    <span className="font-semibold ml-1">{order.id ?? 'N/A'}</span>
                  </div>
                  <div className="text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      order.status === 'completed' ? 'bg-green-900/40 text-green-400 border border-green-500/30' :
                      order.status === 'pending' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' :
                      order.status === 'cancelled' ? 'bg-red-900/40 text-red-400 border border-red-500/30' :
                      'bg-gray-700 text-gray-300 border border-gray-600'
                    }`}>
                      {order.status ?? 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatDate(order.created_at)}
                  </div>
                  <div className="text-lg font-bold text-green-400">
                    {formatPrice(calculateOrderTotal(order))}
                  </div>
                </div>

                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="border-t border-gray-700 pt-4 space-y-3">
                    {order.items.slice(0, 3).map((item, itemIndex) => (
                      <div key={`${order.id ?? index}-item-${itemIndex}`} className="flex items-center gap-4">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gray-900/40">
                          <img
                            src={buildStorageUrl(item.featured_image)}
                            alt={item.product_title || `Product ${item.product_id}`}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">
                            {item.product_title || `Product #${item.product_id}`}
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Qty: {item.quantity} × {' '}
                            {item.sale_price ? (
                              <>
                                <span className="line-through opacity-60">{formatPrice(item.unit_price || item.price)}</span>
                                {' '}
                                <span className="text-green-400 font-semibold">{formatPrice(item.sale_price)}</span>
                              </>
                            ) : (
                              formatPrice(item.unit_price || item.price)
                            )}
                          </p>
                        </div>
                        <div className="text-sm font-semibold text-gray-300">
                          {formatPrice(item.subtotal || (getEffectivePrice(item) * item.quantity))}
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-gray-500 pt-2">
                        +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-gray-800 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Order Details #{selectedOrder.id}</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedOrder.status === 'completed' ? 'bg-green-900/40 text-green-400 border border-green-500/30' :
                      selectedOrder.status === 'pending' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' :
                      selectedOrder.status === 'cancelled' ? 'bg-red-900/40 text-red-400 border border-red-500/30' :
                      'bg-gray-700 text-gray-300 border border-gray-600'
                    }`}>
                      {selectedOrder.status ?? 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2">{formatDate(selectedOrder.created_at)}</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-500">Total:</span>
                    <span className="ml-2 font-bold text-green-400 text-lg">{formatPrice(calculateOrderTotal(selectedOrder))}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedOrder.customer_first_name && (
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-500">Customer:</span>
                      <span className="ml-2">{selectedOrder.customer_first_name} {selectedOrder.customer_last_name}</span>
                    </div>
                  )}
                  {selectedOrder.customer_email && (
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-500">Email:</span>
                      <span className="ml-2">{selectedOrder.customer_email}</span>
                    </div>
                  )}
                  {selectedOrder.customer_phone && (
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-500">Phone:</span>
                      <span className="ml-2">{selectedOrder.customer_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Shipping Address</h3>
                  <div className="text-sm text-gray-300">
                    <p>{selectedOrder.shipping_address.street}</p>
                    <p>{selectedOrder.shipping_address.postal_code} {selectedOrder.shipping_address.city}</p>
                    <p>{selectedOrder.shipping_address.state}, {selectedOrder.shipping_address.country}</p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4">Order Items</h3>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item, itemIndex) => (
                      
                      <div key={itemIndex} className="flex items-center gap-4 bg-gray-900/40 rounded-lg p-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gray-900">
                          <img
                            src={buildStorageUrl(item.featured_image)}
                            alt={item.product_title || `Product ${item.product_id}`}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white">
                            {item.product_title || `Product #${item.product_id}`}
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Product ID: {item.product_id}
                          </p>
                          <p className="text-sm text-gray-400">
                            {item.sale_price ? (
                              <>
                                <span className="line-through opacity-60">{formatPrice(item.unit_price || item.price)}</span>
                                {' → '}
                                <span className="text-green-400 font-semibold">{formatPrice(item.sale_price)}</span>
                              </>
                            ) : (
                              formatPrice(item.unit_price || item.price)
                            )}
                            {' × '}{item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-400">
                            {formatPrice(item.subtotal || (getEffectivePrice(item) * item.quantity))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Order Notes</h3>
                  <p className="text-sm text-gray-300">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="rounded-lg bg-gray-700 px-6 py-2 font-semibold text-white hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyOrdersView;
