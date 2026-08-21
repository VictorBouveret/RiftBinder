import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export type CardTileData = {
  id: string
  external_id: string | null
  name: string
  collector_number: number
  variant: string
  image_url: string | null
  set: { code: string }
  card_prices: { price: number; currency: string } | null
}

type CardTileMode = 'browse' | 'collection' | 'wishlist'

type CardTileProps = {
  card: CardTileData
  mode: CardTileMode
  isWishlisted?: boolean
  isOwned?: boolean
  quantity?: number | null
  onToggleWishlist?: () => void
  onAddToCollection?: () => void
  onRemoveFromCollection?: () => void
  onNavigateAway?: () => void
  compact?: boolean // vrai pour la grille "petite" de Collection/Wishlist : image seule
}

// Vignette partagée par CardList et CardManagementGrid : image en grand,
// nom + prix affichés en dessous plutôt qu'en overlay (inspiré des fiches
// produit Cardmarket), actions wishlist/collection en icônes discrètes.
export function CardTile({
  card,
  mode,
  isWishlisted = false,
  isOwned = false,
  quantity = null,
  onToggleWishlist,
  onAddToCollection,
  onRemoveFromCollection,
  onNavigateAway,
  compact = false,
}: CardTileProps) {
  const { t } = useTranslation()

  const variantLabel =
    card.variant === 'a' ? t('variant.altArt') : card.variant === 'star' ? t('variant.signature') : ''
  const collectorLabel = `${card.set.code}-${String(card.collector_number).padStart(3, '0')}`

  function withoutNavigation(action?: () => void) {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      if (!action) return
      action()
    }
  }

  if (compact) {
    return (
      <Link
        to={`/cards/${card.external_id ?? card.id}`}
        onClick={onNavigateAway}
        className="relative block aspect-[3/4] overflow-hidden rounded-md border border-zinc-800 bg-zinc-900"
      >
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-zinc-600">
            {card.name}
          </div>
        )}
        {isOwned && (
          <span className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-emerald-950">
            ✓
          </span>
        )}
        {quantity && quantity > 1 && (
          <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
            x{quantity}
          </span>
        )}
      </Link>
    )
  }

  return (
    <Link
      to={`/cards/${card.external_id ?? card.id}`}
      onClick={onNavigateAway}
      className="block overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700"
    >
      <div className="relative aspect-[3/4] w-full bg-zinc-950">
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-xs text-zinc-600">
            {card.name}
          </div>
        )}
        {isOwned && (
          <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-emerald-950">
            ✓
          </span>
        )}
        {quantity && quantity > 1 && (
          <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
            x{quantity}
          </span>
        )}
      </div>

      <div className="p-2.5">
        <p className="line-clamp-2 text-sm font-medium leading-tight text-zinc-100">{card.name}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {collectorLabel}
          {variantLabel && ` · ${variantLabel}`}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-100">
            {card.card_prices ? `${card.card_prices.price.toFixed(2)} €` : '—'}
          </span>

          <div className="flex gap-1">
            {mode !== 'collection' && (
              <button
                onClick={withoutNavigation(onToggleWishlist)}
                aria-label={t('cardDetail.addToWishlist')}
                className={`flex h-7 w-7 items-center justify-center rounded-md border text-sm ${
                  isWishlisted
                    ? 'border-transparent bg-zinc-100 text-zinc-900'
                    : 'border-zinc-700 text-zinc-300'
                }`}
              >
                ♥
              </button>
            )}
            {mode === 'collection' ? (
              <button
                onClick={withoutNavigation(onRemoveFromCollection)}
                aria-label={t('collectionGrid.removeFromCollection')}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 text-sm text-zinc-300"
              >
                ⊟
              </button>
            ) : (
              <button
                onClick={withoutNavigation(onAddToCollection)}
                aria-label={t('cardDetail.addToCollection')}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 text-sm text-zinc-300"
              >
                +
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}