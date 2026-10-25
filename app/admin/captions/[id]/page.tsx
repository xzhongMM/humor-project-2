import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { getCaption, recentMemes } from "@/lib/data";
import { displayName, fmtDateTime, fmtInt } from "@/lib/format";
import { Flash, PageHeader, RawRow, Thumb } from "@/components/ui";
import { SplitBar } from "@/components/charts";
import CaptionForm from "../CaptionForm";
import ConfirmButton from "../ConfirmButton";
import { deleteCaptionAction, updateCaptionAction } from "../actions";

export default async function CaptionDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireSuperadmin();
  const { id } = await params;
  const sp = await searchParams;
  const found = await getCaption(id);
  if (!found) notFound();
  const { caption, meme, author, votes, raw } = found;
  const memes = await recentMemes(48);

  return (
    <>
      <p className="small"><Link href={caption.memeId ? `/admin/memes/${caption.memeId}` : "/admin/memes"}>← Back to meme</Link></p>
      <PageHeader title="Edit caption" sub={<>by {caption.profileId ? <Link href={`/admin/users/${caption.profileId}`}>{displayName(author, caption.profileId)}</Link> : "unknown"} · {fmtDateTime(caption.created)}</>} />
      <Flash saved={sp.saved} error={sp.error} />

      <section className="grid-2-1">
        <div className="panel">
          <CaptionForm
            action={updateCaptionAction.bind(null, caption.id)}
            memes={memes}
            initial={{ content: caption.content, memeId: caption.memeId }}
            returnTo={caption.memeId ? `/admin/memes/${caption.memeId}` : undefined}
            submitLabel="Save changes"
          />
        </div>
        <div className="col-stack">
          <div className="panel preview">
            <Thumb url={meme?.imageUrl} size={260} />
            <p className="caption-text">“{caption.content}”</p>
            <SplitBar up={votes.up} down={votes.down} />
          </div>
          <div className="panel danger">
            <h2>Delete</h2>
            <p className="small muted">
              This permanently removes the caption and its {fmtInt(votes.total)} vote{votes.total === 1 ? "" : "s"}.
            </p>
            <form action={deleteCaptionAction.bind(null, caption.id)}>
              {caption.memeId && <input type="hidden" name="return_to" value={`/admin/memes/${caption.memeId}`} />}
              <ConfirmButton className="btn danger" message="Delete this caption and all of its votes? This cannot be undone.">
                Delete caption
              </ConfirmButton>
            </form>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Raw row</h2>
        <RawRow row={raw} />
      </section>
    </>
  );
}
