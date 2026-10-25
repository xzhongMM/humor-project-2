import Link from "next/link";
import { fmtInt, fmtPct } from "@/lib/format";

/* Dependency-free SVG/CSS charts, rendered entirely on the server. */

export function DailyBars({ days }: { days: { key: string; label: string; captions: number; votes: number }[] }) {
  const W = 720;
  const H = 180;
  const pad = { l: 8, r: 8, t: 10, b: 22 };
  const max = Math.max(1, ...days.map((d) => d.votes), ...days.map((d) => d.captions));
  const slot = (W - pad.l - pad.r) / Math.max(1, days.length);
  const bw = Math.max(2, slot / 2 - 1.5);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Votes and captions per day, last 30 days">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="grid" />
      ))}
      {days.map((d, i) => {
        const x = pad.l + i * slot;
        return (
          <g key={d.key}>
            <title>{`${d.key}: ${d.votes} votes, ${d.captions} captions`}</title>
            <rect x={x + 1} y={y(d.votes)} width={bw} height={H - pad.b - y(d.votes)} rx={2} className="bar-a" />
            <rect x={x + 1 + bw + 1} y={y(d.captions)} width={bw} height={H - pad.b - y(d.captions)} rx={2} className="bar-b" />
            {i % 5 === 0 && (
              <text x={x + slot / 2} y={H - 6} textAnchor="middle" className="axis">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Punchcard({ grid, labels }: { grid: number[][]; labels: string[] }) {
  const cell = 26;
  const left = 36;
  const top = 6;
  const W = left + 24 * cell;
  const H = top + 7 * cell + 18;
  const max = Math.max(1, ...grid.flat());
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Votes by weekday and hour">
      {grid.map((row, d) => (
        <g key={d}>
          <text x={0} y={top + d * cell + cell / 2 + 4} className="axis">
            {labels[d]}
          </text>
          {row.map((n, h) => {
            const r = n === 0 ? 1.2 : 2.5 + (cell / 2 - 3.5) * Math.sqrt(n / max);
            return (
              <circle key={h} cx={left + h * cell + cell / 2} cy={top + d * cell + cell / 2} r={r} className="dot" style={{ opacity: n === 0 ? 0.25 : 0.35 + 0.65 * (n / max) }}>
                <title>{`${labels[d]} ${h}:00 — ${n} votes`}</title>
              </circle>
            );
          })}
        </g>
      ))}
      {[0, 6, 12, 18, 23].map((h) => (
        <text key={h} x={left + h * cell + cell / 2} y={H - 2} textAnchor="middle" className="axis">
          {h === 0 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`}
        </text>
      ))}
    </svg>
  );
}

export function HBars({
  items,
  format = fmtInt,
}: {
  items: { label: React.ReactNode; value: number; sub?: React.ReactNode; href?: string }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="hbars">
      {items.map((it, idx) => {
        const label = it.href ? <Link href={it.href}>{it.label}</Link> : it.label;
        return (
          <li key={idx}>
            <div className="hbar-head">
              <span className="ellipsis">{label}</span>
              <span className="mono">{format(it.value)}</span>
            </div>
            <div className="hbar-track">
              <div className="hbar-fill" style={{ width: `${(it.value / max) * 100}%` }} />
            </div>
            {it.sub && <div className="muted small">{it.sub}</div>}
          </li>
        );
      })}
    </ul>
  );
}

export function SplitBar({ up, down, compact }: { up: number; down: number; compact?: boolean }) {
  const total = up + down;
  const pct = total ? up / total : 0;
  return (
    <div className={compact ? "split compact" : "split"} title={`${up} up / ${down} down`}>
      <div className="split-track">
        <div className="split-up" style={{ width: `${pct * 100}%` }} />
      </div>
      {!compact && (
        <div className="split-legend small">
          <span className="up">▲ {fmtInt(up)}</span>
          <span className="muted">{total ? fmtPct(pct) : "no votes"}</span>
          <span className="down">▼ {fmtInt(down)}</span>
        </div>
      )}
    </div>
  );
}

export function Gauge({ value, label }: { value: number; label: string }) {
  // Semicircle gauge for a 0..1 value.
  const r = 70;
  const c = Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg viewBox="0 0 180 104" className="gauge" role="img" aria-label={`${label}: ${fmtPct(v)}`}>
      <path d="M20 94 A70 70 0 0 1 160 94" className="gauge-bg" />
      <path d="M20 94 A70 70 0 0 1 160 94" className="gauge-fg" strokeDasharray={`${c * v} ${c}`} />
      <text x="90" y="82" textAnchor="middle" className="gauge-num">
        {fmtPct(v)}
      </text>
      <text x="90" y="100" textAnchor="middle" className="axis">
        {label}
      </text>
    </svg>
  );
}

export function LengthChart({ buckets }: { buckets: { label: string; captions: number; votes: number; approval: number }[] }) {
  const max = Math.max(0.01, ...buckets.map((b) => b.approval));
  return (
    <div className="colchart">
      {buckets.map((b) => (
        <div key={b.label} className="col" title={`${b.captions} captions, ${b.votes} votes`}>
          <span className="small mono">{b.votes ? fmtPct(b.approval) : "—"}</span>
          <div className="col-track">
            <div className="col-fill" style={{ height: `${(b.approval / max) * 100}%` }} />
          </div>
          <span className="small">{b.label}</span>
          <span className="muted tiny">{fmtInt(b.captions)} caps</span>
        </div>
      ))}
    </div>
  );
}
