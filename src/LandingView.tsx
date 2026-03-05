import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from './i18n';
import { loginUser, registerUser, logoutUser } from './api/authApi';

function LandingView() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const [language] = useState(() => getStoredLanguage());
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [loginTouched, setLoginTouched] = useState({ identifier: false, password: false });
  const [loginSubmitted, setLoginSubmitted] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    firstname: '',
    lastname: '',
    password: '',
    repassword: ''
  });
  const [loginResponse, setLoginResponse] = useState<Record<string, unknown> | null>(null);
  const [registerResponse, setRegisterResponse] = useState<Record<string, unknown> | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerTouched, setRegisterTouched] = useState({
    username: false,
    email: false,
    firstname: false,
    lastname: false,
    password: false,
    repassword: false
  });
  const [registerSubmitted, setRegisterSubmitted] = useState(false);

  // Check for auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);
  }, []);

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

  const loginHasErrors = Object.keys(loginErrors).length > 0;
  const registerHasErrors = Object.keys(registerErrors).length > 0;

  const shouldShowLoginError = (field: keyof typeof loginTouched) =>
    (loginSubmitted || loginTouched[field]) && Boolean(loginErrors[field]);

  const shouldShowRegisterError = (field: keyof typeof registerTouched) =>
    (registerSubmitted || registerTouched[field]) && Boolean(registerErrors[field]);

  const handleLogin = async () => {
    setLoginSubmitted(true);
    if (loginHasErrors || loginLoading) return;

    setLoginResponse(null);
    setLoginSuccess(false);
    setLoginLoading(true);
    const identifier = loginForm.identifier.trim();
    const payload = identifier.includes('@')
      ? { email: identifier, password: loginForm.password }
      : { username: identifier, password: loginForm.password };

    try {
      const data = await loginUser(payload);
      // Check if response has a token (success)
      if (data && typeof data === 'object' && 'token' in data) {
        // Store token in localStorage
        localStorage.setItem('auth_token', (data as { token: string }).token);
        setLoginSuccess(true);
        setLoginResponse(data as Record<string, unknown>);
        // Reload page after short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setLoginResponse(data as Record<string, unknown>);
      }
    } catch (error) {
      const authError = error as { data?: unknown; message?: string };
      const errorData = authError.data as { message?: string } | undefined;
      setLoginResponse({ 
        message: errorData?.message ?? authError.message ?? 'Login failed' 
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
        firstname: registerForm.firstname.trim(),
        lastname: registerForm.lastname.trim(),
        password: registerForm.password,
        password_confirmation: registerForm.repassword
      });
      // Check if response has a token (success)
      if (data && typeof data === 'object' && 'token' in data) {
        // Store token in localStorage
        localStorage.setItem('auth_token', (data as { token: string }).token);
        setRegisterSuccess(true);
        setRegisterResponse(data as Record<string, unknown>);
        // Reload page after short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setRegisterResponse(data as Record<string, unknown>);
      }
    } catch (error) {
      const authError = error as { data?: unknown; message?: string };
      const errorData = authError.data as { message?: string } | undefined;
      setRegisterResponse({ 
        message: errorData?.message ?? authError.message ?? 'Registration failed' 
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      await logoutUser(token);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token and reload regardless of API response
      localStorage.removeItem('auth_token');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Hero Section */}
      <header className="grow flex items-center justify-center px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">{t.landing.title}</h1>
          <p className="text-xl mb-8">{t.landing.subtitle}</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate('/chat')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {t.landing.cta}
            </button>
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => {
                  setActiveTab('login');
                  setIsModalOpen(true);
                  setLoginResponse(null);
                  setRegisterResponse(null);
                  setLoginSuccess(false);
                  setRegisterSuccess(false);
                  setLoginSubmitted(false);
                  setRegisterSubmitted(false);
                  setLoginTouched({ identifier: false, password: false });
                  setRegisterTouched({
                    username: false,
                    email: false,
                    firstname: false,
                    lastname: false,
                    password: false,
                    repassword: false
                  });
                }}
                className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded border border-white/20"
              >
                Login
              </button>
            )}
            <button 
              onClick={() => navigate('/jobs')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              {t.landing.jobsCta}
            </button>
            <button 
              onClick={() => navigate('/demo/ecommerce/products')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Ecommerce Demo
            </button>
          </div>
          
          {/* Social Links */}
          <div className="flex justify-center items-center gap-6 mt-8">
            <a
              href="https://github.com/jussipalanen/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/jussi-alanen-38628a75/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 px-4 text-center">
        <div className="flex justify-center items-center gap-4 mb-3">
          <a
            href="https://github.com/jussipalanen/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/jussi-alanen-38628a75/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="LinkedIn"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
        <p className="text-gray-400">&copy; {year} Jussimatic. {t.footer}</p>
      </footer>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-gray-800 text-white shadow-2xl border border-white/10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="text-sm font-semibold text-white/80">
                {activeTab === 'login' ? 'Login' : 'Register'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              {activeTab === 'login' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80">Username or Email</label>
                    <input
                      value={loginForm.identifier}
                      onChange={(event) =>
                        setLoginForm((current) => ({ ...current, identifier: event.target.value }))
                      }
                      onBlur={() =>
                        setLoginTouched((current) => ({ ...current, identifier: true }))
                      }
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
                      onBlur={() =>
                        setLoginTouched((current) => ({ ...current, password: true }))
                      }
                      className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter password"
                    />
                    {shouldShowLoginError('password') && (
                      <p className="mt-1 text-sm text-red-400">{loginErrors.password}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      onClick={handleLogin}
                      disabled={loginHasErrors || loginLoading}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loginLoading ? 'Logging in...' : 'Login'}
                    </button>
                    <button
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
                    <div className={`mt-4 rounded-lg border p-3 text-sm ${
                      loginSuccess 
                        ? 'border-green-500/30 bg-green-900/20 text-green-300' 
                        : 'border-red-500/30 bg-red-900/20 text-red-300'
                    }`}>
                      {loginSuccess ? (
                        <div>
                          <p className="font-semibold mb-2">✓ Login successful!</p>
                        </div>
                      ) : (
                        <p>
                          {(loginResponse as { message?: string })?.message ?? 'Login failed'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-white/80">Username</label>
                      <input
                        value={registerForm.username}
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, username: event.target.value }))
                        }
                        onBlur={() =>
                          setRegisterTouched((current) => ({ ...current, username: true }))
                        }
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
                        onBlur={() =>
                          setRegisterTouched((current) => ({ ...current, email: true }))
                        }
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
                        onBlur={() =>
                          setRegisterTouched((current) => ({ ...current, firstname: true }))
                        }
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
                        onBlur={() =>
                          setRegisterTouched((current) => ({ ...current, lastname: true }))
                        }
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
                        onBlur={() =>
                          setRegisterTouched((current) => ({ ...current, password: true }))
                        }
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
                        onBlur={() =>
                          setRegisterTouched((current) => ({ ...current, repassword: true }))
                        }
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
                      onClick={() => {
                        setActiveTab('login');
                        setLoginSubmitted(false);
                      }}
                      className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5 sm:w-auto"
                    >
                      Login
                    </button>
                    <button
                      onClick={() =>
                        {
                          setRegisterForm({
                            username: '',
                            email: '',
                            firstname: '',
                            lastname: '',
                            password: '',
                            repassword: ''
                          });
                          setRegisterTouched({
                            username: false,
                            email: false,
                            firstname: false,
                            lastname: false,
                            password: false,
                            repassword: false
                          });
                          setRegisterSubmitted(false);
                          setRegisterResponse(null);
                        }
                      }
                      className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5 sm:w-auto"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleRegister}
                      disabled={registerHasErrors || registerLoading}
                      className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {registerLoading ? 'Creating...' : 'Create new user'}
                    </button>
                  </div>
                  {registerResponse && (
                    <div className={`mt-4 rounded-lg border p-3 text-sm ${
                      registerSuccess 
                        ? 'border-green-500/30 bg-green-900/20 text-green-300' 
                        : 'border-red-500/30 bg-red-900/20 text-red-300'
                    }`}>
                      {registerSuccess ? (
                        <div>
                          <p className="font-semibold mb-2">✓ Registration successful!</p>
                          <pre className="text-xs text-white/60 whitespace-pre-wrap overflow-wrap-break-word">
                            {JSON.stringify(registerResponse, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <p>
                          {(registerResponse as { message?: string })?.message ?? 'Registration failed'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingView;
