// Mathematical & Statistical Utilities for Quantitative Finance

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function standardDeviation(arr: number[], isSample = true): number {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  const variance =
    arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) /
    (isSample ? arr.length - 1 : arr.length);
  return Math.sqrt(Math.max(0, variance));
}

export function skewness(arr: number[]): number {
  const n = arr.length;
  if (n < 3) return 0;
  const m = mean(arr);
  const s = standardDeviation(arr, true);
  if (s === 0) return 0;
  const sum3 = arr.reduce((acc, v) => acc + Math.pow((v - m) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum3;
}
export const computeSkewness = skewness;

export function excessKurtosis(arr: number[]): number {
  const n = arr.length;
  if (n < 4) return 0;
  const m = mean(arr);
  const s = standardDeviation(arr, true);
  if (s === 0) return 0;
  const sum4 = arr.reduce((acc, v) => acc + Math.pow((v - m) / s, 4), 0);
  const k =
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum4 -
    (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  return k;
}
export const computeKurtosis = excessKurtosis;

// Compute annualized expected returns vector from ReturnObservation[] or matrix
export function computeExpectedReturns(
  observations: { returns: Record<string, number> }[],
  tickers: string[],
  ppy = 52
): number[] {
  return tickers.map((t) => {
    const assetReturns = observations.map((o) => o.returns[t] || 0);
    return mean(assetReturns) * ppy;
  });
}

// Compute Sample Covariance Matrix (accepts either ReturnObservation[] + tickers, or raw number[][])
export function computeCovarianceMatrix(
  data: { returns: Record<string, number> }[] | number[][],
  tickersOrPpy?: string[] | number,
  optionalPpy = 52
): number[][] {
  let returnsMatrix: number[][] = [];
  let ppy = 52;

  if (Array.isArray(tickersOrPpy)) {
    const tickers = tickersOrPpy;
    ppy = optionalPpy;
    const obs = data as { returns: Record<string, number> }[];
    returnsMatrix = obs.map((o) => tickers.map((t) => o.returns[t] || 0));
  } else {
    returnsMatrix = data as number[][];
    if (typeof tickersOrPpy === "number") {
      ppy = tickersOrPpy;
    }
  }

  const nRows = returnsMatrix.length;
  const nCols = returnsMatrix[0]?.length || 0;
  if (nRows === 0 || nCols === 0) return [];
  const means: number[] = [];

  for (let j = 0; j < nCols; j++) {
    let sum = 0;
    for (let i = 0; i < nRows; i++) {
      sum += returnsMatrix[i][j];
    }
    means.push(sum / nRows);
  }

  const cov: number[][] = Array.from({ length: nCols }, () =>
    Array(nCols).fill(0)
  );

  for (let j1 = 0; j1 < nCols; j1++) {
    for (let j2 = j1; j2 < nCols; j2++) {
      let sum = 0;
      for (let i = 0; i < nRows; i++) {
        sum +=
          (returnsMatrix[i][j1] - means[j1]) *
          (returnsMatrix[i][j2] - means[j2]);
      }
      const val = (sum / (nRows - 1)) * ppy;
      cov[j1][j2] = val;
      cov[j2][j1] = val;
    }
  }

  return conditionCovariance(cov);
}

// Symmetrize and PSD-repair (Eigenvalue flooring / ridge regularization)
export function conditionCovariance(cov: number[][], minEig = 1e-6): number[][] {
  const n = cov.length;
  const conditioned = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let val = 0.5 * (cov[i][j] + cov[j][i]);
      if (i === j) {
        val = Math.max(val, minEig);
      }
      return val;
    })
  );
  return conditioned;
}

// Matrix Inversion (Gauss-Jordan elimination with partial pivoting)
export function invertMatrix(A: number[][]): number[][] {
  const n = A.length;
  const M = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    const pivot = M[i][i] || 1e-9;
    for (let j = i; j < 2 * n; j++) {
      M[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j < 2 * n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }
  }

  return M.map((row) => row.slice(n));
}

// Matrix vector multiplication
export function matVecMul(A: number[][], v: number[]): number[] {
  return A.map((row) => row.reduce((acc, val, idx) => acc + val * v[idx], 0));
}

// Vector dot product
export function dotProduct(v1: number[], v2: number[]): number {
  return v1.reduce((acc, val, idx) => acc + val * (v2[idx] || 0), 0);
}

// Cornish-Fisher VaR Expansion
export function cornishFisherZ(
  alpha: number,
  skew: number,
  excessKurt: number
): number {
  // Normal inverse quantile approximation
  const z = normalInverse(1 - alpha);
  const z_cf =
    z +
    (1 / 6) * (Math.pow(z, 2) - 1) * skew +
    (1 / 24) * (Math.pow(z, 3) - 3 * z) * excessKurt -
    (1 / 36) * (2 * Math.pow(z, 3) - 5 * z) * Math.pow(skew, 2);
  return z_cf;
}

// Standard normal quantile function (Wichura rational approximation)
export function normalInverse(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  // Rational approximation for normal quantile
  const a = [-3.969683e1, 2.20946e2, -2.759285e2, 1.383577e2, -3.066479e1, 2.506628];
  const b = [-5.447609e1, 1.615858e2, -1.556989e2, 6.680131e1, -1.328068e1];
  const c = [-7.784894e-3, -3.223964e-1, -2.400758, -2.549732, 4.374664, 2.938163];
  const d = [7.784695e-3, 3.224671e-1, 2.445134, 3.754408];

  const q = p - 0.5;
  if (Math.abs(q) <= 0.42) {
    const r = q * q;
    return (
      (q *
        (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5])) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const r = q < 0 ? p : 1 - p;
  const s = Math.sqrt(-Math.log(r));
  let x =
    (((((c[0] * s + c[1]) * s + c[2]) * s + c[3]) * s + c[4]) * s + c[5]) /
    ((((d[0] * s + d[1]) * s + d[2]) * s + d[3]) * s + 1);
  return q < 0 ? -x : x;
}

// Cholesky Decomposition for correlated Monte Carlo simulation
export function choleskyDecomposition(A: number[][]): number[][] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }

      if (i === j) {
        const val = A[i][i] - sum;
        L[i][j] = Math.sqrt(Math.max(1e-8, val));
      } else {
        L[i][j] = (A[i][j] - sum) / (L[j][j] || 1e-8);
      }
    }
  }
  return L;
}
