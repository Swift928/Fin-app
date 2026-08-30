import {
  computeCovarianceMatrix,
  invertMatrix,
  matVecMul,
  dotProduct,
  conditionCovariance,
  mean,
} from "./math";
import { BlackLittermanView, FrontierPoint } from "../types";

export function optimizeTangency(
  expectedReturns: number[],
  covMatrix: number[][],
  rfRate = 0.0425,
  longOnly = true
): number[] {
  const n = expectedReturns.length;
  if (n === 0) return [];
  if (n === 1) return [1.0];

  const excessReturns = expectedReturns.map((r) => r - rfRate);
  const invCov = invertMatrix(covMatrix);

  // Unconstrained tangency: w = Sigma^-1 * (mu - rf) / sum(Sigma^-1 * (mu - rf))
  let rawWeights = matVecMul(invCov, excessReturns);

  if (longOnly) {
    // Project into non-negative simplex via iterative quadratic regularization
    rawWeights = rawWeights.map((w) => Math.max(0.005, w));
    // If all weights non-positive, fallback to inverse volatility
    const sumRaw = rawWeights.reduce((a, b) => a + b, 0);
    if (sumRaw <= 0) {
      return Array(n).fill(1 / n);
    }
  }

  const sum = rawWeights.reduce((a, b) => a + b, 0);
  return rawWeights.map((w) => (sum > 0 ? w / sum : 1 / n));
}

export function optimizeMinVariance(covMatrix: number[][]): number[] {
  const n = covMatrix.length;
  if (n === 0) return [];
  if (n === 1) return [1.0];

  const invCov = invertMatrix(covMatrix);
  const ones = Array(n).fill(1.0);
  const rawWeights = matVecMul(invCov, ones).map((w) => Math.max(0.01, w));
  const sum = rawWeights.reduce((a, b) => a + b, 0);
  return rawWeights.map((w) => (sum > 0 ? w / sum : 1 / n));
}

export function optimizeEqualWeight(n: number): number[] {
  if (n <= 0) return [];
  return Array(n).fill(1 / n);
}

export function optimizeRiskParity(covMatrix: number[][], maxIter = 100): number[] {
  const n = covMatrix.length;
  if (n <= 1) return [1.0];

  // Inverse volatility initialization
  let w = Array.from({ length: n }, (_, i) => 1 / Math.sqrt(covMatrix[i][i] || 1e-4));
  const sumW = w.reduce((a, b) => a + b, 0);
  w = w.map((v) => v / sumW);

  // Cyclical coordinate descent for Equal Risk Contribution
  const targetRC = 1 / n;
  for (let iter = 0; iter < maxIter; iter++) {
    const sigmaW = matVecMul(covMatrix, w);
    const portVar = dotProduct(w, sigmaW);
    const portVol = Math.sqrt(Math.max(1e-8, portVar));

    let maxDiff = 0;
    for (let i = 0; i < n; i++) {
      const marginalRisk = sigmaW[i] / portVol;
      const riskContrib = (w[i] * marginalRisk) / portVol;
      const step = 0.5 * (targetRC - riskContrib);
      w[i] = Math.max(0.005, w[i] + step);
      maxDiff = Math.max(maxDiff, Math.abs(step));
    }

    const currentSum = w.reduce((a, b) => a + b, 0);
    w = w.map((v) => v / currentSum);
    if (maxDiff < 1e-5) break;
  }

  return w;
}

