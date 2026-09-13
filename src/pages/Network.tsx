import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SKUS, SUPPLIERS } from '../data/catalog';
import { poValue, storeStats } from '../engine/plan';
import { inr, inrCompact, pct } from '../lib/format';
import { useStore } from '../store/Store';
import { WORLD } from '../data/world';
import { Badge, Drawer } from '../ui/bits';

export function Network() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { live, pos, setStoreFilter, stores: scoped } = useStore();
  const [supplierId, setSupplierId] = useState(params.get('supplier'));

  const stores = useMemo(
    () =>
      scoped.map((st) => ({
        st,
        ...storeStats(WORLD, live, st.id),
      })),
    [live, scoped],
  );

  const suppliers = SUPPLIERS.map((s) => {
    const open = pos.filter((p) => p.supplierId === s.id && p.status !== 'received' && p.status !== 'cancelled');
    const skus = SKUS.filter((k) => k.supplierId === s.id);
    return { s, open, skus, openValue: open.reduce((n, p) => n + poValue(p), 0) };
  });

  const selected = suppliers.find((x) => x.s.id === supplierId);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="sheet rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line font-medium text-[13px]">Stores</div>
          <table className="data">
            <thead>
              <tr>
                <th>Store</th>
                <th>Fill</th>
                <th>Empty</th>
                <th>MAPE</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(({ st, fill, stockouts, mape, value }) => (
                <tr
                  key={st.id}
                  onClick={() => {
                    setStoreFilter(st.id);
                    nav('/stock');
                  }}
                >
                  <td>
                    <div className="font-medium">{st.name}</div>
                    <div className="text-[12px] text-mute">
                      {st.city} · {st.format} · {st.manager}
                    </div>
                  </td>
                  <td className="num">{pct(fill, 1)}</td>
                  <td className="num">{stockouts ? <span className="text-crit">{stockouts}</span> : '0'}</td>
                  <td className="num text-mute">{pct(mape, 0)}</td>
                  <td className="num">{inrCompact(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="sheet rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line font-medium text-[13px]">Suppliers</div>
          <table className="data">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Lead</th>
                <th>OTIF</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(({ s, open, openValue, skus }) => (
                <tr key={s.id} className={supplierId === s.id ? 'active' : ''} onClick={() => setSupplierId(s.id)}>
                  <td>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-[12px] text-mute">
                      {s.ticker && s.last != null ? (
                        <span className="num">
                          {s.ticker} {s.last.toFixed(2)}{' '}
                          <span className={s.chg! >= 0 ? 'text-forest-dim' : 'text-crit'}>
                            {s.chg! >= 0 ? '+' : ''}
                            {s.chg}%
                          </span>
                        </span>
                      ) : (
                        `${s.city} · ${skus.length}`
                      )}
                    </div>
                  </td>
                  <td className="num">{s.leadDays}d</td>
                  <td>
                    <Badge tone={s.otif < 0.9 ? 'warn' : 'ok'}>{pct(s.otif * 100, 0)}</Badge>
                  </td>
                  <td className="num">
                    {open.length ? (
                      <>
                        {open.length} · {inrCompact(openValue)}
                      </>
                    ) : (
                      <span className="text-mute">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {selected && (
        <Drawer
          open
          onClose={() => setSupplierId(null)}
          title={selected.s.name}
          kicker={`${selected.s.city} · ${selected.s.leadDays}d · OTIF ${pct(selected.s.otif * 100, 0)}`}
        >
          {selected.s.last != null && (
            <div className="num text-[13px] mb-3">
              {selected.s.ticker} {selected.s.last.toFixed(2)} {selected.s.chg! >= 0 ? '+' : ''}
              {selected.s.chg}%
            </div>
          )}
          <div className="text-[12px] text-mute mb-2">SKUs</div>
          <ul className="text-[13px] space-y-1 mb-4">
            {selected.skus.map((k) => (
              <li key={k.id} className="flex justify-between gap-3">
                <span>
                  {k.brand} {k.name}
                </span>
                <span className="text-mute num">₹{k.cost}</span>
              </li>
            ))}
          </ul>
          {selected.open.length > 0 && (
            <>
              <div className="text-[12px] text-mute mb-2 mt-3">Open POs</div>
              <ul className="text-[13px] space-y-1">
                {selected.open.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span className="num">{p.id}</span>
                    <span>{inr(poValue(p))}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button type="button" className="btn btn-ghost mt-5" onClick={() => nav('/buy')}>
            Buy
          </button>
        </Drawer>
      )}
    </div>
  );
}
