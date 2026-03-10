import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../../../api/ordersApi';
import { getMe } from '../../../api/authApi';
import { clearCart, getCart } from '../../../utils/cartUtils';
import type { CartItem } from '../../../utils/cartUtils';
import EcommerceHeader from '../components/EcommerceHeader';

const STORAGE_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL || '';
const PLACEHOLDER_IMAGE_URL = 'https://placehold.net/default.png';

function CheckoutView() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>(getCart());
  const [formValues, setFormValues] = useState({
    firstname: '',
    lastname: '',
    billingStreet: '',
    billingPostCode: '',
    billingCity: '',
    billingState: '',
    billingCountry: '',
    shippingStreet: '',
    shippingPostCode: '',
    shippingCity: '',
    shippingState: '',
    shippingCountry: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [useBillingForShipping, setUseBillingForShipping] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
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

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price);
      return total + price * item.quantity;
    }, 0);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormValues((current) => {
      const next = { ...current, [name]: value };
      if (useBillingForShipping) {
        if (name === 'billingStreet') next.shippingStreet = value;
        if (name === 'billingPostCode') next.shippingPostCode = value;
        if (name === 'billingCity') next.shippingCity = value;
        if (name === 'billingState') next.shippingState = value;
        if (name === 'billingCountry') next.shippingCountry = value;
      }
      return next;
    });
  };

  const handleToggleUseBilling = (checked: boolean) => {
    setUseBillingForShipping(checked);
    if (checked) {
      setFormValues((current) => ({
        ...current,
        shippingStreet: current.billingStreet,
        shippingPostCode: current.billingPostCode,
        shippingCity: current.billingCity,
        shippingState: current.billingState,
        shippingCountry: current.billingCountry,
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (cartItems.length === 0) {
      setSubmitError('Cart is empty.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Try to fetch authenticated user's ID
      let userId: number | undefined;
      try {
        const user = await getMe();
        userId = user.user_id;
      } catch (error) {
        // If getMe fails (no token, invalid token, etc.), proceed as guest
        console.log('Proceeding with guest checkout:', error);
      }

      const billingAddress = {
        street: formValues.billingStreet.trim(),
        city: formValues.billingCity.trim(),
        state: formValues.billingState.trim(),
        postal_code: formValues.billingPostCode.trim(),
        country: formValues.billingCountry.trim(),
      };

      const shippingAddress = useBillingForShipping
        ? billingAddress
        : {
            street: formValues.shippingStreet.trim(),
            city: formValues.shippingCity.trim(),
            state: formValues.shippingState.trim(),
            postal_code: formValues.shippingPostCode.trim(),
            country: formValues.shippingCountry.trim(),
          };

      await createOrder({
        ...(userId !== undefined && { user_id: userId }),
        customer_first_name: formValues.firstname.trim(),
        customer_last_name: formValues.lastname.trim(),
        customer_email: formValues.email.trim(),
        customer_phone: formValues.phone.trim(),
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        items: cartItems.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
        notes: formValues.notes.trim() || undefined,
      });

      clearCart();
      setCartItems([]);
      alert('Order submitted successfully!');
      navigate('/demo/ecommerce/products');
    } catch (error) {
      console.error('Failed to submit order:', error);
      setSubmitError('Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <EcommerceHeader
        title="Checkout"
        backTo="/demo/ecommerce/cart"
        backLabel="Back to cart"
        cartCount={cartCount}
      />

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
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h2 className="text-lg font-semibold">Order Summary</h2>
                </div>
                <div className="divide-y divide-gray-700">
                  {cartItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-4 px-6 py-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gray-900/40">
                        <img
                          src={buildStorageUrl(item.featuredImage)}
                          alt={item.title}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{item.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {formatPrice(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <div className="text-right font-semibold text-green-400">
                        {formatPrice((parseFloat(item.price) * item.quantity).toFixed(2))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                  <span className="text-lg font-semibold">Subtotal</span>
                  <span className="text-2xl font-bold text-green-400">
                    {formatPrice(calculateTotal().toFixed(2))}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold">Customer Details</h2>
                {submitError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                    {submitError}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-white/80">Firstname</label>
                    <input
                      name="firstname"
                      required
                      value={formValues.firstname}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80">Lastname</label>
                    <input
                      name="lastname"
                      required
                      value={formValues.lastname}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <h3 className="text-base font-semibold text-white">Billing Address</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">Street address</label>
                  <input
                    name="billingStreet"
                    required
                    value={formValues.billingStreet}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-white/80">Post code</label>
                    <input
                      name="billingPostCode"
                      required
                      value={formValues.billingPostCode}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80">State</label>
                    <input
                      name="billingState"
                      required
                      value={formValues.billingState}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-white/80">City</label>
                    <input
                      name="billingCity"
                      required
                      value={formValues.billingCity}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80">Country</label>
                    <input
                      name="billingCountry"
                      required
                      value={formValues.billingCountry}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="useBillingForShipping"
                    type="checkbox"
                    checked={useBillingForShipping}
                    onChange={(event) => handleToggleUseBilling(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-gray-900 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="useBillingForShipping" className="text-sm text-white/80">
                    Use the same information for shipping
                  </label>
                </div>
                <div className="pt-2">
                  <h3 className="text-base font-semibold text-white">Shipping Address</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">Street address</label>
                  <input
                    name="shippingStreet"
                    required={!useBillingForShipping}
                    disabled={useBillingForShipping}
                    value={formValues.shippingStreet}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-white/80">Post code</label>
                    <input
                      name="shippingPostCode"
                      required={!useBillingForShipping}
                      disabled={useBillingForShipping}
                      value={formValues.shippingPostCode}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80">State</label>
                    <input
                      name="shippingState"
                      required={!useBillingForShipping}
                      disabled={useBillingForShipping}
                      value={formValues.shippingState}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-white/80">City</label>
                    <input
                      name="shippingCity"
                      required={!useBillingForShipping}
                      disabled={useBillingForShipping}
                      value={formValues.shippingCity}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80">Country</label>
                    <input
                      name="shippingCountry"
                      required={!useBillingForShipping}
                      disabled={useBillingForShipping}
                      value={formValues.shippingCountry}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-white/80">Email</label>
                    <input
                      name="email"
                      type="email"
                      required
                      value={formValues.email}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80">Phone</label>
                    <input
                      name="phone"
                      required
                      value={formValues.phone}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">Additional information for order</label>
                  <textarea
                    name="notes"
                    rows={4}
                    value={formValues.notes}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Order'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default CheckoutView;
