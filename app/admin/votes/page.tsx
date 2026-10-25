import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { listVotes, type VoteFilter } from "@/lib/data";
import { displayName, fmtDateTime, fmtInt, pageNum } from "@/lib/format";
import { PageHeader, Pagination, Stat } from "@/components/ui";
import { SplitBar } from "@/components/charts";

export default async function VotesPage({ searchParams }: { searchParams: Promise<{ filter?: string; page?: string }> }) {
  await requireSuperadmin();
  const sp = await searchParams;
  const page = pageNum(sp.page);
  const filter: VoteFilter = sp.filter === "up" || sp.filter === "down" ? sp.filter : "all";
  const { rows, captions, voters, count, pageSize, upCount, downCount } = await listVotes({ filter, page });

  const tab = (f: VoteFilter, label: string) => (
    <Link href={f === "all" ? "/admin/votes" : `/admin/votes?filter=${f}`} className={filter === f ? "tab active" : "tab"}>
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader title="Votes" sub="Upvotes, downvotes and ratings. Read-only." />
      <section className="stat-strip">
        <Stat label="Upvotes" value={<span className="up">{fmtInt(upCount)}</span>} />
        <Stat label="Downvotes" value={<span className="down">{fmtInt(downCount)}</span>} />
        <div className="stat grow"><span className="stat-label">Overall split</span><SplitBar up={upCount} down={downCount} /></div>
      </section>
      <div className="tabs">
        {tab("all", "All")}
        {tab("up", "▲ Up")}
        {tab("down", "▼ Down")}
      </div>
      <div className="panel flush">
        <table>
          <thead>
            <tr>
              <th style={{ width: 70 }}>Vote</th>
              <th>Caption</th>
              <th style={{ width: 180 }}>Voter</th>
              <th style={{ width: 170 }}>When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>
                  <span className={v.value > 0 ? "pill up" : v.value < 0 ? "pill down" : "pill"}>
                    {v.value > 0 ? `▲ +${v.value}` : v.value < 0 ? `▼ ${v.value}` : "0"}
                  </span>
                </td>
                <td><Link href={`/admin/captions/${v.captionId}`}>{captions.get(v.captionId)?.content ?? <span className="muted">caption {v.captionId} (deleted?)</span>}</Link></td>
                <td className="small">
                  {v.profileId ? <Link href={`/admin/users/${v.profileId}`}>{displayName(voters.get(v.profileId), v.profileId)}</Link> : <span className="muted">—</span>}
                </td>
                <td className="muted small">{fmtDateTime(v.created)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="muted center">No votes.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} count={count} basePath="/admin/votes" params={{ filter: filter === "all" ? undefined : filter }} />
    </>
  );
}
