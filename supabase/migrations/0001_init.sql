-- Extensions
create extension if not exists "pgcrypto";

-- Sets (expansions)
create table sets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  release_date date,
  total_cards int not null default 0,
  created_at timestamptz not null default now()
);

-- Cards
create table cards (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  set_id uuid not null references sets(id) on delete cascade,
  collector_number int not null,
  name text not null,
  faction text,
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'showcase')),
  card_type text,
  illustrator text,
  image_url text,
  is_signed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (set_id, collector_number)
);

create index idx_cards_set_id on cards(set_id);
create index idx_cards_name on cards(name);
create index idx_cards_rarity on cards(rarity);

-- Current price per card (1-1). Historique possible plus tard via une table séparée.
create table card_prices (
  card_id uuid primary key references cards(id) on delete cascade,
  price numeric(10, 2) not null,
  currency text not null default 'EUR',
  source text,
  updated_at timestamptz not null default now()
);

-- Profil utilisateur (étend auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'fr',
  currency text not null default 'EUR',
  theme text not null default 'dark' check (theme in ('light', 'dark', 'auto')),
  created_at timestamptz not null default now()
);

-- Collection de l'utilisateur
create table user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  quantity int not null default 1 check (quantity >= 0),
  condition text check (condition in ('mint', 'near_mint', 'excellent', 'good', 'light_played', 'played', 'poor')),
  added_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index idx_user_cards_user_id on user_cards(user_id);

-- Wishlist de l'utilisateur
create table wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index idx_wishlist_items_user_id on wishlist_items(user_id);

-- Création automatique du profil à l'inscription
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table sets enable row level security;
alter table cards enable row level security;
alter table card_prices enable row level security;
alter table profiles enable row level security;
alter table user_cards enable row level security;
alter table wishlist_items enable row level security;

-- Lecture publique : catalogue de cartes, sets, prix
create policy "Sets are publicly readable"
  on sets for select using (true);

create policy "Cards are publicly readable"
  on cards for select using (true);

create policy "Card prices are publicly readable"
  on card_prices for select using (true);

-- Profils : chacun lit et modifie uniquement le sien
create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Collection : chacun gère uniquement la sienne
create policy "Users can view their own collection"
  on user_cards for select using (auth.uid() = user_id);

create policy "Users can insert into their own collection"
  on user_cards for insert with check (auth.uid() = user_id);

create policy "Users can update their own collection"
  on user_cards for update using (auth.uid() = user_id);

create policy "Users can delete from their own collection"
  on user_cards for delete using (auth.uid() = user_id);

-- Wishlist : chacun gère uniquement la sienne
create policy "Users can view their own wishlist"
  on wishlist_items for select using (auth.uid() = user_id);

create policy "Users can insert into their own wishlist"
  on wishlist_items for insert with check (auth.uid() = user_id);

create policy "Users can delete from their own wishlist"
  on wishlist_items for delete using (auth.uid() = user_id);