import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteUser, fetchAllUsers } from '../../../api/usersApi';
import type { UserSummary } from '../../../api/usersApi';
import { getCart } from '../../../utils/cartUtils';
import EcommerceHeader from '../components/EcommerceHeader';
import { getMe } from '../../../api/authApi';
import { getRoleAccess, PERMISSION_MESSAGE } from '../../../utils/authUtils';
import UserEditModal from '../components/UserEditModal';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  vendor: 'Vendor',
  customer: 'Customer',
};

function normalizeRoleLabel(role: string) {
  const key = role.trim().toLowerCase();
  return ROLE_LABELS[key] ?? role;
}

function getUserNameValue(user: UserSummary, key: 'first' | 'last') {
  if (key === 'first') {
    return user.first_name ?? user.firstname ?? '';
  }
  return user.last_name ?? user.lastname ?? '';
}

function getUserFullNameValue(user: UserSummary) {
  const explicit = user.fullname ?? user.name;
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit;
  }

  const firstName = getUserNameValue(user, 'first').trim();
  const lastName = getUserNameValue(user, 'last').trim();
  return `${firstName} ${lastName}`.trim();
}

function getUserRoles(user: UserSummary): string[] {
  if (Array.isArray(user.roles)) {
    return user.roles.filter((role) => typeof role === 'string');
  }

  const candidate = user.role ?? user.user_role ?? user.type;
  if (typeof candidate === 'string' && candidate.trim()) {
    return [candidate];
  }

  return [];
}

function AdminUsersView() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUserData, setEditingUserData] = useState<{
    username: string;
    fullname: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      setAuthError(null);

      try {
        const me = await getMe();
        const access = getRoleAccess(me);

        setCurrentUserId(me?.user_id ?? null);
        setCurrentUserRole(access.isAdmin ? 'admin' : access.isVendor ? 'vendor' : 'customer');

        if (!access.isAdmin && !access.isVendor) {
          setAuthError(PERMISSION_MESSAGE);
          setLoading(false);
          return;
        }

        try {
          const data = await fetchAllUsers();
          setUsers(data);
        } catch (fetchError) {
          console.error('Failed to load users:', fetchError);
          setError('Failed to load users. Please try again.');
        }
      } catch (err) {
        console.error('Authentication failed:', err);
        setAuthError('Authentication required. Please log in to view the user list.');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const cartCount = getCart().reduce((sum, item) => sum + item.quantity, 0);
  const canManageUsers = currentUserRole === 'admin' || currentUserRole === 'administrator';

  const rows = useMemo(() => {
    return users.map((user) => {
      const firstName = getUserNameValue(user, 'first') || 'N/A';
      const lastName = getUserNameValue(user, 'last') || 'N/A';
      const fullName = getUserFullNameValue(user) || 'N/A';
      const email = user.email ?? 'N/A';
      const username = user.username ?? 'N/A';
      const roles = getUserRoles(user);
      const roleLabel = roles.map(normalizeRoleLabel).join(', ') || 'N/A';
      const role = roles.length > 0 ? roles[0].toLowerCase() : '';
      const numericId = user.id ?? user.user_id;
      return {
        id: user.id ?? user.user_id ?? `${firstName}-${lastName}-${email}`,
        numericId: typeof numericId === 'number' ? numericId : null,
        username,
        fullName,
        firstName,
        lastName,
        email,
        role,
        roleLabel,
      };
    });
  }, [users]);

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUserId(null);
    setEditingUserData(null);
  };

  const handleEditClick = (row: {
    numericId: number | null;
    username: string;
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }) => {
    if (!canManageUsers) return;
    if (row.numericId === null) return;

    setEditingUserId(row.numericId);
    setEditingUserData({
      username: row.username === 'N/A' ? '' : row.username,
      fullname: row.fullName === 'N/A' ? '' : row.fullName,
      first_name: row.firstName === 'N/A' ? '' : row.firstName,
      last_name: row.lastName === 'N/A' ? '' : row.lastName,
      email: row.email === 'N/A' ? '' : row.email,
      role: row.role || 'customer',
    });
    setShowEditModal(true);
  };

  const handleModalSuccess = async () => {
    // Reload the users list after successful update
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to reload users:', err);
    }
  };

  const handleDeleteClick = (row: { numericId: number | null; firstName: string; lastName: string }) => {
    if (!canManageUsers) return;
    if (row.numericId === null || row.numericId === currentUserId) return;
    const name = `${row.firstName} ${row.lastName}`.trim();
    setUserToDelete({ id: row.numericId, name: name || 'this user' });
    setShowDeleteConfirm(true);
  };

  const handleDeleteCancel = () => {
    if (deleting) return;
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete || deleting) return;
    if (userToDelete.id === currentUserId) {
      setError('You cannot delete your own account.');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((user) => (user.id ?? user.user_id) !== userToDelete.id));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Failed to delete user. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <EcommerceHeader
        title="Admin Users"
        backTo="/demo/ecommerce/admin"
        backLabel="Back to admin dashboard"
        cartCount={cartCount}
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
                Go to Products
              </button>
            )}
          </div>
        )}

        {loading && !authError && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-300">Loading users...</p>
          </div>
        )}

        {error && !loading && !authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-center">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && !authError && rows.length === 0 && (
          <div className="text-center py-10 text-gray-400">No users found.</div>
        )}

        {!loading && !error && !authError && rows.length > 0 && (
          <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
            <table className="w-full text-left">
              <thead className="bg-gray-850 border-b border-gray-700">
                <tr className="text-xs uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">First name</th>
                  <th className="px-6 py-3">Last name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono text-sm">{row.numericId ?? 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-200">{row.username}</td>
                    <td className="px-6 py-4 text-gray-200">{row.firstName}</td>
                    <td className="px-6 py-4 text-gray-200">{row.lastName}</td>
                    <td className="px-6 py-4 text-gray-300">{row.email}</td>
                    <td className="px-6 py-4 text-gray-300">{row.roleLabel}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(row)}
                          disabled={row.numericId === null || !canManageUsers}
                          className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-gray-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            !canManageUsers
                              ? 'You do not have permission to edit users'
                              : row.numericId === null
                                ? 'User id is missing'
                                : 'Edit user'
                          }
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(row)}
                          disabled={row.numericId === null || row.numericId === currentUserId || !canManageUsers}
                          className="rounded-lg border border-red-500/60 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            !canManageUsers
                              ? 'You do not have permission to delete users'
                              : row.numericId === currentUserId
                                ? 'You cannot delete your own account'
                                : undefined
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div
              className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg"
              role="dialog"
              aria-modal="true"
            >
              <h2 className="text-xl font-semibold text-white">Delete user</h2>
              <p className="mt-3 text-sm text-gray-300">
                Are you sure you want to delete {userToDelete.name}? This action cannot be undone.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && editingUserId && editingUserData && (
          <UserEditModal
            isOpen={showEditModal}
            onClose={closeEditModal}
            userId={editingUserId}
            initialData={editingUserData}
            onSuccess={handleModalSuccess}
            showRoleSelect={currentUserRole === 'admin' || currentUserRole === 'administrator'}
          />
        )}
      </main>
    </div>
  );
}

export default AdminUsersView;
