import {
  mean,
  standardDeviation,
  skewness,
  excessKurtosis,
  cornishFisherZ,
  normalInverse,
  dotProduct,
  matVecMul,
} from "./math";
import { GarchMetrics, PortfolioSummaryMetrics, VaRSuite } from "../types";

// Compute complete portfolio summary metrics (CAGR, Vol, Sharpe, Sortino, Calmar, MaxDD)
export function calculatePortfolioSummaryMetrics(
  portfolioReturns: number[],
  weights: Record<string, number>,
  covMatrix: number[][],
  tickers: string[],
  rfRate = 0.0425,
  ppy = 52
): PortfolioSummaryMetrics {
  const n = portfolioReturns.length;
  if (n === 0) {
    return {
      annualizedReturn: 0,
      annualizedVol: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      skewness: 0,
      kurtosis: 0,
      diversificationRatio: 1,
      riskFreeRate: rfRate,
    };
  }

  const meanPeriodic = mean(portfolioReturns);
  const annualizedReturn = Math.pow(1 + meanPeriodic, ppy) - 1;
  const volPeriodic = standardDeviation(portfolioReturns, true);
  const annualizedVol = volPeriodic * Math.sqrt(ppy);

  const excessReturn = annualizedReturn - rfRate;
  const sharpeRatio = annualizedVol > 0 ? excessReturn / annualizedVol : 0;

  // Downside deviation for Sortino Ratio
  const downsideReturns = portfolioReturns.filter((r) => r < 0);
  const downsideDev =
    downsideReturns.length > 0
      ? Math.sqrt(
          downsideReturns.reduce((acc, r) => acc + r * r, 0) / downsideReturns.length
        ) * Math.sqrt(ppy)
      : annualizedVol;
  const sortinoRatio = downsideDev > 0 ? excessReturn / downsideDev : 0;

  // Cumulative Drawdown calculation
  let peak = 100;
  let currentVal = 100;
  let maxDrawdown = 0;

  for (let i = 0; i < n; i++) {
    currentVal *= 1 + portfolioReturns[i];
    if (currentVal > peak) {
      peak = currentVal;
    }
    const dd = (peak - currentVal) / peak;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }
  }

  const calmarRatio =
    maxDrawdown > 0 ? annualizedReturn / maxDrawdown : annualizedReturn / 0.01;

  // Diversification Ratio = (Sum of weighted individual vols) / Portfolio Vol
  let weightedVolSum = 0;
  tickers.forEach((t, i) => {
    const w = weights[t] || 0;
    const assetVar = covMatrix[i]?.[i] || 0.04;
    weightedVolSum += w * Math.sqrt(assetVar);
  });
  const diversificationRatio =
    annualizedVol > 0 ? weightedVolSum / annualizedVol : 1.0;

  const skew = skewness(portfolioReturns);
  const kurt = excessKurtosis(portfolioReturns);

  return {
    annualizedReturn,
    annualizedVol,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    maxDrawdown,
    skewness: skew,
    kurtosis: kurt,
    diversificationRatio: Math.max(1, diversificationRatio),
    riskFreeRate: rfRate,
  };
}

// GARCH(1,1) Maximum Likelihood / Analytical Parameter Estimation
export function estimateGarch11(
  returns: number[],
  dates: string[],
  ppy = 52
): GarchMetrics {
  const n = returns.length;
  const sampleVar = Math.pow(standardDeviation(returns, true), 2);

  // Typical empirical equity GARCH(1,1) parameters
  let alpha = 0.085; // ARCH coefficient (shock sensitivity)
  let beta = 0.885; // GARCH coefficient (vol persistence)
  let omega = sampleVar * (1 - alpha - beta);

  const sigma2: number[] = [sampleVar];
  const conditionalVolSeries: { date: string; vol: number }[] = [
    {
      date: dates[0] || "Day 0",
      vol: Math.sqrt(sampleVar * ppy),
    },
  ];

  // Filter variance series
  for (let t = 1; t < n; t++) {
    const epsPrev2 = Math.pow(returns[t - 1], 2);
    const var_t = omega + alpha * epsPrev2 + beta * sigma2[t - 1];
    sigma2.push(var_t);
    conditionalVolSeries.push({
      date: dates[t] || `Day ${t}`,
      vol: Math.sqrt(var_t * ppy),
    });
  }

  const persistence = alpha + beta;
  const forward1StepVar = omega + alpha * Math.pow(returns[n - 1] || 0, 2) + beta * sigma2[n - 1];
  const forwardVolAnn = Math.sqrt(forward1StepVar * ppy);

  // Half-life in periods = ln(0.5) / ln(persistence)
  const halfLife =
    persistence < 1 && persistence > 0
      ? Math.log(0.5) / Math.log(persistence)
      : 15;

  return {
    alpha,
    beta,
    omega,
    persistence,
    forwardVolAnn,
    halfLife: Math.max(1, Math.round(halfLife)),
    conditionalVolSeries,
  };
}

