import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type { CardSet, Rarity } from '../types/database'

const PAGE_SIZE = 30

type ListedCard = {
  id: string
  external_id: string | null
  name: string
  collector_number: number
  variant: string
  rarity: Rarity
  image_url: string | null
  set: { code: string }
  card_prices: { price: number; currency: string } | null
}

type RarityFilterValue = Rarity | 'signed' | 'overnumbered'

const RARITY_OPTIONS: { value: RarityFilterValue; label: string }[] = [
  { value: 'common', label: 'Commune' },
  { value: 'uncommon', label: 'Peu commune' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Épique' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'signed', label: 'Signée' },
  { value: 'overnumbered', label: 'Overnumbered' },
]

type SortValue = 'name_asc' | 'price_asc' | 'price_desc' | 'rarity_asc' | 'rarity_desc' | 'number_asc' | 'number_desc'

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'name_asc', label: 'Nom (A → Z)' },
  { value: 'number_asc', label: 'Numéro (croissant)' },
  { value: 'number_desc', label: 'Numéro (décroissant)' },
  { value: 'rarity_desc', label: 'Rareté (plus rare → moins rare)' },
  { value: 'rarity_asc', label: 'Rareté (moins rare → plus rare)' },
  { value: 'price_asc', label: 'Prix (croissant)' },
  { value: 'price_desc', label: 'Prix (décroissant)' },
]

function useSetsList() {
  const [sets, setSets] = useState<CardSet[]>([])
  useEffect(() => {
    supabase
      .from('sets')
      .select('*')
      .order('code')
      .then(({ data }) => setSets(data ?? []))
  }, [])
  return sets
}

function useCardList(params: { name: string; setCode: string; rarity: string; sort: SortValue; initialPage: number }) {
  const debouncedName = useDebouncedValue(params.name, 300)
  const [cards, setCards] = useState<ListedCard[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(params.initialPage)

  // Reset la pagination uniquement quand les filtres/tri changent VRAIMENT
  // (comparaison de valeurs), pas via un simple flag "premier passage" —
  // React.StrictMode exécute les effets deux fois en dev pour détecter ce
  // genre de bug, et un flag booléen se fait piéger par ce double appel
  // (il se remet à zéro juste après avoir restauré la bonne page).
  const prevFilters = useRef({
    debouncedName: params.name,
    setCode: params.setCode,
    rarity: params.rarity,
    sort: params.sort,
  })
  useEffect(() => {
    const prev = prevFilters.current
    const changed =
      prev.debouncedName !== debouncedName ||
      prev.setCode !== params.setCode ||
      prev.rarity !== params.rarity ||
      prev.sort !== params.sort

    prevFilters.current = { debouncedName, setCode: params.setCode, rarity: params.rarity, sort: params.sort }

    if (changed) setPage(0)
  }, [debouncedName, params.setCode, params.rarity, params.sort])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function run() {
      // On recharge toujours depuis le début jusqu'à la page courante en une
      // seule requête (plutôt que d'accumuler page par page), ce qui permet
      // de restaurer directement "page 3" après un retour en arrière sans
      // avoir à rejouer les pages 0, 1 et 2 une par une.
      const upperBound = (page + 1) * PAGE_SIZE
      let query = supabase
        .from('cards')
        .select(
          'id, external_id, name, collector_number, variant, rarity, image_url, set:sets!inner(code), card_prices(price, currency)',
        )
        .range(0, upperBound)

      switch (params.sort) {
        case 'number_asc':
          query = query.order('collector_number', { ascending: true }).order('id')
          break
        case 'number_desc':
          query = query.order('collector_number', { ascending: false }).order('id')
          break
        case 'rarity_asc':
          query = query.order('rarity_rank', { ascending: true }).order('id')
          break
        case 'rarity_desc':
          query = query.order('rarity_rank', { ascending: false }).order('id')
          break
        case 'price_asc':
          query = query
            .order('price', { foreignTable: 'card_prices', ascending: true, nullsFirst: false })
            .order('id')
          break
        case 'price_desc':
          query = query
            .order('price', { foreignTable: 'card_prices', ascending: false, nullsFirst: false })
            .order('id')
          break
        default:
          query = query.order('name', { ascending: true }).order('id')
      }

      if (debouncedName.trim()) {
        query = query.ilike('name', `%${debouncedName.trim()}%`)
      }
      if (params.setCode) {
        query = query.eq('set.code', params.setCode)
      }
      if (params.rarity === 'signed') {
        query = query.eq('is_signed', true)
      } else if (params.rarity === 'overnumbered') {
        // Une carte signée qui est aussi overnumbered ne compte que dans
        // "Signée", pas en plus dans "Overnumbered" générique.
        query = query.eq('is_overnumbered', true).eq('is_signed', false)
      } else if (params.rarity === 'showcase') {
        // Une carte signée ou overnumbered ne compte que dans son propre
        // filtre, pas aussi dans "Showcase" générique.
        query = query.eq('rarity', 'showcase').eq('is_signed', false).eq('is_overnumbered', false)
      } else if (params.rarity) {
        query = query.eq('rarity', params.rarity)
      }

      const { data, error } = await query
      if (cancelled) return
      setLoading(false)

      if (error) {
        console.error(error)
        return
      }

      const rows = (data ?? []) as unknown as ListedCard[]
      setHasMore(rows.length > upperBound)
      setCards(rows.slice(0, upperBound))
    }

    run()
    return () => {
      cancelled = true
    }
  }, [debouncedName, params.setCode, params.rarity, params.sort, page])

  return { cards, loading, hasMore, page, loadMore: () => setPage((p) => p + 1) }
}

