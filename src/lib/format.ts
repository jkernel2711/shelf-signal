export function inr(n: number, digits = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function inrCompact(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return inr(n);
}

export function num(n: number, digits = 0) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function pct(n: number, digits = 0) {
  return `${n.toFixed(digits)}%`;
}

export function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDay(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtDay(d: Date | string, withYear = false) {
  const x = typeof d === 'string' ? parseDay(d) : d;
  return x.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

export function weekday(d: Date | string) {
  const x = typeof d === 'string' ? parseDay(d) : d;
  return x.toLocaleDateString('en-IN', { weekday: 'short' });
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}

export function cases(qty: number, pack: number) {
  if (pack <= 1) return `${num(qty)}`;
  const c = Math.floor(qty / pack);
  const p = qty % pack;
  if (c === 0) return `${p} pcs`;
  if (p === 0) return `${c} cs`;
  return `${c} cs + ${p}`;
}

export function coverLabel(days: number) {
  if (!Number.isFinite(days)) return '—';
  if (days <= 0) return 'Empty';
  if (days < 1) return `${Math.round(days * 24)}h`;
  return `${days.toFixed(days < 10 ? 1 : 0)}d`;
}

export const CATEGORY_LABEL: Record<string, string> = {
  staples: 'Staples',
  dairy: 'Dairy & eggs',
  beverages: 'Beverages',
  snacks: 'Snacks',
  personal: 'Personal care',
  household: 'Household',
  produce: 'Produce',
  frozen: 'Frozen',
};
