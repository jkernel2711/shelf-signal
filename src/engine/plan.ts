import { FESTIVALS, HORIZON, REVIEW_DAYS, SKUS, STORES, SUPPLIERS, TEST_H, posKey } from '../data/catalog';
import type { World } from '../data/world';
import { addDays, daysBetween, isoDay, parseDay } from '../lib/format';
import type { Exception, ModelId, Override, Position, Promo, PurchaseOrder, SuggestedLine, Transfer } from '../types';
import { festivalLift, promoLift, skuById, storeById, WEEKDAY } from './demand';
import { ensureNeural, MODEL_LABEL } from './forecast';

export type Live = {
  positions: Record<string, Position>;
  overrides: Record<string, Override>;
  extraPromos: Promo[];
  acked: string[];
  held: string[];
  modelPick: Record<string, ModelId>;
};

export function inScope(id: string, ids?: string[]) {
  return !ids || ids.includes(id);
}

export function livePosition(world: World, live: Live, key: string): Position {
  return { ...world.positions[key], ...live.positions[key] };
}

export function modelFor(world: World, live: Live, key: string): ModelId {
  return live.modelPick?.[key] ?? world.series[key]?.best ?? 'sarima';
}

export function fitFor(world: World, live: Live, key: string) {
  const s = world.series[key];
  if (!s) return undefined;
  const id = modelFor(world, live, key);
  if (id === 'lstm' || id === 'hybrid') {
    const arima = s.models.arima;
    if (!arima) return s.models[s.best];
    const n = ensureNeural(key, s.actual, HORIZON, arima, TEST_H);
    return id === 'lstm' ? n.lstm : n.hybrid;
  }
  return s.models[id] ?? s.models[s.best];
}

export function forecastAt(world: World, live: Live, key: string, dayIndex: number) {
  const [skuId, storeId] = key.split(':');
  const sku = skuById(skuId);
  const store = storeById(storeId);
  const over = live.overrides[key];
  if (over) return over.daily;
  const fit = fitFor(world, live, key);
  const raw = fit?.forecast[dayIndex] ?? world.series[key]?.forecast[dayIndex] ?? 0;
  const day = isoDay(addDays(parseDay(world.asOf), dayIndex));
  const extra = live.extraPromos;
  let lift = festivalLift(day, sku.category) * promoLift(skuId, day, extra);
  const id = modelFor(world, live, key);
  if (id === 'arima') lift *= WEEKDAY[sku.category][parseDay(day).getDay()];
  return Math.max(0, Math.round(raw * lift));
}

export function mape(world: World, key: string) {
  const s = world.series[key];
  if (!s) return 0;
  const fit = s.models[s.best];
  if (fit?.test?.mape) return fit.test.mape;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < s.actual.length; i++) {
    const a = s.actual[i];
    const f = s.fitted[i];
    if (a <= 0) continue;
    sum += Math.abs(a - f) / a;
    n++;
  }
  return n ? (sum / n) * 100 : 0;
}

export function chainMape(world: World, storeIds?: string[]) {
  let sum = 0;
  let n = 0;
  for (const sku of SKUS) {
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      const m = mape(world, posKey(sku.id, store.id));
      if (m) {
        sum += m;
        n++;
      }
    }
  }
  return n ? sum / n : 0;
}

export function avgDaily(world: World, live: Live, key: string, days = 7) {
  let s = 0;
  const n = Math.min(days, HORIZON);
  for (let i = 0; i < n; i++) s += forecastAt(world, live, key, i);
  return n ? s / n : 0;
}

export function coverDays(onHand: number, daily: number) {
  if (daily <= 0.15) return onHand > 0 ? 99 : 0;
  return onHand / daily;
}

export function roundToPack(qty: number, pack: number, moq: number) {
  if (qty <= 0) return 0;
  const p = Math.max(1, pack);
  let q = Math.ceil(qty / p) * p;
  if (q < moq) q = moq;
  return q;
}

