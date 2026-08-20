import type { Rarity } from '../types/database'

export const RARITY_STYLES: Record<Rarity, { label: string; bg: string; text: string }> = {
  common: { label: 'Commune', bg: 'bg-zinc-700', text: 'text-zinc-200' },
  uncommon: { label: 'Peu commune', bg: 'bg-blue-900', text: 'text-blue-200' },
  rare: { label: 'Rare', bg: 'bg-violet-900', text: 'text-violet-200' },
  epic: { label: 'Épique', bg: 'bg-[#E8590C]', text: 'text-zinc-950' },
  showcase: { label: 'Showcase', bg: 'bg-[#F2B705]', text: 'text-zinc-950' },
}