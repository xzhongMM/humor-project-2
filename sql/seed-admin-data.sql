-- Seeds the admin-area tables with the data the main site (humorproject_1) actually uses:
-- the Gemini provider/models, the two caption prompts as prompt chains, the six vibes as terms,
-- and generation examples taken from the best-voted memes. Then links existing
-- generation_requests / llm_responses to those rows.
-- Safe to run more than once (every insert skips rows that already exist).
-- Run in Supabase SQL Editor, after backfill-generation-log.sql.

begin;

/* ---------- LLM providers & models (lib/gemini.ts) ---------- */

insert into public.llm_providers (name, website_url)
select 'Google', 'https://ai.google.dev'
where not exists (select 1 from public.llm_providers where name = 'Google');

-- identifier must equal memes.model so requests can be linked. context_window: edit if wrong.
insert into public.llm_models (provider_id, name, identifier, context_window)
select p.id, v.name, v.identifier, v.ctx
from public.llm_providers p
cross join (values
  ('Gemini 3.8 Flash',      'gemini-3.8-flash',      1048576),
  ('Gemini 3.5 Flash',      'gemini-3.5-flash',      1048576),
  ('Gemini 3.1 Flash-Lite', 'gemini-3.1-flash-lite', 1048576)
) as v(name, identifier, ctx)
where p.name = 'Google'
  and not exists (select 1 from public.llm_models m where m.identifier = v.identifier);

/* ---------- Prompt chains (lib/vibes.ts) ---------- */

insert into public.prompt_chains (name, description)
select v.name, v.description
from (values
  ('User upload caption', 'buildPrompt(): one caption for a photo a signed-in user uploads, in the vibe they pick.'),
  ('Daily bot reaction caption', 'buildBotPrompt(): one reaction-meme caption for a Wikimedia photo, inspired by r/columbia topics, random vibe.')
) as v(name, description)
where not exists (select 1 from public.prompt_chains c where c.name = v.name);

insert into public.prompt_chain_steps (chain_id, position, name, instruction, required)
select c.id, s.position, s.name, s.instruction, s.required
from public.prompt_chains c
join (values
  ('User upload caption', 1, 'Role', 'You are a meme caption writer for college students at Columbia University in New York City.', true),
  ('User upload caption', 2, 'Task', 'Write ONE short, funny meme caption for the attached photo in the vibe "{vibe.label}" ({vibe.hint}).', true),
  ('User upload caption', 3, 'Rules', 'The caption must clearly relate to what is visible in the photo; max 120 characters; pick whichever format fits best (POV, ''me when'', ''nobody:'', dialogue, plain one-liner); no hashtags; no emojis; keep it playful, never mean-spirited, hateful, or sexual.', true),
  ('User upload caption', 4, 'Output format', 'Return JSON: {"caption": "..."}.', true),

  ('Daily bot reaction caption', 1, 'Role', 'You are a meme caption writer for college students at Columbia University in New York City.', true),
  ('Daily bot reaction caption', 2, 'Image framing', 'The attached image is a reaction image: {an animal | a person | an emoji} with a strong expression or vibe. Treat the image as the punchline/reaction.', true),
  ('Daily bot reaction caption', 3, 'Task', 'Write ONE caption that sets up a relatable Columbia situation that this reaction perfectly matches, in the vibe "{vibe.label}" ({vibe.hint}). Use classic reaction-meme formats like ''me when...'', ''POV:'', ''my face when...'', ''nobody: / me:'', or ''[thing] be like''. Do NOT just describe what''s in the image.', true),
  ('Daily bot reaction caption', 4, 'Topic inspiration', 'Here is what Columbia students are posting about on r/columbia this week (inspiration only): {up to 5 topics}. Build the situation from ONE of these topics if one fits naturally; otherwise use everyday Columbia student life.', false),
  ('Daily bot reaction caption', 5, 'Rules', 'Never quote a post word for word; never mention usernames, real names, or identifiable people; don''t mock the person in the photo, any individual, or any group; avoid politics, protests, tragedies, crime, and health crises; max 120 characters; no hashtags; no emojis.', true),
  ('Daily bot reaction caption', 6, 'Output format', 'Return JSON: {"caption": "..."}.', true)
) as s(chain_name, position, name, instruction, required) on s.chain_name = c.name
where not exists (
  select 1 from public.prompt_chain_steps x where x.chain_id = c.id and x.position = s.position
);

