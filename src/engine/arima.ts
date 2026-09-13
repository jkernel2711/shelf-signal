import { acf, adf, mean, solve, stdev } from './stats';

export type ArimaFit = {
  p: number;
  d: number;
  q: number;
  phi: number[];
  theta: number[];
  intercept: number;
  aic: number;
  sigma: number;
  fitted: number[];
  forecast: (horizon: number) => number[];
  order: string;
};

function diffOnce(y: number[]) {
  const z: number[] = [];
  for (let i = 1; i < y.length; i++) z.push(y[i] - y[i - 1]);
  return z;
}

function yuleWalker(z: number[], p: number): number[] {
  const n = z.length;
  const mu = mean(z);
  const x = z.map((v) => v - mu);
  const r: number[] = [];
  for (let lag = 0; lag <= p; lag++) {
    let s = 0;
    for (let t = lag; t < n; t++) s += x[t] * x[t - lag];
    r.push(s / n);
  }
  const R = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => r[Math.abs(i - j)]));
  const rhs = r.slice(1);
  const phi = solve(R, rhs);
  if (!phi) return Array(p).fill(0);
  return phi.map((v) => Math.max(-0.99, Math.min(0.99, v)));
}

function ma1FromAcf(r1: number) {
  if (!Number.isFinite(r1) || Math.abs(r1) < 1e-6) return 0;
  if (Math.abs(r1) >= 0.49) return Math.sign(r1) * 0.49;
  const disc = 1 - 4 * r1 * r1;
  const th = (1 - Math.sqrt(Math.max(0, disc))) / (2 * r1);
  if (!Number.isFinite(th)) return r1;
  return Math.max(-0.95, Math.min(0.95, th));
}

function fitOnStationary(z: number[], p: number, q: number) {
  const n = z.length;
  const intercept = p === 0 ? mean(z) : 0;
  const phi = p > 0 ? yuleWalker(z, p) : [];
  const e = Array(n).fill(0);
  const zhat = Array(n).fill(0);

  const predict = (t: number, useTheta: number[]) => {
    let hat = intercept;
    for (let i = 1; i <= p; i++) if (t - i >= 0) hat += phi[i - 1] * z[t - i];
    for (let j = 1; j <= useTheta.length; j++) if (t - j >= 0) hat += useTheta[j - 1] * e[t - j];
    return hat;
  };

  for (let t = 0; t < n; t++) {
    const hat = predict(t, []);
    zhat[t] = hat;
    e[t] = z[t] - hat;
  }
  const theta: number[] = [];
  if (q >= 1) theta.push(ma1FromAcf(acf(e, 1)));

  for (let t = 0; t < n; t++) {
    const hat = predict(t, theta);
    zhat[t] = hat;
    e[t] = z[t] - hat;
  }

  let rss = 0;
  for (const x of e) rss += x * x;
  const k = p + q + 1;
  const aic = n * Math.log(Math.max(rss / n, 1e-9)) + 2 * k;
  const sigma = Math.sqrt(rss / Math.max(1, n - k));
  return { phi, theta, intercept, zhat, e, aic, sigma };
}

function integrate(history: number[], zhat: number[], d: number) {
  if (d === 0) return zhat.slice();
  const fitted = [history[0]];
  for (let t = 1; t < history.length; t++) {
    fitted.push(history[t - 1] + (zhat[t - 1] ?? 0));
  }
  return fitted;
}

export function fitArima(y: number[], _horizon: number): ArimaFit {
  const n = y.length;
  const fallback = seasonalFallback(y, _horizon);
  if (n < 16) return fallback;

  let best: {
    p: number;
    d: number;
    q: number;
    inner: ReturnType<typeof fitOnStationary>;
    z: number[];
  } | null = null;

  const dPref = adf(y).stationary ? 0 : 1;
  for (const d of [dPref] as const) {
    const z = d === 0 ? y.slice() : diffOnce(y);
    if (z.length < 12) continue;
    for (const p of [0, 1]) {
      for (const q of [0, 1]) {
        const inner = fitOnStationary(z, p, q);
        if (!Number.isFinite(inner.aic)) continue;
        if (!best || inner.aic < best.inner.aic) best = { p, d, q, inner, z };
      }
    }
  }

  if (!best) return fallback;

  const { p, d, q, inner } = best;
  const fitted = integrate(y, inner.zhat, d).map((v) => Math.max(0, v));

  const forecast = (h: number) => {
    const zHist = d === 0 ? y.slice() : diffOnce(y);
    const e = inner.e.slice();
    const zExt = zHist.slice();
    const outZ: number[] = [];
    for (let k = 0; k < h; k++) {
      const t = zExt.length;
      let hat = inner.intercept;
      for (let i = 1; i <= p; i++) {
        const v = t - i >= 0 ? zExt[t - i] : 0;
        hat += (inner.phi[i - 1] ?? 0) * v;
      }
      for (let j = 1; j <= q; j++) {
        const v = t - j >= 0 ? (e[t - j] ?? 0) : 0;
        hat += (inner.theta[j - 1] ?? 0) * v;
      }
      zExt.push(hat);
      e.push(0);
      outZ.push(hat);
    }
    if (d === 0) return outZ.map((v) => Math.max(0, v));
    const yExt = y.slice();
    const out: number[] = [];
    for (let k = 0; k < h; k++) {
      const next = yExt[yExt.length - 1] + outZ[k];
      yExt.push(next);
      out.push(Math.max(0, next));
    }
    return out;
  };

  return {
    p,
    d,
    q,
    phi: inner.phi,
    theta: inner.theta,
    intercept: inner.intercept,
    aic: inner.aic,
    sigma: inner.sigma || stdev(inner.e),
    fitted,
    forecast,
    order: `ARIMA(${p},${d},${q})`,
  };
}

function seasonalFallback(y: number[], horizon: number): ArimaFit {
  const fitted = y.map((v, t) => (t >= 7 ? y[t - 7] : v));
  const sigma = stdev(y.map((v, t) => v - fitted[t]));
  return {
    p: 0,
    d: 0,
    q: 0,
    phi: [],
    theta: [],
    intercept: mean(y),
    aic: y.length * Math.log(Math.max(varianceSafe(y), 1e-9)) + 2,
    sigma,
    fitted,
    forecast: (h) => Array.from({ length: h }, (_, i) => y[y.length - 7 + (i % 7)] ?? mean(y)),
    order: 'ARIMA(0,0,0)',
  };
}

function varianceSafe(y: number[]) {
  const m = mean(y);
  let s = 0;
  for (const v of y) s += (v - m) * (v - m);
  return s / Math.max(1, y.length);
}

export function seriesAdf(y: number[]) {
  const raw = adf(y);
  if (raw.stationary) return { ...raw, d: 0 as const };
  const d1 = adf(diffOnce(y));
  return { ...d1, d: 1 as const, raw };
}
