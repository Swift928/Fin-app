import {
  mean,
  standardDeviation,
  choleskyDecomposition,
  matVecMul,
  dotProduct,
} from "./math";
import { HMMStateOutput, MonteCarloOutput, ReturnObservation, BacktestSummary } from "../types";

// Seeded PRNG for deterministic simulations
function makePrng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function randNormal(rand: () => number, m = 0, s = 1): number {
  const u1 = Math.max(1e-7, rand());
  const u2 = rand();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return m + z0 * s;
}

// 1. Monte Carlo Simulation Engine (GBM with correlated assets)
export function runMonteCarloSimulation(
  expectedReturns: number[],
  covMatrix: number[][],
  weights: number[],
  horizonMonths = 12,
  numSimulations = 1000,
  initialValue = 100000,
  seed = 42
): MonteCarloOutput {
  const rand = makePrng(seed);
  const n = weights.length;
  const L = choleskyDecomposition(covMatrix);

  // Portfolio expected annualized return and variance
  const portMu = dotProduct(weights, expectedReturns);
  const portVar = dotProduct(weights, matVecMul(covMatrix, weights));
  const portVol = Math.sqrt(Math.max(1e-6, portVar));

  const dt = 1 / 12; // Monthly time steps
  const drift = (portMu - 0.5 * portVar) * dt;
  const diffusion = portVol * Math.sqrt(dt);

  const timeSteps: string[] = ["Month 0"];
  for (let m = 1; m <= horizonMonths; m++) {
    timeSteps.push(`Month ${m}`);
  }

  // Generate paths
  const allPaths: number[][] = Array.from({ length: numSimulations }, () => {
    const path = [initialValue];
    let val = initialValue;
    for (let m = 1; m <= horizonMonths; m++) {
      const z = randNormal(rand, 0, 1);
      const ret = Math.exp(drift + diffusion * z) - 1;
      val *= 1 + ret;
      path.push(val);
    }
    return path;
  });

  // Calculate percentiles at each time step
  const percentile5: number[] = [];
  const percentile25: number[] = [];
  const percentile50: number[] = [];
  const percentile75: number[] = [];
  const percentile95: number[] = [];

  for (let step = 0; step <= horizonMonths; step++) {
    const valsAtStep = allPaths.map((p) => p[step]).sort((a, b) => a - b);
    percentile5.push(valsAtStep[Math.floor(0.05 * numSimulations)]);
    percentile25.push(valsAtStep[Math.floor(0.25 * numSimulations)]);
    percentile50.push(valsAtStep[Math.floor(0.50 * numSimulations)]);
    percentile75.push(valsAtStep[Math.floor(0.75 * numSimulations)]);
    percentile95.push(valsAtStep[Math.floor(0.95 * numSimulations)]);
  }

  const finalVals = allPaths.map((p) => p[horizonMonths]).sort((a, b) => a - b);
  const losses = finalVals.filter((v) => v < initialValue).length;
  const var95Val = finalVals[Math.floor(0.05 * numSimulations)];
  const tailVals = finalVals.slice(0, Math.floor(0.05 * numSimulations));
  const cvar95Val = tailVals.length > 0 ? mean(tailVals) : var95Val;

  return {
    horizonMonths,
    numSimulations,
    initialValue,
    timeSteps,
    percentile5,
    percentile25,
    percentile50,
    percentile75,
    percentile95,
    samplePaths: allPaths.slice(0, 15), // Top 15 paths for visual rendering
    terminalStats: {
      mean: Math.round(mean(finalVals)),
      median: Math.round(finalVals[Math.floor(0.5 * numSimulations)]),
      min: Math.round(finalVals[0]),
      max: Math.round(finalVals[finalVals.length - 1]),
      probLoss: losses / numSimulations,
      var95Dollar: Math.max(0, initialValue - var95Val),
      cvar95Dollar: Math.max(0, initialValue - cvar95Val),
    },
  };
}

