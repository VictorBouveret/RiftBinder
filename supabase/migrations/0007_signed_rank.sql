-- Une colonne générée ne peut pas être modifiée en place (ALTER COLUMN),
-- il faut la supprimer et la recréer. On ajoute un 6ème rang pour les
-- cartes signées : elles restent affichées avec le badge "Showcase" (pas
-- de changement de rarity ni d'UI), mais elles trient au-dessus des
-- showcase classiques, cohérent avec le fait que ce sont les cartes les
-- plus rares du jeu.
alter table cards drop column rarity_rank;

alter table cards add column rarity_rank smallint generated always as (
  case
    when rarity = 'showcase' and is_signed then 6
    when rarity = 'showcase' then 5
    when rarity = 'epic' then 4
    when rarity = 'rare' then 3
    when rarity = 'uncommon' then 2
    when rarity = 'common' then 1
  end
) stored;
