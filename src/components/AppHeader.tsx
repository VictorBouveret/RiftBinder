import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function useProfileChips() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<{ language: string; currency: string } | null>(null)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    supabase
      .from('profiles')
      .select('language, currency')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          return
        }
        setProfile(data)
      })
  }, [user])

  return profile
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`

export function AppHeader() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const profile = useProfileChips()

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-base font-semibold tracking-tight text-zinc-100">
            RiftBinder
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink to="/cards" className={navLinkClass}>
              {t('nav.cards')}
            </NavLink>
            {user && (
              <>
                <NavLink to="/collection" className={navLinkClass}>
                  {t('nav.collection')}
                </NavLink>
                <NavLink to="/wishlist" className={navLinkClass}>
                  {t('nav.wishlist')}
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="hidden rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 sm:block"
            >
              {profile?.language.toUpperCase() ?? '…'}
            </Link>
            <Link
              to="/settings"
              className="hidden rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 sm:block"
            >
              {profile?.currency ?? '…'}
            </Link>
            <div className="mx-1 hidden h-5 w-px bg-zinc-800 sm:block" />
            <Link
              to="/settings"
              aria-label={t('nav.settings')}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-300"
            >
              ⚙
            </Link>
            <button
              onClick={() => signOut()}
              className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
            >
              {t('home.logout')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
            >
              {t('home.login')}
            </Link>
            <Link
              to="/signup"
              className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900"
            >
              {t('home.signup')}
            </Link>
          </div>
        )}
      </div>

      {/* Nav mobile : sous le bandeau principal, vu que sm:flex la cache au-dessus */}
      <nav className="flex items-center gap-1 border-t border-zinc-900 px-4 py-1.5 sm:hidden">
        <NavLink to="/cards" className={navLinkClass}>
          {t('nav.cards')}
        </NavLink>
        {user && (
          <>
            <NavLink to="/collection" className={navLinkClass}>
              {t('nav.collection')}
            </NavLink>
            <NavLink to="/wishlist" className={navLinkClass}>
              {t('nav.wishlist')}
            </NavLink>
          </>
        )}
      </nav>
    </header>
  )
}