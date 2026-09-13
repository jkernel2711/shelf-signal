import type { Position, Promo, PurchaseOrder, Series, Transfer } from '../types';
import { AS_OF, HISTORY, HORIZON, PROMOS, SKUS, STORES, TEST_H, hashStr, mulberry, posKey } from './catalog';
import { expectedDaily } from '../engine/demand';
import { evaluateStatistical } from '../engine/forecast';
import { addDays, isoDay, parseDay } from '../lib/format';

export type World = {
  asOf: string;
  series: Record<string, Series>;
  positions: Record<string, Position>;
  pos: PurchaseOrder[];
  transfers: Transfer[];
  promos: Promo[];
};

const STORY: Record<string, Partial<Position> & { bias?: number }> = {
  'milk-500:hyd-gachi': { onHand: 18, inbound: 0 },
  'milk-500:blr-indi': { onHand: 22, inbound: 40 },
  'maggi-70:vja-benz': { onHand: 0, inbound: 0 },
  'maggi-70:viz-mvp': { onHand: 12, inbound: 0 },
  'oil-1:maa-tnagar': { onHand: 420, inbound: 0 },
  'atta-5:viz-mvp': { onHand: 8, inbound: 24 },
  'paneer-200:hyd-kphb': { onHand: 4, inbound: 0, nearestExpiry: '2026-09-13' },
  'eggs-12:hyd-banjara': { onHand: 18, inbound: 12, nearestExpiry: '2026-09-14' },
  'bread-400:hyd-gachi': { onHand: 6, inbound: 0, nearestExpiry: '2026-09-12' },
  'tomato-1:pune-kothrud': { onHand: 9, inbound: 0, nearestExpiry: '2026-09-13' },
  'coke-750:hyd-banjara': { onHand: 16, inbound: 48 },
  'surf-1:vja-benz': { onHand: 3, inbound: 0 },
  'onion-1:maa-tnagar': { onHand: 14, inbound: 0 },
  'milk-500:mum-andheri': { onHand: 24, inbound: 0 },
  'maggi-70:blr-white': { onHand: 0, inbound: 0 },
  'atta-5:pune-baner': { onHand: 10, inbound: 0 },
  'gold-500:hyd-madhapur': { onHand: 16, inbound: 40 },
};

function targetCover(skuId: string) {
  const sku = SKUS.find((s) => s.id === skuId)!;
  if (sku.perishable) return sku.shelfLifeDays <= 4 ? 2.2 : 4.5;
  if (sku.abc === 'A') return 12;
  if (sku.abc === 'B') return 18;
  return 28;
}

