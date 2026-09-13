import { seriesAdf } from './arima';
import { fitArima } from './arima';
import { fitHybrid, fitLstm } from './lstm';
import { seasonalMA, seasonalNaive, fitSarima } from './seasonal';
import { EMPTY_METRICS, score, stdev, type Adf, type Metrics } from './stats';

export type ModelId = 'naive' | 'ma' | 'arima' | 'sarima' | 'lstm' | 'hybrid';

export const STAT_MODELS = ['naive', 'ma', 'arima', 'sarima'] as const satisfies readonly ModelId[];
export const ALL_MODELS: ModelId[] = ['naive', 'ma', 'arima', 'sarima', 'lstm', 'hybrid'];

export const MODEL_LABEL: Record<ModelId, string> = {
  naive: 'Seasonal naive',
  ma: 'Weekday MA',
  arima: 'ARIMA',
  sarima: 'SARIMA',
  lstm: 'LSTM',
  hybrid: 'ARIMA + LSTM',
};

export const MODEL_BLURB: Record<ModelId, string> = {
  naive: 'Same weekday last week. Strong baseline for weekly Indian grocery demand.',
  ma: 'Mean of each weekday in the history. Smooths noise, misses festivals.',
  arima: 'Auto-ARIMA (p,d,q) by AIC after an ADF test. Trend and short lags, no weekly season.',
  sarima: 'Seasonal difference at lag 7, then ARIMA. The paper’s SARIMA for weekly seasonality.',
  lstm: 'A small LSTM trained on this series (window 7, 40 epochs, Adam). Catches irregular spikes.',
  hybrid: 'ARIMA forecast plus LSTM on the residual — the hybrid the paper flags as future work.',
};

export type ModelFit = {
  id: ModelId;
  label: string;
  fitted: number[];
  forecast: number[];
  sigma: number;
  aic?: number;
  order: string;
  test: Metrics;
};

export type SeriesModels = {
  models: Partial<Record<ModelId, ModelFit>>;
  best: ModelId;
  adf: Adf;
};

function pack(
  id: ModelId,
  fitted: number[],
  forecast: number[],
  sigma: number,
  order: string,
  aic?: number,
  test: Metrics = EMPTY_METRICS,
): ModelFit {
  return { id, label: MODEL_LABEL[id], fitted, forecast, sigma, order, aic, test };
}

export function fitStatistical(y: number[], horizon: number, dow0: number): Record<(typeof STAT_MODELS)[number], ModelFit> {
  const naive = seasonalNaive(y, horizon);
  const ma = seasonalMA(y, horizon, dow0);
  const arima = fitArima(y, horizon);
  const sarima = fitSarima(y, horizon);
  return {
    naive: pack('naive', naive.fitted, naive.forecast, naive.sigma, naive.order),
    ma: pack('ma', ma.fitted, ma.forecast, ma.sigma, ma.order),
    arima: pack('arima', arima.fitted, arima.forecast(horizon), arima.sigma, arima.order, arima.aic),
    sarima: pack('sarima', sarima.fitted, sarima.forecast, sarima.sigma, sarima.order, sarima.aic),
  };
}

export function evaluateStatistical(y: number[], horizon: number, dow0: number, testH: number, holdout = true): SeriesModels {
  const split = Math.max(16, y.length - testH);
  const train = y.slice(0, split);
  const test = y.slice(split);
  const live = fitStatistical(y, horizon, dow0);
  if (holdout) {
    const trained = fitStatistical(train, test.length, dow0);
    for (const id of STAT_MODELS) {
      live[id].test = score(train, test, trained[id].forecast.slice(0, test.length));
    }
  } else {
    for (const id of STAT_MODELS) {
      live[id].test = score(train, test, live[id].fitted.slice(split));
    }
  }
  const best = pickBest(STAT_MODELS.map((id) => live[id]));
  return { models: live, best, adf: seriesAdf(y) };
}

export function pickBest(fits: ModelFit[]): ModelId {
  let best = fits[0]?.id ?? 'sarima';
  let scoreV = Infinity;
  for (const f of fits) {
    const v = f.test.mape || f.test.wmape || f.test.rmse;
    if (v > 0 && v < scoreV) {
      scoreV = v;
      best = f.id;
    }
  }
  return best;
}

const neuralCache = new Map<string, { lstm: ModelFit; hybrid: ModelFit; best: ModelId }>();

export function ensureNeural(
  key: string,
  y: number[],
  horizon: number,
  arima: ModelFit,
  testH: number,
): { lstm: ModelFit; hybrid: ModelFit; best: ModelId } {
  const hit = neuralCache.get(key);
  if (hit) return hit;

  const split = Math.max(16, y.length - testH);
  const train = y.slice(0, split);
  const test = y.slice(split);
  const seed = y.reduce((s, v) => s + v, 0) | 0;

  const lstmTrain = fitLstm(train, test.length, seed);
  const lstmLive = fitLstm(y, horizon, seed);
  const lstm = pack('lstm', lstmLive.fitted, lstmLive.forecast, lstmLive.sigma, lstmLive.order);
  lstm.test = score(train, test, lstmTrain.forecast.slice(0, test.length));

  const arimaTrain = fitArima(train, test.length);
  const hybridTrain = fitHybrid(train, arimaTrain.fitted, arimaTrain.forecast(test.length), test.length, seed + 1);
  const hybridLive = fitHybrid(y, arima.fitted, arima.forecast, horizon, seed + 1);
  const hybrid = pack('hybrid', hybridLive.fitted, hybridLive.forecast, hybridLive.sigma, hybridLive.order);
  hybrid.test = score(train, test, hybridTrain.forecast.slice(0, test.length));

  const best = pickBest([lstm, hybrid]);
  const out = { lstm, hybrid, best };
  neuralCache.set(key, out);
  return out;
}

export function clearNeural(key?: string) {
  if (key) neuralCache.delete(key);
  else neuralCache.clear();
}

export function band(forecast: number[], sigma: number, z = 1.28) {
  return {
    lo: forecast.map((v) => Math.max(0, v - z * sigma)),
    hi: forecast.map((v) => v + z * sigma),
  };
}

export function sumSeries(rows: number[][]) {
  if (!rows.length) return [];
  const n = rows[0].length;
  const out = Array(n).fill(0);
  for (const r of rows) {
    for (let i = 0; i < n; i++) out[i] += r[i] ?? 0;
  }
  return out;
}

export { stdev };