export function suggestedFor(world: World, live: Live, skuId: string, storeId: string): SuggestedLine | null {
  const sku = skuById(skuId);
  const supplier = SUPPLIERS.find((s) => s.id === sku.supplierId)!;
  const key = posKey(skuId, storeId);
  const pos = livePosition(world, live, key);
  const lead = supplier.leadDays;
  let demandLead = 0;
  for (let i = 0; i < lead; i++) demandLead += forecastAt(world, live, key, i);
  let demandReview = 0;
  for (let i = lead; i < lead + REVIEW_DAYS; i++) demandReview += forecastAt(world, live, key, i);
  const daily = avgDaily(world, live, key, Math.max(7, lead));
  const sigma = Math.max(0.4, fitFor(world, live, key)?.sigma ?? daily * 0.35);
  const z = sku.abc === 'A' ? 1.65 : sku.abc === 'B' ? 1.28 : 0.84;
  const safety = z * sigma * Math.sqrt(Math.max(1, lead));
  const target = demandLead + safety + demandReview;
  const need = target - pos.onHand - pos.inbound;
  const qty = roundToPack(need, sku.casePack, sku.moq);
  if (qty <= 0) return null;
  const cover = coverDays(pos.onHand, daily);
  const model = MODEL_LABEL[modelFor(world, live, key)];
  let reason = `Below ROP · ${model}`;
  let urgent = false;
  if (pos.onHand <= 0) {
    reason = 'Stockout';
    urgent = true;
  } else if (cover < lead) {
    reason = `${cover.toFixed(1)}d cover < ${lead}d lead`;
    urgent = true;
  } else if (sku.perishable) {
    reason = 'Perishable cover';
  }
  return {
    key,
    skuId,
    storeId,
    supplierId: sku.supplierId,
    onHand: pos.onHand,
    inbound: pos.inbound,
    coverDays: cover,
    daily,
    qty,
    value: qty * sku.cost,
    reason,
    urgent,
  };
}

export function allSuggestions(world: World, live: Live, storeIds?: string[]): SuggestedLine[] {
  const out: SuggestedLine[] = [];
  for (const sku of SKUS) {
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      const key = posKey(sku.id, store.id);
      if (live.held?.includes(key)) continue;
      const line = suggestedFor(world, live, sku.id, store.id);
      if (line) out.push(line);
    }
  }
  out.sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.value - a.value);
  return out;
}

