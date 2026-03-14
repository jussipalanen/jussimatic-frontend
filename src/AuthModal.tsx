import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loginUser, loginWithGoogle, registerUser, requestPasswordReset } from './api/authApi';
import { getStoredLanguage, translations, type Language } from './i18n';

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterRepassword, setShowRegisterRepassword] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());

  const generatePassword = () => {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const special = '!@#$%^&*()-_=+[]{}';
    const all = lower + upper + digits + special;
    const guaranteed = [
      lower[Math.floor(Math.random() * lower.length)],
      upper[Math.floor(Math.random() * upper.length)],
      digits[Math.floor(Math.random() * digits.length)],
      special[Math.floor(Math.random() * special.length)],
    ];
    const rest = Array.from({ length: 12 }, () => all[Math.floor(Math.random() * all.length)]);
    const pwd = [...guaranteed, ...rest].sort(() => Math.random() - 0.5).join('');
    setRegisterForm((current) => ({ ...current, password: pwd, repassword: pwd }));
    setShowRegisterPassword(true);
    setShowRegisterRepassword(true);
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const lang = (event as CustomEvent<Language>).detail;
      setLanguage(lang);
    };
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  const t = translations[language].auth;

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
    setGoogleLoading(false);
    setGoogleReady(false);
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

  const handleGoogleLogin = useCallback(async (idToken: string) => {
    if (!idToken || googleLoading) return;

    setLoginResponse(null);
    setLoginSuccess(false);
    setGoogleLoading(true);

    try {
      const data = await loginWithGoogle(idToken);
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
        message: errorData?.message ?? authError.message ?? t.loginFailed,
      });
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'login') return;

    if (!googleClientId) {
      setGoogleReady(false);
      return;
    }

    let active = true;

    const initializeGoogleButton = () => {
      if (!active || !googleButtonRef.current || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: GoogleCredentialResponse) => {
          void handleGoogleLogin(response.credential ?? '');
        },
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'filled_blue',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: googleButtonRef.current.clientWidth || 320,
      });

      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogleButton();
      return () => {
        active = false;
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleButton;
    script.onerror = () => {
      if (!active) return;
      setGoogleReady(false);
      setLoginResponse({ message: t.googleUnavailable });
    };
    document.head.appendChild(script);

    return () => {
      active = false;
      script.onload = null;
      script.onerror = null;
    };
  }, [activeTab, googleClientId, handleGoogleLogin, isOpen]);

  const loginErrors = useMemo(() => {
    const errors: { identifier?: string; password?: string } = {};
    const trimmedIdentifier = loginForm.identifier.trim();
    if (!trimmedIdentifier) {
      errors.identifier = t.errIdentifierRequired;
    } else if (trimmedIdentifier.includes('@')) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedIdentifier);
      if (!emailOk) errors.identifier = t.errEmailFormat;
    } else {
      const usernameOk = /^[a-zA-Z0-9._-]{3,}$/.test(trimmedIdentifier);
      if (!usernameOk) errors.identifier = t.errUsernameFormat;
    }
    if (!loginForm.password.trim()) {
      errors.password = t.errPasswordRequired;
    }
    return errors;
  }, [loginForm, language]);

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
      errors.username = t.errUsernameRequired;
    } else if (!/^[a-zA-Z0-9._-]{3,}$/.test(trimmedUsername)) {
      errors.username = t.errUsernameFormat;
    }
    if (!registerForm.email.trim()) {
      errors.email = t.errEmailRequired;
    } else {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email.trim());
      if (!emailOk) errors.email = t.errEmailFormat;
    }
    if (!registerForm.firstname.trim()) errors.firstname = t.errFirstnameRequired;
    if (!registerForm.lastname.trim()) errors.lastname = t.errLastnameRequired;
    if (!registerForm.password.trim()) errors.password = t.errPasswordRequired;
    if (!registerForm.repassword.trim()) {
      errors.repassword = t.errRepasswordRequired;
    } else if (registerForm.password.trim() && registerForm.password !== registerForm.repassword) {
      errors.repassword = t.errPasswordsMismatch;
    }
    return errors;
  }, [registerForm, language]);

  const forgotErrors = useMemo(() => {
    const errors: { email?: string } = {};
    if (!forgotForm.email.trim()) {
      errors.email = t.errEmailRequired;
    } else {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotForm.email.trim());
      if (!emailOk) errors.email = t.errEmailFormat;
    }
    return errors;
  }, [forgotForm, language]);

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
        message: errorData?.message ?? authError.message ?? t.loginFailed,
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
      }, language);
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
        message: errorData?.message ?? authError.message ?? t.registerFailed,
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
      setForgotResponse({});
    } catch (error) {
      const authError = error as { data?: unknown; message?: string };
      const errorData = authError.data as { message?: string } | undefined;
      setForgotResponse({
        message: errorData?.message ?? authError.message ?? t.forgotFailed,
      });
    } finally {
      setForgotLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center px-4 py-6">
      <div
        className="w-full max-w-xl rounded-2xl bg-gray-800 text-white shadow-2xl border border-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="text-sm font-semibold text-white/80">
            {activeTab === 'login' ? t.tabLogin : activeTab === 'register' ? t.tabRegister : t.tabForgot}
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
                <label className="block text-sm font-medium text-white/80">{t.labelIdentifier}</label>
                <input
                  value={loginForm.identifier}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, identifier: event.target.value }))
                  }
                  onBlur={() => setLoginTouched((current) => ({ ...current, identifier: true }))}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.placeholderIdentifier}
                />
                {shouldShowLoginError('identifier') && (
                  <p className="mt-1 text-sm text-red-400">{loginErrors.identifier}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80">{t.labelPassword}</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  onBlur={() => setLoginTouched((current) => ({ ...current, password: true }))}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.placeholderPassword}
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
                    {t.forgotPasswordLink}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loginHasErrors || loginLoading || googleLoading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginLoading ? t.btnLoggingIn : t.btnLogin}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegisterSubmitted(false);
                  }}
                  className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5"
                >
                  {t.btnRegister}
                </button>
              </div>

              <div className="pt-2">
                <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
                  <span>{t.orContinueWith}</span>
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
                </div>

                <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] p-3 shadow-inner">
                  <div ref={googleButtonRef} className="flex min-h-11 w-full justify-center overflow-hidden" />
                  {googleLoading && (
                    <p className="mt-2 text-center text-xs text-white/70">{t.googleSigningIn}</p>
                  )}
                  {!googleClientId && (
                    <p className="mt-2 text-center text-xs text-amber-300">
                      {t.googleNotConfigured}
                    </p>
                  )}
                  {googleClientId && !googleReady && !googleLoading && (
                    <p className="mt-2 text-center text-xs text-white/60">{t.googleLoading}</p>
                  )}
                </div>
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
                      <p className="font-semibold mb-2">{t.loginSuccess}</p>
                    </div>
                  ) : (
                    <p>{(loginResponse as { message?: string })?.message ?? t.loginFailed}</p>
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
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-white/80">{t.labelUsername}</label>
                <input
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, username: event.target.value }))
                  }
                  onBlur={() => setRegisterTouched((current) => ({ ...current, username: true }))}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.placeholderUsername}
                />
                {shouldShowRegisterError('username') && (
                  <p className="mt-1 text-sm text-red-400">{registerErrors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-white/80">{t.labelEmail}</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, email: event.target.value }))
                  }
                  onBlur={() => setRegisterTouched((current) => ({ ...current, email: true }))}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.placeholderEmail}
                />
                {shouldShowRegisterError('email') && (
                  <p className="mt-1 text-sm text-red-400">{registerErrors.email}</p>
                )}
              </div>

              {/* First name + Last name — natural pair */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80">{t.labelFirstname}</label>
                  <input
                    value={registerForm.firstname}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, firstname: event.target.value }))
                    }
                    onBlur={() => setRegisterTouched((current) => ({ ...current, firstname: true }))}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.placeholderFirstname}
                  />
                  {shouldShowRegisterError('firstname') && (
                    <p className="mt-1 text-sm text-red-400">{registerErrors.firstname}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80">{t.labelLastname}</label>
                  <input
                    value={registerForm.lastname}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, lastname: event.target.value }))
                    }
                    onBlur={() => setRegisterTouched((current) => ({ ...current, lastname: true }))}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.placeholderLastname}
                  />
                  {shouldShowRegisterError('lastname') && (
                    <p className="mt-1 text-sm text-red-400">{registerErrors.lastname}</p>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-white/80">{t.labelPassword}</label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-xs font-semibold text-blue-300 hover:text-blue-200"
                  >
                    {t.btnGeneratePassword}
                  </button>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, password: event.target.value }))
                    }
                    onBlur={() => setRegisterTouched((current) => ({ ...current, password: true }))}
                    className="w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.placeholderPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((v) => !v)}
                    aria-label={showRegisterPassword ? t.btnHidePassword : t.btnShowPassword}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {showRegisterPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {shouldShowRegisterError('password') && (
                  <p className="mt-1 text-sm text-red-400">{registerErrors.password}</p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-white/80">{t.labelRepassword}</label>
                <div className="relative mt-2">
                  <input
                    type={showRegisterRepassword ? 'text' : 'password'}
                    value={registerForm.repassword}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, repassword: event.target.value }))
                    }
                    onBlur={() => setRegisterTouched((current) => ({ ...current, repassword: true }))}
                    className="w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.placeholderRepassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterRepassword((v) => !v)}
                    aria-label={showRegisterRepassword ? t.btnHidePassword : t.btnShowPassword}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {showRegisterRepassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {shouldShowRegisterError('repassword') && (
                  <p className="mt-1 text-sm text-red-400">{registerErrors.repassword}</p>
                )}
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setLoginSubmitted(false);
                    setLoginResponse(null);
                    setLoginTouched({ identifier: false, password: false });
                  }}
                  className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5 sm:w-auto"
                >
                  ← {t.btnBackToLogin}
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
                    setShowRegisterPassword(false);
                    setShowRegisterRepassword(false);
                  }}
                  className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5 sm:w-auto"
                >
                  {t.btnReset}
                </button>
                <button
                  type="submit"
                  disabled={registerHasErrors || registerLoading}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {registerLoading ? t.btnCreating : t.btnCreateUser}
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
                      <p className="font-semibold">{t.registerSuccess}</p>
                    </div>
                  ) : (
                    <p>{(registerResponse as { message?: string })?.message ?? t.registerFailed}</p>
                  )}
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80">{t.labelEmail}</label>
                <input
                  type="email"
                  value={forgotForm.email}
                  onChange={(event) => setForgotForm({ email: event.target.value })}
                  onBlur={() => setForgotTouched({ email: true })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.placeholderForgotEmail}
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
                  {forgotLoading ? t.btnSending : t.btnSendResetLink}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setLoginSubmitted(false);
                    setLoginResponse(null);
                    setLoginTouched({ identifier: false, password: false });
                  }}
                  className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5"
                >
                  {t.btnBackToLogin}
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
                  {forgotSuccess ? (
                    <p>{t.forgotSuccess}</p>
                  ) : (
                    <p>{(forgotResponse as { message?: string })?.message ?? t.forgotFailed}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default AuthModal;