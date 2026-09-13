import { useMemo, useState } from 'react';
import { CATEGORY_LABEL, inr, inrCompact, num } from '../lib/format';
import { salesByCategory, salesByStore, yesterdaySales } from '../engine/plan';
import { useStore } from '../store/Store';
import { WORLD } from '../data/world';

export function Sales() {
  const { scopedIds } = useStore();
  const [tab, setTab] = useState<'store' | 'category'>('store');
  const chain = yesterdaySales(WORLD, scopedIds);
  const week = useMemo(() => {
    const rows = salesByStore(WORLD, scopedIds);
    return rows.reduce((s, r) => s + r.week, 0);
  }, [scopedIds]);
  const stores = useMemo(() => salesByStore(WORLD, scopedIds).sort((a, b) => b.yday - a.yday), [scopedIds]);
  const cats = useMemo(() => salesByCategory(WORLD, scopedIds), [scopedIds]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="sheet rounded-xl px-4 py-3">
          <div className="text-[11px] text-mute">Yesterday</div>
          <div className="num text-[24px] mt-1">{inrCompact(chain.rupees)}</div>
          <div className="text-[12px] text-mute num">{num(chain.units)} units</div>
        </div>
        <div className="sheet rounded-xl px-4 py-3">
          <div className="text-[11px] text-mute">7 days</div>
          <div className="num text-[24px] mt-1">{inrCompact(week)}</div>
        </div>
        <div className="sheet rounded-xl px-4 py-3">
          <div className="text-[11px] text-mute">Stores</div>
          <div className="num text-[24px] mt-1">{stores.length}</div>
        </div>
      </div>

      <div className="flex gap-1 bg-white border border-line rounded-lg p-1 w-fit mb-4">
        <button type="button" className={`px-3 h-8 rounded-md text-[13px] ${tab === 'store' ? 'bg-forest text-paper' : 'text-mute'}`} onClick={() => setTab('store')}>
          Store
        </button>
        <button type="button" className={`px-3 h-8 rounded-md text-[13px] ${tab === 'category' ? 'bg-forest text-paper' : 'text-mute'}`} onClick={() => setTab('category')}>
          Category
        </button>
      </div>

      <section className="sheet rounded-2xl overflow-hidden">
        {tab === 'store' ? (
          <table className="data">
            <thead>
              <tr>
                <th>Store</th>
                <th>Yesterday</th>
                <th>Units</th>
                <th>7 days</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(({ st, yday, week: w, units }) => (
                <tr key={st.id}>
                  <td>
                    <div className="font-medium">{st.name}</div>
                    <div className="text-[12px] text-mute">
                      {st.city} · {st.format}
                    </div>
                  </td>
                  <td className="num">{inr(yday)}</td>
                  <td className="num">{num(units)}</td>
                  <td className="num">{inrCompact(w)}</td>
                  <td className="num text-mute">{chain.rupees ? ((yday / chain.rupees) * 100).toFixed(1) : '0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Category</th>
                <th>Yesterday</th>
                <th>Units</th>
                <th>7 days</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.category}>
                  <td>{CATEGORY_LABEL[c.category]}</td>
                  <td className="num">{inr(c.yday)}</td>
                  <td className="num">{num(c.units)}</td>
                  <td className="num">{inrCompact(c.week)}</td>
                  <td className="num text-mute">{chain.rupees ? ((c.yday / chain.rupees) * 100).toFixed(1) : '0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
