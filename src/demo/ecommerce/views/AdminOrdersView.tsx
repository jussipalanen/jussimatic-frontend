import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllOrders, updateOrder } from '../../../api/ordersApi';
import { getMe } from '../../../api/authApi';
import { getRoleAccess, PERMISSION_MESSAGE } from '../../../utils/authUtils';
import { fetchProductById } from '../../../api/productsApi';
import type { Order } from '../../../api/ordersApi';
import AdminHeader from '../components/AdminHeader';
import CountrySelect from '../../../components/CountrySelect';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../../../i18n';
import type { Language } from '../../../i18n';

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

function formatTaxPct(rate: number): string {
  const pct = parseFloat((rate * 100).toPrecision(10));
  return `${pct.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

interface TaxGroup { code: string | null; rate: number; amount: number }

function calcOrderTaxBreakdown(items: import('../../../api/ordersApi').OrderItem[]): TaxGroup[] {
  const groups: TaxGroup[] = [];
  for (const item of items) {
    const rawRate = item.tax_rate;
    if (rawRate == null) continue;
    const rate = typeof rawRate === 'string' ? parseFloat(rawRate) : Number(rawRate);
    if (!rate || isNaN(rate)) continue;
    const effectiveRate = rate > 1 ? rate / 100 : rate;
    const lineTotal = item.subtotal != null
      ? (typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : Number(item.subtotal))
      : getEffectivePrice(item) * item.quantity;
    const taxAmount = lineTotal * effectiveRate;
    const code = (item.tax_code as string | null | undefined) ?? null;
    const existing = groups.find(g => g.code === code && g.rate === effectiveRate);
    if (existing) existing.amount += taxAmount;
    else groups.push({ code, rate: effectiveRate, amount: taxAmount });
  }
  return groups;
}

function AdminOrdersView() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminOrders;

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  const orderStatusOptions = [
    { value: 'pending', label: t.statusPending },
    { value: 'processing', label: t.statusProcessing },
    { value: 'completed', label: t.statusCompleted },
    { value: 'cancelled', label: t.statusCancelled },
    { value: 'refunded', label: t.statusRefunded },
  ];
  const [editFormValues, setEditFormValues] = useState({
    firstname: '',
    lastname: '',
    streetAddress: '',
    postCode: '',
    city: '',
    state: '',
    country: '',
    email: '',
    phone: '',
    notes: '',
    status: 'pending',
    lang: language as string,
  });
  const [editItems, setEditItems] = useState<Array<{
    product_id: number;
    quantity: number;
    tax_code: string;
    tax_rate: string;
    product_title?: string;
    featured_image?: string | null;
  }>>([]);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setAuthError(null);
      setOrdersError(null);

      try {
        const token = localStorage.getItem('auth_token');

        if (!token) {
          setAuthError(t.authErrLogin);
          setLoading(false);
          return;
        }

        const user = await getMe();
        const access = getRoleAccess(user);

        if (!access.isAdmin && !access.isVendor) {
          setAuthError(PERMISSION_MESSAGE);
          setLoading(false);
          return;
        }

        try {
          const data = await fetchAllOrders(token);

          const enrichedOrders = await Promise.all(
            data.map(async (order) => {
              if (!Array.isArray(order.items) || order.items.length === 0) {
                return order;
              }

              const enrichedItems = await Promise.all(
                order.items.map(async (item) => {
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
                    return item;
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
          // Auto-open the first order's modal on page load
          if (enrichedOrders.length > 0) {
            setSelectedOrder(enrichedOrders[0]);
          }
        } catch (err) {
          console.error('Failed to load orders:', err);
          setOrdersError(t.errLoadOrders);
          setOrders([]);
        }
      } catch (err) {
        console.error('Authentication failed:', err);
        setAuthError(t.authErrLogin);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [navigate]);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    setIsEditModalOpen(false);
    setEditError(null);
  };

  const handleOpenEditModal = () => {
    if (!selectedOrder) return;

    setEditFormValues({
      firstname: selectedOrder.customer_first_name ?? '',
      lastname: selectedOrder.customer_last_name ?? '',
      streetAddress: selectedOrder.shipping_address?.street ?? '',
      postCode: selectedOrder.shipping_address?.postal_code ?? '',
      city: selectedOrder.shipping_address?.city ?? '',
      state: selectedOrder.shipping_address?.state ?? '',
      country: selectedOrder.shipping_address?.country ?? '',
      email: selectedOrder.customer_email ?? '',
      phone: selectedOrder.customer_phone ?? '',
      notes: selectedOrder.notes ?? '',
      status: selectedOrder.status ?? 'pending',
      lang: language as string,
    });
    setEditItems(
      Array.isArray(selectedOrder.items)
        ? selectedOrder.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          tax_code: (item.tax_code as string | null | undefined) ?? '',
          tax_rate: item.tax_rate != null ? String(item.tax_rate) : '',
          product_title: item.product_title,
          featured_image: item.featured_image,
        }))
        : []
    );
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditError(null);
  };

  const handleEditFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setEditFormValues((current) => ({ ...current, [name]: value }));
  };

  const handleEditOrderSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedOrder?.id) {
      setEditError(t.errMissingOrderId);
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setEditError(t.errAuthRequired);
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      const addressPayload = {
        street: editFormValues.streetAddress.trim(),
        city: editFormValues.city.trim(),
        state: editFormValues.state.trim(),
        postal_code: editFormValues.postCode.trim(),
        country: editFormValues.country.trim(),
      };

      const updatedOrder = await updateOrder(
        selectedOrder.id,
        {
          customer_first_name: editFormValues.firstname.trim(),
          customer_last_name: editFormValues.lastname.trim(),
          customer_email: editFormValues.email.trim(),
          customer_phone: editFormValues.phone.trim(),
          lang: editFormValues.lang,
          shipping_address: addressPayload,
          billing_address: addressPayload,
          status: editFormValues.status,
          notes: editFormValues.notes.trim() || undefined,
          items: Array.isArray(selectedOrder.items)
            ? editItems.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              tax_code: item.tax_code.trim() || null,
              tax_rate: item.tax_rate.trim() ? parseFloat(item.tax_rate) : null,
            }))
            : undefined,
        },
        token
      );

      const mergedOrder: Order = {
        ...selectedOrder,
        ...updatedOrder,
        items: Array.isArray(updatedOrder.items) ? updatedOrder.items : selectedOrder.items,
      };

      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === selectedOrder.id ? mergedOrder : order))
      );
      setSelectedOrder(mergedOrder);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update order:', error);
      setEditError(t.errUpdateFailed);
    } finally {
      setEditSubmitting(false);
    }
  };

  const getStatusLabel = (status: string | null | undefined) => {
    if (!status) return 'N/A';
    return orderStatusOptions.find((o) => o.value === status)?.label ?? status;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AdminHeader
        title={t.title}
        backTo="/admin"
        backLabel={translations[language].adminDashboard.title}
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
                onClick={() => navigate('/demo/ecommerce/products')}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {t.goToProducts}
              </button>
            )}
          </div>
        )}

        {loading && !authError && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-300">{t.loading}</p>
          </div>
        )}

        {ordersError && !authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-center">
            <p className="text-red-300">{ordersError}</p>
          </div>
        )}

        {!loading && !authError && !ordersError && orders.length === 0 && (
          <div className="text-center py-10 text-gray-400">{t.empty}</div>
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
                    <span className="text-gray-500">{t.orderPrefix}</span>
                    <span className="font-semibold ml-1">{order.id ?? 'N/A'}</span>
                  </div>
                  <div className="text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'completed' ? 'bg-green-900/40 text-green-400 border border-green-500/30' :
                      order.status === 'pending' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' :
                        order.status === 'cancelled' ? 'bg-red-900/40 text-red-400 border border-red-500/30' :
                          'bg-gray-700 text-gray-300 border border-gray-600'
                      }`}>
                      {getStatusLabel(order.status)}
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
                            {t.qty} {item.quantity} × {' '}
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
                        +{order.items.length - 3} {order.items.length - 3 !== 1 ? t.moreItems : t.moreItem}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-gray-800 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{t.modalTitle} #{selectedOrder.id}</h2>
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

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-500">{t.labelStatus}</span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${selectedOrder.status === 'completed' ? 'bg-green-900/40 text-green-400 border border-green-500/30' :
                      selectedOrder.status === 'pending' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' :
                        selectedOrder.status === 'cancelled' ? 'bg-red-900/40 text-red-400 border border-red-500/30' :
                          'bg-gray-700 text-gray-300 border border-gray-600'
                      }`}>
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-500">{t.labelCreated}</span>
                    <span className="ml-2">{formatDate(selectedOrder.created_at)}</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-500">{t.labelTotal}</span>
                    <span className="ml-2 font-bold text-green-400 text-lg">{formatPrice(calculateOrderTotal(selectedOrder))}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedOrder.customer_first_name && (
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-500">{t.labelCustomer}</span>
                      <span className="ml-2">{selectedOrder.customer_first_name} {selectedOrder.customer_last_name}</span>
                    </div>
                  )}
                  {selectedOrder.customer_email && (
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-500">{t.labelEmail}</span>
                      <span className="ml-2">{selectedOrder.customer_email}</span>
                    </div>
                  )}
                  {selectedOrder.customer_phone && (
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-500">{t.labelPhone}</span>
                      <span className="ml-2">{selectedOrder.customer_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.shipping_address && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">{t.shippingAddress}</h3>
                  <div className="text-sm text-gray-300">
                    <p>{selectedOrder.shipping_address.street}</p>
                    <p>{selectedOrder.shipping_address.postal_code} {selectedOrder.shipping_address.city}</p>
                    <p>{selectedOrder.shipping_address.state}, {selectedOrder.shipping_address.country}</p>
                  </div>
                </div>
              )}

              {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4">{t.orderItems}</h3>
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
                            {t.labelProductId} {item.product_id}
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
                          {item.tax_code && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.tax_code}{item.tax_rate != null ? ` (${formatTaxPct(typeof item.tax_rate === 'string' ? parseFloat(item.tax_rate) : Number(item.tax_rate))})` : ''}
                            </p>
                          )}
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

              {selectedOrder.notes && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">{t.orderNotes}</h3>
                  <p className="text-sm text-gray-300">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Tax breakdown */}
              {(() => {
                const breakdown = calcOrderTaxBreakdown(selectedOrder.items ?? []);
                if (!breakdown.length) return null;
                const itemsTotal = calculateOrderTotal(selectedOrder);
                const taxTotal = breakdown.reduce((s, g) => s + g.amount, 0);
                return (
                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">{t.invoiceSummary}</h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>{t.subtotalExclVat}</span>
                        <span>{formatPrice(itemsTotal - taxTotal)}</span>
                      </div>
                      {breakdown.map(g => (
                        <div key={`${g.code}-${g.rate}`} className="flex justify-between text-gray-400">
                          <span>{g.code ?? 'VAT'} ({formatTaxPct(g.rate)})</span>
                          <span>{formatPrice(g.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold text-green-400 border-t border-gray-700 pt-1.5">
                        <span>{t.totalInclVat}</span>
                        <span>{formatPrice(itemsTotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4 flex items-center justify-between">
              <button
                onClick={handleOpenEditModal}
                className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {t.btnEditOrder}
              </button>
              <button
                onClick={handleCloseModal}
                className="rounded-lg bg-gray-700 px-6 py-2 font-semibold text-white hover:bg-gray-600 transition-colors"
              >
                {t.btnClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && isEditModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-60 p-4"
          onClick={handleCloseEditModal}
        >
          <div
            className="bg-gray-800 rounded-lg border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">{t.editModalTitle} #{selectedOrder.id}</h3>
              <button
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close edit modal"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditOrderSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/80">{t.labelFirstname}</label>
                  <input
                    name="firstname"
                    required
                    value={editFormValues.firstname}
                    onChange={handleEditFormChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">{t.labelLastname}</label>
                  <input
                    name="lastname"
                    required
                    value={editFormValues.lastname}
                    onChange={handleEditFormChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">{t.labelStreetAddress}</label>
                <input
                  name="streetAddress"
                  required
                  value={editFormValues.streetAddress}
                  onChange={handleEditFormChange}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/80">{t.labelPostCode}</label>
                  <input
                    name="postCode"
                    required
                    value={editFormValues.postCode}
                    onChange={handleEditFormChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">{t.labelState}</label>
                  <input
                    name="state"
                    required
                    value={editFormValues.state}
                    onChange={handleEditFormChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/80">{t.labelCity}</label>
                  <input
                    name="city"
                    required
                    value={editFormValues.city}
                    onChange={handleEditFormChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">{t.labelCountry}</label>
                  <CountrySelect
                    name="country"
                    required
                    value={editFormValues.country}
                    onChange={handleEditFormChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/80">{t.labelEmail}</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={editFormValues.email}
                    onChange={handleEditFormChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">{t.labelPhone}</label>
                  <input
                    name="phone"
                    required
                    value={editFormValues.phone}
                    onChange={handleEditFormChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">{t.labelOrderStatus}</label>
                <select
                  name="status"
                  required
                  value={editFormValues.status}
                  onChange={handleEditFormChange}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {orderStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">{t.labelOrderLang}</label>
                <select
                  name="lang"
                  value={editFormValues.lang}
                  onChange={handleEditFormChange}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">{translations.en.languages.en}</option>
                  <option value="fi">{translations.en.languages.fi}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">{t.labelNotes}</label>
                <textarea
                  name="notes"
                  rows={4}
                  value={editFormValues.notes}
                  onChange={handleEditFormChange}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editItems.length > 0 && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-base font-semibold text-white mb-3">{t.lineTaxTitle}</h3>
                  <div className="space-y-3">
                    {editItems.map((item, idx) => (
                      <div key={item.product_id} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-3 py-2">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded border border-white/10 bg-gray-900">
                          <img
                            src={buildStorageUrl(item.featured_image)}
                            alt={item.product_title}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-sm text-white/80 truncate">
                          {item.product_title ?? `Product #${item.product_id}`}
                          <span className="text-gray-500 ml-2">×{item.quantity}</span>
                        </div>
                        <input
                          type="text"
                          value={item.tax_code}
                          onChange={(e) =>
                            setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, tax_code: e.target.value } : it))
                          }
                          placeholder={t.vatCodePlaceholder}
                          className="w-28 rounded border border-white/10 bg-gray-900 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={item.tax_rate}
                          onChange={(e) =>
                            setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, tax_rate: e.target.value } : it))
                          }
                          placeholder="0.24"
                          className="w-20 rounded border border-white/10 bg-gray-900 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">{t.taxRateHint}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="rounded-lg bg-gray-700 px-6 py-2 font-semibold text-white hover:bg-gray-600 transition-colors"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {editSubmitting ? t.btnSaving : t.btnSaveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOrdersView;
