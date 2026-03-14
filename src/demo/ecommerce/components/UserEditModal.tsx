import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { deleteUser, updateUser } from '../../../api/usersApi';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../../../i18n';
import type { Language } from '../../../i18n';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength validation
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 30;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_NUMBER_REGEX = /[0-9]/;
const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/;'`~]/;

type PasswordT = Pick<
  (typeof translations)[typeof DEFAULT_LANGUAGE]['userEdit'],
  | 'errPasswordMinLength'
  | 'errPasswordMaxLength'
  | 'errPasswordLowercase'
  | 'errPasswordUppercase'
  | 'errPasswordNumber'
  | 'errPasswordSpecial'
>;

// Helper to work around TS type inference on indexed translation
function getUserEditT(lang: Language) {
  return (translations[lang] ?? translations[DEFAULT_LANGUAGE]).userEdit;
}

function validatePasswordStrength(password: string, t: PasswordT): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return t.errPasswordMinLength.replace('{min}', String(PASSWORD_MIN_LENGTH));
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return t.errPasswordMaxLength.replace('{max}', String(PASSWORD_MAX_LENGTH));
  }
  if (!PASSWORD_LOWERCASE_REGEX.test(password)) {
    return t.errPasswordLowercase;
  }
  if (!PASSWORD_UPPERCASE_REGEX.test(password)) {
    return t.errPasswordUppercase;
  }
  if (!PASSWORD_NUMBER_REGEX.test(password)) {
    return t.errPasswordNumber;
  }
  if (!PASSWORD_SPECIAL_CHAR_REGEX.test(password)) {
    return t.errPasswordSpecial;
  }
  return null;
}

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  initialData: {
    username: string;
    fullname: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  onSuccess: () => void;
  showRoleSelect: boolean;
}

