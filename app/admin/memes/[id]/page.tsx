import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { captionsForMeme, getMeme } from "@/lib/data";
import { displayName, fmtDateTime } from "@/lib/format";
import { Flash, PageHeader, RawRow, Thumb } from "@/components/ui";
import { SplitBar } from "@/components/charts";
import ConfirmButton from "../../captions/ConfirmButton";
import MemeForm from "../MemeForm";
import { deleteMemeAction, updateMemeAction } from "../actions";

export default async function MemeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireSuperadmin();
  const { id } = await params;
  const sp = await searchParams;
  const found = await getMeme(id);
  if (!found) notFound();
  const captionData = await captionsForMeme(id);
  const { meme, raw } = found;

  return (
    <>
      <p className="small"><Link href="/admin/memes">← All memes</Link></p>
      <PageHeader title="Edit meme" sub={`Created ${fmtDateTime(meme.created)} · ${meme.source}`} />
      <Flash saved={sp.saved} error={sp.error} />
      <section className="grid-2-1">
        <div className="panel">
          <MemeForm action={updateMemeAction.bind(null, meme.id)} initial={meme} submitLabel="Save changes" />
        </div>
        <div className="col-stack">
          <div className="panel preview">
            <Thumb url={meme.imageUrl} size={260} />
            <p className="small muted">Storage path: <span className="mono">{meme.imagePath}</span></p>
          </div>
          <div className="panel danger">
            <h2>Delete meme</h2>
            <p className="small muted">Deleting this row also cascades to its captions and votes. It does not remove the underlying storage object.</p>
            <form action={deleteMemeAction.bind(null, meme.id)}>
              <ConfirmButton className="btn danger" message="Delete this media row and all related captions and votes? The stored image file will remain.">
                Delete meme
              </ConfirmButton>
            </form>
          </div>
        </div>
      </section>
      <section className="panel">
        <PageHeader
          title={`Captions (${captionData.rows.length})`}
          sub="Captions and ratings attached to this meme."
          actions={<Link className="btn primary" href={`/admin/memes/${meme.id}/captions/new`}>+ New caption</Link>}
        />
        {captionData.rows.length > 0 ? (
          <div className="panel flush">
            <table>
              <thead><tr><th>Caption</th><th style={{ width: 180 }}>Author</th><th style={{ width: 170 }}>Ratings</th><th style={{ width: 100 }}>Manage</th></tr></thead>
              <tbody>
                {captionData.rows.map((caption) => {
                  const ratings = captionData.votes.get(caption.id);
                  return (
                    <tr key={caption.id}>
                      <td>{caption.content}</td>
                      <td className="small">{caption.profileId ? displayName(captionData.authors.get(caption.profileId), caption.profileId) : "unknown"}</td>
                      <td>{ratings && ratings.total ? <SplitBar up={ratings.up} down={ratings.down} /> : <span className="muted small">no votes</span>}</td>
                      <td><Link href={`/admin/captions/${caption.id}`}>Edit</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">No captions yet.</p>}
        {captionData.rows.length === 100 && <p className="muted small">Showing the 100 most recent captions for this meme.</p>}
      </section>
      <section className="panel"><h2>Raw row</h2><RawRow row={raw} /></section>
    </>
  );
}