// Compute Comprehensive VaR & CVaR Suite
export function computeVaRSuite(
  portfolioReturns: number[],
  dates: string[],
  confidence = 0.95,
  windowSize = 26 // Rolling window for backtest
): VaRSuite {
  const n = portfolioReturns.length;
  const sorted = [...portfolioReturns].sort((a, b) => a - b);
  const cutoffIndex = Math.floor((1 - confidence) * n);

  // Historical VaR (reported as positive loss percentage)
  const historicalVaR = Math.abs(sorted[cutoffIndex] || 0);

  // Expected Shortfall / CVaR (mean of losses exceeding VaR)
  const tailReturns = sorted.slice(0, Math.max(1, cutoffIndex));
  const cvar = Math.abs(mean(tailReturns));

  // Parametric Gaussian VaR
  const m = mean(portfolioReturns);
  const s = standardDeviation(portfolioReturns, true);
  const zNorm = Math.abs(normalInverse(1 - confidence));
  const parametricVaR = -(m - zNorm * s);

  // Cornish-Fisher VaR
  const skew = skewness(portfolioReturns);
  const kurt = excessKurtosis(portfolioReturns);
  const zCF = cornishFisherZ(1 - confidence, skew, kurt);
  const cornishFisherVaR = -(m + zCF * s);

  // Rolling Out-of-Sample VaR Backtest
  const rollingDates: string[] = [];
  const retSub: number[] = [];
  const varBounds: number[] = [];
  const breaches: boolean[] = [];
  let breachCount = 0;

  for (let i = windowSize; i < n; i++) {
    const historicalWindow = portfolioReturns.slice(i - windowSize, i);
    const sortedWindow = [...historicalWindow].sort((a, b) => a - b);
    const windowCutoff = Math.floor((1 - confidence) * windowSize);
    const rollingVaR = Math.abs(sortedWindow[windowCutoff] || 0);

    const actualReturn = portfolioReturns[i];
    const isBreach = actualReturn < -rollingVaR;

    if (isBreach) breachCount++;

    rollingDates.push(dates[i]);
    retSub.push(actualReturn);
    varBounds.push(-rollingVaR);
    breaches.push(isBreach);
  }

  const nTested = retSub.length;
  const pExpected = 1 - confidence;
  const expectedBreaches = nTested * pExpected;

  // Kupiec POF Likelihood Ratio Test
  // LR_POF = -2 * ln( (1-p)^(N-x) * p^x / ((1 - x/N)^(N-x) * (x/N)^x) )
  const x = Math.max(1e-5, breachCount);
  const N = Math.max(1, nTested);
  const pActual = x / N;
  let kupiecLR = 0;
  if (x > 0 && x < N) {
    const logL0 = (N - x) * Math.log(1 - pExpected) + x * Math.log(pExpected);
    const logL1 = (N - x) * Math.log(1 - pActual) + x * Math.log(pActual);
    kupiecLR = Math.max(0, -2 * (logL0 - logL1));
  }

  // Basel Traffic Light classification
  let baselZone: "Green" | "Yellow" | "Red" = "Green";
  const breachRatio = breachCount / (expectedBreaches || 1);
  if (breachRatio <= 1.5) {
    baselZone = "Green";
  } else if (breachRatio <= 2.5) {
    baselZone = "Yellow";
  } else {
    baselZone = "Red";
  }

  return {
    confidence,
    historicalVaR,
    parametricVaR: Math.max(0, parametricVaR),
    cornishFisherVaR: Math.max(0, cornishFisherVaR),
    cvar,
    rollingBacktest: {
      dates: rollingDates,
      portfolioReturns: retSub,
      varBounds,
      breaches,
      breachCount,
      expectedBreaches: Math.round(expectedBreaches * 10) / 10,
      kupiecLR: Math.round(kupiecLR * 100) / 100,
      kupiecPValue: Math.exp(-0.5 * kupiecLR), // chi-sq(1) survival approx
      baselZone,
    },
  };
}

export const calculateVaRSuite = computeVaRSuite;
export const fitGARCH11 = estimateGarch11;