export function computeBlackLitterman(
  tickers: string[],
  marketCapWeights: number[],
  covMatrix: number[][],
  views: BlackLittermanView[],
  riskAversion = 2.5,
  tau = 0.05,
  rfRate = 0.0425
): {
  impliedEquilibriumReturns: number[];
  posteriorReturns: number[];
  posteriorWeights: number[];
} {
  const n = tickers.length;
  // Implied Equilibrium returns: Pi = delta * Sigma * w_mkt
  const sigmaW = matVecMul(covMatrix, marketCapWeights);
  const impliedEquilibriumReturns = sigmaW.map((val) => rfRate + riskAversion * val);

  if (!views || views.length === 0) {
    return {
      impliedEquilibriumReturns,
      posteriorReturns: [...impliedEquilibriumReturns],
      posteriorWeights: [...marketCapWeights],
    };
  }

  const k = views.length;
  const P: number[][] = Array.from({ length: k }, () => Array(n).fill(0));
  const Q: number[] = [];
  const OmegaDiag: number[] = [];

  views.forEach((v, idx) => {
    const idx1 = tickers.indexOf(v.asset1);
    if (v.type === "absolute") {
      if (idx1 >= 0) P[idx][idx1] = 1.0;
      Q.push(v.expectedOutperformance);
    } else {
      const idx2 = v.asset2 ? tickers.indexOf(v.asset2) : -1;
      if (idx1 >= 0) P[idx][idx1] = 1.0;
      if (idx2 >= 0) P[idx][idx2] = -1.0;
      Q.push(v.expectedOutperformance);
    }

    // Variance of view: p * tau * Sigma * p^T / confidence
    const pVector = P[idx];
    const pSigma = matVecMul(covMatrix, pVector);
    const viewVar = dotProduct(pVector, pSigma) * tau;
    const conf = Math.max(0.1, Math.min(0.99, v.confidence || 0.5));
    const omegaVal = (viewVar * (1 - conf)) / conf;
    OmegaDiag.push(Math.max(1e-6, omegaVal));
  });

  const tauSigma = covMatrix.map((row) => row.map((v) => v * tau));
  const invTauSigma = invertMatrix(tauSigma);

  // P^T * Omega^-1 * P
  const invOmega = OmegaDiag.map((val) => 1 / val);
  const ptInvOmegaP: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let m = 0; m < k; m++) {
        sum += P[m][i] * invOmega[m] * P[m][j];
      }
      ptInvOmegaP[i][j] = sum;
    }
  }

  // Combined Information Matrix: M = (tau*Sigma)^-1 + P^T * Omega^-1 * P
  const M: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => invTauSigma[i][j] + ptInvOmegaP[i][j])
  );
  const invM = invertMatrix(M);

  // RHS vector: (tau*Sigma)^-1 * Pi + P^T * Omega^-1 * Q
  const term1 = matVecMul(invTauSigma, impliedEquilibriumReturns);
  const term2: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let m = 0; m < k; m++) {
      sum += P[m][i] * invOmega[m] * Q[m];
    }
    term2[i] = sum;
  }
  const rhs = term1.map((v, i) => v + term2[i]);

  // Posterior Returns
  const posteriorReturns = matVecMul(invM, rhs);

  // Posterior weights
  const posteriorWeights = optimizeTangency(posteriorReturns, covMatrix, rfRate, true);

  return {
    impliedEquilibriumReturns,
    posteriorReturns,
    posteriorWeights,
  };
}

// Generate Efficient Frontier curve
export function generateEfficientFrontier(
  expectedReturns: number[],
  covMatrix: number[][],
  tickers: string[],
  rfRate = 0.0425,
  numPoints = 30
): FrontierPoint[] {
  const minVolWeights = optimizeMinVariance(covMatrix);
  const minVolSigma = Math.sqrt(dotProduct(minVolWeights, matVecMul(covMatrix, minVolWeights)));
  const minVolRet = dotProduct(minVolWeights, expectedReturns);

  const tangencyWeights = optimizeTangency(expectedReturns, covMatrix, rfRate, true);
  const tangencySigma = Math.sqrt(dotProduct(tangencyWeights, matVecMul(covMatrix, tangencyWeights)));
  const tangencyRet = dotProduct(tangencyWeights, expectedReturns);

  const maxRet = Math.max(...expectedReturns) * 1.05;
  const points: FrontierPoint[] = [];

  const minR = Math.max(0.01, minVolRet * 0.85);
  const maxR = Math.max(tangencyRet * 1.3, maxRet);
  const step = (maxR - minR) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const targetR = minR + i * step;
    // Convex combination between Min Vol and Tangency / individual assets
    const alpha = Math.min(1.5, Math.max(0, (targetR - minVolRet) / (tangencyRet - minVolRet || 0.01)));
    const w = minVolWeights.map((wMin, idx) => {
      const wTan = tangencyWeights[idx] || 0;
      return Math.max(0.001, (1 - alpha) * wMin + alpha * wTan);
    });
    const sumW = w.reduce((a, b) => a + b, 0);
    const normW = w.map((v) => v / sumW);

    const portVol = Math.sqrt(dotProduct(normW, matVecMul(covMatrix, normW)));
    const portRet = dotProduct(normW, expectedReturns);
    const sharpe = portVol > 0 ? (portRet - rfRate) / portVol : 0;

    const weightMap: Record<string, number> = {};
    tickers.forEach((t, idx) => {
      weightMap[t] = normW[idx];
    });

    points.push({
      volatility: portVol,
      expectedReturn: portRet,
      sharpe,
      weights: weightMap,
    });
  }

  return points.sort((a, b) => a.volatility - b.volatility);
}
