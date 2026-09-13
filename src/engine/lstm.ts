import { clamp, mean, mulberry, stdev } from './stats';

const H = 5;
const WIN = 7;
const EPOCHS = 22;
const LR = 0.025;

function sigmoid(x: number) {
  const z = clamp(x, -25, 25);
  return 1 / (1 + Math.exp(-z));
}

type Mat = number[][];

type Net = {
  Wf: Mat;
  Wi: Mat;
  Wo: Mat;
  Wc: Mat;
  bf: number[];
  bi: number[];
  bo: number[];
  bc: number[];
  Why: number[];
  by: number;
};

function zeros(n: number) {
  return Array(n).fill(0);
}

function mat(h: number, w: number, rng: () => number, scale: number): Mat {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => (rng() * 2 - 1) * scale));
}

function init(rng: () => number): Net {
  const I = H + 1;
  const s = Math.sqrt(1 / I);
  return {
    Wf: mat(H, I, rng, s),
    Wi: mat(H, I, rng, s),
    Wo: mat(H, I, rng, s),
    Wc: mat(H, I, rng, s),
    bf: Array(H).fill(1),
    bi: zeros(H),
    bo: zeros(H),
    bc: zeros(H),
    Why: Array.from({ length: H }, () => (rng() * 2 - 1) * s),
    by: 0,
  };
}

function cloneNet(n: Net): Net {
  const cmat = (m: Mat) => m.map((r) => r.slice());
  return {
    Wf: cmat(n.Wf),
    Wi: cmat(n.Wi),
    Wo: cmat(n.Wo),
    Wc: cmat(n.Wc),
    bf: n.bf.slice(),
    bi: n.bi.slice(),
    bo: n.bo.slice(),
    bc: n.bc.slice(),
    Why: n.Why.slice(),
    by: n.by,
  };
}

type StepCache = {
  z: number[];
  f: number[];
  i: number[];
  o: number[];
  g: number[];
  c: number[];
  cPrev: number[];
  h: number[];
  hPrev: number[];
};

function gemv(W: Mat, v: number[], b: number[]) {
  return W.map((row, r) => {
    let s = b[r];
    for (let k = 0; k < row.length; k++) s += row[k] * v[k];
    return s;
  });
}

function step(net: Net, x: number, hPrev: number[], cPrev: number[]): { h: number[]; c: number[]; cache: StepCache } {
  const z = [...hPrev, x];
  const f = gemv(net.Wf, z, net.bf).map(sigmoid);
  const i = gemv(net.Wi, z, net.bi).map(sigmoid);
  const o = gemv(net.Wo, z, net.bo).map(sigmoid);
  const g = gemv(net.Wc, z, net.bc).map(Math.tanh);
  const c = f.map((fv, j) => fv * cPrev[j] + i[j] * g[j]);
  const h = o.map((ov, j) => ov * Math.tanh(c[j]));
  return { h, c, cache: { z, f, i, o, g, c, cPrev, h, hPrev } };
}

function readOut(net: Net, h: number[]) {
  let y = net.by;
  for (let j = 0; j < H; j++) y += net.Why[j] * h[j];
  return y;
}

type Adam = { m: Net; v: Net; t: number };

function zerosNet(): Net {
  const zm = (): Mat => Array.from({ length: H }, () => zeros(H + 1));
  return {
    Wf: zm(),
    Wi: zm(),
    Wo: zm(),
    Wc: zm(),
    bf: zeros(H),
    bi: zeros(H),
    bo: zeros(H),
    bc: zeros(H),
    Why: zeros(H),
    by: 0,
  };
}

