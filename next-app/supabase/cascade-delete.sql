-- Optional hardening for account deletion.
--
-- The app deletes a user's rows explicitly in FK order via the service role, so
-- this is NOT required for `honeytree` account deletion to work. Apply it if you
-- also want deleting a user from the Supabase dashboard (Authentication → Users →
-- Delete) to automatically cascade and remove all of their Honeytree data.
--
-- Safe to run repeatedly.

-- profiles.id → auth.users(id): delete the profile when the auth user is deleted.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- trees/plantings/rewards.user_id → profiles(id): cascade from the profile.
alter table public.trees drop constraint if exists trees_user_id_fkey;
alter table public.trees
  add constraint trees_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.plantings drop constraint if exists plantings_user_id_fkey;
alter table public.plantings
  add constraint plantings_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.rewards drop constraint if exists rewards_user_id_fkey;
alter table public.rewards
  add constraint rewards_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
