import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { listMemes } from "@/lib/data";
import { fmtDate, pageNum } from "@/lib/format";
import { Flash, Pagination, Thumb } from "@/components/ui";
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
    <div className="memes-directory">
      <header className="memes-directory-header">
        <div>
          <p className="memes-eyebrow">Humor admin / media library</p>
          <h1>Memes</h1>
          <p className="memes-intro">Browse captions, inspect image records, and keep the collection tidy.</p>
        </div>
        <div className="memes-header-actions">
          <p className="memes-count"><strong>{count}</strong><span>records</span></p>
          <Link className="memes-new-button" href="/admin/memes/new">+ New meme</Link>
        </div>
      </header>
      <Flash saved={sp.saved} />
      <form className="memes-search" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search prompt, vibe, model, source…" aria-label="Search memes" />
        <button type="submit">Search</button>
      </form>
      <section className="memes-record-list" aria-label="Meme records">
        {rows.map((meme, index) => (
          <article className="memes-record-card" key={meme.id}>
            <span className="memes-record-number">{String((page - 1) * pageSize + index + 1).padStart(2, "0")}</span>
            <Link className="memes-record-image" href={`/admin/memes/${meme.id}`} aria-label={`Open meme ${meme.id}`}>
              <Thumb url={meme.imageUrl} size={76} />
            </Link>
            <div className="memes-record-content">
              <Link className="memes-record-caption" href={`/admin/memes/${meme.id}`}>
                {captions.get(meme.id)?.length
                  ? captions.get(meme.id)!.slice(0, 2).map((caption) => <span className="memes-caption-line" key={caption.id}>{caption.content}</span>)
                  : <span className="memes-empty-caption">No captions yet</span>}
              </Link>
              {captions.get(meme.id)?.length ? (
                <p className="memes-caption-count">{captions.get(meme.id)!.length} caption{captions.get(meme.id)!.length === 1 ? "" : "s"}{captions.get(meme.id)!.length > 2 ? ` shown, ${captions.get(meme.id)!.length - 2} more` : ""}</p>
              ) : null}
              <dl className="memes-record-meta">
                <div><dt>Vibe</dt><dd>{meme.vibe}</dd></div>
                <div><dt>Model</dt><dd>{meme.model}</dd></div>
                <div><dt>Source</dt><dd>{meme.source}</dd></div>
                <div><dt>Created</dt><dd>{fmtDate(meme.created)}</dd></div>
              </dl>
            </div>
            <form className="memes-row-action" action={deleteMemeAction.bind(null, meme.id)}>
              <ConfirmButton className="memes-delete-button" message="Delete this meme and all of its captions and votes? The stored image file will remain.">
                Delete
              </ConfirmButton>
            </form>
          </article>
        ))}
        {rows.length === 0 && (
          <div className="memes-empty-state">
            <strong>No memes found</strong>
            <p>Try a different search or create a new meme record.</p>
          </div>
        )}
      </section>
      <Pagination page={page} pageSize={pageSize} count={count} basePath="/admin/memes" params={{ q: sp.q }} />
    </div>
  );
}