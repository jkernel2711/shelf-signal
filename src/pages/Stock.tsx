import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SKUS, STORES, posKey } from '../data/catalog';
import { skuById, storeById } from '../engine/demand';
import { avgDaily, coverDays, livePosition, suggestedFor } from '../engine/plan';
import { CATEGORY_LABEL, cases, daysBetween, inr, num } from '../lib/format';
import { useStore } from '../store/Store';
import { WORLD } from '../data/world';
import { Badge, Cover, Drawer, Field } from '../ui/bits';

type Bucket = 'all' | 'empty' | 'risk' | 'over' | 'expiring';

export function Stock() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { live, scopedStore, stores, setStoreFilter, adjustStock, transfer, createBuy, writeOff, waste } = useStore();
  const storeFromUrl = params.get('store');
  useEffect(() => {
    if (storeFromUrl) setStoreFilter(storeFromUrl);
  }, [storeFromUrl, setStoreFilter]);
  const storeId = scopedStore ?? storeFromUrl ?? 'all';
  const [q, setQ] = useState('');
  const [bucket, setBucket] = useState<Bucket>('all');
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [q, bucket, cat, storeId]);

  const rows = useMemo(() => {
    const out: {
      key: string;
      skuId: string;
      storeId: string;
      onHand: number;
      inbound: number;
      daily: number;
      cover: number;
      expiry?: string;
    }[] = [];
    for (const sku of SKUS) {
      if (cat !== 'all' && sku.category !== cat) continue;
      for (const st of stores) {
        if (storeId !== 'all' && st.id !== storeId) continue;
        const key = posKey(sku.id, st.id);
        const pos = livePosition(WORLD, live, key);
        const daily = avgDaily(WORLD, live, key);
        const cover = coverDays(pos.onHand, daily);
        out.push({
          key,
          skuId: sku.id,
          storeId: st.id,
          onHand: pos.onHand,
          inbound: pos.inbound,
          daily,
          cover,
          expiry: pos.nearestExpiry,
        });
      }
    }
    const t = q.trim().toLowerCase();
    return out.filter((r) => {
      const sku = skuById(r.skuId);
      const st = storeById(r.storeId);
      if (t && !`${sku.brand} ${sku.name} ${st.name}`.toLowerCase().includes(t)) return false;
      if (bucket === 'empty') return r.onHand <= 0;
      if (bucket === 'risk') return r.onHand > 0 && r.cover < 3;
      if (bucket === 'over') return r.cover > 40;
      if (bucket === 'expiring') return r.expiry && daysBetween(WORLD.asOf, r.expiry) <= 5;
      return true;
    });
  }, [live, storeId, q, bucket, cat, stores]);

  const sel = open ? rows.find((r) => r.key === open) ?? openRow(open, live) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[13px] text-mute num">{num(rows.length)}</div>
        {rows.length > 80 && (
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost h-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <button type="button" className="btn btn-ghost h-7" disabled={(page + 1) * 80 >= rows.length} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SKU or store" className="w-56" />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {(['all', 'empty', 'risk', 'over', 'expiring'] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBucket(b)}
            className={`px-2.5 h-8 rounded-md text-[12px] ${bucket === b ? 'bg-forest text-paper' : 'bg-white border border-line text-mute'}`}
          >
            {b === 'all' ? 'All' : b === 'empty' ? 'Empty' : b === 'risk' ? 'At risk' : b === 'over' ? 'Heavy' : 'Expiring'}
          </button>
        ))}
      </div>

      <section className="sheet rounded-2xl overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Store</th>
              <th>On hand</th>
              <th>Inbound</th>
              <th>Daily</th>
              <th>Cover</th>
              <th>Value</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 80, page * 80 + 80).map((r) => {
              const sku = skuById(r.skuId);
              const st = storeById(r.storeId);
              return (
                <tr key={r.key} className={open === r.key ? 'active' : ''} onClick={() => setOpen(r.key)}>
                  <td>
                    <div className="font-medium">{sku.brand}</div>
                    <div className="text-[12px] text-mute">{sku.name}</div>
                  </td>
                  <td className="text-mute">{st.name}</td>
                  <td className="num">{num(r.onHand)}</td>
                  <td className="num text-mute">{r.inbound ? num(r.inbound) : '—'}</td>
                  <td className="num">{num(r.daily, 1)}</td>
                  <td>
                    <Cover days={r.cover} />
                  </td>
                  <td className="num">{inr(r.onHand * sku.cost)}</td>
                  <td>
                    {r.expiry ? (
                      <Badge tone={daysBetween(WORLD.asOf, r.expiry) <= 2 ? 'crit' : 'warn'}>{r.expiry}</Badge>
                    ) : (
                      <span className="text-mute">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <div className="p-10 text-center text-mute text-sm">None</div>}
      </section>

      {sel && (
        <StockDrawer
          row={sel}
          onClose={() => setOpen(null)}
          onDemand={() => nav(`/forecast?sku=${sel.skuId}&store=${sel.storeId}`)}
          onAdjust={adjustStock}
          onTransfer={transfer}
          onBuy={(qty) => createBuy([{ skuId: sel.skuId, storeId: sel.storeId, qty }])}
          onFocusStore={() => setStoreFilter(sel.storeId)}
          onWriteOff={writeOff}
          waste={waste.filter((w) => w.skuId === sel.skuId && w.storeId === sel.storeId)}
        />
      )}
    </div>
  );
}

function openRow(key: string, live: ReturnType<typeof useStore>['live']) {
  const [skuId, storeId] = key.split(':');
  const pos = livePosition(WORLD, live, key);
  const daily = avgDaily(WORLD, live, key);
  return {
    key,
    skuId,
    storeId,
    onHand: pos.onHand,
    inbound: pos.inbound,
    daily,
    cover: coverDays(pos.onHand, daily),
    expiry: pos.nearestExpiry,
  };
}

function StockDrawer({
  row,
  onClose,
  onDemand,
  onAdjust,
  onTransfer,
  onBuy,
  onFocusStore,
  onWriteOff,
  waste,
}: {
  row: {
    key: string;
    skuId: string;
    storeId: string;
    onHand: number;
    inbound: number;
    daily: number;
    cover: number;
    expiry?: string;
  };
  onClose: () => void;
  onDemand: () => void;
  onAdjust: (skuId: string, storeId: string, delta: number) => void;
  onTransfer: (skuId: string, from: string, to: string, qty: number) => string;
  onBuy: (qty: number) => void;
  onFocusStore: () => void;
  onWriteOff: (skuId: string, storeId: string, qty: number, reason: 'expiry' | 'damage' | 'shrink') => void;
  waste: { qty: number; reason: string; at: string }[];
}) {
  const sku = skuById(row.skuId);
  const store = storeById(row.storeId);
  const sug = suggestedFor(WORLD, useStore().live, row.skuId, row.storeId);
  const [delta, setDelta] = useState(0);
  const [to, setTo] = useState(STORES.find((s) => s.id !== store.id)!.id);
  const [qty, setQty] = useState(Math.min(row.onHand, sku.casePack) || 1);
  const [off, setOff] = useState(1);
  const [why, setWhy] = useState<'expiry' | 'damage' | 'shrink'>('expiry');

  return (
    <Drawer open onClose={onClose} title={`${sku.brand} ${sku.name}`} kicker={store.name}>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Mini k="On hand" v={cases(row.onHand, sku.casePack)} />
        <Mini k="Cover" v={`${row.cover.toFixed(1)}d`} />
        <Mini k="Inbound" v={num(row.inbound)} />
        <Mini k="Value" v={inr(row.onHand * sku.cost)} />
      </div>
      {row.expiry && <p className="text-[13px] text-crit mb-3">{row.expiry}</p>}
      <div className="flex gap-2 mb-4">
        <button type="button" className="btn btn-ghost" onClick={onDemand}>
          Forecast
        </button>
        <button type="button" className="btn btn-ghost" onClick={onFocusStore}>
          This store
        </button>
      </div>

      <div className="text-[12px] text-mute mb-1">Count</div>
      <div className="flex gap-2 mb-4">
        <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} className="w-24" />
        <button type="button" className="btn btn-primary" onClick={() => onAdjust(row.skuId, row.storeId, delta)}>
          Apply
        </button>
      </div>

      <div className="text-[12px] text-mute mb-1">Write off</div>
      <div className="flex gap-2 mb-4">
        <input type="number" min={1} max={row.onHand} value={off} onChange={(e) => setOff(Number(e.target.value))} className="w-20" />
        <select value={why} onChange={(e) => setWhy(e.target.value as typeof why)}>
          <option value="expiry">Expiry</option>
          <option value="damage">Damage</option>
          <option value="shrink">Shrink</option>
        </select>
        <button type="button" className="btn btn-ghost" disabled={off <= 0 || off > row.onHand} onClick={() => onWriteOff(row.skuId, row.storeId, off, why)}>
          Off
        </button>
      </div>

      <div className="text-[12px] text-mute mb-1">Transfer</div>
      <Field label="To">
        <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full">
          {STORES.filter((s) => s.id !== store.id).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex gap-2 mb-4">
        <input type="number" min={1} max={row.onHand} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-24" />
        <button type="button" className="btn btn-ghost" disabled={qty <= 0 || qty > row.onHand} onClick={() => onTransfer(row.skuId, store.id, to, qty)}>
          Move
        </button>
      </div>

      {sug && (
        <button type="button" className="btn btn-primary mb-4" onClick={() => onBuy(sug.qty)}>
          Buy {sug.qty}
        </button>
      )}

      {waste.length > 0 && (
        <div className="text-[12px] text-mute space-y-1">
          {waste.map((w, i) => (
            <div key={i}>
              {w.at} · {w.reason} · {w.qty}
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-mist/60 rounded-lg px-3 py-2">
      <div className="text-[11px] text-mute">{k}</div>
      <div className="num">{v}</div>
    </div>
  );
}
