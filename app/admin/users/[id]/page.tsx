import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { activityForProfile, captionsByIds, getProfile } from "@/lib/data";
import { displayName, fmtDateTime, fmtInt, fmtPct } from "@/lib/format";
import { Flash, PageHeader, RawRow, Stat } from "@/components/ui";
import { updateUserRoleAction } from "../actions";
import { SplitBar } from "@/components/charts";

export default async function UserDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const currentUser = await requireSuperadmin();
  const { id } = await params;
  const sp = await searchParams;
  const found = await getProfile(id);
  if (!found) notFound();
  const { profile, raw } = found;
  const act = await activityForProfile(id);
  const up = act.votes.filter((v) => v.value > 0).length;
  const down = act.votes.filter((v) => v.value < 0).length;
  const recentVotes = act.votes.slice(0, 10);
  const votedCaptions = await captionsByIds(recentVotes.map((v) => v.captionId));

  return (
    <>
      <p className="small"><Link href="/admin/users">← All users</Link></p>
      <PageHeader title={displayName(profile)} sub={profile.id} actions={profile.isSuperadmin ? <span className="badge">superadmin</span> : null} />
      <Flash saved={sp.saved} error={sp.error} />

      <section className="stat-strip">
        <Stat label="Captions written" value={fmtInt(act.captionCount)} />
        <Stat label="Votes cast" value={fmtInt(act.votes.length)} hint={act.votes.length ? `${fmtPct(down / act.votes.length)} downvotes` : undefined} />
        <div className="stat"><span className="stat-label">Voting style</span><SplitBar up={up} down={down} /></div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>Recent captions</h2>
          <ul className="plain">
            {act.captions.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/captions/${c.id}`}>“{c.content}”</Link>
                <span className="muted small"> · {fmtDateTime(c.created)}</span>
              </li>
            ))}
            {act.captions.length === 0 && <li className="muted">None.</li>}
          </ul>
        </div>
        <div className="panel">
          <h2>Recent votes</h2>
          <ul className="plain">
            {recentVotes.map((v) => (
              <li key={v.id}>
                <span className={v.value > 0 ? "up" : v.value < 0 ? "down" : "muted"}>{v.value > 0 ? "▲" : v.value < 0 ? "▼" : "•"}</span>{" "}
                <Link href={`/admin/captions/${v.captionId}`}>{votedCaptions.get(v.captionId)?.content ?? `caption ${v.captionId}`}</Link>
                <span className="muted small"> · {fmtDateTime(v.created)}</span>
              </li>
            ))}
            {recentVotes.length === 0 && <li className="muted">None.</li>}
          </ul>
        </div>
      </section>

      <section className="panel">
        <h2>Raw profile row</h2>
        <RawRow row={raw} />
      </section>

      <section className="panel">
        <h2>Role</h2>
        {id === currentUser.id ? (
          <p className="small muted">You cannot change your own admin role from this panel.</p>
        ) : (
          <form action={updateUserRoleAction.bind(null, id)} className="row gap-sm">
            <select name="role" defaultValue={profile.isSuperadmin ? "superadmin" : "user"} aria-label="User role">
              <option value="user">User</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <button className="btn primary small">Update role</button>
          </form>
        )}
      </section>
    </>
  );
}
