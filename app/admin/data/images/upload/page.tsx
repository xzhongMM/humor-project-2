import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { Flash, PageHeader } from "@/components/ui";
import { uploadAdminImageAction } from "../actions";

export default async function UploadImagePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireSuperadmin();
  const sp = await searchParams;
  return <>
    <p className="small"><Link href="/admin/data/images">← Back to images</Link></p>
    <PageHeader title="Upload image" sub="Files are stored in the admin-images Supabase Storage bucket." />
    <Flash error={sp.error} />
    <div className="panel">
      <form action={uploadAdminImageAction} className="form">
        <label><span>Image file</span><input name="file" type="file" accept="image/*" required /></label>
        <label><span>Meme ID (optional)</span><input name="meme_id" className="mono" /></label>
        <label><span>Alt text</span><textarea name="alt_text" rows={3} /></label>
        <label><span>Caption</span><textarea name="caption" rows={3} /></label>
        <div className="row gap-sm"><button className="btn primary">Upload image</button></div>
      </form>
    </div>
  </>;
}
