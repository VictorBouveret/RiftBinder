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

  // Certaines cartes sont marquées "showcase" directement dans la rareté
  // brute de l'API, même en variante standard (ex. certains sets promo).
  if (normalized === 'showcase') return 'showcase'

  if (['common', 'uncommon', 'rare', 'epic'].includes(normalized)) {
    return normalized as Rarity
  }

  console.warn(`  Rareté inconnue "${raw}" pour une carte en variant "${variant}", repli sur "common".`)
  return 'common'
}

// RiftScribe ne fournit aucune métadonnée de "total officiel de cartes" par
// set. Par défaut on estime ce total en excluant les cartes showcase du
// calcul (voir plus bas), mais cette heuristique peut se tromper pour des
// sets avec des cas particuliers. Renseigne ici le vrai total dès que tu le
// connais (wiki communautaire, Cardmarket...) pour le fiabiliser set par
// set, sans dépendre uniquement de l'heuristique.
// RiftScribe ne fournit pas de nom complet par set. Noms anglais confirmés
// (sources communautaires) ; pas de traduction française officielle connue
// à ce jour pour Riftbound — on utilise l'anglais en attendant, à corriger
// ici si une localisation française sort un jour.
const SET_NAMES: Record<string, { en: string; fr: string }> = {
  OGN: { en: 'Origins', fr: 'Origine' },
  OGS: { en: 'Origins: Proving Grounds', fr: 'Origins: Proving Grounds' },
  SFD: { en: 'Spirit Forged', fr: 'Armes Spirituelles' },
  UNL: { en: 'Unleashed', fr: 'Déchaînement' },
  VEN: { en: 'Vendetta', fr: 'Vendetta' },
}

const OFFICIAL_SET_TOTALS: Record<string, number> = {
  OGN: 298, // Origins — confirmé (Cardmarket)
  SFD: 221, // Spiritforged — confirmé (Cardmarket)
  UNL: 219, // Unleashed — confirmé (Cardmarket)
  VEN: 166, // Vendetta — confirmé (dénominateur imprimé sur les cartes du set)
}

// Dates de sortie officielles, non fournies par RiftScribe. Sources
// communautaires (Wikipedia). OGS (Origins: Proving Grounds) est un
// produit compagnon d'Origins — date supposée identique, à vérifier.
const SET_RELEASE_DATES: Record<string, string> = {
  OGN: '2025-10-31', // Origins
  OGS: '2025-10-31', // Origins: Proving Grounds — supposé, à confirmer
  SFD: '2026-02-13', // Spiritforged
  UNL: '2026-05-08', // Unleashed
  VEN: '2026-07-31', // Vendetta
}

// Certaines cartes ont un nom flavor qui ne contient pas le nom du champion
// associé (ex. "Nine-Tailed Fox" est en réalité Ahri) : RiftScribe ne
// fournit cette info nulle part dans son API en masse, donc on maintient
// cette liste à la main au fil des cartes découvertes. Clé = nom exact de
// la carte tel qu'il apparaît dans l'API, valeur = noms à ajouter à la
// recherche.
const CARD_ALIASES: Record<string, string[]> = {
  'Nine-Tailed Fox': ['Ahri'],
  'Prodigal Explorer': ['Ezreal']
}

async function main() {
  console.log('Récupération des cartes depuis RiftScribe...')
  const rawCards = await fetchAllCards()

  // On exclut les tokens pour ce premier import : ils ne sont généralement
  // pas collectionnés/tradés de la même façon que les cartes classiques.
  const filteredCards = rawCards.filter((c) => !c.variant.startsWith('t'))
  console.log(`${filteredCards.length} cartes retenues (hors tokens).`)

  // On calcule la rareté normalisée en amont : on en a besoin à la fois
  // pour le calcul du total_cards (étape suivante) et pour l'upsert final.
  const cards = filteredCards.map((c) => ({
    ...c,
    normalizedRarity: normalizeRarity(c.rarity, c.variant),
  }))

  // Le "total_cards" d'un set = le plus grand collector_number parmi les
  // cartes "normales" (hors showcase), sauf si une valeur officielle a été
  // renseignée manuellement dans OFFICIAL_SET_TOTALS ci-dessus.
  const heuristicTotals = new Map<string, number>()
  for (const c of cards) {
    if (c.normalizedRarity !== 'showcase') {
      heuristicTotals.set(c.set_id, Math.max(heuristicTotals.get(c.set_id) ?? 0, c.collector_number))
    }
  }

  const setTotals = new Map<string, number>()
  for (const code of heuristicTotals.keys()) {
    const official = OFFICIAL_SET_TOTALS[code]
    if (official !== undefined) {
      setTotals.set(code, official)
    } else {
      setTotals.set(code, heuristicTotals.get(code)!)
      console.warn(
        `  Aucun total officiel pour le set "${code}" : repli sur l'heuristique (${heuristicTotals.get(code)}). À vérifier/renseigner dans OFFICIAL_SET_TOTALS si besoin.`,
      )
    }
  }

  console.log(`${setTotals.size} sets détectés, upsert en base...`)
  for (const [code, totalCards] of setTotals) {
    const names = SET_NAMES[code]
    if (!names) {
      console.warn(`  Aucun nom connu pour le set "${code}", repli sur le code brut.`)
    }

    const { error } = await supabase.from('sets').upsert(
      {
        code,
        name: names?.en ?? code,
        name_en: names?.en ?? code,
        name_fr: names?.fr ?? code,
        total_cards: totalCards,
        release_date: SET_RELEASE_DATES[code] ?? null,
      },
      { onConflict: 'code' },
    )
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
        rarity: c.normalizedRarity,
        card_type: c.type,
        illustrator: c.art?.artist ?? null,
        image_url: c.image,
        is_signed: c.variant === 'star',
        is_overnumbered: c.collector_number > (setTotals.get(c.set_id) ?? c.collector_number),
        alt_names: CARD_ALIASES[c.name] ?? [],
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