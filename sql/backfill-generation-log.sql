-- One-time backfill: memes created before the main site started logging generations
-- have no generation_requests / llm_responses / images rows. This creates them.
-- Safe to run more than once: memes that already have a generation request are skipped.
-- Run in Supabase SQL Editor.

begin;

create temp table backfill on commit drop as
select m.id as meme_id, m.user_id, m.prompt, m.model, m.image_path, m.image_url, m.created_at,
       gen_random_uuid() as request_id,
       (select c.content from public.captions c where c.meme_id = m.id order by c.created_at limit 1) as caption,
       (select lm.id from public.llm_models lm where lm.identifier = m.model or lm.name = m.model limit 1) as model_id
from public.memes m
where not exists (select 1 from public.generation_requests g where g.meme_id = m.id);

insert into public.generation_requests (id, user_id, meme_id, provider_id, model_id, prompt, status, created_at, completed_at)
select b.request_id, b.user_id, b.meme_id,
       (select lm.provider_id from public.llm_models lm where lm.id = b.model_id),
       b.model_id, coalesce(b.prompt, ''), 'succeeded', b.created_at, b.created_at
from backfill b;

-- Only the caption text survives for old memes (no raw response, tokens or latency).
insert into public.llm_responses (request_id, model_id, response_text, created_at)
select b.request_id, b.model_id, b.caption, b.created_at
from backfill b
where b.caption is not null;

insert into public.images (user_id, meme_id, storage_path, public_url, caption, created_at, updated_at)
select b.user_id, b.meme_id, b.image_path, b.image_url, b.caption, b.created_at, b.created_at
from backfill b
where b.image_path is not null
  and not exists (select 1 from public.images i where i.meme_id = b.meme_id);

commit;