export function buildWorld(): World {
  const t0 = Date.now();
  const asOf = parseDay(AS_OF);
  const series: Record<string, Series> = {};
  const positions: Record<string, Position> = {};

  const firstDay = addDays(asOf, -HISTORY);
  const dow0 = firstDay.getDay();

  for (const sku of SKUS) {
    for (const store of STORES) {
      const key = posKey(sku.id, store.id);
      const rand = mulberry(hashStr(key) ^ 20260911);
      const actual: number[] = [];
      const trend = 0.92 + rand() * 0.12;

      for (let i = -HISTORY; i < 0; i++) {
        const day = isoDay(addDays(asOf, i));
        const mean = expectedDaily(sku, store, day);
        const drift = 1 + ((i + HISTORY) / HISTORY) * (trend - 1);
        const noise = 0.78 + rand() * 0.44;
        const spike = rand() > 0.97 ? 1.4 + rand() * 0.5 : 1;
        const miss = rand() > 0.985 ? 0.35 : 1;
        const rain = sku.category === 'produce' && rand() > 0.92 ? 0.72 : 1;
        actual.push(Math.max(0, Math.round(mean * drift * noise * spike * miss * rain)));
      }

      let evaled;
      try {
        evaled = evaluateStatistical(actual, HORIZON, dow0, TEST_H, true);
      } catch {
        evaled = evaluateStatistical(
          actual.map((v) => v || 1),
          HORIZON,
          dow0,
          TEST_H,
          true,
        );
      }
      const bestFit = evaled.models[evaled.best] ?? evaled.models.sarima!;
      series[key] = {
        actual,
        fitted: bestFit.fitted,
        forecast: bestFit.forecast,
        best: evaled.best,
        models: evaled.models,
        adf: evaled.adf,
      };

      const daily = Math.max(0.4, bestFit.forecast.slice(0, 7).reduce((a, b) => a + b, 0) / 7);
      const story = STORY[key];
      const h = hashStr(key);
      let onHand = Math.round(daily * targetCover(sku.id) * (0.7 + rand() * 0.7));
      let inbound = 0;
      let nearestExpiry: string | undefined;

      if (h % 41 === 0) onHand = 0;
      else if (h % 29 === 0) onHand = Math.round(daily * 0.6);
      else if (h % 37 === 0) onHand = Math.round(daily * 48);
      if (h % 19 === 0) inbound = sku.casePack * (1 + (h % 3));
      if (sku.perishable && h % 23 === 0) nearestExpiry = isoDay(addDays(asOf, 1 + (h % 4)));

      if (story) {
        if (story.onHand != null) onHand = story.onHand;
        if (story.inbound != null) inbound = story.inbound;
        if (story.nearestExpiry) nearestExpiry = story.nearestExpiry;
      }

      positions[key] = { onHand, inbound, nearestExpiry };
    }
  }

  const pos: PurchaseOrder[] = [
    {
      id: 'PO-2026-0836',
      supplierId: 'amul',
      storeId: 'hyd-gachi',
      status: 'in_transit',
      createdAt: '2026-09-10',
      eta: '2026-09-11',
      lines: [
        { skuId: 'milk-500', qty: 80, cost: 25 },
        { skuId: 'butter-100', qty: 40, cost: 51 },
      ],
    },
    {
      id: 'PO-2026-0837',
      supplierId: 'nestle',
      storeId: 'vja-benz',
      status: 'approved',
      createdAt: '2026-09-10',
      eta: '2026-09-15',
      lines: [{ skuId: 'maggi-70', qty: 192, cost: 10 }],
    },
    {
      id: 'PO-2026-0838',
      supplierId: 'hul',
      storeId: 'pune-kothrud',
      status: 'submitted',
      createdAt: '2026-09-11',
      eta: '2026-09-17',
      lines: [
        { skuId: 'surf-1', qty: 24, cost: 132 },
        { skuId: 'dove-75', qty: 48, cost: 38 },
      ],
    },
    {
      id: 'PO-2026-0831',
      supplierId: 'marico',
      storeId: 'maa-tnagar',
      status: 'received',
      createdAt: '2026-09-03',
      eta: '2026-09-09',
      lines: [{ skuId: 'oil-1', qty: 144, cost: 132 }],
    },
    {
      id: 'PO-2026-0842',
      supplierId: 'amul',
      storeId: 'mum-andheri',
      status: 'in_transit',
      createdAt: '2026-09-10',
      eta: '2026-09-11',
      lines: [
        { skuId: 'milk-500', qty: 240, cost: 25 },
        { skuId: 'gold-500', qty: 160, cost: 30 },
        { skuId: 'paneer-200', qty: 64, cost: 76 },
      ],
    },
    {
      id: 'PO-2026-0843',
      supplierId: 'itc',
      storeId: 'blr-white',
      status: 'approved',
      createdAt: '2026-09-11',
      eta: '2026-09-16',
      lines: [
        { skuId: 'atta-5', qty: 72, cost: 218 },
        { skuId: 'yippee-70', qty: 288, cost: 10 },
      ],
    },
    {
      id: 'PO-2026-0844',
      supplierId: 'coke',
      storeId: 'maa-tnagar',
      status: 'submitted',
      createdAt: '2026-09-11',
      eta: '2026-09-14',
      lines: [
        { skuId: 'coke-750', qty: 144, cost: 28 },
        { skuId: 'thums-750', qty: 144, cost: 28 },
        { skuId: 'sprite-750', qty: 96, cost: 28 },
      ],
    },
  ];

  const transfers: Transfer[] = [
    {
      id: 'TR-0140',
      skuId: 'oil-1',
      fromStoreId: 'maa-tnagar',
      toStoreId: 'viz-mvp',
      qty: 36,
      status: 'in_transit',
      createdAt: '2026-09-10',
    },
  ];

  if (typeof console !== 'undefined') console.debug(`ShelfSignal world ${Date.now() - t0}ms`);
  return { asOf: AS_OF, series, positions, pos, transfers, promos: PROMOS };
}

export const WORLD = buildWorld();
