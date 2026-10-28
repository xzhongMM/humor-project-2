import { requireSuperadmin } from "@/lib/auth";
import NavLink from "./NavLink";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    title: "Content",
    links: [
      ["/admin/users", "Users"],
      ["/admin/memes", "Memes"],
      ["/admin/votes", "Votes"],
      ["/admin/data/images", "Images"],
    ],
  },
  {
    title: "Prompts",
    links: [
      ["/admin/data/prompt-chains", "Prompt chains"],
      ["/admin/data/prompt-chain-steps", "Chain steps"],
      ["/admin/data/prompt-chain-mix", "Chain mix"],
      ["/admin/data/terms", "Terms"],
      ["/admin/data/generation-examples", "Generation examples"],
    ],
  },
  {
    title: "AI activity",
    links: [
      ["/admin/data/generation-requests", "Generation requests"],
      ["/admin/data/llm-responses", "LLM responses"],
    ],
  },
  {
    title: "Models",
    links: [
      ["/admin/data/llm-providers", "LLM providers"],
      ["/admin/data/llm-models", "LLM models"],
    ],
  },
  {
    title: "Access",
    links: [
      ["/admin/data/allowed-signup-domains", "Signup domains"],
      ["/admin/data/whitelisted-emails", "Email allowlist"],
    ],
  },
] as const;

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
          {SECTIONS.map((section) => (
            <div key={section.title} className="nav-section">
              <span className="nav-heading">{section.title}</span>
              {section.links.map(([href, label]) => (
                <NavLink key={href} href={href}>{label}</NavLink>
              ))}
            </div>
          ))}
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
