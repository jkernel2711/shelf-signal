import { mean, stdev } from './stats';

const S = 7;

export function seasonalNaive(y: number[], horizon: number) {
  const fitted = y.map((v, t) => (t >= S ? y[t - S] : v));
  const forecast = Array.from({ length: horizon }, (_, h) => y[y.length - S + (h % S)] ?? mean(y));
  const resid = y.map((v, t) => v - fitted[t]);
  return { fitted, forecast, sigma: stdev(resid), order: 'Naive(lag-7)' };
}

/** Same-weekday mean — a seasonal moving average. */
export function seasonalMA(y: number[], horizon: number, dow0: number) {
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const cnt = [0, 0, 0, 0, 0, 0, 0];
  for (let t = 0; t < y.length; t++) {
    const d = (dow0 + t) % 7;
    sums[d] += y[t];
    cnt[d]++;
  }
  const avg = sums.map((s, i) => s / Math.max(1, cnt[i]));
  const fitted = y.map((_, t) => avg[(dow0 + t) % 7]);
  const forecast = Array.from({ length: horizon }, (_, h) => avg[(dow0 + y.length + h) % 7]);
  const resid = y.map((v, t) => v - fitted[t]);
  return { fitted, forecast, sigma: stdev(resid), order: 'MA-weekday' };
}

/**
 * Weekly seasonal model: Holt–Winters additive, period 7.
 * On short daily grocery series this is the practical SARIMA(·)(0,1,0)[7].
 */
export function fitSarima(y: number[], horizon: number) {
  const hw = holtWinters(y, horizon);
  return { ...hw, order: hw.order.startsWith('Holt') ? `SARIMA~${hw.order}` : `SARIMA~(0,1,0)[${S}]` };
}

/** Additive Holt–Winters, period 7. Seasonal exponential smoothing. */
export function holtWinters(y: number[], horizon: number) {
  const m = S;
  if (y.length < m * 2) {
    const naive = seasonalNaive(y, horizon);
    return { ...naive, aic: y.length * Math.log(Math.max(naive.sigma ** 2, 1e-9)) + 4, order: 'Holt-Winters' };
  }

  let best: { a: number; b: number; g: number; sse: number; fitted: number[]; level: number; trend: number; seas: number[] } | null =
    null;

  const alphas = [0.2, 0.4];
  const betas = [0.05, 0.2];
  const gammas = [0.2, 0.4];

  for (const a of alphas) {
    for (const b of betas) {
      for (const g of gammas) {
        const run = hwOnce(y, a, b, g, m);
        if (!best || run.sse < best.sse) best = { a, b, g, ...run };
      }
    }
  }

  const pick = best!;
  const forecast: number[] = [];
  let { level, trend } = pick;
  const seas = pick.seas.slice();
  for (let h = 0; h < horizon; h++) {
    const s = seas[h % m];
    forecast.push(Math.max(0, level + (h + 1) * trend + s));
  }

  const k = 3;
  const aic = y.length * Math.log(Math.max(pick.sse / y.length, 1e-9)) + 2 * k;
  const sigma = Math.sqrt(pick.sse / Math.max(1, y.length - k));
  return { fitted: pick.fitted, forecast, sigma, aic, order: `Holt-Winters(α=${pick.a})` };
}

function hwOnce(y: number[], alpha: number, beta: number, gamma: number, m: number) {
  let level = mean(y.slice(0, m));
  let trend = (mean(y.slice(m, 2 * m)) - level) / m;
  const seas = y.slice(0, m).map((v) => v - level);
  const fitted: number[] = [];
  let sse = 0;
  for (let t = 0; t < y.length; t++) {
    const s = seas[t % m];
    const hat = level + trend + s;
    fitted.push(Math.max(0, hat));
    const e = y[t] - hat;
    sse += e * e;
    const lastLevel = level;
    level = alpha * (y[t] - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    seas[t % m] = gamma * (y[t] - level) + (1 - gamma) * s;
  }
  return { sse, fitted, level, trend, seas };
}
