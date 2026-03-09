import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from './api/authApi'

function ResetPasswordView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = (searchParams.get('token') ?? '').trim()
  const email = (searchParams.get('email') ?? '').trim()
  const isTokenMissing = token.length === 0
  const isEmailMissing = email.length === 0

  const [form, setForm] = useState({ password: '', repassword: '' })
  const [touched, setTouched] = useState({ password: false, repassword: false })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [responseMessage, setResponseMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showRepassword, setShowRepassword] = useState(false)

  const errors = useMemo(() => {
    const nextErrors: { password?: string; repassword?: string } = {}

    if (!form.password.trim()) {
      nextErrors.password = 'New password is required.'
    }

    if (!form.repassword.trim()) {
      nextErrors.repassword = 'Please re-enter the new password.'
    } else if (form.password !== form.repassword) {
      nextErrors.repassword = 'Passwords do not match.'
    }

    return nextErrors
  }, [form])

  const hasErrors = isTokenMissing || isEmailMissing || Object.keys(errors).length > 0

  const shouldShowError = (field: keyof typeof touched) =>
    (submitted || touched[field]) && Boolean(errors[field])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)

    if (hasErrors || loading) return

    setLoading(true)
    setSuccess(false)
    setResponseMessage(null)

    try {
      const data = await resetPassword({
        token,
        email,
        password: form.password,
        password_confirmation: form.repassword,
      })
      setSuccess(true)
      setResponseMessage(
        (data as { message?: string } | null)?.message ?? 'Password reset successful. You can now log in.'
      )
    } catch (error) {
      const authError = error as { data?: unknown; message?: string }
      const errorData = authError.data as { message?: string } | undefined
      setResponseMessage(errorData?.message ?? authError.message ?? 'Password reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-12 text-white">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-white/10 bg-gray-800 p-6 shadow-2xl">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-2 text-sm text-white/70">
          Set a new password for your account using the reset link details.
        </p>

        {isTokenMissing && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-300">
            Reset token is missing. Please use the full reset link from your email.
          </div>
        )}

        {isEmailMissing && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-300">
            Email is missing. Please use the full reset link from your email.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80">New password</label>
            <div className="relative mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                className="w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 pr-16 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-blue-300 hover:bg-white/5 hover:text-blue-200"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {shouldShowError('password') && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80">New re-password</label>
            <div className="relative mt-2">
              <input
                type={showRepassword ? 'text' : 'password'}
                value={form.repassword}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    repassword: event.target.value,
                  }))
                }
                onBlur={() => setTouched((current) => ({ ...current, repassword: true }))}
                className="w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 pr-16 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowRepassword((current) => !current)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-blue-300 hover:bg-white/5 hover:text-blue-200"
              >
                {showRepassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {shouldShowError('repassword') && <p className="mt-1 text-sm text-red-400">{errors.repassword}</p>}
          </div>

          <button
            type="submit"
            disabled={hasErrors || loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Updating...' : 'Submit new password'}
          </button>
        </form>

        {responseMessage && (
          <div
            className={`mt-4 rounded-lg border p-3 text-sm ${
              success
                ? 'border-green-500/30 bg-green-900/20 text-green-300'
                : 'border-red-500/30 bg-red-900/20 text-red-300'
            }`}
          >
            {responseMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {success && (
            <button
              type="button"
              onClick={() => navigate('/?auth=login')}
              className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 sm:w-auto"
            >
              Back to login
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5 sm:w-auto"
          >
            Go to landing
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordView
