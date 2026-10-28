import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { getAdminArea } from "@/lib/admin-areas";
import { getAdminRecord } from "@/lib/admin-records";
import { Flash, PageHeader, RawRow } from "@/components/ui";
import RecordForm from "../RecordForm";
import ConfirmButton from "@/app/admin/captions/ConfirmButton";
import { deleteAdminRecordAction, updateAdminRecordAction } from "../../actions";
import { deleteAdminImageAction } from "../../images/actions";

export default async function AdminRecordDetailPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireSuperadmin();
  const [{ slug, id }, sp] = await Promise.all([params, searchParams]);
  const area = getAdminArea(slug);
  if (!area) redirect("/admin");
  const record = await getAdminRecord(area, id);
  if (!record) notFound();

  return <>
    <p className="small"><Link href={`/admin/data/${slug}`}>← Back to {area.title}</Link></p>
    <PageHeader title={area.title.replace(/s$/, "") + " record"} sub={id} />
    <Flash saved={sp.saved} error={sp.error} />
    {area.mode !== "read" ? <section className="grid-2-1">
      <div className="panel"><RecordForm area={area} initial={record} action={updateAdminRecordAction.bind(null, slug, id)} submitLabel="Save changes" /></div>
      {area.mode === "crud" ? <div className="panel danger">
        <h2>Delete</h2>
        <p className="small muted">This permanently deletes this database record.</p>
        {area.slug === "images" ? (
          <form action={deleteAdminImageAction.bind(null, id, String(record.storage_path ?? ""))}>
            <ConfirmButton className="btn danger" message="Delete this image from Storage and its database record?">Delete image</ConfirmButton>
          </form>
        ) : (
          <form action={deleteAdminRecordAction.bind(null, slug, id)}><ConfirmButton className="btn danger" message="Delete this record permanently?">Delete record</ConfirmButton></form>
        )}
      </div> : null}
    </section> : null}
    <section className="panel"><h2>Raw row</h2><RawRow row={record} /></section>
  </>;
}
