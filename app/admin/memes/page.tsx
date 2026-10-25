import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { listMemes } from "@/lib/data";
import { fmtDate, pageNum } from "@/lib/format";
import { Flash, PageHeader, Pagination, Thumb } from "@/components/ui";
import ConfirmButton from "../captions/ConfirmButton";
import { deleteMemeAction } from "./actions";

export default async function MemesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; saved?: string }>;
}) {
  await requireSuperadmin();
  const sp = await searchParams;
  const page = pageNum(sp.page);
  const { rows, captions, count, pageSize } = await listMemes({ q: sp.q, page });

  return (
    <>
      <PageHeader
        title="Memes"
        sub="Manage meme images, generation details, related captions, and ratings."
        actions={<Link className="btn primary" href="/admin/memes/new">+ New meme</Link>}
      />
      <Flash saved={sp.saved} />
      <form className="toolbar" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search prompt, vibe, model, source…" />
        <button className="btn">Search</button>
      </form>
      <div className="panel flush">
        <table>
          <thead>
            <tr>
              <th style={{ width: 70 }}>Image</th>
              <th>Caption</th>
              <th style={{ width: 120 }}>Vibe</th>
              <th style={{ width: 120 }}>Model</th>
              <th style={{ width: 90 }}>Source</th>
              <th style={{ width: 115 }}>Created</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((meme) => (
              <tr key={meme.id}>
                <td><Thumb url={meme.imageUrl} size={48} /></td>
                <td>
                  <Link href={`/admin/memes/${meme.id}`}>
                    {captions.get(meme.id)?.length
                      ? <span>{captions.get(meme.id)!.slice(0, 2).map((caption) => <span key={caption.id} className="meme-caption">{caption.content}</span>)}{captions.get(meme.id)!.length > 2 && <span className="muted small">+{captions.get(meme.id)!.length - 2} more</span>}</span>
                      : <span className="muted">No captions yet</span>}
                  </Link>
                </td>
                <td>{meme.vibe}</td>
                <td className="small">{meme.model}</td>
                <td><span className="badge">{meme.source}</span></td>
                <td className="muted small">{fmtDate(meme.created)}</td>
                <td>
                  <form action={deleteMemeAction.bind(null, meme.id)}>
                    <ConfirmButton className="btn danger small" message="Delete this meme and all of its captions and votes? The stored image file will remain.">
                      Delete
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="muted center">No memes match.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} count={count} basePath="/admin/memes" params={{ q: sp.q }} />
    </>
  );
}