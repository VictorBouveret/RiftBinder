import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { CardTile } from './CardTile'
import type { CardSet, Rarity } from '../types/database'

type GridSize = 'small' | 'medium' | 'large'

const GRID_COLS: Record<GridSize, number> = { small: 6, medium: 4, large: 3 }

type RarityFilterValue = Rarity | 'signed' | 'overnumbered'

// Ordre d'affichage uniquement : les libellés viennent de la traduction
// (clé rarity.<value>), pas codés en dur ici.
const RARITY_FILTER_VALUES: RarityFilterValue[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'showcase',
  'overnumbered',
  'signed',
]

type SortValue = 'added_desc' | 'name_asc' | 'number_asc' | 'number_desc' | 'rarity_asc' | 'rarity_desc'

const SORT_VALUES: { value: SortValue; labelKey: string }[] = [
  { value: 'added_desc', labelKey: 'collectionGrid.sortRecent' },
  { value: 'name_asc', labelKey: 'cardList.sortName' },
  { value: 'number_asc', labelKey: 'cardList.sortNumberAsc' },
  { value: 'number_desc', labelKey: 'cardList.sortNumberDesc' },
  { value: 'rarity_desc', labelKey: 'cardList.sortRarityDesc' },
  { value: 'rarity_asc', labelKey: 'cardList.sortRarityAsc' },
  // Tri par prix volontairement absent : à ajouter avec la vraie source de
  // pricing (cf. remarque de Victor sur le brise-égalité par id à remplacer).
]

type ManagedCard = {
  linkId: string
  quantity: number | null
  card: {
    id: string
    external_id: string | null
    name: string
    collector_number: number
    variant: string
    image_url: string | null
    set: { code: string }
    card_prices: { price: number; currency: string } | null
  }
}

type Mode = 'collection' | 'wishlist'

function useManagedCards(
  mode: Mode,
  params: { name: string; setCode: string; rarity: string; sort: SortValue },
) {
  const { user } = useAuth()
  const debouncedName = useDebouncedValue(params.name, 300)
  const [items, setItems] = useState<ManagedCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)

    async function run() {
      const table = mode === 'collection' ? 'user_cards' : 'wishlist_items'
      const cardFields =
        'id, external_id, name, collector_number, variant, image_url, rarity, is_signed, is_overnumbered, set:sets(code), card_prices(price, currency)'
      const selectFields =
        mode === 'collection'
          ? `id, quantity, added_at, card:cards!inner(${cardFields})`
          : `id, added_at, card:cards!inner(${cardFields})`

      let query = supabase.from(table).select(selectFields).eq('user_id', user!.id)

      switch (params.sort) {
        case 'name_asc':
          query = query.order('name', { foreignTable: 'card', ascending: true })
          break
        case 'number_asc':
          query = query.order('collector_number', { foreignTable: 'card', ascending: true })
          break
        case 'number_desc':
          query = query.order('collector_number', { foreignTable: 'card', ascending: false })
          break
        case 'rarity_asc':
          query = query.order('rarity_rank', { foreignTable: 'card', ascending: true })
          break
        case 'rarity_desc':
          query = query.order('rarity_rank', { foreignTable: 'card', ascending: false })
          break
        default:
          query = query.order('added_at', { ascending: false })
      }

      if (debouncedName.trim()) {
        query = query.ilike('card.search_text', `%${debouncedName.trim()}%`)
      }
      if (params.setCode) {
        query = query.eq('card.set.code', params.setCode)
      }

      if (params.rarity === 'signed') {
        query = query.eq('card.is_signed', true)
      } else if (params.rarity === 'overnumbered') {
        query = query.eq('card.is_overnumbered', true).eq('card.is_signed', false)
      } else if (params.rarity === 'showcase') {
        query = query
          .eq('card.rarity', 'showcase')
          .eq('card.is_signed', false)
          .eq('card.is_overnumbered', false)
      } else if (params.rarity) {
        query = query.eq('card.rarity', params.rarity)
      }

      const { data, error } = await query
      if (cancelled) return
      setLoading(false)

      if (error) {
        console.error(error)
        return
      }

      const rows = (data ?? []) as unknown as Array<{ id: string; quantity?: number; card: ManagedCard['card'] }>
      setItems(rows.map((r) => ({ linkId: r.id, quantity: r.quantity ?? null, card: r.card })))
    }

    run()
    return () => {
      cancelled = true
    }
  }, [user, mode, debouncedName, params.setCode, params.rarity])

  return { items, loading, setItems }
}

type CardManagementGridProps = {
  mode: Mode
}

