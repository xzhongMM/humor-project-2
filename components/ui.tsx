import Link from "next/link";
import { fmtInt } from "@/lib/format";

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

export function Thumb({ url, size = 48 }: { url: string | null | undefined; size?: number }) {
  if (!url) return <div className="thumb empty" style={{ width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="thumb" src={url} alt="" width={size} height={size} loading="lazy" />;
}

export function Pagination({
  page,
  pageSize,
  count,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  count: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav className="pagination">
      <span className="muted small">
        {fmtInt(count)} total · page {page} of {pages}
      </span>
      <div className="row gap-sm">
        {page > 1 ? <Link className="btn ghost small" href={href(page - 1)}>← Prev</Link> : <span className="btn ghost small disabled">← Prev</span>}
        {page < pages ? <Link className="btn ghost small" href={href(page + 1)}>Next →</Link> : <span className="btn ghost small disabled">Next →</span>}
      </div>
    </nav>
  );
}

export function RawRow({ row }: { row: Record<string, unknown> }) {
  return (
    <dl className="raw">
      {Object.entries(row).map(([k, v]) => (
        <div key={k}>
          <dt className="mono small">{k}</dt>
          <dd className="mono small">{v === null || v === undefined ? <span className="muted">null</span> : typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Flash({ saved, error }: { saved?: string; error?: string }) {
  if (error) return <p className="flash error">{error}</p>;
  if (saved) {
    const messages: Record<string, string> = {
      created: "Caption created.",
      deleted: "Caption deleted.",
      "media-created": "Media record created.",
      "media-deleted": "Meme and its captions and votes deleted.",
      "caption-created": "Caption created.",
      "caption-updated": "Caption updated.",
      "caption-deleted": "Caption deleted.",
    };
    const message = messages[saved] ?? "Saved.";
    return <p className="flash ok">{message}</p>;
  }
  return null;
}
