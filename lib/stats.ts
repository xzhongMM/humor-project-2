import { TZ } from "./schema";
import type { Caption, Meme, Profile, Vote } from "./types";

/* ---------- helpers ---------- */

/** Lower bound of the Wilson score interval (95%). Ranks "8/10 up" above "1/1 up". */
export function wilson(up: number, n: number): number {
  if (n === 0) return 0;
  const z = 1.96;
  const p = up / n;
  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n);
}

/** Reddit-style controversy: lots of votes AND a near-even split. */
export function controversy(up: number, down: number): number {
  if (up <= 0 || down <= 0) return 0;
  const magnitude = up + down;
  const balance = up > down ? down / up : up / down;
  return Math.pow(magnitude, balance);
}

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dowHourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", hourCycle: "h23" });
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
const dayKey = (d: Date) => dayKeyFmt.format(d); // YYYY-MM-DD in TZ

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/* ---------- types ---------- */

export type CaptionScore = {
  caption: Caption;
  up: number;
  down: number;
  total: number;
  wilson: number;
  controversy: number;
};

export type Stats = ReturnType<typeof computeStats>;

/* ---------- main ---------- */

export function computeStats(
  profiles: Profile[],
  memes: Meme[],
  captions: Caption[],
  votes: Vote[],
  now = new Date()
) {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const memeById = new Map(memes.map((m) => [m.id, m]));
  const captionById = new Map(captions.map((c) => [c.id, c]));

  /* totals */
  let up = 0;
  let down = 0;
  const valueHist = new Map<number, number>();
  for (const v of votes) {
    if (v.value > 0) up++;
    else if (v.value < 0) down++;
    valueHist.set(v.value, (valueHist.get(v.value) ?? 0) + 1);
  }
  const voters = new Set(votes.map((v) => v.profileId).filter(Boolean));
  const creators = new Set(captions.map((c) => c.profileId).filter(Boolean));
  const lurkers = profiles.filter((p) => !voters.has(p.id) && !creators.has(p.id)).length;

  /* per-caption scores */
  const scoreMap = new Map<string, CaptionScore>();
  for (const c of captions) scoreMap.set(c.id, { caption: c, up: 0, down: 0, total: 0, wilson: 0, controversy: 0 });
  for (const v of votes) {
    const s = scoreMap.get(v.captionId);
    if (!s) continue;
    if (v.value > 0) s.up++;
    else if (v.value < 0) s.down++;
    s.total++;
  }
  const scores = [...scoreMap.values()];
  for (const s of scores) {
    s.wilson = wilson(s.up, s.up + s.down);
    s.controversy = controversy(s.up, s.down);
  }
  const ghosted = scores.filter((s) => s.total === 0).length;

  const hallOfFame = scores
    .filter((s) => s.total >= 3)
    .sort((a, b) => b.wilson - a.wilson || b.total - a.total)
    .slice(0, 6);
  const hallOfShame = scores
    .filter((s) => s.total >= 3)
    .sort((a, b) => a.wilson - b.wilson || b.down - a.down)
    .slice(0, 3);
  const divisive = scores
    .filter((s) => s.controversy > 0 && s.total >= 4)
    .sort((a, b) => b.controversy - a.controversy)
    .slice(0, 5);

  /* daily activity: last 30 days */
  const DAYS = 30;
  const daily: { key: string; label: string; captions: number; votes: number }[] = [];
  const dailyIdx = new Map<string, number>();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = dayKey(d);
    if (dailyIdx.has(key)) continue;
    dailyIdx.set(key, daily.length);
    daily.push({ key, label: key.slice(5), captions: 0, votes: 0 });
  }
  const allTime = new Map<string, number>();
  for (const c of captions) {
    const d = toDate(c.created);
    if (!d) continue;
    const k = dayKey(d);
    const i = dailyIdx.get(k);
    if (i !== undefined) daily[i].captions++;
    allTime.set(k, (allTime.get(k) ?? 0) + 1);
  }

  /* punchcard (weekday x hour) for votes */
  const punch: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const v of votes) {
    const d = toDate(v.created);
    if (!d) continue;
    const k = dayKey(d);
    const i = dailyIdx.get(k);
    if (i !== undefined) daily[i].votes++;
    allTime.set(k, (allTime.get(k) ?? 0) + 1);
    let dow = -1;
    let hour = -1;
    for (const part of dowHourFmt.formatToParts(d)) {
      if (part.type === "weekday") dow = DOW.indexOf(part.value);
      if (part.type === "hour") hour = parseInt(part.value, 10) % 24;
    }
    if (dow >= 0 && hour >= 0) punch[dow][hour]++;
  }
  let peak = { dow: 0, hour: 0, n: 0 };
  punch.forEach((row, d) => row.forEach((n, h) => n > peak.n && (peak = { dow: d, hour: h, n })));
  let busiestDay: { key: string; n: number } | null = null;
  for (const [key, n] of allTime) if (!busiestDay || n > busiestDay.n) busiestDay = { key, n };

  /* does brevity win? caption length vs approval */
  const bucketDefs: [string, number, number][] = [
    ["1–5", 1, 5],
    ["6–10", 6, 10],
    ["11–15", 11, 15],
    ["16–20", 16, 20],
    ["21–30", 21, 30],
    ["31+", 31, Infinity],
  ];
  const buckets = bucketDefs.map(([label]) => ({ label, captions: 0, up: 0, votes: 0, approval: 0 }));
  let wordSum = 0;
  for (const s of scores) {
    const w = words(s.caption.content);
    wordSum += w;
    const i = bucketDefs.findIndex(([, lo, hi]) => w >= lo && w <= hi);
    if (i < 0) continue;
    buckets[i].captions++;
    buckets[i].up += s.up;
    buckets[i].votes += s.up + s.down;
  }
  for (const b of buckets) b.approval = b.votes ? b.up / b.votes : 0;
  const bestBucket = [...buckets].filter((b) => b.votes >= 10).sort((a, b) => b.approval - a.approval)[0] ?? null;

  /* memes: most captioned + funniest template */
  const memeAgg = new Map<string, { captions: number; up: number; votes: number }>();
  for (const s of scores) {
    const id = s.caption.memeId;
    if (!id) continue;
    const a = memeAgg.get(id) ?? { captions: 0, up: 0, votes: 0 };
    a.captions++;
    a.up += s.up;
    a.votes += s.up + s.down;
    memeAgg.set(id, a);
  }
  const memeRows = [...memeAgg.entries()].map(([id, a]) => ({
    meme: memeById.get(id) ?? { id, imageUrl: null, created: null },
    ...a,
    approval: a.votes ? a.up / a.votes : 0,
  }));
  const mostCaptioned = [...memeRows].sort((a, b) => b.captions - a.captions).slice(0, 6);
  const funniestMemes = memeRows
    .filter((m) => m.votes >= 10)
    .sort((a, b) => wilson(b.up, b.votes) - wilson(a.up, a.votes))
    .slice(0, 6);
  const unusedMemes = memes.filter((m) => !memeAgg.has(m.id)).length;

  /* critics: who votes, and how harshly */
  const critic = new Map<string, { up: number; down: number }>();
  for (const v of votes) {
    if (!v.profileId) continue;
    const c = critic.get(v.profileId) ?? { up: 0, down: 0 };
    if (v.value > 0) c.up++;
    else if (v.value < 0) c.down++;
    critic.set(v.profileId, c);
  }
  const criticRows = [...critic.entries()].map(([id, c]) => ({
    profile: profileById.get(id) ?? null,
    id,
    up: c.up,
    down: c.down,
    total: c.up + c.down,
    harshness: c.up + c.down ? c.down / (c.up + c.down) : 0,
  }));
  const topVoters = [...criticRows].sort((a, b) => b.total - a.total).slice(0, 8);
  const seasoned = criticRows.filter((c) => c.total >= 20);
  const harshest = [...seasoned].sort((a, b) => b.harshness - a.harshness).slice(0, 3);
  const sunniest = [...seasoned].sort((a, b) => a.harshness - b.harshness).slice(0, 3);

  /* comedians: authors by total upvotes earned */
  const authorAgg = new Map<string, { captions: number; up: number; votes: number }>();
  for (const s of scores) {
    const id = s.caption.profileId;
    if (!id) continue;
    const a = authorAgg.get(id) ?? { captions: 0, up: 0, votes: 0 };
    a.captions++;
    a.up += s.up;
    a.votes += s.up + s.down;
    authorAgg.set(id, a);
  }
  const comedians = [...authorAgg.entries()]
    .map(([id, a]) => ({ id, profile: profileById.get(id) ?? null, ...a, approval: a.votes ? a.up / a.votes : 0 }))
    .sort((a, b) => b.up - a.up)
    .slice(0, 8);

  /* self-voting: people upvoting their own captions */
  let selfVotes = 0;
  for (const v of votes) {
    const c = captionById.get(v.captionId);
    if (c && v.profileId && c.profileId === v.profileId) selfVotes++;
  }

  return {
    totals: {
      users: profiles.length,
      admins: profiles.filter((p) => p.isSuperadmin).length,
      memes: memes.length,
      captions: captions.length,
      votes: votes.length,
      up,
      down,
      approval: up + down ? up / (up + down) : 0,
      voters: voters.size,
      creators: creators.size,
      lurkers,
      ghosted,
      unusedMemes,
      avgWords: captions.length ? wordSum / captions.length : 0,
      votesPerCaption: captions.length ? votes.length / captions.length : 0,
      selfVotes,
    },
    valueHist: [...valueHist.entries()].sort((a, b) => a[0] - b[0]),
    hallOfFame,
    hallOfShame,
    divisive,
    daily,
    punch,
    peak: { day: DOW[peak.dow], hour: peak.hour, n: peak.n },
    busiestDay,
    buckets,
    bestBucket,
    mostCaptioned,
    funniestMemes,
    topVoters,
    harshest,
    sunniest,
    comedians,
    memeById,
    profileById,
  };
}

export const DOW_LABELS = DOW;