function adamUpdate(net: Net, g: Net, opt: Adam, lr: number) {
  const b1 = 0.9;
  const b2 = 0.999;
  const eps = 1e-8;
  opt.t += 1;
  const corr1 = 1 - b1 ** opt.t;
  const corr2 = 1 - b2 ** opt.t;
  const clip = (x: number) => clamp(x, -5, 5);

  const updMat = (W: Mat, dW: Mat, mW: Mat, vW: Mat) => {
    for (let r = 0; r < W.length; r++) {
      for (let c = 0; c < W[r].length; c++) {
        const gij = clip(dW[r][c]);
        mW[r][c] = b1 * mW[r][c] + (1 - b1) * gij;
        vW[r][c] = b2 * vW[r][c] + (1 - b2) * gij * gij;
        const mhat = mW[r][c] / corr1;
        const vhat = vW[r][c] / corr2;
        W[r][c] -= (lr * mhat) / (Math.sqrt(vhat) + eps);
      }
    }
  };
  const updVec = (w: number[], dw: number[], mw: number[], vw: number[]) => {
    for (let j = 0; j < w.length; j++) {
      const gij = clip(dw[j]);
      mw[j] = b1 * mw[j] + (1 - b1) * gij;
      vw[j] = b2 * vw[j] + (1 - b2) * gij * gij;
      w[j] -= (lr * (mw[j] / corr1)) / (Math.sqrt(vw[j] / corr2) + eps);
    }
  };

  updMat(net.Wf, g.Wf, opt.m.Wf, opt.v.Wf);
  updMat(net.Wi, g.Wi, opt.m.Wi, opt.v.Wi);
  updMat(net.Wo, g.Wo, opt.m.Wo, opt.v.Wo);
  updMat(net.Wc, g.Wc, opt.m.Wc, opt.v.Wc);
  updVec(net.bf, g.bf, opt.m.bf, opt.v.bf);
  updVec(net.bi, g.bi, opt.m.bi, opt.v.bi);
  updVec(net.bo, g.bo, opt.m.bo, opt.v.bo);
  updVec(net.bc, g.bc, opt.m.bc, opt.v.bc);
  updVec(net.Why, g.Why, opt.m.Why, opt.v.Why);
  {
    const gij = clip(g.by);
    opt.m.by = b1 * opt.m.by + (1 - b1) * gij;
    opt.v.by = b2 * opt.v.by + (1 - b2) * gij * gij;
    net.by -= (lr * (opt.m.by / corr1)) / (Math.sqrt(opt.v.by / corr2) + eps);
  }
}

function accMat(A: Mat, B: Mat) {
  for (let r = 0; r < A.length; r++) for (let c = 0; c < A[r].length; c++) A[r][c] += B[r][c];
}
function accVec(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) a[i] += b[i];
}

function bptt(net: Net, caches: StepCache[], dY: number) {
  const g = zerosNet();
  const last = caches[caches.length - 1];
  g.by += dY;
  const dh = zeros(H);
  const dc = zeros(H);
  for (let j = 0; j < H; j++) {
    g.Why[j] += dY * last.h[j];
    dh[j] += dY * net.Why[j];
  }

  for (let t = caches.length - 1; t >= 0; t--) {
    const c = caches[t];
    const tanhC = c.c.map(Math.tanh);
    const do_ = dh.map((v, j) => v * tanhC[j] * c.o[j] * (1 - c.o[j]));
    for (let j = 0; j < H; j++) dc[j] += dh[j] * c.o[j] * (1 - tanhC[j] * tanhC[j]);
    const df = dc.map((v, j) => v * c.cPrev[j] * c.f[j] * (1 - c.f[j]));
    const di = dc.map((v, j) => v * c.g[j] * c.i[j] * (1 - c.i[j]));
    const dg = dc.map((v, j) => v * c.i[j] * (1 - c.g[j] * c.g[j]));
    const dcPrev = dc.map((v, j) => v * c.f[j]);

    const addGate = (W: Mat, b: number[], dpre: number[]) => {
      for (let j = 0; j < H; j++) {
        b[j] += dpre[j];
        for (let k = 0; k < c.z.length; k++) W[j][k] += dpre[j] * c.z[k];
      }
    };
    addGate(g.Wf, g.bf, df);
    addGate(g.Wi, g.bi, di);
    addGate(g.Wo, g.bo, do_);
    addGate(g.Wc, g.bc, dg);

    const dz = zeros(H + 1);
    const addDz = (W: Mat, dpre: number[]) => {
      for (let j = 0; j < H; j++) for (let k = 0; k < dz.length; k++) dz[k] += W[j][k] * dpre[j];
    };
    addDz(net.Wf, df);
    addDz(net.Wi, di);
    addDz(net.Wo, do_);
    addDz(net.Wc, dg);

    for (let j = 0; j < H; j++) dh[j] = dz[j];
    for (let j = 0; j < H; j++) dc[j] = dcPrev[j];
  }
  return g;
}

function forwardWindow(net: Net, xs: number[]) {
  let h = zeros(H);
  let c = zeros(H);
  const caches: StepCache[] = [];
  for (const x of xs) {
    const s = step(net, x, h, c);
    h = s.h;
    c = s.c;
    caches.push(s.cache);
  }
  return { yhat: readOut(net, h), caches };
}

