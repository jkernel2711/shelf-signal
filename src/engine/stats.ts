/** Paper metrics: MAE, RMSE, MAPE, WMAPE, RMSSE, plus ADF and small linear algebra. */

export function mean(xs: number[]) {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function variance(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return s / xs.length;
}

export function stdev(xs: number[]) {
  return Math.sqrt(variance(xs));
}

export function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export function mae(actual: number[], pred: number[]) {
  const n = Math.min(actual.length, pred.length);
  if (!n) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(actual[i] - pred[i]);
  return s / n;
}

export function rmse(actual: number[], pred: number[]) {
  const n = Math.min(actual.length, pred.length);
  if (!n) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const e = actual[i] - pred[i];
    s += e * e;
  }
  return Math.sqrt(s / n);
}

export function mape(actual: number[], pred: number[]) {
  const n = Math.min(actual.length, pred.length);
  let s = 0;
  let k = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] <= 0) continue;
    s += Math.abs(actual[i] - pred[i]) / actual[i];
    k++;
  }
  return k ? (s / k) * 100 : 0;
}

export function wmape(actual: number[], pred: number[]) {
  const n = Math.min(actual.length, pred.length);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += Math.abs(actual[i] - pred[i]);
    den += Math.abs(actual[i]);
  }
  return den ? (num / den) * 100 : 0;
}

/** RMSSE as in the paper: RMSE relative to training naive (one-step) scale. */
export function rmsse(train: number[], test: number[], pred: number[]) {
  const n = Math.min(test.length, pred.length);
  if (!n) return 0;
  let num = 0;
  for (let i = 0; i < n; i++) {
    const e = test[i] - pred[i];
    num += e * e;
  }
  num /= n;
  let den = 0;
  for (let t = 1; t < train.length; t++) {
    const e = train[t] - train[t - 1];
    den += e * e;
  }
  den /= Math.max(1, train.length - 1);
  return Math.sqrt(num / Math.max(den, 1e-9));
}

export type Metrics = {
  mae: number;
  rmse: number;
  mape: number;
  wmape: number;
  rmsse: number;
};

export function score(train: number[], test: number[], pred: number[]): Metrics {
  return {
    mae: mae(test, pred),
    rmse: rmse(test, pred),
    mape: mape(test, pred),
    wmape: wmape(test, pred),
    rmsse: rmsse(train, test, pred),
  };
}

export const EMPTY_METRICS: Metrics = { mae: 0, rmse: 0, mape: 0, wmape: 0, rmsse: 0 };

export function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  if (!n || A.length !== n) return null;
  const M = A.map((row, i) => {
    const r = row.slice(0, n);
    while (r.length < n) r.push(0);
    r.push(b[i] ?? 0);
    return r;
  });
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-12) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    const div = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let j = col; j <= n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((row) => row[n]);
}

export type Adf = { tau: number; pValue: number; stationary: boolean };

function tauToP(tau: number) {
  if (tau >= -1.6) return Math.min(0.99, 0.47 + 0.25 * (tau + 1.6));
  if (tau >= -2.57) return 0.1 + (0.37 * (tau + 2.57)) / 0.97;
  if (tau >= -2.86) return 0.05 + (0.05 * (tau + 2.86)) / 0.29;
  if (tau >= -3.43) return 0.01 + (0.04 * (tau + 3.43)) / 0.57;
  return Math.max(0.001, 0.01 * Math.exp(tau + 3.43));
}

/** Augmented Dickey–Fuller with constant and one lag of Δy. */
export function adf(y: number[]): Adf {
  if (y.length < 12) return { tau: 0, pValue: 1, stationary: false };
  const dy: number[] = [];
  const ylag: number[] = [];
  const dylag: number[] = [];
  for (let t = 2; t < y.length; t++) {
    dy.push(y[t] - y[t - 1]);
    ylag.push(y[t - 1]);
    dylag.push(y[t - 1] - y[t - 2]);
  }
  const n = dy.length;
  const X = dy.map((_, i) => [1, ylag[i], dylag[i]]);
  const XtX = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const Xty = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < 3; a++) {
      Xty[a] += X[i][a] * dy[i];
      for (let b = 0; b < 3; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  const beta = solve(XtX, Xty);
  if (!beta) return { tau: 0, pValue: 1, stationary: false };
  let rss = 0;
  for (let i = 0; i < n; i++) {
    const hat = beta[0] + beta[1] * ylag[i] + beta[2] * dylag[i];
    const e = dy[i] - hat;
    rss += e * e;
  }
  const sigma2 = rss / Math.max(1, n - 3);
  const inv = invert3(XtX);
  const se = inv ? Math.sqrt(Math.max(1e-12, inv[1][1] * sigma2)) : 1;
  const tau = beta[1] / se;
  const pValue = tauToP(tau);
  return { tau, pValue, stationary: pValue < 0.05 };
}

function invert3(A: number[][]): number[][] | null {
  const I = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const cols = [0, 1, 2].map((c) => solve(A, I[c]));
  if (cols.some((c) => !c)) return null;
  return [0, 1, 2].map((r) => cols.map((c) => c![r]));
}

export function autocov(y: number[], lag: number) {
  const n = y.length;
  const m = mean(y);
  let s = 0;
  for (let t = lag; t < n; t++) s += (y[t] - m) * (y[t - lag] - m);
  return s / n;
}

export function acf(y: number[], lag: number) {
  const r0 = autocov(y, 0);
  if (Math.abs(r0) < 1e-12) return 0;
  return autocov(y, lag) / r0;
}

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
