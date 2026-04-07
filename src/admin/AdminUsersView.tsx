import { useEffect, useMemo, useState } from 'react';
import { useLocaleNavigate } from '../hooks/useLocaleNavigate';
import { deleteUser, fetchAllUsers } from '../api/usersApi';
import type { UserSummary } from '../api/usersApi';
import Header from '../components/Header';
import AuthModal from '../modals/AuthModal';
import Breadcrumb from '../components/Breadcrumb';
import { getMe } from '../api/authApi';
import { getRoleAccess } from '../utils/authUtils';
import UserEditModal from '../modals/UserEditModal';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

function normalizeRoleLabel(role: string, labels: Record<string, string>) {
  const key = role.trim().toLowerCase();
  return labels[key] ?? role;
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
  const navigate = useLocaleNavigate();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminUsers;

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);


      try {
        const me = await getMe();
        const access = getRoleAccess(me);

        setCurrentUserId(me?.user_id ?? null);
        setCurrentUserRole(access.isAdmin ? 'admin' : access.isVendor ? 'vendor' : 'customer');

        if (!access.isAdmin) {
          navigate('/', { state: { adminAccessDenied: true } });
          return;
        }

        try {
          const data = await fetchAllUsers();
          setUsers(data);
        } catch (fetchError) {
          console.error('Failed to load users:', fetchError);
          setError(t.errLoadUsers);
        }
      } catch (err) {
        console.error('Authentication failed:', err);
        navigate('/', { state: { adminAccessDenied: true } });
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canManageUsers = currentUserRole === 'admin' || currentUserRole === 'administrator';

  const rows = useMemo(() => {
    const roleLabels: Record<string, string> = {
      admin: t.roleAdmin,
      vendor: t.roleVendor,
      customer: t.roleCustomer,
    };
    return users.map((user) => {
      const firstName = getUserNameValue(user, 'first') || 'N/A';
      const lastName = getUserNameValue(user, 'last') || 'N/A';
      const fullName = getUserFullNameValue(user) || 'N/A';
      const email = user.email ?? 'N/A';
      const username = user.username ?? 'N/A';
      const roles = getUserRoles(user);
      const roleLabel = roles.map((r) => normalizeRoleLabel(r, roleLabels)).join(', ') || 'N/A';
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
  }, [users, t]);

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
    setUserToDelete({ id: row.numericId, name: name || t.errDelSelf });
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
      setError(t.errDelSelf);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteUser(userToDelete.id, language);
      setUsers((prev) => prev.filter((user) => (user.id ?? user.user_id) !== userToDelete.id));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(t.errDelFailed);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header onLoginClick={() => setIsModalOpen(true)} />

      <main className="container mx-auto px-4 pt-24 md:pt-32 pb-8">
        <div className="mx-auto max-w-4xl mb-8">
          <Breadcrumb
            items={[{ label: translations[language].adminDashboard.title, onClick: () => navigate('/admin') }]}
            current={t.title}
          />
        </div>
        {loading && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-300">{t.loading}</p>
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-center">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-10 text-gray-400">{t.empty}</div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="mx-auto max-w-4xl flex flex-col gap-3">
            {rows.map((row) => {
              const initials = [row.firstName, row.lastName]
                .filter((s) => s && s !== 'N/A')
                .map((s) => s[0].toUpperCase())
                .join('') || '?';
              const roleColor =
                row.role === 'admin' || row.role === 'administrator'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : row.role === 'vendor'
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/40';
              const isSelf = row.numericId === currentUserId;

              return (
                <div
                  key={row.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 px-5 py-4 hover:border-gray-600 transition-colors"
                >
                  {/* Avatar */}
                  <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white select-none">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white truncate">{row.fullName !== 'N/A' ? row.fullName : row.username}</span>
                      {isSelf && (
                        <span className="text-xs rounded-full bg-green-600/20 text-green-400 border border-green-500/30 px-2 py-0.5">{t.labelYou ?? 'You'}</span>
                      )}
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${roleColor}`}>{row.roleLabel}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-400">
                      {row.username !== 'N/A' && <span>@{row.username}</span>}
                      {row.email !== 'N/A' && <span className="truncate">{row.email}</span>}
                      {row.numericId !== null && <span className="font-mono text-xs text-gray-500">#{row.numericId}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  {canManageUsers && (
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditClick(row)}
                        disabled={row.numericId === null}
                        className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-gray-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={row.numericId === null ? t.titleMissingId : t.titleEditUser}
                      >
                        {t.btnEdit}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(row)}
                        disabled={row.numericId === null || isSelf}
                        className="rounded-lg border border-red-500/60 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={isSelf ? t.titleDelSelf : undefined}
                      >
                        {t.btnDelete}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div
              className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg"
              role="dialog"
              aria-modal="true"
            >
              <h2 className="text-xl font-semibold text-white">{t.deleteTitle}</h2>
              <p className="mt-3 text-sm text-gray-300">
                {t.deleteConfirm.replace('{name}', userToDelete.name)}
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
                  disabled={deleting}
                >
                  {t.btnCancel}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  disabled={deleting}
                >
                  {deleting ? t.btnDeleting : t.btnConfirmDelete}
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
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialTab="login" />
    </div>
  );
}

export default AdminUsersView;
