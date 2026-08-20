import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { RARITY_STYLES } from '../lib/rarity'
import type { Card, CardSet } from '../types/database'

const VARIANT_LABELS: Record<string, string> = {
  '': 'Standard',
  a: 'Alt art',
  star: 'Signature',
}

type CardWithSet = Card & { set: CardSet }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function useCard(cardId: string | undefined) {
  const [card, setCard] = useState<CardWithSet | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!cardId) return
    setLoading(true)
    setNotFound(false)

    // La colonne `id` est un uuid : lui passer une valeur non-uuid dans un
    // filtre .eq() fait planter toute la requête (erreur de cast Postgres),
    // pas juste cette partie du OR. On ne l'utilise donc que si cardId a
    // vraiment le format d'un uuid ; sinon on filtre uniquement sur
    // external_id (le cas normal, vu que c'est ce que génèrent nos liens).
    const query = UUID_REGEX.test(cardId)
      ? supabase.from('cards').select('*, set:sets(*)').or(`external_id.eq.${cardId},id.eq.${cardId}`)
      : supabase.from('cards').select('*, set:sets(*)').eq('external_id', cardId)

    query.maybeSingle().then(({ data, error }) => {
      setLoading(false)
      if (error) {
        console.error(error)
        setNotFound(true)
        return
      }
      if (!data) {
        setNotFound(true)
        return
      }
      setCard(data as unknown as CardWithSet)
    })
  }, [cardId])

  return { card, loading, notFound }
}

function usePrice(cardId: string | undefined) {
  const [price, setPrice] = useState<{ price: number; currency: string } | null>(null)

  useEffect(() => {
    if (!cardId) return
    supabase
      .from('card_prices')
      .select('price, currency')
      .eq('card_id', cardId)
      .maybeSingle()
      .then(({ data }) => setPrice(data))
  }, [cardId])

  return price
}

function useOwnership(cardId: string | undefined) {
  const { user } = useAuth()
  const [quantity, setQuantity] = useState(0)
  const [inWishlist, setInWishlist] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function refresh() {
    if (!user || !cardId) {
      setLoaded(true)
      return
    }

    const [{ data: userCard }, { data: wishlistItem }] = await Promise.all([
      supabase
        .from('user_cards')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('card_id', cardId)
        .maybeSingle(),
      supabase
        .from('wishlist_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('card_id', cardId)
        .maybeSingle(),
    ])

    setQuantity(userCard?.quantity ?? 0)
    setInWishlist(Boolean(wishlistItem))
    setLoaded(true)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cardId])

  async function setQuantityTo(next: number) {
    if (!user || !cardId) return

    if (next <= 0) {
      await supabase.from('user_cards').delete().eq('user_id', user.id).eq('card_id', cardId)
      setQuantity(0)
      return
    }

    await supabase
      .from('user_cards')
      .upsert(
        { user_id: user.id, card_id: cardId, quantity: next },
        { onConflict: 'user_id,card_id' },
      )
    setQuantity(next)
  }

  async function toggleWishlist() {
    if (!user || !cardId) return

    if (inWishlist) {
      await supabase.from('wishlist_items').delete().eq('user_id', user.id).eq('card_id', cardId)
      setInWishlist(false)
    } else {
      await supabase.from('wishlist_items').insert({ user_id: user.id, card_id: cardId })
      setInWishlist(true)
    }
  }

  return { quantity, inWishlist, loaded, setQuantityTo, toggleWishlist }
}

export function CardDetail() {
  const { cardId } = useParams<{ cardId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { card, loading, notFound } = useCard(cardId)
  const price = usePrice(card?.id)
  const { quantity, inWishlist, setQuantityTo, toggleWishlist } = useOwnership(card?.id)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        Chargement...
      </div>
    )
  }

  if (notFound || !card) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-100">
        <p className="text-sm text-zinc-400">Carte introuvable.</p>
        <Link to="/" className="text-sm underline">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  const rarityStyle = RARITY_STYLES[card.rarity]
  const collectorLabel = `${card.set.code}-${String(card.collector_number).padStart(3, '0')}`

  function requireAuth(action: () => void) {
    if (!user) {
      navigate('/login')
      return
    }
    action()
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-2.5">
            <button
              onClick={() => navigate(-1)}
              aria-label="Retour"
              className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800"
            >
              ←
            </button>
            <div>
              <p className="text-base font-medium">{card.name}</p>
              <p className="text-xs text-zinc-400">
                {card.set.name} · {collectorLabel}
                {card.variant && ` · ${VARIANT_LABELS[card.variant] ?? card.variant}`}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => requireAuth(toggleWishlist)}
              aria-label="Ajouter à la wishlist"
              className={`flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 ${inWishlist ? 'bg-zinc-100 text-zinc-900' : ''}`}
            >
              ♥
            </button>
            <button
              onClick={() => requireAuth(() => setQuantityTo(quantity + 1))}
              aria-label="Ajouter à la collection"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800"
            >
              +
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className={`rounded px-2.5 py-1 text-xs ${rarityStyle.bg} ${rarityStyle.text}`}>
            {rarityStyle.label}
          </span>
          {card.rarity === 'showcase' && card.is_overnumbered && (
            <span className="rounded border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
              Overnumbered
            </span>
          )}
          {card.is_signed && (
            <span className="rounded border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
              Signée
            </span>
          )}
        </div>

        <div className="mb-5 flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-900">
          {card.image_url ? (
            <img src={card.image_url} alt={card.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-zinc-500">Pas d'image</span>
          )}
        </div>

        {user && (
          <div className="mb-4 flex items-center justify-between rounded-md bg-zinc-900 px-4 py-3">
            <span className="text-sm text-zinc-400">Possédée</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantityTo(Math.max(0, quantity - 1))}
                aria-label="Retirer un exemplaire"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800"
              >
                −
              </button>
              <span className="min-w-4 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantityTo(quantity + 1)}
                aria-label="Ajouter un exemplaire"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800"
              >
                +
              </button>
            </div>
          </div>
        )}

        {card.illustrator && (
          <div className="mb-4 border-t border-zinc-800 pt-3">
            <p className="text-xs text-zinc-400">Illustrateur</p>
            <p className="text-sm">{card.illustrator}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Prix actuel</p>
            <p className="text-lg font-medium">
              {price ? `${price.price.toFixed(2)} ${price.currency}` : 'Non renseigné'}
            </p>
          </div>
          <a
            href={`https://www.cardmarket.com/en/Riftbound/Products/Search?searchString=${encodeURIComponent(card.name)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-2 text-sm"
          >
            Voir sur Cardmarket ↗
          </a>
        </div>
      </div>
    </div>
  )
}