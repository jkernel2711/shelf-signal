import { FESTIVALS, PROMOS, SKUS, STORES } from '../data/catalog';
import { parseDay } from '../lib/format';
import type { Category, Festival, Sku, Store } from '../types';

export const WEEKDAY: Record<Category, number[]> = {
  staples: [0.92, 0.95, 0.96, 0.98, 1.05, 1.18, 1.12],
  dairy: [0.95, 0.98, 0.98, 1.0, 1.02, 1.08, 1.05],
  beverages: [0.88, 0.9, 0.92, 0.95, 1.1, 1.28, 1.22],
  snacks: [0.85, 0.88, 0.9, 0.95, 1.15, 1.35, 1.25],
  personal: [0.95, 0.97, 0.98, 1.0, 1.05, 1.12, 1.08],
  household: [0.94, 0.96, 0.98, 1.0, 1.06, 1.14, 1.08],
  produce: [0.95, 0.98, 1.0, 1.02, 1.08, 1.18, 1.12],
  frozen: [0.9, 0.92, 0.95, 0.98, 1.08, 1.22, 1.15],
};

const PROFILE: Record<Store['profile'], Partial<Record<Category, number>>> = {
  it: { dairy: 1.25, snacks: 1.2, beverages: 1.15, staples: 0.85, produce: 0.9 },
  family: { staples: 1.15, household: 1.15, dairy: 1.05, personal: 1.1 },
  traditional: { staples: 1.25, produce: 1.15, snacks: 0.9, frozen: 0.75 },
  mixed: { staples: 1.05, dairy: 1.05, snacks: 1.05 },
};

export function festivalsOn(day: string): Festival[] {
  return FESTIVALS.filter((f) => day >= f.start && day <= f.end);
}

export function festivalLift(day: string, category: Category) {
  let lift = 1;
  for (const f of festivalsOn(day)) {
    const v = f.lifts[category];
    if (v) lift *= v;
  }
  return lift;
}

export function promoLift(skuId: string, day: string, extra: { skuId: string; start: string; end: string; lift: number }[] = []) {
  let lift = 1;
  for (const p of [...PROMOS, ...extra]) {
    if (p.skuId === skuId && day >= p.start && day <= p.end) lift *= p.lift;
  }
  return lift;
}

const CHAIN_SCALE = 2.4;

export function expectedDaily(sku: Sku, store: Store, day: string, extraPromos: { skuId: string; start: string; end: string; lift: number }[] = []) {
  const d = parseDay(day);
  const wd = WEEKDAY[sku.category][d.getDay()];
  const profile = PROFILE[store.profile][sku.category] ?? 1;
  const tier = store.tier === 3 ? 0.82 : store.tier === 2 ? 0.94 : 1;
  return sku.baseDemand * CHAIN_SCALE * store.sizeIndex * profile * tier * wd * festivalLift(day, sku.category) * promoLift(sku.id, day, extraPromos);
}

export type DemandDriver = { label: string; detail: string; lift: number };

export function explainDay(
  sku: Sku,
  store: Store,
  day: string,
  extraPromos: { skuId: string; start: string; end: string; lift: number }[] = [],
): DemandDriver[] {
  const d = parseDay(day);
  const wd = WEEKDAY[sku.category][d.getDay()];
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const out: DemandDriver[] = [
    { label: names[d.getDay()], detail: 'Weekday pattern for this category', lift: wd },
  ];
  for (const f of festivalsOn(day)) {
    const lift = f.lifts[sku.category] ?? 1;
    if (lift !== 1) out.push({ label: f.name, detail: `${sku.category} lift during ${f.name}`, lift });
  }
  const promo = promoLift(sku.id, day, extraPromos);
  if (promo !== 1) out.push({ label: 'Promo', detail: 'Live promotion on this SKU', lift: promo });
  const profile = PROFILE[store.profile][sku.category] ?? 1;
  if (profile !== 1) out.push({ label: store.profile, detail: `${store.name} catchment`, lift: profile });
  return out;
}

export function skuById(id: string) {
  return SKUS.find((s) => s.id === id)!;
}

export function storeById(id: string) {
  return STORES.find((s) => s.id === id)!;
}
