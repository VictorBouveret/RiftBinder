-- Les variantes (alt-art, signature) peuvent partager le même collector_number
-- que la carte de base. On ajoute un discriminant explicite.
alter table cards add column variant text not null default '';

alter table cards drop constraint cards_set_id_collector_number_key;
alter table cards add constraint cards_set_id_collector_number_variant_key
  unique (set_id, collector_number, variant);