export function exceptions(world: World, live: Live, storeIds?: string[]): Exception[] {
  const out: Exception[] = [];
  for (const sku of SKUS) {
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      const key = posKey(sku.id, store.id);
      if (live.acked.includes(key)) continue;
      const pos = livePosition(world, live, key);
      const daily = avgDaily(world, live, key);
      const cover = coverDays(pos.onHand, daily);
      const sug = suggestedFor(world, live, sku.id, store.id);
      const qty = sug?.qty ?? 0;
      const supplier = SUPPLIERS.find((s) => s.id === sku.supplierId)!;

      if (pos.onHand <= 0) {
        out.push({
          id: `so:${key}`,
          kind: 'stockout',
          severity: 'crit',
          skuId: sku.id,
          storeId: store.id,
          title: `${sku.brand} ${sku.name}`,
          detail: `${store.name} · ${daily.toFixed(0)}/day`,
          metric: '0',
          coverDays: 0,
          suggestedQty: qty,
        });
        continue;
      }

      if (pos.nearestExpiry && daysBetween(world.asOf, pos.nearestExpiry) <= 3) {
        out.push({
          id: `ex:${key}`,
          kind: 'expiring',
          severity: daysBetween(world.asOf, pos.nearestExpiry) <= 1 ? 'crit' : 'warn',
          skuId: sku.id,
          storeId: store.id,
          title: `${sku.brand} ${sku.name}`,
          detail: `${store.name} · ${pos.onHand} pcs`,
          metric: pos.nearestExpiry,
          coverDays: cover,
          suggestedQty: 0,
        });
      }

      if (cover < Math.max(1.2, supplier.leadDays * 0.5) && pos.onHand > 0) {
        out.push({
          id: `rk:${key}`,
          kind: 'risk',
          severity: cover < 1 ? 'crit' : 'warn',
          skuId: sku.id,
          storeId: store.id,
          title: `${sku.brand} ${sku.name}`,
          detail: `${store.name} · lead ${supplier.leadDays}d`,
          metric: `${cover.toFixed(1)}d cover`,
          coverDays: cover,
          suggestedQty: qty,
        });
      }

      const m = mape(world, key);
      if (m > 28 && sku.abc !== 'C') {
        out.push({
          id: `ms:${key}`,
          kind: 'miss',
          severity: 'info',
          skuId: sku.id,
          storeId: store.id,
          title: `${sku.brand} ${sku.name}`,
          detail: `${store.name} · ${MODEL_LABEL[modelFor(world, live, key)]}`,
          metric: `${m.toFixed(0)}% MAPE`,
          coverDays: cover,
          suggestedQty: 0,
        });
      }

      const upcoming = FESTIVALS.find((f) => f.start > world.asOf && daysBetween(world.asOf, f.start) <= 3);
      if (upcoming && (upcoming.lifts[sku.category] ?? 1) >= 1.2 && cover < supplier.leadDays + 4 && pos.onHand > 0) {
        out.push({
          id: `ev:${key}`,
          kind: 'event',
          severity: 'warn',
          skuId: sku.id,
          storeId: store.id,
          title: `${sku.brand} ${sku.name}`,
          detail: `${store.name} · ${upcoming.name} ×${upcoming.lifts[sku.category]}`,
          metric: `${cover.toFixed(1)}d cover`,
          coverDays: cover,
          suggestedQty: qty,
        });
      }

      if (cover > 40 && !sku.perishable) {
        out.push({
          id: `ov:${key}`,
          kind: 'overstock',
          severity: 'info',
          skuId: sku.id,
          storeId: store.id,
          title: `${sku.brand} ${sku.name}`,
          detail: `${store.name}`,
          metric: `${cover.toFixed(0)}d cover`,
          coverDays: cover,
          suggestedQty: 0,
        });
      }
    }
  }

  out.sort((a, b) => rank(a) - rank(b) || a.coverDays - b.coverDays);
  return out;
}

function rank(e: Exception) {
  if (e.kind === 'stockout') return 0;
  if (e.kind === 'expiring') return 1;
  if (e.kind === 'event') return 2;
  if (e.kind === 'risk') return 3;
  if (e.kind === 'miss') return 4;
  return 5;
}

export function fillRate(world: World, live: Live, storeIds?: string[]) {
  let ok = 0;
  let n = 0;
  for (const sku of SKUS) {
    if (sku.abc === 'C') continue;
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      n++;
      const pos = livePosition(world, live, posKey(sku.id, store.id));
      if (pos.onHand > 0) ok++;
    }
  }
  return n ? (ok / n) * 100 : 100;
}

export function inventoryValue(world: World, live: Live, storeIds?: string[]) {
  let v = 0;
  for (const sku of SKUS) {
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      const pos = livePosition(world, live, posKey(sku.id, store.id));
      v += pos.onHand * sku.cost;
    }
  }
  return v;
}

export function poValue(po: PurchaseOrder) {
  return po.lines.reduce((s, l) => s + l.qty * l.cost, 0);
}

export function applyReceive(
  live: Live,
  po: PurchaseOrder,
  worldPositions: Record<string, Position>,
  got?: Record<string, number>,
): Live {
  const positions = { ...live.positions };
  for (const line of po.lines) {
    const key = posKey(line.skuId, po.storeId);
    const cur = { ...(worldPositions[key] ?? { onHand: 0, inbound: 0 }), ...positions[key] };
    const qty = got?.[line.skuId] ?? line.qty;
    positions[key] = {
      ...cur,
      onHand: cur.onHand + qty,
      inbound: Math.max(0, cur.inbound - line.qty),
    };
  }
  return { ...live, positions };
}

