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
          <NavLink href="/admin/memes">Memes</NavLink>
          <NavLink href="/admin/votes">Votes</NavLink>
          <NavLink href="/admin/data/prompt-chains">Prompt chains</NavLink>
          <NavLink href="/admin/data/prompt-chain-steps">Chain steps</NavLink>
          <NavLink href="/admin/data/prompt-chain-mix">Chain mix</NavLink>
          <NavLink href="/admin/data/terms">Terms</NavLink>
          <NavLink href="/admin/data/generation-requests">Generation requests</NavLink>
          <NavLink href="/admin/data/generation-examples">Generation examples</NavLink>
          <NavLink href="/admin/data/llm-models">LLM models</NavLink>
          <NavLink href="/admin/data/llm-providers">LLM providers</NavLink>
          <NavLink href="/admin/data/llm-responses">LLM responses</NavLink>
          <NavLink href="/admin/data/allowed-signup-domains">Signup domains</NavLink>
          <NavLink href="/admin/data/whitelisted-emails">Email allowlist</NavLink>
          <NavLink href="/admin/data/images">Images</NavLink>
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
