import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { getAdminArea } from "@/lib/admin-areas";
import { listAdminRecords } from "@/lib/admin-records";
import { fmtDateTime, pageNum } from "@/lib/format";
import { Flash, PageHeader, Pagination, RawRow } from "@/components/ui";

export default async function AdminDataPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string; saved?: string; error?: string }>;
}) {
  await requireSuperadmin();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const area = getAdminArea(slug);
  if (!area) redirect("/admin");
  const page = pageNum(sp.page);
  const { rows, count, pageSize } = await listAdminRecords(area, page, 25, sp.q);
  const visibleColumns = area.fields.filter((field) => !["description","instruction","response_text","response_json","prompt","expected_output","error_message"].includes(field.name)).slice(0, 5);

  return (
    <>
      <PageHeader
        title={area.title}
        sub={area.mode === "read" ? "Read-only records" : area.mode === "update" ? "Update-only records" : "Create, read, update, and delete records"}
        actions={area.slug === "images" ? <Link className="btn primary" href="/admin/data/images/upload">+ Upload image</Link> : area.mode === "crud" ? <Link className="btn primary" href={`/admin/data/${slug}/new`}>+ New record</Link> : undefined}
      />
      <Flash saved={sp.saved} error={sp.error} />
      {area.searchable?.length ? (
        <form className="toolbar" method="get">
          <input name="q" defaultValue={sp.q} placeholder={`Search ${area.title.toLowerCase()}…`} />
          <button className="btn">Search</button>
        </form>
      ) : null}
      <div className="panel flush">
        <table>
          <thead><tr><th>ID</th>{visibleColumns.map((field) => <th key={field.name}>{field.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <td className="mono small">
                  {area.mode === "read" ? String(row.id).slice(0, 8) : <Link href={`/admin/data/${slug}/${String(row.id)}`}>{String(row.id).slice(0, 8)}</Link>}
                </td>
                {visibleColumns.map((field) => {
                  const value = row[field.name];
                  let rendered: React.ReactNode = String(value ?? "—");
                  if (field.type === "date") rendered = fmtDateTime(typeof value === "string" ? value : null);
                  if (field.type === "boolean") rendered = value ? <span className="badge">yes</span> : <span className="muted small">no</span>;
                  if (typeof value === "object" && value !== null) rendered = <span className="mono small">{JSON.stringify(value).slice(0, 80)}</span>;
                  return <td key={field.name} className="small">{rendered}</td>;
                })}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={visibleColumns.length + 1} className="muted center">No records found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} count={count} basePath={`/admin/data/${slug}`} params={{ q: sp.q }} />
    </>
  );
}