export function CardManagementGrid({ mode }: CardManagementGridProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [gridSize, setGridSize] = useState<GridSize>('medium')

  const title = mode === 'collection' ? t('collectionGrid.myCollection') : t('collectionGrid.myWishlist')

  const name = searchParams.get('name') ?? ''
  const setCode = searchParams.get('set') ?? ''
  const rarity = searchParams.get('rarity') ?? ''
  const sort = (searchParams.get('sort') as SortValue) || 'added_desc'

  const { items, loading, setItems } = useManagedCards(mode, { name, setCode, rarity, sort })
  const [sets, setSets] = useState<CardSet[]>([])

  // Restauration de scroll, même principe que sur CardList : clé propre à
  // cette combinaison de filtres (mode inclus, pour ne pas confondre
  // collection et wishlist), sauvegarde déclenchée explicitement au clic
  // sur une carte plutôt qu'en continu au scroll (voir le commentaire dans
  // CardList.tsx pour le détail de la course évitée).
  const restoreKey = `${mode}-scroll:${searchParams.toString()}`

  function saveScrollPosition() {
    sessionStorage.setItem(restoreKey, String(window.scrollY))
  }

  const hasRestoredScroll = useRef(false)
  useEffect(() => {
    if (hasRestoredScroll.current) return
    if (loading) return
    const raw = sessionStorage.getItem(restoreKey)
    if (raw) {
      window.scrollTo({ top: Number(raw) })
    }
    hasRestoredScroll.current = true
    // On ne veut restaurer qu'une fois, au premier chargement complet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  useEffect(() => {
    supabase
      .from('sets')
      .select('*')
      .order('code')
      .then(({ data }) => setSets(data ?? []))
  }, [])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  async function removeFromCollection(linkId: string, cardId: string, currentQuantity: number | null) {
    if (!user) return
    const nextQuantity = (currentQuantity ?? 1) - 1

    if (nextQuantity <= 0) {
      await supabase.from('user_cards').delete().eq('id', linkId)
      setItems((prev) => prev.filter((i) => i.linkId !== linkId))
      return
    }

    await supabase.from('user_cards').update({ quantity: nextQuantity }).eq('id', linkId)
    setItems((prev) =>
      prev.map((i) => (i.linkId === linkId ? { ...i, quantity: nextQuantity } : i)),
    )
    void cardId
  }

  async function removeFromWishlist(linkId: string) {
    await supabase.from('wishlist_items').delete().eq('id', linkId)
    setItems((prev) => prev.filter((i) => i.linkId !== linkId))
  }

  async function addToCollectionFromWishlist(cardId: string) {
    if (!user) return
    await supabase
      .from('user_cards')
      .upsert({ user_id: user.id, card_id: cardId, quantity: 1 }, { onConflict: 'user_id,card_id' })
  }

  return (
    <div className="px-4 py-6 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-3 text-base font-medium">{title}</h1>

        <input
          type="text"
          value={name}
          onChange={(e) => updateParam('name', e.target.value)}
          placeholder={t('common.search')}
          className="mb-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <select
              value={setCode}
              onChange={(e) => updateParam('set', e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
            >
              <option value="">{t('cardList.allSets')}</option>
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
              <option value="">{t('cardList.allRarities')}</option>
              {RARITY_FILTER_VALUES.map((v) => (
                <option key={v} value={v}>
                  {t(`rarity.${v}`)}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
            >
              {SORT_VALUES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setGridSize('small')}
              aria-label={t('collectionGrid.gridSmall')}
              className={`flex h-8 w-8 items-center justify-center rounded-md border ${gridSize === 'small' ? 'border-transparent bg-zinc-100 text-zinc-900' : 'border-zinc-800'}`}
            >
              ▦
            </button>
            <button
              onClick={() => setGridSize('medium')}
              aria-label={t('collectionGrid.gridMedium')}
              className={`flex h-8 w-8 items-center justify-center rounded-md border ${gridSize === 'medium' ? 'border-transparent bg-zinc-100 text-zinc-900' : 'border-zinc-800'}`}
            >
              ▤
            </button>
            <button
              onClick={() => setGridSize('large')}
              aria-label={t('collectionGrid.gridLarge')}
              className={`flex h-8 w-8 items-center justify-center rounded-md border ${gridSize === 'large' ? 'border-transparent bg-zinc-100 text-zinc-900' : 'border-zinc-800'}`}
            >
              ▢
            </button>
          </div>
        </div>

        <div
          className="grid gap-3"
          style={
            gridSize === 'small'
              ? { gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }
              : { gridTemplateColumns: `repeat(${GRID_COLS[gridSize]}, minmax(0, 1fr))` }
          }
        >
          {items.map((item) =>
            mode === 'collection' ? (
              <CardTile
                key={item.linkId}
                card={item.card}
                mode="collection"
                compact={gridSize === 'small'}
                quantity={item.quantity}
                onRemoveFromCollection={() =>
                  removeFromCollection(item.linkId, item.card.id, item.quantity)
                }
                onNavigateAway={saveScrollPosition}
              />
            ) : (
              <CardTile
                key={item.linkId}
                card={item.card}
                mode="wishlist"
                compact={gridSize === 'small'}
                isWishlisted
                onToggleWishlist={() => removeFromWishlist(item.linkId)}
                onAddToCollection={() => addToCollectionFromWishlist(item.card.id)}
                onNavigateAway={saveScrollPosition}
              />
            ),
          )}
        </div>

        {!loading && items.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-500">
            {mode === 'collection' ? t('collectionGrid.emptyCollection') : t('collectionGrid.emptyWishlist')}
          </p>
        )}
      </div>
    </div>
  )
}