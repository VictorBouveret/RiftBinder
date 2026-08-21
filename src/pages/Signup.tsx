import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

const MIN_PASSWORD_LENGTH = 8

export function Signup() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  function getPasswordError(pw: string): string | null {
    if (pw.length < MIN_PASSWORD_LENGTH) {
      return t('auth.passwordTooShort', { count: MIN_PASSWORD_LENGTH })
    }
    if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
      return t('auth.passwordNeedsLetterAndDigit')
    }
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const passwordError = getPasswordError(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    setSubmitting(true)
    const { error } = await signUp(email, password)
    setSubmitting(false)

    if (error) {
      setError(error)
      return
    }

    setConfirmationSent(true)
  }

  if (confirmationSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <h1 className="mb-2 text-lg font-medium text-zinc-100">{t('auth.checkEmailTitle')}</h1>
          <p className="text-sm text-zinc-400">{t('auth.checkEmailBody', { email })}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="mb-6 text-lg font-medium text-zinc-100">{t('auth.signupTitle')}</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs text-zinc-400">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs text-zinc-400">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
            <p className="mt-1 text-[11px] text-zinc-500">{t('auth.passwordHint')}</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-xs text-zinc-400">
              {t('auth.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-zinc-100 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
          >
            {submitting ? t('auth.signingUp') : t('auth.signupButton')}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-500">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-zinc-300 underline">
            {t('home.login')}
          </Link>
        </p>
      </div>
    </div>
  )
}