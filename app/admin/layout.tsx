import { requireSuperadmin } from "@/lib/auth";
import NavLink from "./NavLink";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperadmin();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark sm">ha</span>
          <span>Humor Admin</span>
        </div>
        <nav>
          <NavLink href="/admin" exact>Overview</NavLink>
          <NavLink href="/admin/users">Users</NavLink>
          <NavLink href="/admin/memes">AI media</NavLink>
          <NavLink href="/admin/captions">Captions</NavLink>
          <NavLink href="/admin/votes">Votes</NavLink>
        </nav>
        <div className="whoami">
          <span className="muted small">Signed in as</span>
          <span className="small ellipsis">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="btn ghost small">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
