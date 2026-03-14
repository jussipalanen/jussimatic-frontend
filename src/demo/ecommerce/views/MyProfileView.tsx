import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, type User } from '../../../api/authApi';
import { getRoleAccess } from '../../../utils/authUtils';
import { getCart } from '../../../utils/cartUtils';
import EcommerceHeader from '../components/EcommerceHeader';
import UserEditModal from '../components/UserEditModal';
import { getStoredLanguage, translations, DEFAULT_LANGUAGE, type Language } from '../../../i18n';

function MyProfileView() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).myProfile;
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError(t.authErrLogin);
        setLoading(false);
        return;
      }

      const user = await getMe();
      if (!user) {
        setError(t.errLoadUser);
        setLoading(false);
        return;
      }

      const access = getRoleAccess(user);
      setIsAdmin(access.isAdmin);
      setUserData(user);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(t.errLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(getStoredLanguage());
    window.addEventListener('jussimatic-language-change', handleLanguageChange);
    return () => window.removeEventListener('jussimatic-language-change', handleLanguageChange);
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  const cartCount = getCart().reduce((sum, item) => sum + item.quantity, 0);

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setShowEditModal(false);
  };

  const handleModalSuccess = () => {
    // Reload profile data after successful update
    loadProfile();
  };

  // Extract user details safely - handle nested user object from /me endpoint
  const getUser = () => {
    if (!userData) return null;
    // API returns { user_id: 4, user: { id, username, name, ... } }
    return userData.user || userData;
  };

  const getUserField = (field: string) => {
    const user = getUser();
    if (!user) return 'N/A';
    return user[field] || 'N/A';
  };

  const getUserRole = () => {
    const user = getUser();
    if (!user) return 'N/A';
    const tUsers = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminUsers;
    const roleLabels: Record<string, string> = {
      admin: tUsers.roleAdmin, administrator: tUsers.roleAdmin,
      vendor: tUsers.roleVendor,
      customer: tUsers.roleCustomer,
    };
    const normalizeRole = (role: string) => roleLabels[role.trim().toLowerCase()] ?? role;

    // Try different role fields
    const role = user.role || user.user_role || user.type;
    if (role) {
      return normalizeRole(role);
    }

    if (user.is_admin) {
      return tUsers.roleAdmin;
    }

    // Check roles array
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      return user.roles.map((r: string) => normalizeRole(r)).join(', ');
    }

    return tUsers.roleCustomer;
  };

  const getModalInitialData = () => {
    const user = getUser();
    if (!user) {
      return {
        username: '',
        fullname: '',
        first_name: '',
        last_name: '',
        email: '',
        role: 'customer',
      };
    }

    // Extract role - check multiple possible sources
    let userRole = 'customer';
    if (user.role) {
      userRole = user.role;
    } else if (user.user_role) {
      userRole = user.user_role;
    } else if (user.type) {
      userRole = user.type;
    } else if (Array.isArray(user.roles) && user.roles.length > 0) {
      userRole = user.roles[0];
    } else if (user.is_admin) {
      userRole = 'admin';
    }

    return {
      username: user.username || user.name || '',
      fullname: user.name || user.fullname || '',
      first_name: user.first_name || user.firstname || '',
      last_name: user.last_name || user.lastname || '',
      email: user.email || '',
      role: userRole.toLowerCase(),
    };
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <EcommerceHeader
        title={t.title}
        backTo="/demo/ecommerce/products"
        backLabel={translations[language].ecommerce.browseProducts}
        cartCount={cartCount}
        activeNav="my-profile"
      />

      <main className="container mx-auto px-4 py-8">
        {error && (
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
            <p className="text-lg text-yellow-300 mb-4">{error}</p>
            <button
              onClick={() => navigate('/demo/ecommerce/products')}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              {t.goToProducts}
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-300">{t.loading}</p>
          </div>
        )}

        {!loading && !error && userData && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">{t.headingDetails}</h2>
                <button
                  onClick={handleEditClick}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  {t.btnEdit}
                </button>
              </div>

              <div className="space-y-4">
                <div className="border-b border-gray-700 pb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t.labelUsername}</label>
                  <p className="text-lg text-white">{getUserField('username')}</p>
                </div>

                <div className="border-b border-gray-700 pb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t.labelFullName}</label>
                  <p className="text-lg text-white">{getUserField('name') !== 'N/A' ? getUserField('name') : getUserField('fullname')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-700 pb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">{t.labelFirstName}</label>
                    <p className="text-lg text-white">{getUserField('first_name') !== 'N/A' ? getUserField('first_name') : getUserField('firstname')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">{t.labelLastName}</label>
                    <p className="text-lg text-white">{getUserField('last_name') !== 'N/A' ? getUserField('last_name') : getUserField('lastname')}</p>
                  </div>
                </div>

                <div className="border-b border-gray-700 pb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t.labelEmail}</label>
                  <p className="text-lg text-white">{getUserField('email')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t.labelRole}</label>
                  <p className="text-lg text-white">
                    <span className="inline-flex items-center rounded-full bg-blue-600/20 px-3 py-1 text-sm font-medium text-blue-300">
                      {getUserRole()}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-gray-400">
              <p>{t.hint}</p>
            </div>
          </div>
        )}
      </main>

      {showEditModal && userData && (
        <UserEditModal
          isOpen={showEditModal}
          onClose={handleModalClose}
          userId={userData.user_id || userData.user?.id || userData.id}
          initialData={getModalInitialData()}
          onSuccess={handleModalSuccess}
          showRoleSelect={isAdmin}
        />
      )}
    </div>
  );
}

export default MyProfileView;
