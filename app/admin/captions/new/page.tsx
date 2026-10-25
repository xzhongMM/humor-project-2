import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { recentMemes } from "@/lib/data";
import { Flash, PageHeader } from "@/components/ui";
import CaptionForm from "../CaptionForm";
import { createCaptionAction } from "../actions";

export default async function NewCaption({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireSuperadmin();
  const { error } = await searchParams;
  const memes = await recentMemes(48);
  return (
    <>
      <p className="small"><Link href="/admin/captions">← All captions</Link></p>
      <PageHeader title="New caption" sub="You'll be recorded as the author." />
      <Flash error={error} />
      <div className="panel">
        <CaptionForm action={createCaptionAction} memes={memes} submitLabel="Create caption" />
      </div>
    </>
  );
}
