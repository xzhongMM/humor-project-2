import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { Flash, PageHeader } from "@/components/ui";
import MemeForm from "../MemeForm";
import { createMemeAction } from "../actions";

export default async function NewMemePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireSuperadmin();
  const { error } = await searchParams;
  return (
    <>
      <p className="small"><Link href="/admin/memes">← All AI media</Link></p>
      <PageHeader title="New AI media" sub="Create a media record with its image and generation metadata." />
      <Flash error={error} />
      <div className="panel"><MemeForm action={createMemeAction} submitLabel="Create media" /></div>
    </>
  );
}