export function applyCancel(live: Live, worldPositions: Record<string, Position>, po: PurchaseOrder): Live {
  const positions = { ...live.positions };
  for (const line of po.lines) {
    const key = posKey(line.skuId, po.storeId);
    const cur = { ...(worldPositions[key] ?? { onHand: 0, inbound: 0 }), ...positions[key] };
    positions[key] = { ...cur, inbound: Math.max(0, cur.inbound - line.qty) };
  }
  return { ...live, positions };
}

export function yesterdaySales(world: World, storeIds?: string[]) {
  let units = 0;
  let rupees = 0;
  const i = world.series[posKey(SKUS[0].id, STORES[0].id)].actual.length - 1;
  for (const sku of SKUS) {
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      const u = world.series[posKey(sku.id, store.id)]?.actual[i] ?? 0;
      units += u;
      rupees += u * sku.mrp;
    }
  }
  return { units, rupees };
}

export function lostMargin(world: World, live: Live, storeIds?: string[]) {
  let v = 0;
  for (const sku of SKUS) {
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      const pos = livePosition(world, live, posKey(sku.id, store.id));
      if (pos.onHand > 0) continue;
      v += avgDaily(world, live, posKey(sku.id, store.id)) * (sku.mrp - sku.cost);
    }
  }
  return v;
}

export function applyApprove(live: Live, worldPositions: Record<string, Position>, po: PurchaseOrder): Live {
  const positions = { ...live.positions };
  for (const line of po.lines) {
    const key = posKey(line.skuId, po.storeId);
    const base = { ...(worldPositions[key] ?? { onHand: 0, inbound: 0 }), ...positions[key] };
    positions[key] = { ...base, inbound: base.inbound + line.qty };
  }
  return { ...live, positions };
}

export function applyTransfer(live: Live, worldPositions: Record<string, Position>, t: Transfer): Live {
  const positions = { ...live.positions };
  const fromKey = posKey(t.skuId, t.fromStoreId);
  const toKey = posKey(t.skuId, t.toStoreId);
  const from = { ...(worldPositions[fromKey] ?? { onHand: 0, inbound: 0 }), ...positions[fromKey] };
  const to = { ...(worldPositions[toKey] ?? { onHand: 0, inbound: 0 }), ...positions[toKey] };
  positions[fromKey] = { ...from, onHand: Math.max(0, from.onHand - t.qty) };
  positions[toKey] = { ...to, onHand: to.onHand + t.qty };
  return { ...live, positions };
}

export function storeStats(world: World, live: Live, storeId: string) {
  const ids = [storeId];
  const ex = exceptions(world, live, ids);
  const stockouts = ex.filter((e) => e.kind === 'stockout').length;
  const risk = ex.filter((e) => e.kind === 'risk').length;
  return {
    fill: fillRate(world, live, ids),
    stockouts,
    risk,
    value: inventoryValue(world, live, ids),
    mape: chainMape(world, ids),
    sales: yesterdaySales(world, ids),
  };
}

export function salesByStore(world: World, storeIds?: string[]) {
  const last = world.series[posKey(SKUS[0].id, STORES[0].id)].actual.length;
  return STORES.filter((s) => inScope(s.id, storeIds)).map((st) => {
    let yday = 0;
    let week = 0;
    let units = 0;
    for (const sku of SKUS) {
      const a = world.series[posKey(sku.id, st.id)]?.actual ?? [];
      const y = a[last - 1] ?? 0;
      yday += y * sku.mrp;
      units += y;
      for (let i = Math.max(0, last - 7); i < last; i++) week += (a[i] ?? 0) * sku.mrp;
    }
    return { st, yday, week, units };
  });
}

