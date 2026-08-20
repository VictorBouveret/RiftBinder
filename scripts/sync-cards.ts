/**
 * Import/synchronise le catalogue de cartes Riftbound depuis l'API publique
 * RiftScribe (https://riftscribe.gg/api-docs) vers Supabase.
 *
 * Utilise la clé secrète Supabase (bypass RLS) car ce script doit pouvoir
 * écrire dans `sets` et `cards`, qui n'ont aucune policy d'insertion pour
 * les rôles publics — volontairement, pour que seul un script serveur de
 * confiance puisse modifier le catalogue.
 *
 * Usage : npm run sync:cards
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    'Variables manquantes : renseigne SUPABASE_URL et SUPABASE_SECRET_KEY dans .env (sans préfixe VITE_, ce script ne doit jamais tourner dans le navigateur).',
  )
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

const API_BASE = 'https://riftscribe.gg/api'
const PAGE_SIZE = 200

type RiftScribeCard = {
  id: string
  name: string
  set_id: string
  collector_number: number
  variant: string
  rarity: string | null
  faction: string | null
  type: string | null
  image: string | null
  art: { artist: string | null } | null
  is_banned: boolean
}

async function fetchAllCards(): Promise<RiftScribeCard[]> {
  const all: RiftScribeCard[] = []
  let offset = 0

  while (true) {
    const url = `${API_BASE}/cards?limit=${PAGE_SIZE}&offset=${offset}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`RiftScribe API a répondu ${res.status} pour ${url}`)
    }
    const page = (await res.json()) as RiftScribeCard[]
    all.push(...page)
    console.log(`  ${all.length} cartes récupérées...`)

    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
    // On reste respectueux envers une API communautaire gratuite.
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return all
}

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'showcase'

function normalizeRarity(raw: string | null, variant: string): Rarity {
  // Toute variante alt-art ou signature est traitée comme "showcase",
  // indépendamment de la rareté de base de la carte — c'est ce qu'on voit
  // physiquement sur la carte (hexagone jaune) qui compte pour le tracker.
  if (variant === 'a' || variant === 'star') return 'showcase'

  const normalized = (raw ?? '').toLowerCase()
  if (['common', 'uncommon', 'rare', 'epic'].includes(normalized)) {
    return normalized as Rarity
  }

  console.warn(`  Rareté inconnue "${raw}" pour une carte en variant "${variant}", repli sur "common".`)
  return 'common'
}

async function main() {
  console.log('Récupération des cartes depuis RiftScribe...')
  const rawCards = await fetchAllCards()

  // On exclut les tokens pour ce premier import : ils ne sont généralement
  // pas collectionnés/tradés de la même façon que les cartes classiques.
  const cards = rawCards.filter((c) => !c.variant.startsWith('t'))
  console.log(`${cards.length} cartes retenues (hors tokens).`)

  // Le "total_cards" d'un set = le plus grand collector_number parmi les
  // cartes de base (variant vide). Sert à calculer côté front si une carte
  // showcase est "overnumbered" (collector_number > total_cards du set).
  const setTotals = new Map<string, number>()
  for (const c of cards) {
    if (c.variant === '') {
      setTotals.set(c.set_id, Math.max(setTotals.get(c.set_id) ?? 0, c.collector_number))
    }
  }

  console.log(`${setTotals.size} sets détectés, upsert en base...`)
  for (const [code, totalCards] of setTotals) {
    const { error } = await supabase
      .from('sets')
      .upsert({ code, name: code, total_cards: totalCards }, { onConflict: 'code' })
    if (error) throw error
  }

  const { data: setsRows, error: setsError } = await supabase.from('sets').select('id, code')
  if (setsError) throw setsError
  const setIdByCode = new Map(setsRows.map((s) => [s.code, s.id as string]))

  console.log(`Upsert de ${cards.length} cartes...`)
  const BATCH_SIZE = 200

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE).map((c) => {
      const setId = setIdByCode.get(c.set_id)
      if (!setId) throw new Error(`Set inconnu en base : ${c.set_id}`)

      return {
        external_id: c.id,
        set_id: setId,
        collector_number: c.collector_number,
        variant: c.variant,
        name: c.name,
        faction: c.faction,
        rarity: normalizeRarity(c.rarity, c.variant),
        card_type: c.type,
        illustrator: c.art?.artist ?? null,
        image_url: c.image,
        is_signed: c.variant === 'star',
      }
    })

    const { error } = await supabase
      .from('cards')
      .upsert(batch, { onConflict: 'set_id,collector_number,variant' })
    if (error) throw error

    console.log(`  ${Math.min(i + BATCH_SIZE, cards.length)}/${cards.length}`)
  }

  console.log('Import terminé.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})