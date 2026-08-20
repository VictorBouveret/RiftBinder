-- RiftScribe ne fournit pas de nom complet par set (juste le code). On
-- stocke une version anglaise et une version française séparément pour
-- pouvoir afficher le bon nom selon la langue choisie par l'utilisateur.
alter table sets add column name_en text;
alter table sets add column name_fr text;
