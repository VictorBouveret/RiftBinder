import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Profile = {
  language: string
  currency: string
  theme: string
}

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
]

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar US (USD)' },
  { value: 'GBP', label: 'Livre sterling (GBP)' },
]

const THEME_VALUES: { value: string; labelKey: string }[] = [
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
  { value: 'auto', labelKey: 'settings.themeAuto' },
]

export function Settings() {
  const { t, i18n } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<keyof Profile | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('language, currency, theme')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        setLoading(false)
        if (error) {
          console.error(error)
          return
        }
        setProfile(data)
      })
  }, [user])

  async function updateField<K extends keyof Profile>(field: K, value: Profile[K]) {
    if (!user || !profile) return
    setSaving(field)
    setProfile({ ...profile, [field]: value })

    // Retour instantané de la langue à l'écran, sans attendre la sauvegarde
    // en base ni un rechargement de page.
    if (field === 'language') {
      i18n.changeLanguage(value as string)
    }

    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', user.id)
    setSaving(null)

    if (error) {
      console.error(error)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  if (loading || !profile) {
    return (
      <div className="px-4 py-16 text-center text-sm text-zinc-400">{t('common.loading')}</div>
    )
  }

  return (
    <div className="px-4 py-6 text-zinc-100">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-base font-medium">{t('common.settings')}</h1>

        <div className="mb-6">
          <p className="mb-2 text-xs text-zinc-400">{t('settings.language')}</p>
          <select
            value={profile.language}
            onChange={(e) => updateField('language', e.target.value)}
            disabled={saving === 'language'}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-xs text-zinc-400">{t('settings.currency')}</p>
          <select
            value={profile.currency}
            onChange={(e) => updateField('currency', e.target.value)}
            disabled={saving === 'currency'}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-xs text-zinc-400">{t('settings.theme')}</p>
          <div className="flex gap-2">
            {THEME_VALUES.map((th) => (
              <button
                key={th.value}
                onClick={() => updateField('theme', th.value)}
                className={`flex-1 rounded-md border py-2 text-sm ${
                  profile.theme === th.value
                    ? 'border-transparent bg-zinc-100 text-zinc-900'
                    : 'border-zinc-700 text-zinc-100'
                }`}
              >
                {t(th.labelKey)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">{t('settings.themeNotApplied')}</p>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <p className="mb-2 text-xs text-zinc-400">{t('settings.account')}</p>
          <div className="mb-2 rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            {user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="w-full rounded-md border border-zinc-800 py-2 text-sm text-red-400"
          >
            {t('settings.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}