import { useEffect, useMemo, useState } from 'react';
import { loginUser, registerUser, requestPasswordReset } from './api/authApi';

type AuthTab = 'login' | 'register' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AuthTab;
}

function AuthModal({ isOpen, onClose, initialTab = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [loginTouched, setLoginTouched] = useState({ identifier: false, password: false });
  const [loginSubmitted, setLoginSubmitted] = useState(false);
  const [forgotForm, setForgotForm] = useState({ email: '' });
  const [forgotTouched, setForgotTouched] = useState({ email: false });
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    firstname: '',
    lastname: '',
    password: '',
    repassword: '',
  });
  const [registerTouched, setRegisterTouched] = useState({
    username: false,
    email: false,
    firstname: false,
    lastname: false,
    password: false,
    repassword: false,
  });
  const [registerSubmitted, setRegisterSubmitted] = useState(false);
  const [loginResponse, setLoginResponse] = useState<Record<string, unknown> | null>(null);
  const [registerResponse, setRegisterResponse] = useState<Record<string, unknown> | null>(null);
  const [forgotResponse, setForgotResponse] = useState<Record<string, unknown> | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setLoginResponse(null);
    setRegisterResponse(null);
    setForgotResponse(null);
    setLoginSuccess(false);
    setRegisterSuccess(false);
    setForgotSuccess(false);
    setLoginSubmitted(false);
    setRegisterSubmitted(false);
    setForgotSubmitted(false);
    setLoginTouched({ identifier: false, password: false });
    setRegisterTouched({
      username: false,
      email: false,
      firstname: false,
      lastname: false,
      password: false,
      repassword: false,
    });
    setForgotTouched({ email: false });
    setForgotForm({ email: '' });
  }, [isOpen, initialTab]);

  const loginErrors = useMemo(() => {
    const errors: { identifier?: string; password?: string } = {};
    const trimmedIdentifier = loginForm.identifier.trim();
    if (!trimmedIdentifier) {
      errors.identifier = 'Username or email is required.';
    } else if (trimmedIdentifier.includes('@')) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedIdentifier);
      if (!emailOk) errors.identifier = 'Enter a valid email address.';
    } else {
      const usernameOk = /^[a-zA-Z0-9._-]{3,}$/.test(trimmedIdentifier);
      if (!usernameOk) errors.identifier = 'Username must be at least 3 characters.';
    }
    if (!loginForm.password.trim()) {
      errors.password = 'Password is required.';
    }
    return errors;
  }, [loginForm]);

  const registerErrors = useMemo(() => {
    const errors: {
      username?: string;
      email?: string;
      firstname?: string;
      lastname?: string;
      password?: string;
      repassword?: string;
    } = {};
    const trimmedUsername = registerForm.username.trim();
    if (!trimmedUsername) {
      errors.username = 'Username is required.';
    } else if (!/^[a-zA-Z0-9._-]{3,}$/.test(trimmedUsername)) {
      errors.username = 'Username must be at least 3 characters.';
    }
    if (!registerForm.email.trim()) {
      errors.email = 'Email is required.';
    } else {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email.trim());
      if (!emailOk) errors.email = 'Enter a valid email address.';
    }
    if (!registerForm.firstname.trim()) errors.firstname = 'First name is required.';
    if (!registerForm.lastname.trim()) errors.lastname = 'Last name is required.';
    if (!registerForm.password.trim()) errors.password = 'Password is required.';
    if (!registerForm.repassword.trim()) {
      errors.repassword = 'Please re-enter the password.';
    } else if (registerForm.password.trim() && registerForm.password !== registerForm.repassword) {
      errors.repassword = 'Passwords do not match.';
    }
    return errors;
  }, [registerForm]);

  const forgotErrors = useMemo(() => {
    const errors: { email?: string } = {};
    if (!forgotForm.email.trim()) {
      errors.email = 'Email is required.';
    } else {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotForm.email.trim());
      if (!emailOk) errors.email = 'Enter a valid email address.';
    }
    return errors;
  }, [forgotForm]);

  const loginHasErrors = Object.keys(loginErrors).length > 0;
  const registerHasErrors = Object.keys(registerErrors).length > 0;
  const forgotHasErrors = Object.keys(forgotErrors).length > 0;

  const shouldShowLoginError = (field: keyof typeof loginTouched) =>
    (loginSubmitted || loginTouched[field]) && Boolean(loginErrors[field]);

  const shouldShowRegisterError = (field: keyof typeof registerTouched) =>
    (registerSubmitted || registerTouched[field]) && Boolean(registerErrors[field]);

  const shouldShowForgotError = (field: keyof typeof forgotTouched) =>
    (forgotSubmitted || forgotTouched[field]) && Boolean(forgotErrors[field]);

  const handleLogin = async () => {
    setLoginSubmitted(true);
    if (loginHasErrors || loginLoading) return;

    setLoginResponse(null);
    setLoginSuccess(false);
    setLoginLoading(true);
    const identifier = loginForm.identifier.trim();
    const payload = { username: identifier, password: loginForm.password };

    try {
      const data = await loginUser(payload);
      if (data && typeof data === 'object' && 'token' in data) {
        localStorage.setItem('auth_token', (data as { token: string }).token);
        setLoginSuccess(true);
        setLoginResponse(data as Record<string, unknown>);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setLoginResponse(data as Record<string, unknown>);
      }
    } catch (error) {
      const authError = error as { data?: unknown; message?: string };
      const errorData = authError.data as { message?: string } | undefined;
      setLoginResponse({
        message: errorData?.message ?? authError.message ?? 'Login failed',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegisterSubmitted(true);
    if (registerHasErrors || registerLoading) return;

    setRegisterResponse(null);
    setRegisterSuccess(false);
    setRegisterLoading(true);
    try {
      const data = await registerUser({
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        first_name: registerForm.firstname.trim(),
        last_name: registerForm.lastname.trim(),
        password: registerForm.password,
        password_confirmation: registerForm.repassword,
      });
      if (data && typeof data === 'object' && 'token' in data) {
        localStorage.setItem('auth_token', (data as { token: string }).token);
        setRegisterSuccess(true);
        setRegisterResponse(data as Record<string, unknown>);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setRegisterResponse(data as Record<string, unknown>);
      }
    } catch (error) {
      const authError = error as { data?: unknown; message?: string };
      const errorData = authError.data as { message?: string } | undefined;
      setRegisterResponse({
        message: errorData?.message ?? authError.message ?? 'Registration failed',
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotSubmitted(true);
    if (forgotHasErrors || forgotLoading) return;

    setForgotResponse(null);
    setForgotSuccess(false);
    setForgotLoading(true);
    try {
      await requestPasswordReset(forgotForm.email.trim());
      setForgotSuccess(true);
      setForgotResponse({
        message: 'If the email exists, you will receive password reset instructions shortly.',
      });
    } catch (error) {
      const authError = error as { data?: unknown; message?: string };
      const errorData = authError.data as { message?: string } | undefined;
      setForgotResponse({
        message: errorData?.message ?? authError.message ?? 'Password reset failed',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-gray-800 text-white shadow-2xl border border-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="text-sm font-semibold text-white/80">
            {activeTab === 'login' ? 'Login' : activeTab === 'register' ? 'Register' : 'Forgot password'}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
            x
          </button>
        </div>

        <div className="px-6 py-5">
          {activeTab === 'login' ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin();
              }}
            >
              <div>
                <label className="block text-sm font-medium text-white/80">Username or Email</label>
                <input
                  value={loginForm.identifier}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, identifier: event.target.value }))
                  }
                  onBlur={() => setLoginTouched((current) => ({ ...current, identifier: true }))}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username or email"
                />
                {shouldShowLoginError('identifier') && (
                  <p className="mt-1 text-sm text-red-400">{loginErrors.identifier}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  onBlur={() => setLoginTouched((current) => ({ ...current, password: true }))}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                />
                {shouldShowLoginError('password') && (
                  <p className="mt-1 text-sm text-red-400">{loginErrors.password}</p>
                )}
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('forgot');
                      setForgotSubmitted(false);
                      setForgotTouched({ email: false });
                      setForgotResponse(null);
                      setForgotSuccess(false);
                    }}
                    className="text-xs font-semibold text-blue-300 hover:text-blue-200"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loginHasErrors || loginLoading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginLoading ? 'Logging in...' : 'Login'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegisterSubmitted(false);
                  }}
                  className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5"
                >
                  Register
                </button>
              </div>
              {loginResponse && (
                <div
                  className={`mt-4 rounded-lg border p-3 text-sm ${
                    loginSuccess
                      ? 'border-green-500/30 bg-green-900/20 text-green-300'
                      : 'border-red-500/30 bg-red-900/20 text-red-300'
                  }`}
                >
                  {loginSuccess ? (
                    <div>
                      <p className="font-semibold mb-2">Login successful!</p>
                    </div>
                  ) : (
                    <p>{(loginResponse as { message?: string })?.message ?? 'Login failed'}</p>
                  )}
                </div>
              )}
            </form>
          ) : activeTab === 'register' ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleRegister();
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/80">Username</label>
                  <input
                    value={registerForm.username}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, username: event.target.value }))
                    }
                    onBlur={() => setRegisterTouched((current) => ({ ...current, username: true }))}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Username"
                  />
                  {shouldShowRegisterError('username') && (
                    <p className="mt-1 text-sm text-red-400">{registerErrors.username}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">Email</label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, email: event.target.value }))
                    }
                    onBlur={() => setRegisterTouched((current) => ({ ...current, email: true }))}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email"
                  />
                  {shouldShowRegisterError('email') && (
                    <p className="mt-1 text-sm text-red-400">{registerErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">First name</label>
                  <input
                    value={registerForm.firstname}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, firstname: event.target.value }))
                    }
                    onBlur={() => setRegisterTouched((current) => ({ ...current, firstname: true }))}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="First name"
                  />
                  {shouldShowRegisterError('firstname') && (
                    <p className="mt-1 text-sm text-red-400">{registerErrors.firstname}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">Last name</label>
                  <input
                    value={registerForm.lastname}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, lastname: event.target.value }))
                    }
                    onBlur={() => setRegisterTouched((current) => ({ ...current, lastname: true }))}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Last name"
                  />
                  {shouldShowRegisterError('lastname') && (
                    <p className="mt-1 text-sm text-red-400">{registerErrors.lastname}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/80">Password</label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, password: event.target.value }))
                    }
                    onBlur={() => setRegisterTouched((current) => ({ ...current, password: true }))}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Password"
                  />
                  {shouldShowRegisterError('password') && (
                    <p className="mt-1 text-sm text-red-400">{registerErrors.password}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">Re-enter password</label>
                  <input
                    type="password"
                    value={registerForm.repassword}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, repassword: event.target.value }))
                    }
                    onBlur={() => setRegisterTouched((current) => ({ ...current, repassword: true }))}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Re-enter password"
                  />
                  {shouldShowRegisterError('repassword') && (
                    <p className="mt-1 text-sm text-red-400">{registerErrors.repassword}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setLoginSubmitted(false);
                  }}
                  className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5 sm:w-auto"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterForm({
                      username: '',
                      email: '',
                      firstname: '',
                      lastname: '',
                      password: '',
                      repassword: '',
                    });
                    setRegisterTouched({
                      username: false,
                      email: false,
                      firstname: false,
                      lastname: false,
                      password: false,
                      repassword: false,
                    });
                    setRegisterSubmitted(false);
                    setRegisterResponse(null);
                  }}
                  className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5 sm:w-auto"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={registerHasErrors || registerLoading}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {registerLoading ? 'Creating...' : 'Create new user'}
                </button>
              </div>
              {registerResponse && (
                <div
                  className={`mt-4 rounded-lg border p-3 text-sm ${
                    registerSuccess
                      ? 'border-green-500/30 bg-green-900/20 text-green-300'
                      : 'border-red-500/30 bg-red-900/20 text-red-300'
                  }`}
                >
                  {registerSuccess ? (
                    <div>
                      <p className="font-semibold mb-2">Registration successful!</p>
                      <pre className="text-xs text-white/60 whitespace-pre-wrap overflow-wrap-break-word">
                        {JSON.stringify(registerResponse, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p>{(registerResponse as { message?: string })?.message ?? 'Registration failed'}</p>
                  )}
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80">Email</label>
                <input
                  type="email"
                  value={forgotForm.email}
                  onChange={(event) => setForgotForm({ email: event.target.value })}
                  onBlur={() => setForgotTouched({ email: true })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                />
                {shouldShowForgotError('email') && (
                  <p className="mt-1 text-sm text-red-400">{forgotErrors.email}</p>
                )}
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleForgotPassword}
                  disabled={forgotHasErrors || forgotLoading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {forgotLoading ? 'Sending...' : 'Send reset link'}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('login');
                    setLoginSubmitted(false);
                  }}
                  className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5"
                >
                  Back to login
                </button>
              </div>
              {forgotResponse && (
                <div
                  className={`mt-4 rounded-lg border p-3 text-sm ${
                    forgotSuccess
                      ? 'border-green-500/30 bg-green-900/20 text-green-300'
                      : 'border-red-500/30 bg-red-900/20 text-red-300'
                  }`}
                >
                  <p>{(forgotResponse as { message?: string })?.message ?? 'Request failed'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;