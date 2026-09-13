import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FESTIVALS, HORIZON, SKUS, TEST_H, posKey } from '../data/catalog';
import { WORLD } from '../data/world';
import { explainDay, festivalsOn, skuById, storeById } from '../engine/demand';
import { ALL_MODELS, MODEL_BLURB, MODEL_LABEL, STAT_MODELS, band, ensureNeural, type ModelId } from '../engine/forecast';
import { avgDaily, coverDays, fitFor, forecastAt, livePosition, mape, modelFor } from '../engine/plan';
import { CATEGORY_LABEL, inr, num, pct } from '../lib/format';
import { useStore } from '../store/Store';
import { Badge, Cover, SeriesChart } from '../ui/bits';

const OTHER_COLOR: Record<ModelId, string> = {
  naive: '#8a8374',
  ma: '#5b7c99',
  arima: '#6b4f9a',
  sarima: '#2f6b4f',
  lstm: '#a35d2a',
  hybrid: '#a32d21',
};

export function Forecast() {
  const [params, setParams] = useSearchParams();
  const { live, scopedStore, regionStores, setOverride, addPromo, setModel } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [neural, setNeural] = useState(false);
  const skuId = params.get('sku') ?? SKUS[0].id;
  const storeId = params.get('store') ?? scopedStore ?? regionStores[0]?.id ?? 'hyd-gachi';
  const sku = skuById(skuId);
  const store = storeById(storeId);
  const key = posKey(sku.id, store.id);
  const series = WORLD.series[key];
  const pos = livePosition(WORLD, live, key);
  const daily = avgDaily(WORLD, live, key);
  const cover = coverDays(pos.onHand, daily);
  const m = mape(WORLD, key);
  const over = live.overrides[key];
  const [dailyIn, setDailyIn] = useState(over?.daily ?? Math.round(daily));
  const [reason, setReason] = useState(over?.reason ?? '');
  const [lift, setLift] = useState(1.3);
  const fests = festivalsOn(WORLD.asOf);
  const selected = modelFor(WORLD, live, key);

  const neuralFits = useMemo(() => {
    if (!neural && selected !== 'lstm' && selected !== 'hybrid') return null;
    const arima = series.models.arima;
    if (!arima) return null;
    return ensureNeural(key, series.actual, HORIZON, arima, TEST_H);
  }, [neural, selected, key, series]);

  const activeFit = useMemo(() => {
    if (selected === 'lstm') return neuralFits?.lstm;
    if (selected === 'hybrid') return neuralFits?.hybrid;
    return fitFor(WORLD, live, key);
  }, [selected, neuralFits, live, key]);

  const adjForecast = useMemo(() => {
    return Array.from({ length: HORIZON }, (_, i) => forecastAt(WORLD, live, key, i));
  }, [live, key, selected, neuralFits]);

  const ci = activeFit ? band(adjForecast, activeFit.sigma) : undefined;

  const others = useMemo(() => {
    const out: { name: string; color: string; forecast: number[] }[] = [];
    for (const id of STAT_MODELS) {
      if (id === selected) continue;
      const f = series.models[id];
      if (!f) continue;
      out.push({ name: MODEL_LABEL[id], color: OTHER_COLOR[id], forecast: f.forecast.slice(0, HORIZON) });
    }
    if (neuralFits) {
      if (selected !== 'lstm') out.push({ name: 'LSTM', color: OTHER_COLOR.lstm, forecast: neuralFits.lstm.forecast });
      if (selected !== 'hybrid') out.push({ name: 'Hybrid', color: OTHER_COLOR.hybrid, forecast: neuralFits.hybrid.forecast });
    }
    return out;
  }, [series, selected, neuralFits]);

  const drivers = explainDay(sku, store, WORLD.asOf, live.extraPromos);
  const tomorrow = explainDay(sku, store, shift(WORLD.asOf, 1), live.extraPromos);

  const rows = SKUS.filter((s) => {
    if (cat !== 'all' && s.category !== cat) return false;
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return `${s.brand} ${s.name} ${s.id}`.toLowerCase().includes(t);
  }).map((s) => {
    const k = posKey(s.id, store.id);
    return { s, mape: mape(WORLD, k), best: WORLD.series[k]?.best };
  });

  const pick = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('sku', id);
    next.set('store', store.id);
    setParams(next);
    const k = posKey(id, store.id);
    const d = avgDaily(WORLD, live, k);
    setDailyIn(live.overrides[k]?.daily ?? Math.round(d));
    setReason(live.overrides[k]?.reason ?? '');
  };

  const backtest = TEST_H;
  const testActual = series.actual.slice(-backtest);
  const testRows = ALL_MODELS.map((id) => {
    const fit = id === 'lstm' || id === 'hybrid' ? neuralFits?.[id] : series.models[id];
    return { id, fit };
  }).filter((r) => r.fit);

  const choose = (id: ModelId) => {
    if (id === 'lstm' || id === 'hybrid') setNeural(true);
    setModel(key, id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
      <aside className="sheet rounded-2xl overflow-hidden lg:sticky lg:top-[108px]">
        <div className="p-3 border-b border-line space-y-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SKU" className="w-full" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full">
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="max-h-48 lg:max-h-[calc(100vh-220px)] overflow-y-auto">
          {rows.map((r) => (
            <button
              key={r.s.id}
              type="button"
              onClick={() => pick(r.s.id)}
              className={`w-full text-left px-3 py-2 border-b border-line ${r.s.id === sku.id ? 'bg-[#e7efe8]' : 'hover:bg-mist'}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-medium text-[13px] truncate">
                  {r.s.brand} {r.s.name}
                </div>
                <div className="num text-[11px] text-mute">{pct(r.mape, 0)}</div>
              </div>
              <div className="text-[11px] text-mute">{r.best ? MODEL_LABEL[r.best] : ''}</div>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-medium text-lg">
              {sku.brand} {sku.name}
            </div>
            <div className="text-[13px] text-mute num">
              {sku.pack} · {sku.casePack}/cs · MRP {inr(sku.mrp)} · {CATEGORY_LABEL[sku.category]} · {store.name} (T{store.tier})
            </div>
          </div>
          <select
            value={store.id}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set('sku', sku.id);
              next.set('store', e.target.value);
              setParams(next);
            }}
          >
            {regionStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · T{s.tier}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Stat label="On hand" value={num(pos.onHand)} />
          <Stat label="Cover" value={<Cover days={cover} />} />
          <Stat label="Holdout MAPE" value={pct(activeFit?.test.mape ?? m, 1)} />
          <Stat label="Model" value={MODEL_LABEL[selected]} />
          <Stat label="14-day demand" value={num(adjForecast.slice(0, 14).reduce((a, b) => a + b, 0))} />
        </div>

        <div className="flex flex-wrap gap-1">
          {ALL_MODELS.map((id) => {
            const ready = id === 'lstm' || id === 'hybrid' ? Boolean(neuralFits) : Boolean(series.models[id]);
            return (
              <button
                key={id}
                type="button"
                onClick={() => choose(id)}
                className={`px-2.5 h-8 rounded-md text-[12px] ${
                  selected === id ? 'bg-forest text-paper' : 'bg-white border border-line text-mute'
                }`}
              >
                {MODEL_LABEL[id]}
                {series.best === id ? ' · best' : ''}
                {!ready && (id === 'lstm' || id === 'hybrid') ? ' · run' : ''}
              </button>
            );
          })}
          <button
            type="button"
            className="px-2.5 h-8 rounded-md text-[12px] bg-white border border-line text-mute"
            onClick={() => {
              setNeural(true);
              setModel(key, null);
            }}
          >
            Auto (holdout)
          </button>
        </div>
        <p className="text-[12px] text-mute">{MODEL_BLURB[selected]}</p>

        <section className="sheet rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {fests.map((f) => (
              <Badge key={f.id} tone="warn">
                {f.name}
              </Badge>
            ))}
            {activeFit?.order && <Badge tone="mute">{activeFit.order}</Badge>}
            {series.adf && (
              <Badge tone={series.adf.stationary ? 'ok' : 'warn'}>
                ADF p={series.adf.pValue.toFixed(2)}
                {series.adf.stationary ? ' stationary' : ' differenced'}
              </Badge>
            )}
          </div>
          <SeriesChart
            actual={series.actual}
            fitted={activeFit?.fitted ?? series.fitted}
            forecast={adjForecast}
            asOf={WORLD.asOf}
            bandLo={ci?.lo}
            bandHi={ci?.hi}
            others={others}
            festivals={FESTIVALS}
            fittedLabel={MODEL_LABEL[selected]}
          />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="sheet rounded-2xl p-4">
            <div className="text-[12px] text-mute mb-2">Why this number · today</div>
            <ul className="text-[13px] space-y-1.5">
              {drivers.map((d) => (
                <li key={d.label} className="flex justify-between gap-3">
                  <span>
                    {d.label}
                    <span className="text-mute"> · {d.detail}</span>
                  </span>
                  <span className="num">{d.lift.toFixed(2)}×</span>
                </li>
              ))}
            </ul>
            <div className="text-[12px] text-mute mt-3 mb-1">Tomorrow</div>
            <ul className="text-[13px] space-y-1.5">
              {tomorrow.map((d) => (
                <li key={d.label} className="flex justify-between gap-3">
                  <span>{d.label}</span>
                  <span className="num">{d.lift.toFixed(2)}×</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="sheet rounded-2xl p-4">
            <div className="text-[12px] text-mute mb-2">Holdout {backtest} days · actual vs model</div>
            <table className="data">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>MAPE</th>
                  <th>RMSE</th>
                  <th>WMAPE</th>
                  <th>RMSSE</th>
                </tr>
              </thead>
              <tbody>
                {testRows.map(({ id, fit }) => (
                  <tr key={id} className={id === selected ? 'active' : ''} onClick={() => choose(id)}>
                    <td>
                      {MODEL_LABEL[id]}
                      {series.best === id ? <span className="text-mute"> · best</span> : null}
                    </td>
                    <td className="num">{pct(fit!.test.mape, 1)}</td>
                    <td className="num">{num(fit!.test.rmse, 1)}</td>
                    <td className="num">{pct(fit!.test.wmape, 1)}</td>
                    <td className="num">{num(fit!.test.rmsse, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!neuralFits && (
              <button type="button" className="btn btn-ghost mt-3 text-[12px]" onClick={() => setNeural(true)}>
                Train LSTM + hybrid on this series
              </button>
            )}
            <p className="text-[11px] text-mute mt-2">
              Last {backtest} days held out. Models fit on the {series.actual.length - backtest} days before that. Live forecast refits on
              the full history. Test actual mean {num(testActual.reduce((a, b) => a + b, 0) / testActual.length, 1)}/d.
            </p>
          </section>
        </div>

        <div className="sheet rounded-2xl p-4 flex flex-wrap items-end gap-3">
          <label className="text-[12px] text-mute">
            Daily override
            <input type="number" min={0} value={dailyIn} onChange={(e) => setDailyIn(Number(e.target.value))} className="block w-24 mt-1" />
          </label>
          <label className="text-[12px] text-mute">
            Reason
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="block w-48 mt-1" />
          </label>
          <button type="button" className="btn btn-primary" onClick={() => setOverride(key, { daily: dailyIn, reason: reason || 'planner' })}>
            Override
          </button>
          {over && (
            <button type="button" className="btn btn-ghost" onClick={() => setOverride(key, null)}>
              Clear
            </button>
          )}
          <div className="w-px h-8 bg-line mx-1" />
          <label className="text-[12px] text-mute">
            Promo ×
            <input type="number" min={1} step={0.05} value={lift} onChange={(e) => setLift(Number(e.target.value))} className="block w-20 mt-1" />
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              addPromo({
                id: `p-${sku.id}-${Date.now()}`,
                skuId: sku.id,
                name: `${lift}x`,
                start: WORLD.asOf,
                end: '2026-09-18',
                lift,
              })
            }
          >
            Apply promo
          </button>
          <div className="ml-auto text-[13px] text-mute num">
            {num(daily, 1)}/d · 14d {num(adjForecast.slice(0, 14).reduce((a, b) => a + b, 0))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="sheet rounded-xl px-4 py-3">
      <div className="text-[11px] text-mute">{label}</div>
      <div className="mt-1 text-[20px] num leading-tight">{value}</div>
    </div>
  );
}

function shift(asOf: string, days: number) {
  const [y, m, d] = asOf.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}