function UserEditModal({
  isOpen,
  onClose,
  userId,
  initialData,
  onSuccess,
  showRoleSelect,
}: UserEditModalProps) {
  const [editMode, setEditMode] = useState<'profile' | 'password'>('profile');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  const t = getUserEditT(language);

  const [profileForm, setProfileForm] = useState({
    username: initialData.username,
    fullname: initialData.fullname,
    first_name: initialData.first_name,
    last_name: initialData.last_name,
    email: initialData.email,
    role: initialData.role,
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const profileErrors = useMemo(() => {
    const errors: {
      fullname?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
    } = {};

    if (!profileForm.fullname.trim()) {
      errors.fullname = t.errFullnameRequired;
    }
    if (!profileForm.first_name.trim()) {
      errors.first_name = t.errFirstNameRequired;
    }
    if (!profileForm.last_name.trim()) {
      errors.last_name = t.errLastNameRequired;
    }
    if (!profileForm.email.trim()) {
      errors.email = t.errEmailRequired;
    } else if (!EMAIL_REGEX.test(profileForm.email.trim())) {
      errors.email = t.errEmailFormat;
    }

    return errors;
  }, [profileForm, t]);

  const passwordErrors = useMemo(() => {
    const errors: {
      current_password?: string;
      password?: string;
      password_confirmation?: string;
    } = {};

    if (!passwordForm.current_password.trim()) {
      errors.current_password = t.errCurrentPasswordRequired;
    }

    if (!passwordForm.password.trim()) {
      errors.password = t.errNewPasswordRequired;
    } else {
      const strengthError = validatePasswordStrength(passwordForm.password, t);
      if (strengthError) {
        errors.password = strengthError;
      }
    }

    if (!passwordForm.password_confirmation.trim()) {
      errors.password_confirmation = t.errConfirmPasswordRequired;
    } else if (passwordForm.password && passwordForm.password !== passwordForm.password_confirmation) {
      errors.password_confirmation = t.errPasswordsNoMatch;
    }

    if (
      passwordForm.current_password.trim() &&
      passwordForm.password.trim() &&
      passwordForm.current_password === passwordForm.password &&
      !errors.password
    ) {
      errors.password = t.errPasswordSameAsCurrent;
    }

    return errors;
  }, [passwordForm, t]);

  const profileHasErrors = Object.keys(profileErrors).length > 0;
  const passwordHasErrors = Object.keys(passwordErrors).length > 0;

  const resetForms = () => {
    setProfileForm({
      username: initialData.username,
      fullname: initialData.fullname,
      first_name: initialData.first_name,
      last_name: initialData.last_name,
      email: initialData.email,
      role: initialData.role,
    });
    setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    setProfileSubmitted(false);
    setPasswordSubmitted(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    setEditError(null);
    setEditSuccess(null);
    setEditMode('profile');
    setShowDeleteConfirm(false);
    setDeletingAccount(false);
  };

  const handleClose = () => {
    if (savingEdit) return;
    resetForms();
    onClose();
  };

  const handleSaveProfile = async () => {
    setProfileSubmitted(true);
    setEditError(null);
    setEditSuccess(null);

    if (profileHasErrors || savingEdit) {
      return;
    }

    setSavingEdit(true);
    try {
      const payload: {
        fullname: string;
        first_name: string;
        last_name: string;
        email: string;
        roles?: string[];
      } = {
        fullname: profileForm.fullname.trim(),
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        email: profileForm.email.trim(),
      };

      // Only include roles if showRoleSelect is true (admin access)
      if (showRoleSelect) {
        payload.roles = [profileForm.role];
      }

      await updateUser(userId, payload);

      setEditSuccess(t.successProfile);
      onSuccess();
    } catch (err) {
      console.error('Failed to update user:', err);
      setEditError(err instanceof Error ? err.message : t.errUpdateUser);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordSubmitted(true);
    setEditError(null);
    setEditSuccess(null);

    if (passwordHasErrors || savingEdit) {
      return;
    }

    setSavingEdit(true);
    try {
      await updateUser(userId, {
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      });

      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
      setPasswordSubmitted(false);
      setEditSuccess(t.successPassword);
      onSuccess();
    } catch (err) {
      console.error('Failed to update password:', err);
      setEditError(err instanceof Error ? err.message : t.errUpdatePassword);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deletingAccount) return;
    setEditError(null);
    setEditSuccess(null);
    setDeletingAccount(true);

    try {
      await deleteUser(userId, getStoredLanguage());
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to delete user:', err);
      setEditError(err instanceof Error ? err.message : t.errDeleteUser);
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-xl rounded-lg border border-gray-700 bg-gray-900 shadow-lg flex flex-col max-h-[90vh]" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between gap-3 p-6 pb-0">
          <h2 className="text-xl font-semibold text-white">{t.title}</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={savingEdit}
            className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
          >
            {t.btnClose}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 px-6">
          <button
            type="button"
            onClick={() => {
              setEditMode('profile');
              setEditError(null);
              setEditSuccess(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              editMode === 'profile'
                ? 'bg-blue-600 text-white'
                : 'border border-gray-600 text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.tabBasicInfo}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditMode('password');
              setEditError(null);
              setEditSuccess(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              editMode === 'password'
                ? 'bg-blue-600 text-white'
                : 'border border-gray-600 text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.tabChangePassword}
          </button>
        </div>

        {editError && (
          <div className="mt-4 mx-6 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {editError}
          </div>
        )}

        {editSuccess && (
          <div className="mt-4 mx-6 rounded-lg border border-emerald-500/30 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300">
            {editSuccess}
          </div>
        )}

        {editMode === 'profile' && (
          <div className="mt-5 space-y-4 overflow-y-auto px-6 pb-6">
            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-username">
                {t.labelUsername}
              </label>
              <input
                id="edit-username"
                type="text"
                value={profileForm.username}
                readOnly
                disabled
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-fullname">
                {t.labelFullname}
              </label>
              <input
                id="edit-fullname"
                type="text"
                value={profileForm.fullname}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, fullname: event.target.value }))}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              {profileSubmitted && profileErrors.fullname && (
                <p className="mt-1 text-xs text-red-300">{profileErrors.fullname}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-first-name">
                {t.labelFirstName}
              </label>
              <input
                id="edit-first-name"
                type="text"
                value={profileForm.first_name}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, first_name: event.target.value }))}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              {profileSubmitted && profileErrors.first_name && (
                <p className="mt-1 text-xs text-red-300">{profileErrors.first_name}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-last-name">
                {t.labelLastName}
              </label>
              <input
                id="edit-last-name"
                type="text"
                value={profileForm.last_name}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, last_name: event.target.value }))}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              {profileSubmitted && profileErrors.last_name && (
                <p className="mt-1 text-xs text-red-300">{profileErrors.last_name}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-email">
                {t.labelEmail}
              </label>
              <input
                id="edit-email"
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              {profileSubmitted && profileErrors.email && (
                <p className="mt-1 text-xs text-red-300">{profileErrors.email}</p>
              )}
            </div>

            {showRoleSelect && (
              <div>
                <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-role">
                  {t.labelRole}
                </label>
                <select
                  id="edit-role"
                  value={profileForm.role}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="customer">{t.roleCustomer}</option>
                  <option value="vendor">{t.roleVendor}</option>
                  <option value="admin">{t.roleAdmin}</option>
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
                disabled={savingEdit}
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={savingEdit}
              >
                {savingEdit ? t.btnSaving : t.btnSave}
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-900/10 p-4">
              <h3 className="text-sm font-semibold text-red-300">{t.deleteTitle}</h3>
              <p className="mt-2 text-xs text-red-200/80">
                {t.deleteHint}
              </p>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-3 rounded-lg border border-red-500/50 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                >
                  {t.btnDeleteAccount}
                </button>
              ) : (
                <div className="mt-3 rounded-lg border border-red-500/40 bg-red-900/20 p-3">
                  <p className="text-xs text-red-200">
                    {t.deleteConfirm}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="rounded-lg border border-gray-600 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800"
                      disabled={deletingAccount}
                    >
                      {t.btnCancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      disabled={deletingAccount}
                    >
                      {deletingAccount ? t.btnDeleting : t.btnYesDelete}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {editMode === 'password' && (
          <div className="mt-5 space-y-4 overflow-y-auto px-6 pb-6">
            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-current-password">
                {t.labelCurrentPassword}
              </label>
              <div className="relative">
                <input
                  id="edit-current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 pr-10 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  aria-label={showCurrentPassword ? t.ariaHidePassword : t.ariaShowPassword}
                >
                  {showCurrentPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordSubmitted && passwordErrors.current_password && (
                <p className="mt-1 text-xs text-red-300">{passwordErrors.current_password}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-new-password">
                {t.labelNewPassword}
              </label>
              <div className="relative">
                <input
                  id="edit-new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 pr-10 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  aria-label={showNewPassword ? t.ariaHidePassword : t.ariaShowPassword}
                >
                  {showNewPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordSubmitted && passwordErrors.password && (
                <p className="mt-1 text-xs text-red-300">{passwordErrors.password}</p>
              )}
              {!passwordSubmitted && (
                <p className="mt-1 text-xs text-gray-400">
                  {t.passwordHint}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-password-confirmation">
                {t.labelConfirmPassword}
              </label>
              <div className="relative">
                <input
                  id="edit-password-confirmation"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.password_confirmation}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, password_confirmation: event.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 pr-10 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  aria-label={showConfirmPassword ? t.ariaHidePassword : t.ariaShowPassword}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordSubmitted && passwordErrors.password_confirmation && (
                <p className="mt-1 text-xs text-red-300">{passwordErrors.password_confirmation}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
                disabled={savingEdit}
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleSavePassword}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={savingEdit}
              >
                {savingEdit ? t.btnSaving : t.btnSavePassword}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default UserEditModal;
