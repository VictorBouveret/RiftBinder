-- pg_trgm permet une recherche efficace de type "contient" (ILIKE '%...%'),
-- contrairement à un index B-tree classique qui n'accélère que les recherches
-- de type "commence par". Anticipe la croissance du catalogue au fil des
-- futures extensions Riftbound, même si le volume actuel n'en aurait pas
-- strictement besoin.
create extension if not exists pg_trgm;

create index idx_cards_name_trgm on cards using gin (name gin_trgm_ops);
