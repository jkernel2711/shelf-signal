import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FESTIVALS, HORIZON_LONG, SKUS, STORES, TEST_H, posKey } from '../data/catalog';
import { WORLD } from '../data/world';
import { skuById } from '../engine/demand';
import { MODEL_BLURB, MODEL_LABEL, STAT_MODELS, ensureNeural, evaluateStatistical, type ModelId } from '../engine/forecast';
import { modelLeaderboard, modelMix } from '../engine/plan';
import { CATEGORY_LABEL, num, pct } from '../lib/format';
import { useStore } from '../store/Store';
import { Badge, SeriesChart } from '../ui/bits';

export function Models() {
  const nav = useNavigate();
  const { scopedIds, stores } = useStore();
  const [tier, setTier] = useState<'all' | 2 | 3 | 1>('all');
  const [skuId, setSkuId] = useState(SKUS.find((s) => s.id === 'milk-500')?.id ?? SKUS[0].id);
  const [storeId, setStoreId] = useState(stores.find((s) => s.tier >= 2)?.id ?? stores[0]?.id ?? STORES[0].id);
  const [neural, setNeural] = useState(false);
  const [horizon, setHorizon] = useState(28);

  const scoped = useMemo(() => {
    let list = STORES.filter((s) => !scopedIds || scopedIds.includes(s.id));
    if (tier === 1) list = list.filter((s) => s.tier === 1);
    if (tier === 2) list = list.filter((s) => s.tier === 2);
    if (tier === 3) list = list.filter((s) => s.tier === 3);
    return list;
  }, [scopedIds, tier]);

  const ids = scoped.map((s) => s.id);
  const board = useMemo(() => modelLeaderboard(WORLD, ids), [ids]);
  const mix = useMemo(() => modelMix(WORLD, ids), [ids]);
  const winner = [...board].sort((a, b) => a.mape - b.mape)[0];

  const key = posKey(skuId, storeId);
  const series = WORLD.series[key];
  const sku = skuById(skuId);

  const longFit = useMemo(() => {
    if (!series) return null;
    const dow0 = new Date(2026, 8, 11 - series.actual.length).getDay();
    return evaluateStatistical(series.actual, horizon, dow0, TEST_H);
  }, [series, horizon]);

  const neuralFits = useMemo(() => {
    if (!neural || !series || !series.models.arima) return null;
    return ensureNeural(`${key}:lab`, series.actual, horizon, series.models.arima, TEST_H);
  }, [neural, series, key, horizon]);

  const selectedForecast = longFit?.models.sarima?.forecast ?? series?.forecast ?? [];
  const adf = series?.adf;

  const chainAgg = useMemo(() => {
    const hist = series?.actual.length ?? 0;
    const actual = Array(hist).fill(0);
    for (const s of SKUS) {
      for (const st of scoped) {
        const a = WORLD.series[posKey(s.id, st.id)]?.actual;
        if (!a) continue;
        for (let i = 0; i < hist; i++) actual[i] += a[i] ?? 0;
      }
    }
    return actual;
  }, [scoped, series]);

  const chainEval = useMemo(() => {
    if (!chainAgg.length) return null;
    const dow0 = new Date(2026, 8, 11 - chainAgg.length).getDay();
    return evaluateStatistical(chainAgg, horizon, dow0, TEST_H);
  }, [chainAgg, horizon]);

  return (
    <div className="space-y-5">
      <section className="sheet rounded-2xl p-5">
        <p className="kicker">Woxsen · demand forecasting</p>
        <h1 className="font-display text-2xl mt-1">ARIMA, SARIMA, LSTM — scored the way the paper scores them</h1>
        <p className="text-[14px] text-mute mt-2 max-w-3xl leading-relaxed">
          Retailers in tier-2 and tier-3 cities still buy on gut feel. Each SKU-store series here is fit with seasonal naive, weekday
          moving average, auto-ARIMA, and weekly SARIMA. The last {TEST_H} days are held out. MAPE, RMSE, MAE, WMAPE and RMSSE are
          the paper’s metrics. LSTM and ARIMA+LSTM train on the series you open — they are not faked.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {(['all', 2, 3, 1] as const).map((t) => (
            <button
              key={String(t)}
              type="button"
              onClick={() => setTier(t)}
              className={`px-2.5 h-8 rounded-md text-[12px] ${tier === t ? 'bg-forest text-paper' : 'bg-white border border-line text-mute'}`}
            >
              {t === 'all' ? 'All stores' : t === 1 ? 'Tier 1 metros' : t === 2 ? 'Tier 2' : 'Tier 3'}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {board.map((row) => (
          <div key={row.id} className={`sheet rounded-xl px-4 py-3 ${winner?.id === row.id ? 'ring-1 ring-forest' : ''}`}>
            <div className="text-[11px] text-mute">{row.label}</div>
            <div className="num text-[22px] mt-1">{pct(row.mape, 1)}</div>
            <div className="text-[11px] text-mute mt-1">holdout MAPE · RMSE {num(row.rmse, 1)}</div>
          </div>
        ))}
      </div>

      <section className="sheet rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-line font-medium text-[13px]">
          Mean holdout error · {num(mix.n)} SKU-store series
          {winner ? ` · winner ${winner.label}` : ''}
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>Model</th>
              <th>MAPE</th>
              <th>WMAPE</th>
              <th>MAE</th>
              <th>RMSE</th>
              <th>RMSSE</th>
              <th>Wins</th>
            </tr>
          </thead>
          <tbody>
            {board.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="font-medium">{row.label}</div>
                  <div className="text-[12px] text-mute">{MODEL_BLURB[row.id]}</div>
                </td>
                <td className="num">{pct(row.mape, 1)}</td>
                <td className="num">{pct(row.wmape, 1)}</td>
                <td className="num">{num(row.mae, 1)}</td>
                <td className="num">{num(row.rmse, 1)}</td>
                <td className="num">{num(row.rmsse, 2)}</td>
                <td className="num">{num(mix.counts[row.id] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="sheet rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <div className="font-medium">One series, all models</div>
            <div className="text-[12px] text-mute">
              Same split the paper used: train, then forecast the holdout, then refit for a {horizon}-day live horizon.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={skuId} onChange={(e) => setSkuId(e.target.value)}>
              {SKUS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.brand} {s.name}
                </option>
              ))}
            </select>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · T{s.tier}
                </option>
              ))}
            </select>
            <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
              <option value={14}>14 days</option>
              <option value={28}>28 days</option>
              <option value={HORIZON_LONG}>60 days</option>
            </select>
          </div>
        </div>

        {series && longFit && (
          <>
            <div className="flex gap-2 mb-3">
              {adf && (
                <Badge tone={adf.stationary ? 'ok' : 'warn'}>
                  ADF τ={adf.tau.toFixed(2)} p={adf.pValue.toFixed(3)}
                  {adf.stationary ? ' · stationary' : ' · needs differencing'}
                </Badge>
              )}
              <Badge tone="mute">{longFit.models.arima?.order}</Badge>
              <Badge tone="mute">{longFit.models.sarima?.order}</Badge>
              <Badge tone="forest">best {MODEL_LABEL[longFit.best]}</Badge>
            </div>
            <SeriesChart
              actual={series.actual}
              fitted={longFit.models[longFit.best]?.fitted ?? series.fitted}
              forecast={selectedForecast.slice(0, horizon)}
              asOf={WORLD.asOf}
              others={STAT_MODELS.filter((id) => id !== longFit.best).map((id, i) => ({
                name: MODEL_LABEL[id],
                color: ['#8a8374', '#5b7c99', '#6b4f9a', '#2f6b4f'][i] ?? '#8a8374',
                forecast: (longFit.models[id]?.forecast ?? []).slice(0, horizon),
              }))}
              festivals={FESTIVALS}
              fittedLabel={MODEL_LABEL[longFit.best]}
            />
            <table className="data mt-4">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Order / AIC</th>
                  <th>MAPE</th>
                  <th>RMSE</th>
                  <th>RMSSE</th>
                </tr>
              </thead>
              <tbody>
                {STAT_MODELS.map((id) => {
                  const f = longFit.models[id];
                  if (!f) return null;
                  return (
                    <tr key={id}>
                      <td>{MODEL_LABEL[id]}</td>
                      <td className="num text-mute">
                        {f.order}
                        {f.aic != null ? ` · AIC ${f.aic.toFixed(1)}` : ''}
                      </td>
                      <td className="num">{pct(f.test.mape, 1)}</td>
                      <td className="num">{num(f.test.rmse, 1)}</td>
                      <td className="num">{num(f.test.rmsse, 2)}</td>
                    </tr>
                  );
                })}
                {neuralFits &&
                  (['lstm', 'hybrid'] as const).map((id) => {
                    const f = neuralFits[id];
                    return (
                      <tr key={id}>
                        <td>{MODEL_LABEL[id]}</td>
                        <td className="num text-mute">{f.order}</td>
                        <td className="num">{pct(f.test.mape, 1)}</td>
                        <td className="num">{num(f.test.rmse, 1)}</td>
                        <td className="num">{num(f.test.rmsse, 2)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <div className="flex gap-2 mt-3">
              {!neural && (
                <button type="button" className="btn btn-primary" onClick={() => setNeural(true)}>
                  Train LSTM + hybrid
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => nav(`/forecast?sku=${sku.id}&store=${storeId}`)}>
                Open in Forecast
              </button>
            </div>
          </>
        )}
      </section>

      {chainEval && (
        <section className="sheet rounded-2xl p-4">
          <div className="font-medium mb-1">Chain units (this scope)</div>
          <p className="text-[12px] text-mute mb-3">
            Aggregated sold units, then the same four models. This is closer to the paper’s single sales series after the merge of
            train + prices + week map.
          </p>
          <SeriesChart
            actual={chainAgg}
            fitted={chainEval.models[chainEval.best]?.fitted ?? []}
            forecast={chainEval.models[chainEval.best]?.forecast ?? []}
            asOf={WORLD.asOf}
            festivals={FESTIVALS}
            fittedLabel={MODEL_LABEL[chainEval.best]}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {STAT_MODELS.map((id) => (
              <div key={id} className="bg-mist/60 rounded-lg px-3 py-2">
                <div className="text-[11px] text-mute">{MODEL_LABEL[id]}</div>
                <div className="num">{pct(chainEval.models[id]?.test.mape ?? 0, 1)} MAPE</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="sheet rounded-2xl p-5 text-[13px] text-mute leading-relaxed space-y-2">
        <div className="text-ink font-medium">How this maps to the paper</div>
        <p>
          ARIMA is auto-selected on (p,d,q) by AIC after an ADF stationarity test — the pmdarima step. SARIMA is seasonal
          difference at lag 7 (weekly grocery season) then ARIMA, i.e. (p,d,q)(0,1,0)₇. LSTM is a 6-unit network, window 7, Adam,
          min-max scaled, trained on this series only. Hybrid is ARIMA plus LSTM on the residual.
        </p>
        <p>
          Replenishment on Buy uses the winning model’s forecast over supplier lead time, plus safety stock from residual σ and
          ABC service level — not a flat “days of cover” guess. Festival lifts (Ganesh, Navratri, Diwali) are known future
          exogenous multipliers, the SARIMAX idea without pretending a weekly seasonal model can invent Ganesh.
        </p>
        <p>
          {Object.entries(CATEGORY_LABEL)
            .map(([, v]) => v)
            .join(' · ')}
          .
        </p>
      </section>
    </div>
  );
}
