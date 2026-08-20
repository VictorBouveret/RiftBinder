-- Contrairement à rarity_rank, ce calcul dépend du total_cards du SET
-- (une autre table) — une colonne générée ne peut pas référencer une autre
-- table en Postgres. On la calcule donc côté script de sync (qui a déjà
-- l'info sous la main) plutôt qu'en SQL généré.
alter table cards add column is_overnumbered boolean not null default false;
