import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { getMeme } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { Flash, PageHeader, RawRow, Thumb } from "@/components/ui";
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
  const { meme, raw } = found;

  return (
    <>
      <p className="small"><Link href="/admin/memes">← All AI media</Link></p>
      <PageHeader title="Edit AI media" sub={`Created ${fmtDateTime(meme.created)} · ${meme.source}`} />
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
            <h2>Delete media record</h2>
            <p className="small muted">Deleting this row also cascades to its captions and votes. It does not remove the underlying storage object.</p>
            <form action={deleteMemeAction.bind(null, meme.id)}>
              <ConfirmButton className="btn danger" message="Delete this media row and all related captions and votes? The stored image file will remain.">
                Delete media
              </ConfirmButton>
            </form>
          </div>
        </div>
      </section>
      <section className="panel"><h2>Raw row</h2><RawRow row={raw} /></section>
    </>
  );
}