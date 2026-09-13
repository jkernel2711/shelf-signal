import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { SKUS, STORES, SUPPLIERS, USERS, posKey, visibleStores } from '../data/catalog';
import { WORLD } from '../data/world';
import {
  allSuggestions,
  applyApprove,
  applyCancel,
  applyReceive,
  applyTransfer,
  exceptions,
  fillRate,
  inventoryValue,
  chainMape,
  lostMargin,
  yesterdaySales,
  type Live,
} from '../engine/plan';
import { useLocal } from '../lib/persist';
import type { ModelId, Override, Promo, PurchaseOrder, Transfer, User, Waste } from '../types';

type Toast = { id: number; text: string };

type Saved = {
  userId: string | null;
  storeFilter: string;
  regionFilter: string;
  live: Live;
  pos: PurchaseOrder[];
  transfers: Transfer[];
  waste: Waste[];
  poSeq: number;
  trSeq: number;
};

const emptyLive = (): Live => ({
  positions: {},
  overrides: {},
  extraPromos: [],
  acked: [],
  held: [],
  modelPick: {},
});

const INITIAL: Saved = {
  userId: null,
  storeFilter: 'all',
  regionFilter: 'all',
  live: emptyLive(),
  pos: WORLD.pos,
  transfers: WORLD.transfers,
  waste: [],
  poSeq: 840,
  trSeq: 141,
};

type Ctx = {
  user: User | null;
  storeFilter: string;
  regionFilter: string;
  scopedStore: string | undefined;
  scopedIds: string[] | undefined;
  stores: typeof STORES;
  regionStores: typeof STORES;
  live: Live;
  pos: PurchaseOrder[];
  transfers: Transfer[];
  waste: Waste[];
  toasts: Toast[];
  signIn: (id: string) => void;
  signOut: () => void;
  setStoreFilter: (id: string) => void;
  setRegionFilter: (id: string) => void;
  ack: (id: string) => void;
  setOverride: (key: string, o: Override | null) => void;
  adjustStock: (skuId: string, storeId: string, delta: number) => void;
  writeOff: (skuId: string, storeId: string, qty: number, reason: Waste['reason']) => void;
  hold: (key: string) => void;
  createBuy: (lines: { skuId: string; storeId: string; qty: number }[], note?: string) => string[];
  setPoStatus: (id: string, status: PurchaseOrder['status']) => void;
  receivePo: (id: string, got?: Record<string, number>) => void;
  cancelPo: (id: string) => void;
  transfer: (skuId: string, from: string, to: string, qty: number) => string;
  receiveTransfer: (id: string) => void;
  addPromo: (p: Promo) => void;
  setModel: (key: string, id: ModelId | null) => void;
  reset: () => void;
  toast: (text: string) => void;
};

const C = createContext<Ctx | null>(null);

