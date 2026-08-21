export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'showcase'

export type CardSet = {
  id: string
  code: string
  name: string
  name_en: string | null
  name_fr: string | null
  release_date: string | null
  total_cards: number
}

export type Card = {
  id: string
  external_id: string | null
  set_id: string
  collector_number: number
  variant: string
  name: string
  faction: string | null
  rarity: Rarity
  card_type: string | null
  illustrator: string | null
  image_url: string | null
  is_signed: boolean
  is_overnumbered: boolean
  alt_names: string[]
}

export type CardWithSet = Card & { set: Pick<CardSet, 'code' | 'name'> }