-- Run once in the Supabase SQL Editor after deploying the variety remap.
-- Safe to run repeatedly.

-- Remap legacy reward slugs to the new tree-variety keys.
-- Idempotent: only rows still holding a legacy slug are updated.
update public.rewards set badge_slug = 'cherry' where badge_slug = 'planter';
update public.rewards set badge_slug = 'pine'   where badge_slug = 'bloomer';
update public.rewards set badge_slug = 'oak'    where badge_slug = 'grove';
update public.rewards set badge_slug = 'mythic' where badge_slug = 'legend';
-- 'ancient' is unchanged (slug + threshold both stay 25).
