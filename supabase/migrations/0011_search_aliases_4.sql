-- RiftScribe ne fournit l'identité "champion" d'une carte nulle part dans
-- l'API en masse qu'on utilise (le champ tags/keywords existe seulement sur
-- l'endpoint détail carte par carte, bien trop coûteux à interroger pour
-- tout le catalogue). Certaines cartes ont un nom flavor qui ne contient
-- pas le nom du champion associé (ex. "Nine-Tailed Fox" pour Ahri) : on
-- maintient une table d'alias manuelle, complétée au fil de l'eau.
alter table cards add column alt_names text[] not null default '{}';

-- On retire l'ancien index de recherche restreint à `name` seul, remplacé
-- par un champ calculé combinant nom + alias.
drop index if exists idx_cards_name_trgm;

-- array_to_string() est en réalité marquée "stable" par Postgres (bug
-- connu, jamais corrigé — https://postgresql.org/message-id/17360-...),
-- pas "immuable", donc inutilisable directement dans une colonne générée.
-- On la contourne avec un wrapper explicitement déclaré immuable.
create or replace function immutable_array_to_string(text[], text)
returns text
language sql
immutable
as $$
  select array_to_string($1, $2);
$$;

alter table cards add column search_text text generated always as (
  lower((name || ' ' || immutable_array_to_string(alt_names, ' ')) collate "C")
) stored;

create index idx_cards_search_text_trgm on cards using gin (search_text gin_trgm_ops);
