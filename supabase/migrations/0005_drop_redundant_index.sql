-- Le tri alphabétique n'a pas besoin d'index vu la taille du catalogue
-- (quelques milliers de lignes au maximum). Seul l'index trigram
-- (idx_cards_name_trgm, migration 0004) apporte un gain réel, pour la
-- recherche "contient". On retire le B-tree pour ne garder qu'un seul
-- index de recherche sur cette colonne.
drop index if exists idx_cards_name;
