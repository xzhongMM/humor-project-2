import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { getAdminArea } from "@/lib/admin-areas";
import { Flash, PageHeader } from "@/components/ui";
import RecordForm from "../RecordForm";
import { createAdminRecordAction } from "../../actions";

export default async function NewAdminRecordPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireSuperadmin();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const area = getAdminArea(slug);
  if (!area || area.mode !== "crud") redirect(`/admin/data/${slug}`);
  return <>
    <p className="small"><Link href={`/admin/data/${slug}`}>← Back to {area.title}</Link></p>
    <PageHeader title={`New ${area.title.replace(/s$/, "")}`} sub={`Create a ${area.table} record.`} />
    <Flash error={sp.error} />
    <div className="panel"><RecordForm area={area} action={createAdminRecordAction.bind(null, slug)} submitLabel="Create record" /></div>
  </>;
}
