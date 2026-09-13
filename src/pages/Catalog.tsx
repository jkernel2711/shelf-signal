import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SKUS, STORES, SUPPLIERS, posKey } from '../data/catalog';
import { avgDaily, coverDays, livePosition, mape } from '../engine/plan';
import { MODEL_LABEL } from '../engine/forecast';
import { CATEGORY_LABEL, inr, num, pct } from '../lib/format';
import { useStore } from '../store/Store';
import { WORLD } from '../data/world';
import { Badge, Cover, Drawer } from '../ui/bits';
import type { Abc, Sku } from '../types';

export function Catalog() {
  const nav = useNavigate();
  const { live } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [abc, setAbc] = useState<Abc | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    return SKUS.filter((s) => {
      if (cat !== 'all' && s.category !== cat) return false;
      if (abc !== 'all' && s.abc !== abc) return false;
      const t = q.trim().toLowerCase();
      if (!t) return true;
      return `${s.brand} ${s.name} ${s.id}`.toLowerCase().includes(t);
    }).map((s) => {
      let on = 0;
      let empty = 0;
      for (const st of STORES) {
        const pos = livePosition(WORLD, live, posKey(s.id, st.id));
        on += pos.onHand;
        if (pos.onHand <= 0) empty++;
      }
      const chainDaily = STORES.reduce((n, st) => n + avgDaily(WORLD, live, posKey(s.id, st.id)), 0);
      return { s, on, empty, chainDaily, mape: chainMapeSku(s.id), best: WORLD.series[posKey(s.id, STORES[0].id)]?.best };
    });
  }, [q, cat, abc, live]);

  const sku = open ? SKUS.find((s) => s.id === open) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[13px] text-mute num">{SKUS.length} SKUs · 11 Sep 2026 prices</div>
      </div>

      <div className="flex gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Brand or SKU" className="w-56" />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {(['all', 'A', 'B', 'C'] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAbc(a)}
            className={`px-2.5 h-8 rounded-md text-[12px] ${abc === a ? 'bg-forest text-paper' : 'bg-white border border-line text-mute'}`}
          >
            {a === 'all' ? 'ABC' : a}
          </button>
        ))}
      </div>

      <section className="sheet rounded-2xl overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Category</th>
              <th>ABC</th>
              <th>Pack</th>
              <th>MRP</th>
              <th>Cost</th>
              <th>GM</th>
              <th>On hand</th>
              <th>Empty stores</th>
              <th>Best model</th>
              <th>Holdout MAPE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, on, empty, mape: m, best }) => (
              <tr key={s.id} onClick={() => setOpen(s.id)} className={open === s.id ? 'active' : ''}>
                <td>
                  <div className="font-medium">{s.brand}</div>
                  <div className="text-[12px] text-mute">{s.name}</div>
                </td>
                <td className="text-mute">{CATEGORY_LABEL[s.category]}</td>
                <td>
                  <Badge tone={s.abc === 'A' ? 'forest' : 'mute'}>{s.abc}</Badge>
                </td>
                <td className="text-mute">
                  {s.pack} · {s.casePack}/cs
                </td>
                <td className="num">{inr(s.mrp)}</td>
                <td className="num">{inr(s.cost)}</td>
                <td className="num">{pct(((s.mrp - s.cost) / s.mrp) * 100, 0)}</td>
                <td className="num">{num(on)}</td>
                <td className="num">{empty ? <span className="text-crit">{empty}</span> : '0'}</td>
                <td className="text-mute">{best ? MODEL_LABEL[best] : '—'}</td>
                <td className="num text-mute">{pct(m, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {sku && (
        <SkuDrawer sku={sku} onClose={() => setOpen(null)} onForecast={() => nav(`/forecast?sku=${sku.id}`)} />
      )}
    </div>
  );
}

function chainMapeSku(skuId: string) {
  let s = 0;
  let n = 0;
  for (const st of STORES) {
    const m = mape(WORLD, posKey(skuId, st.id));
    if (m) {
      s += m;
      n++;
    }
  }
  return n ? s / n : 0;
}

function SkuDrawer({ sku, onClose, onForecast }: { sku: Sku; onClose: () => void; onForecast: () => void }) {
  const { live } = useStore();
  const sup = SUPPLIERS.find((s) => s.id === sku.supplierId)!;
  const stores = STORES.map((st) => {
    const key = posKey(sku.id, st.id);
    const pos = livePosition(WORLD, live, key);
    const daily = avgDaily(WORLD, live, key);
    return { st, pos, daily, cover: coverDays(pos.onHand, daily) };
  });

  return (
    <Drawer open onClose={onClose} title={`${sku.brand} ${sku.name}`} kicker={CATEGORY_LABEL[sku.category]} wide>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Mini k="MRP" v={inr(sku.mrp)} />
        <Mini k="Cost" v={inr(sku.cost)} />
        <Mini k="GM" v={`${(((sku.mrp - sku.cost) / sku.mrp) * 100).toFixed(0)}%`} />
        <Mini k="GST" v={`${sku.gst}%`} />
        <Mini k="Case" v={String(sku.casePack)} />
        <Mini k="MOQ" v={String(sku.moq)} />
        <Mini k="Shelf life" v={`${sku.shelfLifeDays}d`} />
      </div>
      <p className="text-[13px] text-mute mb-4">
        {sup.name} · {sup.leadDays}d · {Math.round(sup.otif * 100)}%
        {sup.last != null ? ` · ${sup.ticker} ${sup.last}` : ''}
      </p>
      <button type="button" className="btn btn-primary mb-4" onClick={onForecast}>
        Forecast
      </button>
      <table className="data">
        <thead>
          <tr>
            <th>Store</th>
            <th>On hand</th>
            <th>Daily</th>
            <th>Cover</th>
          </tr>
        </thead>
        <tbody>
          {stores.map(({ st, pos, daily, cover }) => (
            <tr key={st.id}>
              <td>{st.name}</td>
              <td className="num">{num(pos.onHand)}</td>
              <td className="num">{num(daily, 1)}</td>
              <td>
                <Cover days={cover} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
