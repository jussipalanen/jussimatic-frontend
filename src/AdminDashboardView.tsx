import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe } from './api/authApi';
import { getRoleAccess, PERMISSION_MESSAGE } from './utils/authUtils';
import { getCart } from './utils/cartUtils';
import EcommerceHeader from './EcommerceHeader';

function AdminDashboardView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const loadAuth = async () => {
      setLoading(true);
      setAuthError(null);

      try {
        const token = localStorage.getItem('auth_token');

        if (!token) {
          setAuthError('Authentication required. Please log in to view the admin dashboard.');
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
      } catch (error) {
        console.error('Authentication failed:', error);
        setAuthError('Authentication required. Please log in to view the admin dashboard.');
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, [navigate]);

  const cartCount = getCart().reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <EcommerceHeader
        title="Admin Dashboard"
        backTo="/demo/ecommerce/products"
        backLabel="Back to products"
        cartCount={cartCount}
        activeNav="admin-dashboard"
      />

      <main className="container mx-auto px-4 py-10">
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
                Go to Products
              </button>
            )}
          </div>
        )}

        {loading && !authError && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-300">Loading admin dashboard...</p>
          </div>
        )}

        {!loading && !authError && (
          <div className="mx-auto max-w-4xl rounded-2xl border border-gray-700 bg-gray-800 p-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold">Admin dashboard</h2>
              <p className="text-gray-300">Manage the orders users etc.</p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-5">
                <h3 className="text-lg font-semibold text-white">Orders</h3>
                <p className="text-sm text-gray-400 mt-2">Review, update, and fulfill customer orders.</p>
                <button
                  onClick={() => navigate('/demo/ecommerce/admin/orders')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Go to Orders
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-5">
                <h3 className="text-lg font-semibold text-white">Users</h3>
                <p className="text-sm text-gray-400 mt-2">View and manage registered users.</p>
                <button
                  onClick={() => navigate('/demo/ecommerce/admin/users')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Go to Users
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboardView;