export function salesByCategory(world: World, storeIds?: string[]) {
  const last = world.series[posKey(SKUS[0].id, STORES[0].id)].actual.length;
  const map = new Map<string, { yday: number; week: number; units: number }>();
  for (const sku of SKUS) {
    const cur = map.get(sku.category) ?? { yday: 0, week: 0, units: 0 };
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      const a = world.series[posKey(sku.id, store.id)]?.actual ?? [];
      const y = a[last - 1] ?? 0;
      cur.yday += y * sku.mrp;
      cur.units += y;
      for (let i = Math.max(0, last - 7); i < last; i++) cur.week += (a[i] ?? 0) * sku.mrp;
    }
    map.set(sku.category, cur);
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.yday - a.yday);
}

export function chainSeries(world: World, live: Live, storeIds?: string[]) {
  const hist = world.series[posKey(SKUS[0].id, STORES[0].id)].actual.length;
  const actual = Array(hist).fill(0);
  const fitted = Array(hist).fill(0);
  const forecast = Array(HORIZON).fill(0);
  for (const sku of SKUS) {
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      const s = world.series[posKey(sku.id, store.id)];
      if (!s) continue;
      const fit = fitFor(world, live, posKey(sku.id, store.id));
      for (let i = 0; i < hist; i++) actual[i] += s.actual[i] ?? 0;
      for (let i = 0; i < hist; i++) fitted[i] += fit?.fitted[i] ?? s.fitted[i] ?? 0;
      for (let i = 0; i < HORIZON; i++) forecast[i] += forecastAt(world, live, posKey(sku.id, store.id), i);
    }
  }
  return { actual, fitted, forecast };
}

export function modelMix(world: World, storeIds?: string[]) {
  const counts: Record<string, number> = { naive: 0, ma: 0, arima: 0, sarima: 0 };
  let n = 0;
  let mapeSum = 0;
  for (const sku of SKUS) {
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      const s = world.series[posKey(sku.id, store.id)];
      if (!s) continue;
      counts[s.best] = (counts[s.best] ?? 0) + 1;
      mapeSum += s.models[s.best]?.test.mape ?? 0;
      n++;
    }
  }
  return { counts, n, mape: n ? mapeSum / n : 0 };
}

export function modelLeaderboard(world: World, storeIds?: string[]) {
  const acc: Record<ModelId, { mape: number; rmse: number; mae: number; wmape: number; rmsse: number; n: number }> = {
    naive: { mape: 0, rmse: 0, mae: 0, wmape: 0, rmsse: 0, n: 0 },
    ma: { mape: 0, rmse: 0, mae: 0, wmape: 0, rmsse: 0, n: 0 },
    arima: { mape: 0, rmse: 0, mae: 0, wmape: 0, rmsse: 0, n: 0 },
    sarima: { mape: 0, rmse: 0, mae: 0, wmape: 0, rmsse: 0, n: 0 },
    lstm: { mape: 0, rmse: 0, mae: 0, wmape: 0, rmsse: 0, n: 0 },
    hybrid: { mape: 0, rmse: 0, mae: 0, wmape: 0, rmsse: 0, n: 0 },
  };
  for (const sku of SKUS) {
    for (const store of STORES) {
      if (!inScope(store.id, storeIds)) continue;
      const s = world.series[posKey(sku.id, store.id)];
      if (!s) continue;
      for (const id of ['naive', 'ma', 'arima', 'sarima'] as ModelId[]) {
        const t = s.models[id]?.test;
        if (!t) continue;
        acc[id].mape += t.mape;
        acc[id].rmse += t.rmse;
        acc[id].mae += t.mae;
        acc[id].wmape += t.wmape;
        acc[id].rmsse += t.rmsse;
        acc[id].n += 1;
      }
    }
  }
  return (['naive', 'ma', 'arima', 'sarima'] as ModelId[]).map((id) => {
    const a = acc[id];
    const n = Math.max(1, a.n);
    return {
      id,
      label: MODEL_LABEL[id],
      mape: a.mape / n,
      rmse: a.rmse / n,
      mae: a.mae / n,
      wmape: a.wmape / n,
      rmsse: a.rmsse / n,
    };
  });
}

export type { Transfer };
