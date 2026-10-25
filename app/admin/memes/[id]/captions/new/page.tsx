import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { getMeme } from "@/lib/data";
import { Flash, PageHeader } from "@/components/ui";
import CaptionForm from "../../../../captions/CaptionForm";
import { createCaptionAction } from "../../../../captions/actions";

export default async function NewMemeCaptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperadmin();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const found = await getMeme(id);
  if (!found) notFound();
  const { meme } = found;

  return (
    <>
      <p className="small"><Link href={`/admin/memes/${meme.id}`}>← Back to meme</Link></p>
      <PageHeader title="Add caption" sub="This caption will be attached to the current meme." />
      <Flash error={error} />
      <div className="panel">
        <CaptionForm
          action={createCaptionAction}
          memes={[meme]}
          initial={{ content: "", memeId: meme.id }}
          returnTo={`/admin/memes/${meme.id}`}
          submitLabel="Create caption"
        />
      </div>
    </>
  );
}