export type LstmResult = {
  fitted: number[];
  forecast: number[];
  sigma: number;
  order: string;
};

export function fitLstm(y: number[], horizon: number, seed = 1): LstmResult {
  const n = y.length;
  const lo = Math.min(...y);
  const hi = Math.max(...y);
  const span = hi - lo;
  if (n < WIN + 8 || span < 1e-6) {
    const mu = mean(y);
    return {
      fitted: y.map(() => mu),
      forecast: Array(horizon).fill(mu),
      sigma: stdev(y),
      order: 'LSTM(mean)',
    };
  }

  const scaled = y.map((v) => (v - lo) / span);
  const rng = mulberry(seed ^ n ^ Math.round(mean(y) * 100));
  const net = init(rng);
  const opt: Adam = { m: zerosNet(), v: zerosNet(), t: 0 };

  const windows: { xs: number[]; target: number }[] = [];
  for (let t = WIN; t < n; t++) {
    windows.push({ xs: scaled.slice(t - WIN, t), target: scaled[t] });
  }

  for (let ep = 0; ep < EPOCHS; ep++) {
    const acc = zerosNet();
    let count = 0;
    for (let w = 0; w < windows.length; w++) {
      const { xs, target } = windows[w];
      const { yhat, caches } = forwardWindow(net, xs);
      const err = yhat - target;
      const g = bptt(net, caches, err);
      accMat(acc.Wf, g.Wf);
      accMat(acc.Wi, g.Wi);
      accMat(acc.Wo, g.Wo);
      accMat(acc.Wc, g.Wc);
      accVec(acc.bf, g.bf);
      accVec(acc.bi, g.bi);
      accVec(acc.bo, g.bo);
      accVec(acc.bc, g.bc);
      accVec(acc.Why, g.Why);
      acc.by += g.by;
      count++;
    }
    if (!count) break;
    const inv = 1 / count;
    const scale = (m: Mat) => {
      for (const row of m) for (let i = 0; i < row.length; i++) row[i] *= inv;
    };
    scale(acc.Wf);
    scale(acc.Wi);
    scale(acc.Wo);
    scale(acc.Wc);
    for (const v of [acc.bf, acc.bi, acc.bo, acc.bc, acc.Why]) for (let i = 0; i < v.length; i++) v[i] *= inv;
    acc.by *= inv;
    adamUpdate(net, acc, opt, LR);
  }

  const unscale = (v: number) => Math.max(0, v * span + lo);

  const fitted: number[] = y.slice(0, WIN);
  for (let t = WIN; t < n; t++) {
    const { yhat } = forwardWindow(net, scaled.slice(t - WIN, t));
    fitted.push(unscale(yhat));
  }

  const seq = scaled.slice();
  const forecast: number[] = [];
  for (let h = 0; h < horizon; h++) {
    const xs = seq.slice(seq.length - WIN);
    const { yhat } = forwardWindow(net, xs);
    const clipped = clamp(yhat, -0.2, 1.2);
    seq.push(clipped);
    forecast.push(unscale(clipped));
  }

  const resid = y.map((v, t) => v - fitted[t]);
  if (!forecast.every((v) => Number.isFinite(v))) {
    const mu = mean(y);
    return {
      fitted: y.map(() => mu),
      forecast: Array(horizon).fill(mu),
      sigma: stdev(y),
      order: 'LSTM(fallback)',
    };
  }

  return { fitted, forecast, sigma: stdev(resid), order: `LSTM(h=${H},w=${WIN})` };
}

export function fitHybrid(y: number[], arimaFitted: number[], arimaForecast: number[], horizon: number, seed = 2): LstmResult {
  const resid = y.map((v, t) => v - (arimaFitted[t] ?? v));
  const lstm = fitLstm(resid, horizon, seed);
  const fitted = y.map((_, t) => Math.max(0, (arimaFitted[t] ?? 0) + (lstm.fitted[t] ?? 0)));
  const forecast = arimaForecast.map((v, i) => Math.max(0, v + (lstm.forecast[i] ?? 0)));
  const r = y.map((v, t) => v - fitted[t]);
  return { fitted, forecast, sigma: stdev(r), order: 'ARIMA+LSTM' };
}
