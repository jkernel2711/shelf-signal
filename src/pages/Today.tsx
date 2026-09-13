import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FESTIVALS, SKUS, STORES, posKey } from '../data/catalog';
import { MODEL_LABEL } from '../engine/forecast';
import { avgDaily, chainSeries, coverDays, livePosition, modelMix } from '../engine/plan';
import { daysBetween, inrCompact, num, pct } from '../lib/format';
import { useStore, useToday } from '../store/Store';
import { Badge, Cover, Kpi, SeriesChart } from '../ui/bits';
import type { ExceptionKind } from '../types';

const KIND: Record<ExceptionKind, string> = {
  stockout: 'Stockout',
  risk: 'At risk',
  expiring: 'Expiring',
  miss: 'Forecast miss',
  overstock: 'Overstock',
  event: 'Festival',
};

export function Today() {
  const nav = useNavigate();
  const { live, ack, createBuy, stores } = useStore();
  const { ex, sug, fill, mape, value, sales, lost, world } = useToday();
  const [kind, setKind] = useState<ExceptionKind | 'all'>('all');
  const shown = kind === 'all' ? ex : ex.filter((e) => e.kind === kind);
  const stockouts = ex.filter((e) => e.kind === 'stockout').length;
  const urgentBuy = sug.filter((s) => s.urgent).slice(0, 8);
  const mix = useMemo(() => modelMix(world, stores.map((s) => s.id)), [world, stores]);
  const nextFest = FESTIVALS.find((f) => f.start >= world.asOf);
  const daysToFest = nextFest ? daysBetween(world.asOf, nextFest.start) : 99;

  const chain = useMemo(() => chainSeries(world, live, stores.map((s) => s.id)), [world, live, stores]);

  const heat = stores.map((st) => {
    let empty = 0;
    let low = 0;
    for (const sku of SKUS) {
      if (sku.abc === 'C') continue;
      const key = posKey(sku.id, st.id);
      const pos = livePosition(world, live, key);
      const daily = avgDaily(world, live, key);
      const c = coverDays(pos.onHand, daily);
      if (pos.onHand <= 0) empty++;
      else if (c < 3) low++;
    }
    return { st, empty, low };
  });

  const winner = Object.entries(mix.counts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div>
      {nextFest && daysToFest <= 3 && (
        <div className="sheet rounded-2xl px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
          <Badge tone="warn">{daysToFest === 0 ? 'Today' : daysToFest === 1 ? 'Tomorrow' : `${daysToFest}d`}</Badge>
          <div className="text-[13px]">
            <span className="font-medium">{nextFest.name}</span>
            <span className="text-mute">
              {' '}
              · dairy ×{nextFest.lifts.dairy ?? 1} · staples ×{nextFest.lifts.staples ?? 1} · snacks ×{nextFest.lifts.snacks ?? 1}. Forecasts
              already include the lift. Buy from the festival queue.
            </span>
          </div>
          <button type="button" className="btn btn-ghost h-7 text-[12px] ml-auto" onClick={() => setKind('event')}>
            Festival SKUs
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <Kpi label="On-shelf fill" value={pct(fill, 1)} tone={fill < 94 ? 'crit' : 'ok'} />
        <Kpi label="Stockouts" value={num(stockouts)} tone={stockouts ? 'crit' : 'ok'} />
        <Kpi
          label="Forecast MAPE"
          value={pct(mape, 1)}
          hint={winner ? `Best model most often: ${MODEL_LABEL[winner[0] as keyof typeof MODEL_LABEL] ?? winner[0]}` : undefined}
          tone={mape > 22 ? 'warn' : 'ok'}
        />
        <Kpi label="Stock value" value={inrCompact(value)} />
        <Kpi
          label="Yesterday"
          value={inrCompact(sales.rupees)}
          hint={lost ? `Lost margin on empty ${inrCompact(lost)}/day` : undefined}
          tone={lost ? 'warn' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-4">
        <section className="sheet rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line flex flex-wrap items-center gap-2">
            <div className="font-medium text-[13px]">{shown.length} to act on</div>
            <div className="ml-auto flex gap-1 flex-wrap justify-end">
              {(['all', 'stockout', 'event', 'risk', 'expiring', 'overstock'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`px-2 h-7 rounded-md text-[12px] ${kind === k ? 'bg-forest text-paper' : 'text-mute hover:bg-mist'}`}
                >
                  {k === 'all' ? 'All' : KIND[k]}
                </button>
              ))}
            </div>
            {urgentBuy.length > 0 && (
              <button
                type="button"
                className="btn btn-primary h-7 text-[12px]"
                onClick={() => {
                  createBuy(urgentBuy.map((l) => ({ skuId: l.skuId, storeId: l.storeId, qty: l.qty })));
                  nav('/buy');
                }}
              >
                Buy {urgentBuy.length}
              </button>
            )}
          </div>
          <div className="max-h-[540px] overflow-y-auto">
            <table className="data">
              <thead>
                <tr>
                  <th></th>
                  <th>SKU</th>
                  <th>Store</th>
                  <th>Cover</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 50).map((e) => {
                  const sku = SKUS.find((s) => s.id === e.skuId)!;
                  const store = STORES.find((s) => s.id === e.storeId)!;
                  return (
                    <tr key={e.id}>
                      <td>
                        <Badge tone={e.severity === 'crit' ? 'crit' : e.severity === 'warn' ? 'warn' : 'mute'}>{KIND[e.kind]}</Badge>
                      </td>
                      <td>
                        <button type="button" className="text-left" onClick={() => nav(`/forecast?sku=${sku.id}&store=${store.id}`)}>
                          <div className="font-medium">
                            {sku.brand} {sku.name}
                          </div>
                          <div className="text-[12px] text-mute">{e.detail}</div>
                        </button>
                      </td>
                      <td className="text-mute">{store.name}</td>
                      <td>
                        <Cover days={e.coverDays} />
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {e.suggestedQty > 0 && (
                          <button
                            type="button"
                            className="btn btn-ghost h-7 text-[12px] mr-1"
                            onClick={() => createBuy([{ skuId: e.skuId, storeId: e.storeId, qty: e.suggestedQty }])}
                          >
                            Buy {e.suggestedQty}
                          </button>
                        )}
                        <button type="button" className="text-[12px] text-mute hover:text-ink" onClick={() => ack(e.id)}>
                          Dismiss
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!shown.length && <div className="p-8 text-center text-mute text-sm">Nothing in this queue.</div>}
          </div>
        </section>

        <div className="space-y-4">
          <section className="sheet rounded-2xl p-4">
            <div className="text-[12px] text-mute mb-2">Chain units · best model per SKU-store, calendar-adjusted</div>
            <SeriesChart
              actual={chain.actual}
              fitted={chain.fitted}
              forecast={chain.forecast}
              asOf={world.asOf}
              festivals={FESTIVALS.filter((f) => f.end >= world.asOf || f.start >= isoAdd(world.asOf, -84))}
              fittedLabel="In-sample"
            />
          </section>
          <section className="sheet rounded-2xl p-4">
            <div className="text-[12px] text-mute mb-2">Stores · stockouts / low cover</div>
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {heat.map(({ st, empty, low }) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => nav(`/stock?store=${st.id}`)}
                  className="w-full flex items-center gap-3 text-left py-1"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate">
                      {st.name}
                      <span className="text-[11px] text-mute ml-1.5">T{st.tier}</span>
                    </div>
                    <div className="text-[11px] text-mute">{st.city}</div>
                  </div>
                  <div className="text-right text-[12px] num shrink-0">
                    {empty ? <span className="text-crit">{empty}</span> : <span className="text-forest-dim">0</span>}
                    {low ? <span className="text-amber ml-2">{low}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function isoAdd(asOf: string, days: number) {
  const [y, m, d] = asOf.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}
