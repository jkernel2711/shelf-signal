import { useMemo, useState, type ReactNode } from 'react';
import { addDays, fmtDay, parseDay } from '../lib/format';

export function Badge({
  tone = 'mute',
  children,
}: {
  tone?: 'ok' | 'warn' | 'crit' | 'mute' | 'forest';
  children: ReactNode;
}) {
  const cls = {
    ok: 'bg-[#e4efe7] text-forest',
    warn: 'bg-[#f4ead2] text-amber',
    crit: 'bg-[#f4e1dc] text-crit',
    mute: 'bg-mist text-mute',
    forest: 'bg-forest text-paper',
  }[tone];
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${cls}`}>{children}</span>;
}

export function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'ok' | 'warn' | 'crit';
}) {
  const color = tone === 'crit' ? 'text-crit' : tone === 'warn' ? 'text-amber' : tone === 'ok' ? 'text-forest-dim' : 'text-ink';
  return (
    <div className="sheet rounded-xl px-4 py-3">
      <div className="text-[11px] text-mute">{label}</div>
      <div className={`num text-[24px] leading-tight mt-1 ${color}`}>{value}</div>
      {hint && <div className="text-[12px] text-mute mt-1">{hint}</div>}
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  kicker,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" className="flex-1 bg-ink/20" onClick={onClose} aria-label="Close" />
      <aside
        className={`h-full bg-panel border-l border-line shadow-sheet overflow-y-auto w-full ${
          wide ? 'sm:w-[560px] sm:max-w-[560px]' : 'sm:w-[420px] sm:max-w-[420px]'
        }`}
      >
        <div className="sticky top-0 bg-panel border-b border-line px-5 py-4 flex items-start justify-between gap-4">
          <div>
            {kicker && <div className="text-[12px] text-mute">{kicker}</div>}
            <h2 className="text-lg font-medium leading-tight mt-0.5">{title}</h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}

export function Cover({ days }: { days: number }) {
  const pct = Math.max(0, Math.min(100, (days / 28) * 100));
  const color = days <= 0 ? '#a32d21' : days < 3 ? '#a32d21' : days < 8 ? '#b7791f' : days > 40 ? '#6a6458' : '#2f6b4f';
  return (
    <div className="flex items-center gap-2 min-w-[88px]">
      <div className="h-1.5 w-16 rounded-full bg-mist overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="num text-[12px] text-mute">{days <= 0 ? '0d' : `${days.toFixed(days < 10 ? 1 : 0)}d`}</span>
    </div>
  );
}

export function Spark({ values, color = '#2f6b4f' }: { values: number[]; color?: string }) {
  const d = useMemo(() => {
    if (!values.length) return '';
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1 || 1)) * 64;
        const y = 18 - ((v - min) / span) * 16;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [values]);
  return (
    <svg width="64" height="20" viewBox="0 0 64 20" className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function SeriesChart({
  actual,
  fitted,
  forecast,
  asOf,
  bandLo,
  bandHi,
  others,
  festivals,
  fittedLabel = 'Model',
}: {
  actual: number[];
  fitted: number[];
  forecast: number[];
  asOf: string;
  bandLo?: number[];
  bandHi?: number[];
  others?: { name: string; color: string; forecast: number[] }[];
  festivals?: { name: string; start: string; end: string }[];
  fittedLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = actual.length + forecast.length;
  const w = 720;
  const h = 248;
  const pad = { l: 40, r: 12, t: 18, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const all = [...actual, ...forecast, ...(bandHi ?? [])];
  const max = Math.max(...all, ...fitted, 1) * 1.08;
  const x = (i: number) => pad.l + (i / Math.max(1, n - 1)) * innerW;
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const path = (vals: number[], offset: number) =>
    vals
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i + offset).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(' ');
  const split = actual.length - 1;
  const hi = hover ?? null;
  const dayAt = (i: number) => fmtDay(addDays(parseDay(asOf), i - actual.length));
  const valAt = (i: number) => (i < actual.length ? actual[i] : forecast[i - actual.length]);
  const kind = (i: number) => (i < actual.length ? 'Sold' : 'Forecast');
  const asOfDate = parseDay(asOf);

  const festRects = (festivals ?? []).map((f) => {
    const a = Math.round((parseDay(f.start).getTime() - asOfDate.getTime()) / 86400000) + actual.length;
    const b = Math.round((parseDay(f.end).getTime() - asOfDate.getTime()) / 86400000) + actual.length;
    return { ...f, a: Math.max(0, a), b: Math.min(n - 1, b) };
  }).filter((f) => f.b >= 0 && f.a <= n - 1);

  const bandPath = () => {
    if (!bandLo?.length || !bandHi?.length) return '';
    const hiPts = bandHi.map((v, i) => `${x(actual.length + i).toFixed(1)},${y(v).toFixed(1)}`);
    const loPts = [...bandLo].reverse().map((v, i) => {
      const idx = actual.length + bandLo.length - 1 - i;
      return `${x(idx).toFixed(1)},${y(v).toFixed(1)}`;
    });
    return `M${hiPts.join(' L')} L${loPts.join(' L')} Z`;
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-[248px]"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * w;
          const i = Math.round(((px - pad.l) / innerW) * (n - 1));
          setHover(Math.max(0, Math.min(n - 1, i)));
        }}
      >
        {festRects.map((f) => (
          <g key={f.name}>
            <rect x={x(f.a)} y={pad.t} width={Math.max(2, x(f.b) - x(f.a))} height={innerH} fill="#f4ead2" opacity="0.7" />
            <text x={x(f.a) + 4} y={pad.t + 12} fill="#8a6a2a" fontSize="9">
              {f.name}
            </text>
          </g>
        ))}
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={pad.l} x2={w - pad.r} y1={y(max * g)} y2={y(max * g)} stroke="#e4dccb" strokeWidth="1" />
        ))}
        <line x1={x(split)} x2={x(split)} y1={pad.t} y2={h - pad.b} stroke="#cfc6b3" strokeDasharray="3 4" />
        <text x={x(split) + 6} y={pad.t + 12} fill="#6a6458" fontSize="10">
          Today
        </text>
        {bandPath() && <path d={bandPath()} fill="#b7791f" opacity="0.12" />}
        {others?.map((o) => (
          <path
            key={o.name}
            d={path([actual[actual.length - 1] ?? 0, ...o.forecast], split)}
            fill="none"
            stroke={o.color}
            strokeWidth="1.4"
            strokeDasharray="3 3"
            opacity="0.85"
          />
        ))}
        <path d={path(fitted, 0)} fill="none" stroke="#c5d5c8" strokeWidth="1.5" />
        <path d={path(actual, 0)} fill="none" stroke="#1f4a38" strokeWidth="2" />
        <path d={path([actual[actual.length - 1] ?? 0, ...forecast], split)} fill="none" stroke="#b7791f" strokeWidth="2" strokeDasharray="5 4" />
        {hi != null && (
          <>
            <line x1={x(hi)} x2={x(hi)} y1={pad.t} y2={h - pad.b} stroke="#161513" strokeOpacity="0.2" />
            <circle cx={x(hi)} cy={y(valAt(hi) ?? 0)} r="3.5" fill={hi < actual.length ? '#1f4a38' : '#b7791f'} />
          </>
        )}
        <text x={pad.l} y={h - 8} fill="#6a6458" fontSize="10">
          {fmtDay(addDays(parseDay(asOf), -actual.length))}
        </text>
        <text x={w - pad.r} y={h - 8} fill="#6a6458" fontSize="10" textAnchor="end">
          {fmtDay(addDays(parseDay(asOf), forecast.length - 1))}
        </text>
      </svg>
      {hi != null && (
        <div className="absolute top-2 right-2 sheet rounded-lg px-3 py-2 text-[12px]">
          <div className="text-mute">{dayAt(hi)}</div>
          <div className="num font-medium">
            {kind(hi)} {Math.round(valAt(hi) ?? 0)}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-[11px] text-mute px-1">
        <span className="flex items-center gap-1.5">
          <i className="w-3 h-0.5 bg-forest inline-block" /> Sold
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-3 h-0.5 bg-[#c5d5c8] inline-block" /> {fittedLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-3 h-0.5 bg-amber inline-block" /> Forecast
        </span>
        {others?.map((o) => (
          <span key={o.name} className="flex items-center gap-1.5">
            <i className="w-3 h-0.5 inline-block" style={{ background: o.color }} /> {o.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ToastHost({ toasts }: { toasts: { id: number; text: string }[] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="bg-ink text-paper rounded-lg px-3 py-2 text-[13px] shadow-sheet">
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="py-12 text-center text-mute text-sm">
      <div>{title}</div>
      {body ? <p className="mt-1">{body}</p> : null}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <div className="text-[12px] text-mute mb-1">{label}</div>
      {children}
    </label>
  );
}