/* ---------- Terms = the six vibes (VIBES in lib/vibes.ts) ---------- */

insert into public.terms (name, slug, description)
select v.name, v.slug, v.description
from (values
  ('Columbia dorm life',        'dorm',     'dorm rooms, John Jay/Ferris dining, Butler library all-nighters, roommates, Low Steps'),
  ('Midwest kid in NYC',        'midwest',  'a Midwesterner new to New York: culture shock, prices, subway confusion, missing Target and ranch'),
  ('Chronically online',        'online',   'current internet slang and meme formats, group-chat energy, ironic and terminally online'),
  ('Weekend in the city',       'weekend',  'exploring NYC on weekends: bodegas, the MTA, brunch lines, Central Park, overpriced matcha'),
  ('Midterms & finals despair', 'finals',   'academic stress, Core classes, problem sets, office hours, deadlines, caffeine'),
  ('Unhinged',                  'unhinged', 'absurd, surreal, chaotic humor that still relates to the photo')
) as v(name, slug, description)
where not exists (select 1 from public.terms t where t.slug = v.slug);

/* ---------- Prompt chain mix: every vibe in both chains, equal weight ---------- */
-- The bot picks a vibe uniformly at random; users choose one, so 1 is a neutral default.

insert into public.prompt_chain_mix (chain_id, term_id, weight)
select c.id, t.id, 1
from public.prompt_chains c
cross join public.terms t
where c.name in ('User upload caption', 'Daily bot reaction caption')
  and t.slug in ('dorm', 'midwest', 'online', 'weekend', 'finals', 'unhinged')
  and not exists (select 1 from public.prompt_chain_mix x where x.chain_id = c.id and x.term_id = t.id);

/* ---------- Generation examples: the 5 best-voted memes ---------- */

insert into public.generation_examples (title, prompt, expected_output, provider_id, model_id, chain_id)
select left(top.vibe || ': ' || top.content, 80), top.prompt, top.content, lm.provider_id, lm.id, pc.id
from (
  select m.vibe, m.prompt, m.model, m.source, c.content, coalesce(sum(v.vote), 0) as net
  from public.memes m
  join public.captions c on c.meme_id = m.id
  left join public.caption_votes v on v.caption_id = c.id
  where m.prompt is not null
  group by m.id, c.id
  order by net desc, c.created_at desc
  limit 5
) top
left join public.llm_models lm on lm.identifier = top.model
left join public.prompt_chains pc
  on pc.name = case when top.source = 'bot' then 'Daily bot reaction caption' else 'User upload caption' end
where not exists (select 1 from public.generation_examples g where g.expected_output = top.content);

/* ---------- Link existing requests/responses to the rows above ---------- */

update public.generation_requests g
set model_id    = coalesce(g.model_id, lm.id),
    provider_id = coalesce(g.provider_id, lm.provider_id),
    chain_id    = coalesce(g.chain_id, pc.id)
from public.memes m
left join public.llm_models lm on lm.identifier = m.model
left join public.prompt_chains pc
  on pc.name = case when m.source = 'bot' then 'Daily bot reaction caption' else 'User upload caption' end
where g.meme_id = m.id
  and (g.model_id is null or g.provider_id is null or g.chain_id is null);

update public.llm_responses r
set model_id = g.model_id
from public.generation_requests g
where r.request_id = g.id and r.model_id is null and g.model_id is not null;

commit;
