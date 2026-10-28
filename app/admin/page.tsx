import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { loadEverything } from "@/lib/data";
import { computeStats, DOW_LABELS, type CaptionScore } from "@/lib/stats";
import { displayName, fmtDate, fmtInt, fmtPct } from "@/lib/format";
import { Gauge, HBars, LengthChart, Punchcard, SplitBar } from "@/components/charts";
import DailyBars from "@/components/daily-bars";
import LiveRefresh from "@/components/live-refresh";
import { PageHeader, Stat, Thumb } from "@/components/ui";
import type { Meme } from "@/lib/types";

export const dynamic = "force-dynamic";

const hourLabel = (h: number) => (h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`);

function CaptionRow({ s, meme, rank }: { s: CaptionScore; meme?: Meme; rank?: number }) {
  return (
    <li className="caption-row">
      {rank !== undefined && <span className="rank">{rank}</span>}
      <Thumb url={meme?.imageUrl} size={52} />
      <div className="grow">
        <Link href={`/admin/captions/${s.caption.id}`} className="caption-text">
          “{s.caption.content}”
        </Link>
        <SplitBar up={s.up} down={s.down} />
      </div>
    </li>
  );
}

export default async function Overview() {
  await requireSuperadmin();
  const data = await loadEverything();
  const s = computeStats(data.profiles, data.memes, data.captions, data.votes);
  const t = s.totals;

  const brevityInsight =
    s.bestBucket &&
    `Captions with ${s.bestBucket.label} words win ${fmtPct(s.bestBucket.approval)} of their votes, the best of any length.`;

  return (
    <>
      <LiveRefresh intervalMs={15_000} />
      <PageHeader
        title="The Laugh Report"
        sub={`What ${fmtInt(t.users)} people think is funny, based on ${fmtInt(t.votes)} votes across ${fmtInt(t.captions)} AI captions.`}
      />

      {/* headline numbers */}
      <section className="stat-strip">
        <Stat label="Users" value={fmtInt(t.users)} hint={`${fmtInt(t.admins)} superadmin${t.admins === 1 ? "" : "s"}`} />
        <Stat label="Memes" value={fmtInt(t.memes)} hint={`${fmtInt(t.unusedMemes)} never captioned`} />
        <Stat label="Captions" value={fmtInt(t.captions)} hint={`${t.avgWords.toFixed(1)} words on average`} />
        <Stat label="Votes" value={fmtInt(t.votes)} hint={`${t.votesPerCaption.toFixed(1)} per caption`} />
        <div className="stat gauge-wrap">
          <Gauge value={t.approval} label="laugh rate (upvotes)" />
        </div>
      </section>

      {/* pulse */}
      <section className="grid-2-1">
        <div className="panel">
          <div className="panel-head">
            <h2>Pulse, last 30 days</h2>
            <div className="legend small">
              <span><i className="sw a" /> votes</span>
              <span><i className="sw b" /> captions</span>
            </div>
          </div>
          <DailyBars days={s.daily} />
        </div>
        <div className="panel facts">
          <h2>Fun facts</h2>
          <ul>
            {s.busiestDay && (
              <li>
                <b>Busiest day ever:</b> {fmtDate(s.busiestDay.key + "T12:00:00Z")}, with {fmtInt(s.busiestDay.n)} votes and captions.
              </li>
            )}
            {s.peak.n > 0 && (
              <li>
                <b>Peak laugh hour:</b> {s.peak.day}s around {hourLabel(s.peak.hour)}.
              </li>
            )}
            <li>
              <b>Ghosted:</b> {fmtPct(t.captions ? t.ghosted / t.captions : 0)} of captions have never gotten a single vote.
            </li>
            <li>
              <b>Lurkers:</b> {fmtInt(t.lurkers)} users have never voted or captioned anything.
            </li>
            <li>
              <b>Self-love:</b> {fmtInt(t.selfVotes)} votes were cast on the voter's own caption.
            </li>
          </ul>
        </div>
      </section>

      {/* when */}
      <section className="panel">
        <div className="panel-head">
          <h2>When do people vote?</h2>
          <span className="muted small">votes by weekday and hour (ET). Bigger dot means busier.</span>
        </div>
        <Punchcard grid={s.punch} labels={DOW_LABELS} />
      </section>

      {/* best & most divisive */}
      <section className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>Hall of Fame</h2>
            <span className="muted small">ranked by Wilson score, so 40/50 beats 1/1</span>
          </div>
          <ol className="caption-list">
            {s.hallOfFame.map((c, i) => (
              <CaptionRow key={c.caption.id} s={c} rank={i + 1} meme={s.memeById.get(c.caption.memeId ?? "")} />
            ))}
            {s.hallOfFame.length === 0 && <p className="muted">Not enough votes yet.</p>}
          </ol>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>Most divisive</h2>
            <span className="muted small">lots of votes, close to a 50/50 split</span>
          </div>
          <ol className="caption-list">
            {s.divisive.map((c) => (
              <CaptionRow key={c.caption.id} s={c} meme={s.memeById.get(c.caption.memeId ?? "")} />
            ))}
            {s.divisive.length === 0 && <p className="muted">Everyone agrees so far.</p>}
          </ol>
        </div>
      </section>

      {/* brevity */}
      <section className="grid-2-1">
        <div className="panel">
          <div className="panel-head">
            <h2>Does brevity win?</h2>
            <span className="muted small">upvote share by caption length (words)</span>
          </div>
          <LengthChart buckets={s.buckets} />
          {brevityInsight && <p className="insight">{brevityInsight}</p>}
        </div>
        <div className="panel">
          <h2>Hall of Shame</h2>
          <p className="muted small">The captions voters liked least.</p>
          <ol className="caption-list compact">
            {s.hallOfShame.map((c) => (
              <li key={c.caption.id} className="caption-row">
                <div className="grow">
                  <Link href={`/admin/captions/${c.caption.id}`} className="caption-text small">
                    “{c.caption.content}”
                  </Link>
                  <SplitBar up={c.up} down={c.down} compact />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* memes */}
      <section className="grid-2">
        <div className="panel">
          <h2>Most-captioned memes</h2>
          <div className="meme-grid">
            {s.mostCaptioned.map((m) => (
              <figure key={m.meme.id}>
                <Thumb url={m.meme.imageUrl} size={120} />
                <figcaption className="small">
                  <b>{fmtInt(m.captions)}</b> captions · {m.votes ? fmtPct(m.approval) : "—"} up
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Funniest templates</h2>
          <p className="muted small">Memes whose captions do best on average (at least 10 votes).</p>
          <div className="meme-grid">
            {s.funniestMemes.map((m) => (
              <figure key={m.meme.id}>
                <Thumb url={m.meme.imageUrl} size={120} />
                <figcaption className="small">
                  <b>{fmtPct(m.approval)}</b> up · {fmtInt(m.votes)} votes
                </figcaption>
              </figure>
            ))}
            {s.funniestMemes.length === 0 && <p className="muted">Not enough votes yet.</p>}
          </div>
        </div>
      </section>

      {/* people */}
      <section className="grid-2">
        <div className="panel">
          <h2>Top comedians</h2>
          <p className="muted small">Users whose captions earned the most upvotes.</p>
          <HBars
            items={s.comedians.map((c) => ({
              label: displayName(c.profile, c.id),
              href: `/admin/users/${c.id}`,
              value: c.up,
              sub: `${fmtInt(c.captions)} captions · ${fmtPct(c.approval)} laugh rate`,
            }))}
          />
        </div>
        <div className="panel">
          <h2>The critics</h2>
          <HBars
            items={s.topVoters.slice(0, 5).map((c) => ({
              label: displayName(c.profile, c.id),
              href: `/admin/users/${c.id}`,
              value: c.total,
              sub: <SplitBar up={c.up} down={c.down} compact />,
            }))}
          />
          <div className="critic-split">
            <div>
              <h3 className="small">Toughest crowd</h3>
              {s.harshest.map((c) => (
                <p key={c.id} className="small">
                  <Link href={`/admin/users/${c.id}`}>{displayName(c.profile, c.id)}</Link>{" "}
                  <span className="down">{fmtPct(c.harshness)} down</span>
                </p>
              ))}
              {s.harshest.length === 0 && <p className="muted small">Needs 20+ votes per person.</p>}
            </div>
            <div>
              <h3 className="small">Easiest laugh</h3>
              {s.sunniest.map((c) => (
                <p key={c.id} className="small">
                  <Link href={`/admin/users/${c.id}`}>{displayName(c.profile, c.id)}</Link>{" "}
                  <span className="up">{fmtPct(1 - c.harshness)} up</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {s.valueHist.length > 2 && (
        <section className="panel">
          <h2>Vote values</h2>
          <HBars items={s.valueHist.map(([v, n]) => ({ label: `value ${v}`, value: n }))} />
        </section>
      )}
    </>
  );
}
