import { useMemo, useState } from 'react';
import { updateUser } from './api/usersApi';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength validation
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 30;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_NUMBER_REGEX = /[0-9]/;
const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/;'`~]/;

function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters long.`;
  }
  if (!PASSWORD_LOWERCASE_REGEX.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!PASSWORD_UPPERCASE_REGEX.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!PASSWORD_NUMBER_REGEX.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!PASSWORD_SPECIAL_CHAR_REGEX.test(password)) {
    return 'Password must contain at least one special character.';
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
      errors.fullname = 'Full name is required.';
    }
    if (!profileForm.first_name.trim()) {
      errors.first_name = 'First name is required.';
    }
    if (!profileForm.last_name.trim()) {
      errors.last_name = 'Last name is required.';
    }
    if (!profileForm.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(profileForm.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    return errors;
  }, [profileForm]);

  const passwordErrors = useMemo(() => {
    const errors: {
      current_password?: string;
      password?: string;
      password_confirmation?: string;
    } = {};

    if (!passwordForm.current_password.trim()) {
      errors.current_password = 'Current password is required.';
    }
    
    if (!passwordForm.password.trim()) {
      errors.password = 'New password is required.';
    } else {
      // Validate password strength
      const strengthError = validatePasswordStrength(passwordForm.password);
      if (strengthError) {
        errors.password = strengthError;
      }
    }
    
    if (!passwordForm.password_confirmation.trim()) {
      errors.password_confirmation = 'Please re-enter the new password.';
    } else if (passwordForm.password && passwordForm.password !== passwordForm.password_confirmation) {
      errors.password_confirmation = 'Passwords do not match.';
    }
    
    if (
      passwordForm.current_password.trim() &&
      passwordForm.password.trim() &&
      passwordForm.current_password === passwordForm.password &&
      !errors.password // Only show this error if there's no strength error
    ) {
      errors.password = 'New password must be different from current password.';
    }

    return errors;
  }, [passwordForm]);

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

      setEditSuccess('User details saved successfully.');
      onSuccess();
    } catch (err) {
      console.error('Failed to update user:', err);
      setEditError(err instanceof Error ? err.message : 'Failed to update user. Please try again.');
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
      setEditSuccess('Password updated successfully.');
      onSuccess();
    } catch (err) {
      console.error('Failed to update password:', err);
      setEditError(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-xl rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Edit user</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={savingEdit}
            className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
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
            Basic info
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
            Change password
          </button>
        </div>

        {editError && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {editError}
          </div>
        )}

        {editSuccess && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300">
            {editSuccess}
          </div>
        )}

        {editMode === 'profile' && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-username">
                Username (readonly)
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
                Name (fullname)
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
                Firstname (first_name)
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
                Lastname (last_name)
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
                Email (email)
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
                  Role
                </label>
                <select
                  id="edit-role"
                  value={profileForm.role}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="admin">Admin</option>
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {editMode === 'password' && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-current-password">
                Current password
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
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
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
                New password
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
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
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
                  Requirements: 4-30 characters, at least one lowercase, one uppercase, one number, and one special character.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300" htmlFor="edit-password-confirmation">
                Re-password to confirm
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
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePassword}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserEditModal;