export function AppStore({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useLocal<Saved>('shelfsignal.v4', INITIAL);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const user = USERS.find((u) => u.id === saved.userId) ?? null;
  const regionFilter = user?.region ? user.region : saved.regionFilter;
  const storeFilter = user?.storeId ? user.storeId : saved.storeFilter;
  const regionStores = visibleStores(user, regionFilter, 'all');
  const stores =
    storeFilter === 'all' || user?.storeId ? regionStores : regionStores.filter((s) => s.id === storeFilter);
  const scopedIds = stores.length === STORES.length ? undefined : stores.map((s) => s.id);
  const scopedStore = storeFilter === 'all' ? undefined : storeFilter;

  const toast = (text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  const patch = (fn: (s: Saved) => Saved) => setSaved((s) => fn(s));

  const value = useMemo<Ctx>(() => {
    return {
      user,
      storeFilter,
      regionFilter,
      scopedStore,
      scopedIds,
      stores,
      regionStores,
      live: saved.live,
      pos: saved.pos,
      transfers: saved.transfers,
      waste: saved.waste,
      toasts,
      signIn: (id) => {
        const u = USERS.find((x) => x.id === id);
        patch((s) => ({
          ...s,
          userId: id,
          storeFilter: u?.storeId ?? 'all',
          regionFilter: u?.region ?? (u?.storeId ? STORES.find((st) => st.id === u.storeId)?.state ?? 'all' : 'all'),
        }));
        if (u) toast(u.name);
      },
      signOut: () => patch((s) => ({ ...s, userId: null })),
      setStoreFilter: (id) => patch((s) => ({ ...s, storeFilter: id })),
      setRegionFilter: (id) => patch((s) => ({ ...s, regionFilter: id, storeFilter: 'all' })),
      ack: (id) => {
        const key = id.split(':').slice(1).join(':');
        patch((s) => ({ ...s, live: { ...s.live, acked: [...s.live.acked, key] } }));
        toast('Dismissed');
      },
      setOverride: (key, o) => {
        patch((s) => {
          const overrides = { ...s.live.overrides };
          if (!o) delete overrides[key];
          else overrides[key] = o;
          return { ...s, live: { ...s.live, overrides } };
        });
        toast(o ? 'Override saved' : 'Override cleared');
      },
      adjustStock: (skuId, storeId, delta) => {
        const key = posKey(skuId, storeId);
        patch((s) => {
          const cur = { ...(WORLD.positions[key] ?? { onHand: 0, inbound: 0 }), ...s.live.positions[key] };
          return {
            ...s,
            live: {
              ...s.live,
              positions: {
                ...s.live.positions,
                [key]: { ...cur, onHand: Math.max(0, cur.onHand + delta) },
              },
            },
          };
        });
        toast(delta >= 0 ? `+${delta}` : `${delta}`);
      },
      writeOff: (skuId, storeId, qty, reason) => {
        const key = posKey(skuId, storeId);
        patch((s) => {
          const cur = { ...(WORLD.positions[key] ?? { onHand: 0, inbound: 0 }), ...s.live.positions[key] };
          return {
            ...s,
            waste: [{ at: WORLD.asOf, skuId, storeId, qty, reason }, ...s.waste],
            live: {
              ...s.live,
              positions: {
                ...s.live.positions,
                [key]: { ...cur, onHand: Math.max(0, cur.onHand - qty), nearestExpiry: reason === 'expiry' ? undefined : cur.nearestExpiry },
              },
            },
          };
        });
        toast(`Wrote off ${qty}`);
      },
      hold: (key) => {
        patch((s) => {
          const cur = s.live.held ?? [];
          const held = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
          return { ...s, live: { ...s.live, held } };
        });
        toast('Held');
      },
      createBuy: (lines, note) => {
        const groups = new Map<string, { skuId: string; storeId: string; qty: number }[]>();
        for (const line of lines) {
          const sku = SKUS.find((x) => x.id === line.skuId)!;
          const g = `${sku.supplierId}::${line.storeId}`;
          const arr = groups.get(g) ?? [];
          arr.push(line);
          groups.set(g, arr);
        }
        const ids: string[] = [];
        patch((s) => {
          let seq = s.poSeq;
          let live = s.live;
          const pos = [...s.pos];
          for (const [g, glines] of groups) {
            const [supplierId, storeId] = g.split('::');
            seq += 1;
            const id = `PO-2026-${String(seq).padStart(4, '0')}`;
            ids.push(id);
            const po: PurchaseOrder = {
              id,
              supplierId,
              storeId,
              status: user?.role === 'planner' || user?.role === 'buyer' ? 'approved' : 'submitted',
              createdAt: WORLD.asOf,
              eta: addLead(WORLD.asOf, SKUS.find((x) => x.id === glines[0].skuId)!.supplierId),
              lines: glines.map((l) => ({
                skuId: l.skuId,
                qty: l.qty,
                cost: SKUS.find((x) => x.id === l.skuId)!.cost,
              })),
              note,
            };
            pos.unshift(po);
            live = applyApprove(live, WORLD.positions, po);
          }
          return { ...s, poSeq: seq, pos, live };
        });
        toast(ids.join(', '));
        return ids;
      },
      setPoStatus: (id, status) => {
        patch((s) => ({
          ...s,
          pos: s.pos.map((p) => (p.id === id ? { ...p, status } : p)),
        }));
      },
      receivePo: (id, got) => {
        patch((s) => {
          const po = s.pos.find((p) => p.id === id);
          if (!po) return s;
          return {
            ...s,
            pos: s.pos.map((p) => (p.id === id ? { ...p, status: 'received' as const } : p)),
            live: applyReceive(s.live, po, WORLD.positions, got),
          };
        });
        toast(`${id} received`);
      },
      cancelPo: (id) => {
        patch((s) => {
          const po = s.pos.find((p) => p.id === id);
          if (!po || po.status === 'received') return s;
          return {
            ...s,
            pos: s.pos.map((p) => (p.id === id ? { ...p, status: 'cancelled' as const } : p)),
            live: applyCancel(s.live, WORLD.positions, po),
          };
        });
        toast(`${id} cancelled`);
      },
      transfer: (skuId, from, to, qty) => {
        let id = '';
        patch((s) => {
          const seq = s.trSeq + 1;
          id = `TR-${String(seq).padStart(4, '0')}`;
          const t: Transfer = {
            id,
            skuId,
            fromStoreId: from,
            toStoreId: to,
            qty,
            status: 'received',
            createdAt: WORLD.asOf,
          };
          return {
            ...s,
            trSeq: seq,
            transfers: [t, ...s.transfers],
            live: applyTransfer(s.live, WORLD.positions, t),
          };
        });
        toast(`${id} · ${qty}`);
        return id;
      },
      receiveTransfer: (id) => {
        patch((s) => ({
          ...s,
          transfers: s.transfers.map((t) => (t.id === id ? { ...t, status: 'received' as const } : t)),
        }));
      },
      addPromo: (p) => {
        patch((s) => ({ ...s, live: { ...s.live, extraPromos: [...s.live.extraPromos, p] } }));
        toast('Promo on');
      },
      setModel: (key, id) => {
        patch((s) => {
          const modelPick = { ...s.live.modelPick };
          if (!id) delete modelPick[key];
          else modelPick[key] = id;
          return { ...s, live: { ...s.live, modelPick } };
        });
        toast(id ? `Using ${id}` : 'Best model');
      },
      reset: () => {
        setSaved((s) => ({ ...INITIAL, userId: s.userId, storeFilter: s.storeFilter, regionFilter: s.regionFilter }));
        toast('Reset');
      },
      toast,
    };
  }, [saved, user, storeFilter, regionFilter, scopedStore, scopedIds, stores, regionStores, toasts]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useStore() {
  const v = useContext(C);
  if (!v) throw new Error('store');
  return v;
}

export function useToday() {
  const { live, scopedIds, pos } = useStore();
  const ex = useMemo(() => exceptions(WORLD, live, scopedIds), [live, scopedIds]);
  const sug = useMemo(() => allSuggestions(WORLD, live, scopedIds), [live, scopedIds]);
  const fill = fillRate(WORLD, live, scopedIds);
  const mape = chainMape(WORLD, scopedIds);
  const value = inventoryValue(WORLD, live, scopedIds);
  const openPos = pos.filter((p) => p.status !== 'received' && p.status !== 'cancelled' && (!scopedIds || scopedIds.includes(p.storeId)));
  const sales = yesterdaySales(WORLD, scopedIds);
  const lost = lostMargin(WORLD, live, scopedIds);
  return { ex, sug, fill, mape, value, openPos, sales, lost, world: WORLD };
}

export const useTower = useToday;

function addLead(asOf: string, supplierId: string) {
  const lead = SUPPLIERS.find((s) => s.id === supplierId)?.leadDays ?? 5;
  const [y, m, d] = asOf.split('-').map(Number);
  const dt = new Date(y, m - 1, d + lead);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}
