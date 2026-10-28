"use client";

import { useState } from "react";
import { fmtInt } from "@/lib/format";

type Day = { key: string; label: string; captions: number; votes: number };
type Hover = { series: "votes" | "captions"; count: number; day: string; x: number } | null;

export default function DailyBars({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<Hover>(null);
  const W = 720;
  const H = 180;
  const pad = { l: 38, r: 8, t: 10, b: 22 };
  const rawMax = Math.max(1, ...days.map((d) => d.votes), ...days.map((d) => d.captions));
  const step = rawMax <= 5 ? 1 : rawMax <= 20 ? 5 : Math.pow(10, Math.floor(Math.log10(rawMax))) / 2;
  const max = Math.ceil(rawMax / step) * step;
  const slot = (W - pad.l - pad.r) / Math.max(1, days.length);
  const bw = Math.max(2, slot / 2 - 1.5);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((max / 4) * i));

  return (
    <div className="daily-chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Votes and captions per day, last 30 days">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={pad.l} x2={W - pad.r} y1={y(tick)} y2={y(tick)} className="grid" />
            <text x={pad.l - 7} y={y(tick) + 4} textAnchor="end" className="axis">{fmtInt(tick)}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = pad.l + i * slot;
          const showTooltip = (series: "votes" | "captions", count: number) => {
            const chartX = ((x + slot / 2) / W) * 100;
            setHover({ series, count, day: d.key, x: chartX });
          };
          return (
            <g key={d.key}>
              <rect
                className="daily-bar bar-a"
                x={x + 1} y={y(d.votes)} width={bw}
                height={H - pad.b - y(d.votes)} rx={2}
                onMouseEnter={() => showTooltip("votes", d.votes)}
                onFocus={() => showTooltip("votes", d.votes)}
                tabIndex={0}
                aria-label={`${d.key}: ${d.votes} votes`}
              />
              <rect
                className="daily-bar bar-b"
                x={x + 1 + bw + 1} y={y(d.captions)} width={bw}
                height={H - pad.b - y(d.captions)} rx={2}
                onMouseEnter={() => showTooltip("captions", d.captions)}
                onFocus={() => showTooltip("captions", d.captions)}
                tabIndex={0}
                aria-label={`${d.key}: ${d.captions} captions`}
              />
              {i % 5 === 0 && <text x={x + slot / 2} y={H - 6} textAnchor="middle" className="axis">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="daily-chart-tooltip" style={{ left: `${hover.x}%` }} role="status">
          <strong>{fmtInt(hover.count)}</strong>
          <span>{hover.series}</span>
          <small>{hover.day}</small>
        </div>
      )}
    </div>
  );
}