const VARIANT_LABELS: Record<string, string> = {
  '': '',
  a: 'Alt art',
  star: 'Signature',
}

// Une seule requête groupée pour savoir quelles cartes (parmi celles
// actuellement affichées) sont possédées/en wishlist, plutôt qu'une requête
// par vignette (problème classique du "N+1 requêtes").
function useOwnershipMap(cardIds: string[]) {
  const { user } = useAuth()
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user || cardIds.length === 0) return

    supabase
      .from('wishlist_items')
      .select('card_id')
      .eq('user_id', user.id)
      .in('card_id', cardIds)
      .then(({ data }) => {
        setWishlistIds((prev) => new Set([...prev, ...(data ?? []).map((r) => r.card_id)]))
      })

    supabase
      .from('user_cards')
      .select('card_id')
      .eq('user_id', user.id)
      .in('card_id', cardIds)
      .then(({ data }) => {
        setOwnedIds((prev) => new Set([...prev, ...(data ?? []).map((r) => r.card_id)]))
      })
    // On ne veut relancer que quand la LISTE d'ids change (nouvelle page
    // chargée), pas à chaque changement de référence du tableau.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cardIds.join(',')])

  async function toggleWishlist(cardId: string) {
    if (!user) return
    if (wishlistIds.has(cardId)) {
      await supabase.from('wishlist_items').delete().eq('user_id', user.id).eq('card_id', cardId)
      setWishlistIds((prev) => {
        const next = new Set(prev)
        next.delete(cardId)
        return next
      })
    } else {
      await supabase.from('wishlist_items').insert({ user_id: user.id, card_id: cardId })
      setWishlistIds((prev) => new Set([...prev, cardId]))
    }
  }

  async function addToCollection(cardId: string) {
    if (!user) return
    await supabase
      .from('user_cards')
      .upsert({ user_id: user.id, card_id: cardId, quantity: 1 }, { onConflict: 'user_id,card_id' })
    setOwnedIds((prev) => new Set([...prev, cardId]))
  }

  return { wishlistIds, ownedIds, toggleWishlist, addToCollection }
}

type CardTileProps = {
  card: ListedCard
  isWishlisted: boolean
  isOwned: boolean
  onToggleWishlist: (cardId: string) => void
  onAddToCollection: (cardId: string) => void
  onNavigateAway: () => void
}

function CardTile({ card, isWishlisted, isOwned, onToggleWishlist, onAddToCollection, onNavigateAway }: CardTileProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }
    onToggleWishlist(card.id)
  }

  function addToCollection(e: React.MouseEvent) {
    e.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }
    onAddToCollection(card.id)
  }

  const label = VARIANT_LABELS[card.variant]
  const collectorLabel = `${card.set.code}-${String(card.collector_number).padStart(3, '0')}`

  return (
    <Link
      to={`/cards/${card.external_id ?? card.id}`}
      onClick={onNavigateAway}
      className="relative block aspect-[3/4] overflow-hidden rounded-md border border-zinc-800 bg-zinc-900"
    >
      {card.image_url ? (
        <img src={card.image_url} alt={card.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[11px] text-zinc-600">
          {card.name}
        </div>
      )}

      {isOwned && (
        <span className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-emerald-950">
          ✓
        </span>
      )}

      <div className="absolute bottom-1.5 right-1.5 flex flex-col items-stretch gap-1">
        <div className="flex items-center justify-center gap-1 whitespace-nowrap rounded bg-white/80 px-1.5 py-0.5">
          <span className="text-[9px] font-medium text-zinc-900">{collectorLabel}</span>
          <span className="text-[10px] font-medium text-zinc-900">
            {card.card_prices ? `${card.card_prices.price.toFixed(2)} €` : '—'}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={toggleWishlist}
            aria-label="Ajouter à la wishlist"
            className={`flex-1 rounded py-1 text-[13px] ${isWishlisted ? 'bg-zinc-900 text-white' : 'bg-white/80 text-zinc-900'}`}
          >
            ♥
          </button>
          <button
            onClick={addToCollection}
            aria-label="Ajouter à la collection"
            className="flex-1 rounded bg-white/80 py-1 text-[13px] text-zinc-900"
          >
            +
          </button>
        </div>
      </div>

      {label && (
        <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
          {label}
        </span>
      )}
    </Link>
  )
}

