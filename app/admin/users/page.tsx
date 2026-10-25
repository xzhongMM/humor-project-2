import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { listProfiles } from "@/lib/data";
import { displayName, fmtDate, pageNum } from "@/lib/format";
import { PageHeader, Pagination, Thumb } from "@/components/ui";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; admins?: string }>;
}) {
  await requireSuperadmin();
  const sp = await searchParams;
  const page = pageNum(sp.page);
  const admins = sp.admins === "1";
  const { rows, count, pageSize } = await listProfiles({ q: sp.q, page, admins });

  return (
    <>
      <PageHeader title="Users" sub="Profiles are read-only here." />
      <form className="toolbar" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search profile name…" />
        <label className="check small">
          <input type="checkbox" name="admins" value="1" defaultChecked={admins} /> superadmins only
        </label>
        <button className="btn">Search</button>
      </form>
      <div className="panel flush">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Profile ID</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="row gap-sm">
                    <Thumb url={p.avatarUrl} size={32} />
                    <Link href={`/admin/users/${p.id}`}>{displayName(p)}</Link>
                  </div>
                </td>
                <td className="muted small mono">{p.id}</td>
                <td>{p.isSuperadmin ? <span className="badge">superadmin</span> : <span className="muted small">user</span>}</td>
                <td className="muted small">{fmtDate(p.created)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="muted center">No users match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} count={count} basePath="/admin/users" params={{ q: sp.q, admins: admins ? "1" : undefined }} />
    </>
  );
}
