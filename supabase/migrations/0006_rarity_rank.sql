-- Trier la colonne `rarity` alphabétiquement donnerait un ordre absurde
-- (commune, épique, rare, showcase, peu commune). Cette colonne générée
-- encode le vrai rang croissant de rareté, recalculée automatiquement par
-- Postgres à chaque insert/update — jamais désynchronisée manuellement.
alter table cards add column rarity_rank smallint generated always as (
  case rarity
    when 'common' then 1
    when 'uncommon' then 2
    when 'rare' then 3
    when 'epic' then 4
    when 'showcase' then 5
  end
) stored;
