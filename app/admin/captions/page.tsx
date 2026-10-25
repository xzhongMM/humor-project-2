import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { listCaptions, type CaptionSort } from "@/lib/data";
import { displayName, fmtDate, pageNum } from "@/lib/format";
import { Flash, PageHeader, Pagination, Thumb } from "@/components/ui";
import { SplitBar } from "@/components/charts";

export default async function CaptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; saved?: string; error?: string }>;
}) {
  await requireSuperadmin();
  const sp = await searchParams;
  const page = pageNum(sp.page);
  const sort: CaptionSort = sp.sort === "oldest" ? "oldest" : "newest";
  const { rows, memes, authors, votes, count, pageSize } = await listCaptions({ q: sp.q, page, sort });

  return (
    <>
      <PageHeader
        title="Captions"
        sub="AI-generated captions. Create, edit and delete them here."
        actions={<Link className="btn primary" href="/admin/captions/new">+ New caption</Link>}
      />
      <Flash saved={sp.saved} error={sp.error} />
      <form className="toolbar" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search caption text…" />
        <select name="sort" defaultValue={sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button className="btn">Apply</button>
      </form>
      <div className="panel flush">
        <table>
          <thead>
            <tr>
              <th style={{ width: 64 }}>Meme</th>
              <th>Caption</th>
              <th style={{ width: 160 }}>Author</th>
              <th style={{ width: 150 }}>Votes</th>
              <th style={{ width: 110 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const v = votes.get(c.id);
              return (
                <tr key={c.id}>
                  <td><Thumb url={c.memeId ? memes.get(c.memeId)?.imageUrl : null} size={44} /></td>
                  <td><Link href={`/admin/captions/${c.id}`}>{c.content || <em className="muted">(empty)</em>}</Link></td>
                  <td className="small">
                    {c.profileId ? <Link href={`/admin/users/${c.profileId}`}>{displayName(authors.get(c.profileId), c.profileId)}</Link> : <span className="muted">—</span>}
                  </td>
                  <td>{v && v.total > 0 ? <SplitBar up={v.up} down={v.down} /> : <span className="muted small">no votes</span>}</td>
                  <td className="muted small">{fmtDate(c.created)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="muted center">No captions match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} count={count} basePath="/admin/captions" params={{ q: sp.q, sort: sort === "oldest" ? "oldest" : undefined }} />
    </>
  );
}
