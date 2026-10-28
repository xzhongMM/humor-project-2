import "server-only";
import { createSupabaseAdmin } from "./supabase/admin";
import { TABLES, COLS, sel, aliasRow } from "./schema";
import { cleanSearch } from "./format";
import type { Caption, Meme, Profile, Vote, VoteSummary } from "./types";

/*
 * Data access layer. Every function here uses the service-role client, so
 * every caller must have already run requireSuperadmin().
 */

type Row = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));

export const mapProfile = (r: Row): Profile => ({
  id: String(r.id),
  firstName: str(r.firstName),
  lastName: str(r.lastName),
  avatarUrl: str(r.avatarUrl),
  isSuperadmin: r.isSuperadmin === true,
  created: str(r.created),
});
export const mapMeme = (r: Row): Meme => ({
  id: String(r.id),
  userId: str(r.userId),
  imagePath: String(r.imagePath ?? ""),
  imageUrl: String(r.imageUrl ?? ""),
  vibe: String(r.vibe ?? ""),
  prompt: String(r.prompt ?? ""),
  model: String(r.model ?? ""),
  created: str(r.created),
  source: r.source === "bot" ? "bot" : "user",
  imageCredit: str(r.imageCredit),
  imageSourceUrl: str(r.imageSourceUrl),
});
export const mapCaption = (r: Row): Caption => ({
  id: String(r.id),
  content: str(r.content) ?? "",
  memeId: str(r.memeId),
  profileId: str(r.profileId),
  created: str(r.created),
});
export const mapVote = (r: Row): Vote => ({
  id: String(r.id),
  captionId: String(r.captionId),
  profileId: str(r.profileId),
  value: Number(r.value) || 0,
  created: str(r.created),
});

function fail(table: string, error: { message: string }): never {
  throw new Error(
    `Query on "${table}" failed: ${error.message}. If a column name is wrong, fix schema.config.json (run \`npm run check-schema\`).`
  );
}

