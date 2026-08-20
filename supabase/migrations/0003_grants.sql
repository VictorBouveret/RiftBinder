-- Les policies RLS contrôlent les LIGNES visibles/modifiables, mais Postgres
-- exige en plus un GRANT explicite au niveau de la TABLE avant même que la
-- RLS ne s'applique. Sans ça, un rôle se prend "permission denied" avant
-- même d'atteindre la logique des policies.

-- service_role : bypass la RLS (utilisé uniquement par des scripts serveur
-- de confiance, comme scripts/sync-cards.ts). Accès complet au catalogue.
grant select, insert, update, delete on public.sets to service_role;
grant select, insert, update, delete on public.cards to service_role;
grant select, insert, update, delete on public.card_prices to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.user_cards to service_role;
grant select, insert, update, delete on public.wishlist_items to service_role;

-- anon / authenticated : lecture seule sur le catalogue public.
-- Les policies RLS filtrent déjà, ces GRANTs ouvrent juste la porte de la table.
grant select on public.sets to anon, authenticated;
grant select on public.cards to anon, authenticated;
grant select on public.card_prices to anon, authenticated;

-- authenticated : données personnelles, filtrées ensuite par les policies
-- RLS via auth.uid() = user_id.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_cards to authenticated;
grant select, insert, delete on public.wishlist_items to authenticated;
