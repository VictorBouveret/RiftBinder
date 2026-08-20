import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { SetBadge } from '../components/SetBadge'
import type { Card, CardSet } from '../types/database'

type SearchResult = Pick<Card, 'id' | 'external_id' | 'name' | 'collector_number' | 'variant'> & {
  set: { code: string }
}

const VARIANT_LABELS: Record<string, string> = {
  '': 'Standard',
  a: 'Alt art',
  star: 'Signature',
}

function useCardSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 300)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([])
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('cards')
      .select('id, external_id, name, collector_number, variant, set:sets(code)')
      .ilike('name', `%${debounced}%`)
      .order('name')
      .limit(20)
      .then(({ data, error }) => {
        if (cancelled) return
        setLoading(false)
        if (error) {
          console.error(error)
          return
        }
        setResults((data ?? []) as unknown as SearchResult[])
      })

    return () => {
      cancelled = true
    }
  }, [debounced])

  return { results, loading, isSearching: debounced.length >= 2 }
}

function getCharacterName(fullName: string): string {
  const commaIndex = fullName.indexOf(',')
  return commaIndex === -1 ? fullName : fullName.slice(0, commaIndex).trim()
}

function useCollectionCounts() {
  const { user } = useAuth()
  const [totalCards, setTotalCards] = useState<number | null>(null)
  const [ownedCount, setOwnedCount] = useState<number | null>(null)
  const [wishlistCount, setWishlistCount] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setTotalCards(count ?? 0))
  }, [])

  useEffect(() => {
    if (!user) {
      setOwnedCount(null)
      setWishlistCount(null)
      return
    }

    supabase
      .from('user_cards')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setOwnedCount(count ?? 0))

    supabase
      .from('wishlist_items')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setWishlistCount(count ?? 0))
  }, [user])

  return { totalCards, ownedCount, wishlistCount }
}

// RiftScribe ne fournit pas de logo par set, et on évite d'utiliser des
// artworks Riftbound non fournis par l'API officielle Riot pour cet usage
// (voir leur Digital Tools Policy : "Your App may only use Riftbound assets
// provided by the Riot API. No external or unofficial materials."). On
// génère donc des vignettes maison via le composant SetBadge.
function useSets() {
  const [sets, setSets] = useState<CardSet[]>([])

  useEffect(() => {
    supabase
      .from('sets')
      .select('*')
      .order('release_date', { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          return
        }
        setSets(data ?? [])
      })
  }, [])

  return sets
}

function useProfile() {
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

function getLocalizedSetName(set: CardSet, language: string | undefined): string {
  if (language === 'fr') return set.name_fr ?? set.name
  return set.name_en ?? set.name
}

function groupSetsByYear(sets: CardSet[]) {
  const groups = new Map<string, CardSet[]>()
  for (const set of sets) {
    const year = set.release_date ? set.release_date.slice(0, 4) : 'Année inconnue'
    const existing = groups.get(year) ?? []
    existing.push(set)
    groups.set(year, existing)
  }
  return Array.from(groups.entries())
}

export function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [setSearch, setSetSearch] = useState('')
  const [openYear, setOpenYear] = useState<string | null>(null)
  const { results, isSearching } = useCardSearch(query)
  const { totalCards, ownedCount, wishlistCount } = useCollectionCounts()
  const sets = useSets()
  const profile = useProfile()

  const uniqueNames = useMemo(() => {
    const seen = new Set<string>()
    const names: string[] = []
    for (const r of results) {
      const characterName = getCharacterName(r.name)
      if (!seen.has(characterName)) {
        seen.add(characterName)
        names.push(characterName)
      }
    }
    return names.slice(0, 3)
  }, [results])

  const filteredSetGroups = useMemo(() => {
    const filtered = setSearch.trim()
      ? sets.filter((s) =>
          getLocalizedSetName(s, profile?.language).toLowerCase().includes(setSearch.trim().toLowerCase()),
        )
      : sets
    return groupSetsByYear(filtered)
  }, [sets, setSearch, profile?.language])

  function goToCardsByName(name: string) {
    navigate(`/cards?name=${encodeURIComponent(name)}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <span className="text-lg font-medium">Accueil</span>
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/settings"
                className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
              >
                {profile?.language.toUpperCase() ?? '…'}
              </Link>
              <Link
                to="/settings"
                className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
              >
                {profile?.currency ?? '…'}
              </Link>
              <div className="mx-1 h-5 w-px bg-zinc-800" />
              <Link
                to="/settings"
                aria-label="Paramètres"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-300"
              >
                ⚙
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
              >
                Se déconnecter
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
              >
                Se connecter
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900"
              >
                Créer un compte
              </Link>
            </div>
          )}
        </header>

        <div className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une carte (nom ou numéro)"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
          {isSearching && (
            <div className="absolute left-0 right-0 top-11 z-10 overflow-hidden rounded-md border border-zinc-800 bg-zinc-900">
              {uniqueNames.length === 0 && (
                <p className="px-3 py-2 text-xs text-zinc-500">Aucun résultat.</p>
              )}
              {uniqueNames.map((name) => (
                <button
                  key={name}
                  onClick={() => goToCardsByName(name)}
                  className="flex w-full items-center gap-2 border-t border-zinc-800 px-3 py-2 text-left text-sm first:border-t-0 hover:bg-zinc-800"
                >
                  {name}
                </button>
              ))}
              {results.slice(0, 5).map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/cards/${r.external_id ?? r.id}`)}
                  className="flex w-full items-center justify-between border-t border-zinc-800 px-3 py-2 text-left text-sm hover:bg-zinc-800"
                >
                  <span>{r.name}</span>
                  <span className="text-zinc-500">
                    {r.set.code}-{String(r.collector_number).padStart(3, '0')} ·{' '}
                    {VARIANT_LABELS[r.variant] ?? r.variant}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to="/collection"
            className="flex h-32 flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <span className="text-sm font-medium">Ma collection</span>
            <span className="text-xs text-zinc-400">
              {user
                ? `${ownedCount ?? '…'} sur ${totalCards ?? '…'} cartes possédées`
                : 'Connecte-toi pour voir ta collection'}
            </span>
          </Link>
          <Link
            to="/wishlist"
            className="flex h-32 flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <span className="text-sm font-medium">Ma wishlist</span>
            <span className="text-xs text-zinc-400">
              {user
                ? `${wishlistCount ?? '…'} cartes en attente`
                : 'Connecte-toi pour voir ta wishlist'}
            </span>
          </Link>
        </div>

        <h2 className="mb-3 text-base font-medium">Séries</h2>
        <input
          type="text"
          value={setSearch}
          onChange={(e) => setSetSearch(e.target.value)}
          placeholder="Rechercher une série"
          className="mb-3 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />

        <div className="flex flex-col gap-2">
          {filteredSetGroups.map(([year, setsInYear]) => (
            <div key={year}>
              <button
                onClick={() => setOpenYear(openYear === year ? null : year)}
                className="flex h-11 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm"
              >
                <span>{year}</span>
                <span className="text-zinc-500">{openYear === year ? '−' : '+'}</span>
              </button>
              {openYear === year && (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {setsInYear.map((set) => (
                    <button key={set.id} onClick={() => navigate(`/cards?set=${set.code}`)}>
                      <SetBadge code={set.code} name={getLocalizedSetName(set, profile?.language)} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredSetGroups.length === 0 && (
            <p className="text-xs text-zinc-500">Aucune série trouvée.</p>
          )}
        </div>
      </div>
    </div>
  )
}