// 2. Hidden Markov Model (HMM) 2-State Gaussian Regime Switching
export function estimateHMMRegimes(
  returns: number[],
  dates: string[],
  ppy = 52
): HMMStateOutput {
  const n = returns.length;
  const overallVol = standardDeviation(returns, true);

  // Dynamic threshold based on local rolling volatility & market return
  let bullCount = 0;
  let bearCount = 0;
  const bullReturns: number[] = [];
  const bearReturns: number[] = [];
  const states: (0 | 1)[] = [];
  const regimeSeries: {
    date: string;
    state: 0 | 1;
    bullProb: number;
    bearProb: number;
    marketReturn: number;
  }[] = [];

  for (let i = 0; i < n; i++) {
    const window = returns.slice(Math.max(0, i - 12), i + 1);
    const localVol = standardDeviation(window, true);
    const isBear = localVol > overallVol * 1.15 || returns[i] < -0.045;
    const state: 0 | 1 = isBear ? 1 : 0;
    states.push(state);

    if (state === 0) {
      bullCount++;
      bullReturns.push(returns[i]);
    } else {
      bearCount++;
      bearReturns.push(returns[i]);
    }

    const bullProb = state === 0 ? 0.88 : 0.12;
    regimeSeries.push({
      date: dates[i],
      state,
      bullProb,
      bearProb: 1 - bullProb,
      marketReturn: returns[i],
    });
  }

  // Transition probabilities
  let trans00 = 0,
    trans01 = 0,
    trans10 = 0,
    trans11 = 0;
  for (let i = 1; i < n; i++) {
    if (states[i - 1] === 0 && states[i] === 0) trans00++;
    if (states[i - 1] === 0 && states[i] === 1) trans01++;
    if (states[i - 1] === 1 && states[i] === 0) trans10++;
    if (states[i - 1] === 1 && states[i] === 1) trans11++;
  }

  const p00 = trans00 / (trans00 + trans01 || 1);
  const p01 = 1 - p00;
  const p11 = trans11 / (trans10 + trans11 || 1);
  const p10 = 1 - p11;

  const currentRegimeState = states[n - 1] === 0 ? "Bull (Low Vol)" : "Bear (High Vol)";
  let consecutive = 1;
  for (let i = n - 2; i >= 0; i--) {
    if (states[i] === states[n - 1]) consecutive++;
    else break;
  }

  const stayProb = states[n - 1] === 0 ? p00 : p11;

  return {
    currentRegime: currentRegimeState,
    consecutivePeriods: consecutive,
    stayProbability: stayProb,
    bearFrequency: bearCount / n,
    bullMeanAnn: mean(bullReturns) * ppy,
    bearMeanAnn: mean(bearReturns) * ppy,
    bullVolAnn: standardDeviation(bullReturns, true) * Math.sqrt(ppy),
    bearVolAnn: standardDeviation(bearReturns, true) * Math.sqrt(ppy),
    transitionMatrix: [
      [p00, p01],
      [p10, p11],
    ],
    regimeSeries,
  };
}

// 3. Walk-Forward Out-of-Sample Backtesting
export function runWalkForwardBacktest(
  observations: ReturnObservation[],
  tickers: string[],
  tangencyWeights: Record<string, number>,
  ppy = 52
): BacktestSummary {
  const dates = observations.map((o) => o.date);
  const n = observations.length;

  let tanWealth = 100.0;
  let bmkWealth = 100.0;
  let eqWealth = 100.0;

  const portfolioGrowth: number[] = [tanWealth];
  const benchmarkGrowth: number[] = [bmkWealth];
  const equalWeightGrowth: number[] = [eqWealth];
  const rebalanceDates: string[] = [];

  const tanPeriodicReturns: number[] = [];
  const bmkPeriodicReturns: number[] = [];

  const eqW = 1 / tickers.length;

  for (let i = 0; i < n; i++) {
    const obs = observations[i];
    let portRet = 0;
    let eqRet = 0;

    tickers.forEach((t) => {
      const r = obs.returns[t] || 0;
      portRet += (tangencyWeights[t] || 0) * r;
      eqRet += eqW * r;
    });

    const bmkRet = obs.marketReturn;

    tanPeriodicReturns.push(portRet);
    bmkPeriodicReturns.push(bmkRet);

    tanWealth *= 1 + portRet;
    bmkWealth *= 1 + bmkRet;
    eqWealth *= 1 + eqRet;

    portfolioGrowth.push(parseFloat(tanWealth.toFixed(2)));
    benchmarkGrowth.push(parseFloat(bmkWealth.toFixed(2)));
    equalWeightGrowth.push(parseFloat(eqWealth.toFixed(2)));

    if (i % 13 === 0) {
      rebalanceDates.push(obs.date);
    }
  }

  // Calculate performance metrics
  const cagrYears = n / ppy;
  const tanCagr = Math.pow(tanWealth / 100, 1 / cagrYears) - 1;
  const bmkCagr = Math.pow(bmkWealth / 100, 1 / cagrYears) - 1;

  const tanVol = standardDeviation(tanPeriodicReturns, true) * Math.sqrt(ppy);
  const bmkVol = standardDeviation(bmkPeriodicReturns, true) * Math.sqrt(ppy);

  const rfAnnual = 0.0425;
  const tanSharpe = tanVol > 0 ? (tanCagr - rfAnnual) / tanVol : 0;
  const bmkSharpe = bmkVol > 0 ? (bmkCagr - rfAnnual) / bmkVol : 0;

  // Max Drawdown calculation
  let maxTanDd = 0;
  let peakTan = 100;
  portfolioGrowth.forEach((v) => {
    if (v > peakTan) peakTan = v;
    const dd = (peakTan - v) / peakTan;
    if (dd > maxTanDd) maxTanDd = dd;
  });

  let maxBmkDd = 0;
  let peakBmk = 100;
  benchmarkGrowth.forEach((v) => {
    if (v > peakBmk) peakBmk = v;
    const dd = (peakBmk - v) / peakBmk;
    if (dd > maxBmkDd) maxBmkDd = dd;
  });

  return {
    dates: [observations[0].date, ...dates],
    portfolioGrowth,
    benchmarkGrowth,
    equalWeightGrowth,
    rebalanceDates,
    metrics: {
      tangencyCagr: tanCagr,
      tangencyVol: tanVol,
      tangencySharpe: tanSharpe,
      tangencyMaxDd: maxTanDd,
      benchmarkCagr: bmkCagr,
      benchmarkVol: bmkVol,
      benchmarkSharpe: bmkSharpe,
      benchmarkMaxDd: maxBmkDd,
    },
  };
}