/** Page through a whole table 1000 rows at a time (PostgREST's default cap). */
async function fetchAll(table: string, select: string, orderCol: string, cap = 200_000): Promise<Row[]> {
  const db = createSupabaseAdmin();
  const size = 1000;
  const out: Row[] = [];
  for (let from = 0; from < cap; from += size) {
    const { data, error } = await db
      .from(table)
      .select(select)
      .order(orderCol, { ascending: true })
      .range(from, from + size - 1);
    if (error) fail(table, error);
    const rows = (data ?? []) as unknown as Row[];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

export async function loadEverything() {
  const [profiles, memes, captions, votes] = await Promise.all([
    fetchAll(TABLES.profiles, sel(COLS.profiles), COLS.profiles.id),
    fetchAll(TABLES.memes, sel(COLS.memes), COLS.memes.id),
    fetchAll(TABLES.captions, sel(COLS.captions), COLS.captions.id),
    fetchAll(TABLES.votes, sel(COLS.votes), COLS.votes.id),
  ]);
  return {
    profiles: profiles.map(mapProfile),
    memes: memes.map(mapMeme),
    captions: captions.map(mapCaption),
    votes: votes.map(mapVote),
  };
}

/* ---------- lookups by id list ---------- */

async function byIds<T>(table: string, cols: Record<string, string>, idCol: string, ids: string[], map: (r: Row) => T) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map<string, T>();
  const { data, error } = await createSupabaseAdmin().from(table).select(sel(cols)).in(idCol, unique);
  if (error) fail(table, error);
  const m = new Map<string, T>();
  for (const r of (data ?? []) as unknown as Row[]) m.set(String(r.id), map(r));
  return m;
}
export const profilesByIds = (ids: string[]) =>
  byIds(TABLES.profiles, COLS.profiles, COLS.profiles.id, ids, mapProfile);
export const memesByIds = (ids: string[]) => byIds(TABLES.memes, COLS.memes, COLS.memes.id, ids, mapMeme);
export const captionsByIds = (ids: string[]) =>
  byIds(TABLES.captions, COLS.captions, COLS.captions.id, ids, mapCaption);

export async function voteSummariesFor(captionIds: string[]): Promise<Map<string, VoteSummary>> {
  const m = new Map<string, VoteSummary>();
  if (captionIds.length === 0) return m;
  const { data, error } = await createSupabaseAdmin()
    .from(TABLES.votes)
    .select(sel({ captionId: COLS.votes.captionId, value: COLS.votes.value }))
    .in(COLS.votes.captionId, captionIds)
    .range(0, 49_999);
  if (error) fail(TABLES.votes, error);
  for (const id of captionIds) m.set(id, { up: 0, down: 0, total: 0, net: 0 });
  for (const r of (data ?? []) as unknown as Row[]) {
    const s = m.get(String(r.captionId));
    if (!s) continue;
    const v = Number(r.value) || 0;
    if (v > 0) s.up++;
    else if (v < 0) s.down++;
    s.total++;
    s.net += v;
  }
  return m;
}

/* ---------- profiles (READ) ---------- */

export async function listProfiles(opts: { q?: string; page: number; pageSize?: number; admins?: boolean }) {
  const { page, pageSize = 25 } = opts;
  const c = COLS.profiles;
  let query = createSupabaseAdmin().from(TABLES.profiles).select(sel(c), { count: "exact" });
  const q = cleanSearch(opts.q);
  if (q) query = query.or([c.firstName, c.lastName].map((col) => `${col}.ilike.%${q}%`).join(","));
  if (opts.admins) query = query.eq(c.isSuperadmin, true);
  const { data, error, count } = await query
    .order(c.created, { ascending: false, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) fail(TABLES.profiles, error);
  return { rows: ((data ?? []) as unknown as Row[]).map(mapProfile), count: count ?? 0, pageSize };
}

export async function getProfile(id: string) {
  const { data, error } = await createSupabaseAdmin()
    .from(TABLES.profiles)
    .select("*")
    .eq(COLS.profiles.id, id)
    .maybeSingle();
  if (error) fail(TABLES.profiles, error);
  if (!data) return null;
  const raw = data as unknown as Row;
  return { raw, profile: mapProfile(aliasRow(raw, COLS.profiles)) };
}

export async function activityForProfile(id: string) {
  const db = createSupabaseAdmin();
  const [caps, votes] = await Promise.all([
    db
      .from(TABLES.captions)
      .select(sel(COLS.captions), { count: "exact" })
      .eq(COLS.captions.profileId, id)
      .order(COLS.captions.created, { ascending: false, nullsFirst: false })
      .range(0, 19),
    db
      .from(TABLES.votes)
      .select(sel(COLS.votes))
      .eq(COLS.votes.profileId, id)
      .order(COLS.votes.created, { ascending: false, nullsFirst: false })
      .range(0, 9_999),
  ]);
  if (caps.error) fail(TABLES.captions, caps.error);
  if (votes.error) fail(TABLES.votes, votes.error);
  return {
    captions: ((caps.data ?? []) as unknown as Row[]).map(mapCaption),
    captionCount: caps.count ?? 0,
    votes: ((votes.data ?? []) as unknown as Row[]).map(mapVote),
  };
}

/* ---------- memes ---------- */

export async function recentMemes(limit = 48) {
  const { data, error } = await createSupabaseAdmin()
    .from(TABLES.memes)
    .select(sel(COLS.memes))
    .order(COLS.memes.created, { ascending: false, nullsFirst: false })
    .range(0, limit - 1);
  if (error) fail(TABLES.memes, error);
  return ((data ?? []) as unknown as Row[]).map(mapMeme);
}

/* ---------- generated media (memes CRUD) ---------- */

export async function listMemes(opts: { q?: string; page: number; pageSize?: number }) {
  const { page, pageSize = 25 } = opts;
  const c = COLS.memes;
  let query = createSupabaseAdmin().from(TABLES.memes).select(sel(c), { count: "exact" });
  const q = cleanSearch(opts.q);
  if (q) query = query.or([c.vibe, c.prompt, c.model, c.source].map((col) => `${col}.ilike.%${q}%`).join(","));
  const { data, error, count } = await query
    .order(c.created, { ascending: false, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) fail(TABLES.memes, error);
  const rows = ((data ?? []) as unknown as Row[]).map(mapMeme);
  const captions = await captionsForMemes(rows.map((meme) => meme.id));
  return { rows, captions, count: count ?? 0, pageSize };
}

async function captionsForMemes(memeIds: string[]): Promise<Map<string, Caption[]>> {
  const captionsByMeme = new Map<string, Caption[]>();
  if (memeIds.length === 0) return captionsByMeme;
  const c = COLS.captions;
  const { data, error } = await createSupabaseAdmin()
    .from(TABLES.captions)
    .select(sel(c))
    .in(c.memeId, memeIds)
    .order(c.created, { ascending: false, nullsFirst: false })
    .range(0, 9_999);
  if (error) fail(TABLES.captions, error);
  for (const raw of (data ?? []) as unknown as Row[]) {
    const caption = mapCaption(raw);
    const group = captionsByMeme.get(caption.memeId ?? "") ?? [];
    group.push(caption);
    captionsByMeme.set(caption.memeId ?? "", group);
  }
  return captionsByMeme;
}

export async function getMeme(id: string) {
  const { data, error } = await createSupabaseAdmin()
    .from(TABLES.memes)
    .select("*")
    .eq(COLS.memes.id, id)
    .maybeSingle();
  if (error) fail(TABLES.memes, error);
  if (!data) return null;
  const raw = data as unknown as Row;
  return { raw, meme: mapMeme(aliasRow(raw, COLS.memes)) };
}

export async function captionsForMeme(memeId: string) {
  const c = COLS.captions;
  const { data, error } = await createSupabaseAdmin()
    .from(TABLES.captions)
    .select(sel(c))
    .eq(c.memeId, memeId)
    .order(c.created, { ascending: false, nullsFirst: false })
    .range(0, 99);
  if (error) fail(TABLES.captions, error);
  const rows = ((data ?? []) as unknown as Row[]).map(mapCaption);
  const [authors, votes] = await Promise.all([
    profilesByIds(rows.map((caption) => caption.profileId ?? "")),
    voteSummariesFor(rows.map((caption) => caption.id)),
  ]);
  return { rows, authors, votes };
}

export type MemeInput = Omit<Meme, "id" | "created">;

export async function insertMeme(input: MemeInput) {
  const c = COLS.memes;
  const values = {
    [c.userId]: input.userId,
    [c.imagePath]: input.imagePath,
    [c.imageUrl]: input.imageUrl,
    [c.vibe]: input.vibe,
    [c.prompt]: input.prompt,
    [c.model]: input.model,
    [c.source]: input.source,
    [c.imageCredit]: input.imageCredit,
    [c.imageSourceUrl]: input.imageSourceUrl,
  };
  const { data, error } = await createSupabaseAdmin()
    .from(TABLES.memes)
    .insert(values as never)
    .select(c.id)
    .single();
  if (error) throw new Error(error.message);
  return String((data as unknown as Row)[c.id]);
}

export async function updateMeme(id: string, input: MemeInput) {
  const c = COLS.memes;
  const values = {
    [c.userId]: input.userId,
    [c.imagePath]: input.imagePath,
    [c.imageUrl]: input.imageUrl,
    [c.vibe]: input.vibe,
    [c.prompt]: input.prompt,
    [c.model]: input.model,
    [c.source]: input.source,
    [c.imageCredit]: input.imageCredit,
    [c.imageSourceUrl]: input.imageSourceUrl,
  };
  const { error } = await createSupabaseAdmin()
    .from(TABLES.memes)
    .update(values as never)
    .eq(c.id, id);
  if (error) throw new Error(error.message);
}

export async function deleteMeme(id: string) {
  const { error } = await createSupabaseAdmin().from(TABLES.memes).delete().eq(COLS.memes.id, id);
  if (error) throw new Error(error.message);
}

/* ---------- captions (CRUD) ---------- */

export type CaptionSort = "newest" | "oldest";

export async function listCaptions(opts: { q?: string; page: number; sort: CaptionSort; pageSize?: number }) {
  const { page, pageSize = 25 } = opts;
  const c = COLS.captions;
  let query = createSupabaseAdmin().from(TABLES.captions).select(sel(c), { count: "exact" });
  const q = cleanSearch(opts.q);
  if (q) query = query.ilike(c.content, `%${q}%`);
  const { data, error, count } = await query
    .order(c.created, { ascending: opts.sort === "oldest", nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) fail(TABLES.captions, error);
  const rows = ((data ?? []) as unknown as Row[]).map(mapCaption);
  const [memes, authors, votes] = await Promise.all([
    memesByIds(rows.map((r) => r.memeId ?? "")),
    profilesByIds(rows.map((r) => r.profileId ?? "")),
    voteSummariesFor(rows.map((r) => r.id)),
  ]);
  return { rows, memes, authors, votes, count: count ?? 0, pageSize };
}

export async function getCaption(id: string) {
  const { data, error } = await createSupabaseAdmin()
    .from(TABLES.captions)
    .select("*")
    .eq(COLS.captions.id, id)
    .maybeSingle();
  if (error) fail(TABLES.captions, error);
  if (!data) return null;
  const raw = data as unknown as Row;
  const caption = mapCaption(aliasRow(raw, COLS.captions));
  const [memes, authors, votes] = await Promise.all([
    memesByIds([caption.memeId ?? ""]),
    profilesByIds([caption.profileId ?? ""]),
    voteSummariesFor([caption.id]),
  ]);
  return {
    raw,
    caption,
    meme: caption.memeId ? memes.get(caption.memeId) ?? null : null,
    author: caption.profileId ? authors.get(caption.profileId) ?? null : null,
    votes: votes.get(caption.id)!,
  };
}

export async function insertCaption(input: { content: string; memeId: string; profileId: string }) {
  const c = COLS.captions;
  const values = { [c.content]: input.content, [c.memeId]: input.memeId, [c.profileId]: input.profileId };
  const { data, error } = await createSupabaseAdmin()
    .from(TABLES.captions)
    .insert(values as never)
    .select(c.id)
    .single();
  if (error) throw new Error(error.message);
  return String((data as unknown as Row)[c.id]);
}

export async function updateCaption(id: string, input: { content: string; memeId: string }) {
  const c = COLS.captions;
  const values = { [c.content]: input.content, [c.memeId]: input.memeId };
  const { error } = await createSupabaseAdmin()
    .from(TABLES.captions)
    .update(values as never)
    .eq(c.id, id);
  if (error) throw new Error(error.message);
}

export async function deleteCaption(id: string) {
  const db = createSupabaseAdmin();
  // Remove dependent votes first so a foreign key without ON DELETE CASCADE doesn't block us.
  const v = await db.from(TABLES.votes).delete().eq(COLS.votes.captionId, id);
  if (v.error) throw new Error(v.error.message);
  const { error } = await db.from(TABLES.captions).delete().eq(COLS.captions.id, id);
  if (error) throw new Error(error.message);
}

/* ---------- votes (READ) ---------- */

export type VoteFilter = "all" | "up" | "down";

export async function listVotes(opts: { filter: VoteFilter; page: number; pageSize?: number }) {
  const { page, pageSize = 50 } = opts;
  const c = COLS.votes;
  const db = createSupabaseAdmin();
  let query = db.from(TABLES.votes).select(sel(c), { count: "exact" });
  if (opts.filter === "up") query = query.gt(c.value, 0);
  if (opts.filter === "down") query = query.lt(c.value, 0);
  const { data, error, count } = await query
    .order(c.created, { ascending: false, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) fail(TABLES.votes, error);
  const rows = ((data ?? []) as unknown as Row[]).map(mapVote);

  const [upRes, downRes, captions, voters] = await Promise.all([
    db.from(TABLES.votes).select(c.id, { count: "exact", head: true }).gt(c.value, 0),
    db.from(TABLES.votes).select(c.id, { count: "exact", head: true }).lt(c.value, 0),
    captionsByIds(rows.map((r) => r.captionId)),
    profilesByIds(rows.map((r) => r.profileId ?? "")),
  ]);
  return {
    rows,
    captions,
    voters,
    count: count ?? 0,
    pageSize,
    upCount: upRes.count ?? 0,
    downCount: downRes.count ?? 0,
  };
}

export async function updateProfileSuperadmin(id: string, isSuperadmin: boolean) {
  const c = COLS.profiles;
  const values = { [c.isSuperadmin]: isSuperadmin };
  const { error } = await createSupabaseAdmin()
    .from(TABLES.profiles)
    .update(values as never)
    .eq(c.id, id);
  if (error) throw new Error(error.message);
}
