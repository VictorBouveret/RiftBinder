import type { Rarity } from '../types/database'

// Le libellé affiché vient maintenant de la traduction (clé rarity.<value>)
// plutôt que d'être codé en dur ici, pour rester cohérent quelle que soit
// la langue choisie dans les paramètres.
export const RARITY_STYLES: Record<Rarity, { bg: string; text: string }> = {
  common: { bg: 'bg-zinc-700', text: 'text-zinc-200' },
  uncommon: { bg: 'bg-blue-900', text: 'text-blue-200' },
  rare: { bg: 'bg-violet-900', text: 'text-violet-200' },
  epic: { bg: 'bg-[#E8590C]', text: 'text-zinc-950' },
  showcase: { bg: 'bg-[#F2B705]', text: 'text-zinc-950' },
}