export function CardList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sets = useSetsList()

  const name = searchParams.get('name') ?? ''
  const setCode = searchParams.get('set') ?? ''
  const rarity = searchParams.get('rarity') ?? ''
  const sort = (searchParams.get('sort') as SortValue) || 'name_asc'

  // Clé de restauration propre à cette combinaison de filtres/tri : si les
  // filtres changent, on ne restaure pas un scroll qui n'a plus de sens.
  const restoreKey = `cardlist-scroll:${searchParams.toString()}`

  const restored = useMemo(() => {
    const raw = sessionStorage.getItem(restoreKey)
    if (!raw) return null
    try {
      return JSON.parse(raw) as { page: number; scrollY: number }
    } catch {
      return null
    }
    // On ne lit la valeur sauvegardée qu'une fois, au tout premier rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { cards, loading, hasMore, page, loadMore } = useCardList({
    name,
    setCode,
    rarity,
    sort,
    initialPage: restored?.page ?? 0,
  })
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards])
  const { wishlistIds, ownedIds, toggleWishlist, addToCollection } = useOwnershipMap(cardIds)

  // Sauvegarde de la position ET du nombre de pages chargées, déclenchée
  // explicitement au clic sur une carte plutôt qu'en continu au scroll.
  // Sauvegarder en continu créait une course : au clic, React démonte
  // CardList (page plus courte) avant que CardDetail ne monte, ce qui fait
  // recalculer/clamper la position de scroll par le navigateur — un dernier
  // événement de scroll à une position quasi nulle écrasait alors la bonne
  // valeur juste avant la navigation.
  function saveScrollPosition() {
    sessionStorage.setItem(restoreKey, JSON.stringify({ page, scrollY: window.scrollY }))
  }

  // Une fois les cartes restaurées chargées, on repositionne le scroll.
  // Ne se déclenche qu'une fois, quand les données sont prêtes.
  const hasRestoredScroll = useRef(false)
  useEffect(() => {
    if (hasRestoredScroll.current) return
    if (loading) return
    if (!restored) {
      hasRestoredScroll.current = true
      return
    }
    window.scrollTo({ top: restored.scrollY })
    hasRestoredScroll.current = true
  }, [loading, restored])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const activeSet = useMemo(() => sets.find((s) => s.code === setCode), [sets, setCode])

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center gap-2.5">
          <Link
            to="/"
            aria-label="Retour"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800"
          >
            ←
          </Link>
          <span className="text-base font-medium">
            Toutes les cartes{activeSet ? ` — ${activeSet.name}` : ''}
          </span>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => updateParam('name', e.target.value)}
          placeholder="Rechercher une carte"
          className="mb-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />

        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={setCode}
            onChange={(e) => updateParam('set', e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
          >
            <option value="">Tous les sets</option>
            {sets.map((s) => (
              <option key={s.id} value={s.code}>
                {s.code}
              </option>
            ))}
          </select>
          <select
            value={rarity}
            onChange={(e) => updateParam('rarity', e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
          >
            <option value="">Toutes raretés</option>
            {RARITY_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {cards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              isWishlisted={wishlistIds.has(card.id)}
              isOwned={ownedIds.has(card.id)}
              onToggleWishlist={toggleWishlist}
              onAddToCollection={addToCollection}
              onNavigateAway={saveScrollPosition}
            />
          ))}
        </div>

        {!loading && cards.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-500">Aucune carte trouvée.</p>
        )}

        {hasMore && (
          <button
            onClick={loadMore}
            className="mx-auto mt-6 block rounded-md border border-zinc-800 px-4 py-2 text-sm"
          >
            Charger plus
          </button>
        )}
      </div>
    </div>
  )
}