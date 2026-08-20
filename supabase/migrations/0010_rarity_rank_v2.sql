-- Nouvelle hiérarchie de tri, du plus rare au moins rare :
-- Signée (7) > Overnumbered (6) > Showcase classique (5) > Épique (4)
-- > Rare (3) > Peu commune (2) > Commune (1).
-- Une colonne générée ne peut pas être modifiée en place, on la recrée.
alter table cards drop column rarity_rank;

alter table cards add column rarity_rank smallint generated always as (
  case
    when rarity = 'showcase' and is_signed then 7
    when rarity = 'showcase' and is_overnumbered then 6
    when rarity = 'showcase' then 5
    when rarity = 'epic' then 4
    when rarity = 'rare' then 3
    when rarity = 'uncommon' then 2
    when rarity = 'common' then 1
  end
) stored;
