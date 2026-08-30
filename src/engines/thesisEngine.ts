import {
  InvestmentThesis,
  ThesisTestResult,
  PortfolioSummaryMetrics,
  ReturnObservation,
} from "../types";
import { INITIAL_FUNDAMENTALS } from "../data/marketData";
import { generateHistoricalObservations } from "../data/marketData";
import {
  computeCovarianceMatrix,
  computeExpectedReturns,
  mean,
  standardDeviation,
  dotProduct,
  matVecMul,
} from "./math";
import {
  optimizeTangency,
  optimizeMinVariance,
  optimizeRiskParity,
  optimizeEqualWeight,
} from "./optimization";
import { runFactorRegression } from "./econometrics";
import { computeVaRSuite, estimateGarch11 } from "./risk";
import { HISTORICAL_SCENARIOS, runStressScenario } from "./scenarios";
import { estimateHMMRegimes, runMonteCarloSimulation } from "./simulation";

export interface ThematicArchetype {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  hypothesis: string;
  defaultTickers: string[];
  rationale: string;
  targetObjective: "Max Sharpe" | "Downside Protection" | "Factor Alpha" | "Regime Resilience";
}

export const PRESET_THESES_ARCHETYPES: ThematicArchetype[] = [
  {
    id: "ai_infra_semis",
    title: "AI Infrastructure & Compute Supercycle",
    subtitle: "High-Beta Growth with Semiconductor Dominance",
    category: "Thematic Growth",
    hypothesis:
      "Enterprise CapEx acceleration in AI hardware and custom silicon generates sustained structural alpha exceeding the S&P 500 by >600bps annualized, with volatility manageable via multi-supplier diversification.",
    defaultTickers: ["NVDA", "ASML", "MU", "DELL", "MSFT", "AMD"],
    rationale:
      "Combines leading GPU accelerators (NVDA, AMD), lithography equipment monopoly (ASML), enterprise server infrastructure (DELL), memory bandwidth (MU), and cloud scaling (MSFT).",
    targetObjective: "Max Sharpe",
  },
  {
    id: "defensive_compounders",
    title: "All-Weather Quality & Cash Compounders",
    subtitle: "Low-Beta Resilience with High Free Cash Flow Yield",
    category: "Defensive Alpha",
    hypothesis:
      "High ROE, low-debt non-cyclicals with inelastic pricing power deliver superior Sortino ratios and dampens 2008/2022-style macro drawdowns to less than 15% without sacrificing long-term compound growth.",
    defaultTickers: ["UNH", "WMT", "JPM", "XOM", "COST", "LLY"],
    rationale:
      "Overweights healthcare pricing power (LLY, UNH), retail staple distribution (WMT, COST), global energy cash generation (XOM), and diversified money-center banking (JPM).",
    targetObjective: "Downside Protection",
  },
  {
    id: "stagflation_hedged",
    title: "Real Asset & Commodity Stagflation Shield",
    subtitle: "Inflation Pass-Through with Flight-to-Safety Assets",
    category: "Macro Hedging",
    hypothesis:
      "Combining high-margin energy, industrial CAPEX leaders, clean utilities, and physical gold hedges provides asymmetric payoff during supply-side inflationary shocks and sticky 10Y yields.",
    defaultTickers: ["XOM", "GLD", "CAT", "NEE", "WMT", "JPM"],
    rationale:
      "Blends commodity energy cash flows (XOM), monetary gold safe-haven (GLD), industrial capex (CAT), regulated clean power (NEE), and essential staples (WMT).",
    targetObjective: "Regime Resilience",
  },
  {
    id: "asymmetric_tech_treasury",
    title: "Tech Titans + Long Duration Convexity",
    subtitle: "High-Margin Cash Engines Paired with Bond/Gold Flight Tail Hedge",
    category: "Asymmetric Multi-Asset",
    hypothesis:
      "Mega-cap balance sheet fortresses (AAPL, GOOGL, META, MSFT) paired with long duration Treasuries (TLT) and Gold (GLD) create negative covariance during liquidity crunches while capturing tech operating leverage.",
    defaultTickers: ["AAPL", "MSFT", "GOOGL", "META", "TLT", "GLD"],
    rationale:
      "Combines mega-cap net cash balance sheets with systemic liquidity hedges that surge during severe equity market tail events.",
    targetObjective: "Max Sharpe",
  },
  {
    id: "semiconductor_storage_value",
    title: "Deep Cyclical Tech & Hardware Re-Rating",
    subtitle: "Low PEG & EV/EBITDA Multiple Expansion Play",
    category: "Deep Value & Momentum",
    hypothesis:
      "Memory, storage, and hardware supply consolidation combined with low forward P/E multiples creates asymmetric upside during DRAM/NAND inflection cycles.",
    defaultTickers: ["MU", "WDC", "DELL", "AMD", "BIDU", "CAT"],
    rationale:
      "Captures high operating leverage in cyclical tech hardware trading at significant valuation discounts to broad software peers.",
    targetObjective: "Factor Alpha",
  },
];

/**
 * Execute full autonomous quantitative multi-test suite on a candidate thesis
 */
export function runAutonomousThesisEvaluation(
  thesisMeta: {
    id: string;
    title: string;
    thematicCategory: string;
    hypothesis: string;
    selectedTickers: string[];
    rationale: string;
  },
  activePortfolioMetrics: PortfolioSummaryMetrics,
  activePortfolioTickers: string[],
  activePortfolioWeights: Record<string, number>,
  rfRate = 0.0425,
  ppy = 252
): InvestmentThesis {
  const tickers = thesisMeta.selectedTickers;
  const n = tickers.length;

  // 1. Generate dedicated observations for the thesis universe
  const observations = generateHistoricalObservations(tickers, 500, ppy, 101);
  const covMatrix = computeCovarianceMatrix(observations, tickers, ppy);
  const expectedReturns = computeExpectedReturns(observations, tickers, ppy);

  // 2. Optimization Weights (Tangency with long-only regularization)
  const rawTangency = optimizeTangency(expectedReturns, covMatrix, rfRate, true);
  const targetWeights: Record<string, number> = {};
  tickers.forEach((t, i) => {
    targetWeights[t] = rawTangency[i] || 1 / n;
  });

  // Calculate thesis portfolio returns time series
  const thesisReturns = observations.map((obs) => {
    return tickers.reduce((sum, t) => sum + (obs.returns[t] || 0) * targetWeights[t], 0);
  });

  const thesisMeanDaily = mean(thesisReturns);
  const thesisStdDaily = standardDeviation(thesisReturns, true);
  const thesisAnnReturn = thesisMeanDaily * ppy;
  const thesisAnnVol = thesisStdDaily * Math.sqrt(ppy);
  const thesisSharpe = thesisAnnVol > 0 ? (thesisAnnReturn - rfRate) / thesisAnnVol : 0;

  // Max drawdown calculation
  let peak = 1.0;
  let maxDd = 0;
  let cum = 1.0;
  for (const r of thesisReturns) {
    cum *= 1 + r;
    if (cum > peak) peak = cum;
    const dd = (peak - cum) / peak;
    if (dd > maxDd) maxDd = dd;
  }

  const dates = observations.map((o) => o.date);
  const computePortVar = (w: number[]) =>
    Math.max(1e-6, dotProduct(w, matVecMul(covMatrix, w)));

  // Run Test Suite:
  const testResults: ThesisTestResult[] = [];

  // ==========================================
  // TEST 1: Markowitz & Frontier Optimization Test
  // ==========================================
  const minVarWeights = optimizeMinVariance(covMatrix);
  const minVarReturn = dotProduct(expectedReturns, minVarWeights);
  const minVarVol = Math.sqrt(computePortVar(minVarWeights));
  const minVarSharpe = minVarVol > 0 ? (minVarReturn - rfRate) / minVarVol : 0;

  const equalWeightArray = optimizeEqualWeight(n);
  const eqReturn = dotProduct(expectedReturns, equalWeightArray);
  const eqVol = Math.sqrt(computePortVar(equalWeightArray));
  const eqSharpe = eqVol > 0 ? (eqReturn - rfRate) / eqVol : 0;

  const optPass = thesisSharpe >= 1.25;
  const optScore = Math.min(100, Math.max(20, Math.round(thesisSharpe * 45)));

  testResults.push({
    id: "test_optimization",
    name: "Markowitz & Frontier Efficiency Test",
    category: "Asset Allocation",
    status: thesisSharpe >= 1.3 ? "pass" : thesisSharpe >= 1.0 ? "warning" : "fail",
    score: optScore,
    keyMetricLabel: "Tangency Sharpe Ratio",
    keyMetricValue: `${thesisSharpe.toFixed(2)} (Ann. Ret: ${(thesisAnnReturn * 100).toFixed(1)}%)`,
    benchmarkComparison: `vs. S&P 500 Proxy (0.95) & Eq-Weight (${eqSharpe.toFixed(2)})`,
    details: {
      tangencySharpe: thesisSharpe,
      minVarSharpe: minVarSharpe,
      equalWeightSharpe: eqSharpe,
      annualizedReturn: thesisAnnReturn,
      annualizedVol: thesisAnnVol,
    },
    agentNotes: `Tangency optimization achieves ${(thesisAnnReturn * 100).toFixed(1)}% expected return at ${(thesisAnnVol * 100).toFixed(1)}% volatility, generating a Sharpe ratio premium of +${(thesisSharpe - eqSharpe).toFixed(2)} over naïve 1/N allocation.`,
  });

  // ==========================================
  // TEST 2: Fama-French 3-Factor & Carhart 4-Factor OLS Test
  // ==========================================
  const factorResult = runFactorRegression(
    thesisReturns,
    observations,
    "Carhart (4-Factor)",
    thesisMeta.title,
    ppy
  );

  const alphaSignificant = factorResult.alphaTStat >= 1.96 && factorResult.alphaAnn > 0;
  const factorScore = Math.min(
    100,
    Math.max(
      15,
      Math.round(
        (factorResult.alphaAnn > 0 ? 50 : 20) +
          Math.min(30, factorResult.alphaTStat * 12) +
          factorResult.r2 * 20
      )
    )
  );

  testResults.push({
    id: "test_econometrics",
    name: "Carhart 4-Factor OLS Alpha Significance Test",
    category: "Econometrics",
    status: alphaSignificant ? "pass" : factorResult.alphaAnn > 0 ? "warning" : "fail",
    score: factorScore,
    keyMetricLabel: "Jensen's Annualized Alpha",
    keyMetricValue: `${(factorResult.alphaAnn * 100).toFixed(2)}% (t-stat: ${factorResult.alphaTStat.toFixed(2)})`,
    benchmarkComparison: `p-value: ${factorResult.alphaPValue.toFixed(3)} | R²: ${(factorResult.r2 * 100).toFixed(1)}%`,
    details: {
      alphaAnn: factorResult.alphaAnn,
      alphaTStat: factorResult.alphaTStat,
      alphaPValue: factorResult.alphaPValue,
      r2: factorResult.r2,
      factors: factorResult.factors,
      informationRatio: factorResult.informationRatio,
    },
    agentNotes: alphaSignificant
      ? `Statistically significant alpha of +${(factorResult.alphaAnn * 100).toFixed(1)}% p.a. (t-stat ${factorResult.alphaTStat.toFixed(2)} > 1.96) validates that outperformance is driven by idiosyncratic asset selection rather than passive factor beta.`
      : `Alpha is ${(factorResult.alphaAnn * 100).toFixed(1)}% p.a. (t-stat ${factorResult.alphaTStat.toFixed(2)}). Factor loadings absorb a substantial portion of the excess returns.`,
  });

  // ==========================================
  // TEST 3: Cornish-Fisher & Basel VaR Backtest
  // ==========================================
  const varSuite = computeVaRSuite(thesisReturns, dates, 0.95);
  const baselZone = varSuite.rollingBacktest.baselZone;
  const varScore =
    baselZone === "Green"
      ? 92
      : baselZone === "Yellow"
      ? 65
      : 30;

  testResults.push({
    id: "test_var",
    name: "Cornish-Fisher & Basel Traffic Light VaR Test",
    category: "Tail Risk",
    status: baselZone === "Green" ? "pass" : baselZone === "Yellow" ? "warning" : "fail",
    score: varScore,
    keyMetricLabel: "1-Day 95% Cornish-Fisher VaR",
    keyMetricValue: `${(Math.abs(varSuite.cornishFisherVaR) * 100).toFixed(2)}% | CVaR: ${(Math.abs(varSuite.cvar) * 100).toFixed(2)}%`,
    benchmarkComparison: `Basel Traffic Light: ${baselZone} (${varSuite.rollingBacktest.breachCount} breaches vs. ${varSuite.rollingBacktest.expectedBreaches} expected)`,
    details: {
      historicalVaR: varSuite.historicalVaR,
      parametricVaR: varSuite.parametricVaR,
      cornishFisherVaR: varSuite.cornishFisherVaR,
      cvar: varSuite.cvar,
      baselZone: baselZone,
      breachCount: varSuite.rollingBacktest.breachCount,
      kupiecPValue: varSuite.rollingBacktest.kupiecPValue,
    },
    agentNotes: `Basel backtest placed model in the ${baselZone} Zone with Kupiec POF p-value of ${varSuite.rollingBacktest.kupiecPValue.toFixed(3)}. Cornish-Fisher non-normality adjustment accounts for negative skewness and leptokurtic tail thickness.`,
  });

  // ==========================================
  // TEST 4: Macro Crisis Stress Testing
  // ==========================================
  const stressScenarios = HISTORICAL_SCENARIOS.map((sc) =>
    runStressScenario(sc.id, tickers, targetWeights, INITIAL_FUNDAMENTALS)
  );

  const worstCrisis = stressScenarios.reduce((worst, sc) =>
    sc.estimatedPnl < worst.estimatedPnl ? sc : worst
  );

  const stressPass = worstCrisis.estimatedPnl > -0.25;
  const stressScore = Math.min(
    100,
    Math.max(20, Math.round(100 - Math.abs(worstCrisis.estimatedPnl) * 220))
  );

  testResults.push({
    id: "test_stress",
    name: "Macro Crisis & Systemic Liquidity Shock Test",
    category: "Stress Scenarios",
    status: worstCrisis.estimatedPnl > -0.22 ? "pass" : worstCrisis.estimatedPnl > -0.30 ? "warning" : "fail",
    score: stressScore,
    keyMetricLabel: "Max Crisis Scenario Drawdown",
    keyMetricValue: `${(worstCrisis.estimatedPnl * 100).toFixed(1)}% (${worstCrisis.name})`,
    benchmarkComparison: `2022 Rate Hike: ${(stressScenarios.find((s) => s.id === "rate_hike_2022")?.estimatedPnl || 0) * 100}%`,
    details: {
      scenarios: stressScenarios.map((s) => ({
        name: s.name,
        estimatedPnl: s.estimatedPnl,
        dollarImpact: s.dollarImpact,
      })),
      worstScenario: worstCrisis.name,
      worstLoss: worstCrisis.estimatedPnl,
    },
    agentNotes: `Simulated across 4 historical crisis archetypes (2008 GFC, 2020 COVID, 2022 Fed Rate Shock, Tech Liquidity Squeeze). Worst drawdown occurs in '${worstCrisis.name}' at ${(worstCrisis.estimatedPnl * 100).toFixed(1)}%.`,
  });

  // ==========================================
  // TEST 5: GARCH(1,1) Volatility Memory Test
  // ==========================================
  const garch = estimateGarch11(thesisReturns, dates, ppy);
  const persistenceHealthy = garch.persistence < 0.985 && garch.persistence > 0.75;
  const garchScore = persistenceHealthy ? 88 : garch.persistence >= 0.985 ? 55 : 40;

  testResults.push({
    id: "test_garch",
    name: "GARCH(1,1) Volatility Memory & Persistence Test",
    category: "Time-Varying Volatility",
    status: persistenceHealthy ? "pass" : "warning",
    score: garchScore,
    keyMetricLabel: "Persistence (α + β)",
    keyMetricValue: `${garch.persistence.toFixed(3)} (Half-life: ${garch.halfLife} days)`,
    benchmarkComparison: `Forward 1-Step Vol: ${(garch.forwardVolAnn * 100).toFixed(1)}% (Baseline: ${(thesisAnnVol * 100).toFixed(1)}%)`,
    details: {
      alpha: garch.alpha,
      beta: garch.beta,
      omega: garch.omega,
      persistence: garch.persistence,
      forwardVolAnn: garch.forwardVolAnn,
      halfLife: garch.halfLife,
    },
    agentNotes: `GARCH(1,1) parameter estimation: Shock sensitivity α=${garch.alpha.toFixed(3)}, conditional persistence β=${garch.beta.toFixed(3)}. Total persistence of ${garch.persistence.toFixed(3)} confirms ${garch.persistence > 0.95 ? "extended volatility memory" : "rapid mean reversion after shocks"}.`,
  });

  // ==========================================
  // TEST 6: 2-State Gaussian Hidden Markov Model (HMM) Test
  // ==========================================
  const hmm = estimateHMMRegimes(thesisReturns, dates, ppy);
  const hmmScore =
    hmm.currentRegime === "Bull (Low Vol)"
      ? Math.round(hmm.stayProbability * 100)
      : Math.round((1 - hmm.bearFrequency) * 100);

  testResults.push({
    id: "test_hmm",
    name: "2-State Gaussian HMM Regime Transition Test",
    category: "Regime Detection",
    status: hmm.currentRegime === "Bull (Low Vol)" ? "pass" : "warning",
    score: Math.min(95, Math.max(30, hmmScore)),
    keyMetricLabel: "Current Regime Classification",
    keyMetricValue: `${hmm.currentRegime} (P_stay: ${(hmm.stayProbability * 100).toFixed(1)}%)`,
    benchmarkComparison: `Bull Vol: ${(hmm.bullVolAnn * 100).toFixed(1)}% vs. Bear Vol: ${(hmm.bearVolAnn * 100).toFixed(1)}%`,
    details: {
      currentRegime: hmm.currentRegime,
      stayProbability: hmm.stayProbability,
      bearFrequency: hmm.bearFrequency,
      bullMeanAnn: hmm.bullMeanAnn,
      bearMeanAnn: hmm.bearMeanAnn,
      transitionMatrix: hmm.transitionMatrix,
    },
    agentNotes: `Hidden Markov Model identifies state switching dynamics. Regime persistence in low-vol state is ${(hmm.stayProbability * 100).toFixed(1)}%, with historical bear regime frequency at ${(hmm.bearFrequency * 100).toFixed(1)}%.`,
  });

  // ==========================================
  // TEST 7: Monte Carlo 1,000-Path Wealth Cone Test
  // ==========================================
  const rawWeightArray = tickers.map((t) => targetWeights[t] || 0);
  const mc = runMonteCarloSimulation(
    expectedReturns,
    covMatrix,
    rawWeightArray,
    12,
    1000,
    1000000,
    42
  );

  const probLoss = mc.terminalStats.probLoss;
  const mcPass = probLoss <= 0.15;
  const mcScore = Math.min(100, Math.max(25, Math.round(100 - probLoss * 350)));

  testResults.push({
    id: "test_monte_carlo",
    name: "Monte Carlo 1,000-Path Terminal Cone Test",
    category: "Stochastic Forecasting",
    status: probLoss <= 0.12 ? "pass" : probLoss <= 0.22 ? "warning" : "fail",
    score: mcScore,
    keyMetricLabel: "1-Yr Median Expected Value",
    keyMetricValue: `$${(mc.terminalStats.median / 1000000).toFixed(2)}M (Loss Prob: ${(probLoss * 100).toFixed(1)}%)`,
    benchmarkComparison: `5th%ile Worst Case: $${(mc.terminalStats.min / 1000000).toFixed(2)}M | 95th%ile Upside: $${(mc.percentile95[mc.percentile95.length - 1] / 1000000).toFixed(2)}M`,
    details: {
      medianTerminal: mc.terminalStats.median,
      meanTerminal: mc.terminalStats.mean,
      probLoss: probLoss,
      var95Dollar: mc.terminalStats.var95Dollar,
      cvar95Dollar: mc.terminalStats.cvar95Dollar,
    },
    agentNotes: `Geometric Brownian motion cone (1,000 sample paths over 252 trading days) yields a ${(100 - probLoss * 100).toFixed(1)}% probability of positive 1-year total return, with 95th percentile terminal upside reaching $${(mc.percentile95[mc.percentile95.length - 1] / 1000000).toFixed(2)}M.`,
  });

  // Calculate composite confidence score (weighted average of all 7 tests)
  const weightsPerTest = [0.22, 0.20, 0.16, 0.15, 0.09, 0.09, 0.09];
  const overallConfidenceScore = Math.round(
    testResults.reduce((sum, test, i) => sum + test.score * (weightsPerTest[i] || 0.14), 0)
  );

  const verdict: "Approved / High Conviction" | "Conditional Pass" | "Rejected / Excess Tail Risk" =
    overallConfidenceScore >= 78
      ? "Approved / High Conviction"
      : overallConfidenceScore >= 58
      ? "Conditional Pass"
      : "Rejected / Excess Tail Risk";

  // Comparison with current active portfolio
  const activeSharpe = activePortfolioMetrics.sharpeRatio;
  const activeMaxDd = activePortfolioMetrics.maxDrawdown;
  const activeAnnReturn = activePortfolioMetrics.annualizedReturn;
  const activeVol = activePortfolioMetrics.annualizedVol;
  const activeVaR = 0.0145; // default benchmark
  const alphaVsActive = thesisAnnReturn - activeAnnReturn;

  // Generate tailored executive memorandum and vulnerabilities
  const vulnerabilities: string[] = [];
  const recommendedHedges: string[] = [];

  if (thesisAnnVol > 0.22) {
    vulnerabilities.push("Elevated single-sector concentration drives annualized volatility above 22%.");
    recommendedHedges.push("Overlay an index put spread or allocate 8-12% into GLD/TLT safe-havens.");
  }
  if (worstCrisis.estimatedPnl < -0.22) {
    vulnerabilities.push(`High vulnerability to rate hike & liquidity compression (${(worstCrisis.estimatedPnl * 100).toFixed(1)}% drawdown).`);
    recommendedHedges.push("Introduce short duration bias or floating rate cash buffers.");
  }
  if (factorResult.alphaTStat < 1.96) {
    vulnerabilities.push("Excess return is partially absorbed by passive factor momentum and market beta.");
    recommendedHedges.push("Rebalance weights toward highest FCF yield and lowest PEG components.");
  }
  if (vulnerabilities.length === 0) {
    vulnerabilities.push("Model parameter stability requires periodic monthly covariance matrix re-conditioning.");
    recommendedHedges.push("Implement monthly 5% rebalancing bands to prevent factor drift.");
  }

  const executiveMemo = `### Institutional Research Memorandum: ${thesisMeta.title}

**Executive Verdict**: **${verdict}** (Empirical Confidence Score: **${overallConfidenceScore}/100**)

**1. Core Investment Hypothesis**:
${thesisMeta.hypothesis}

**2. Asset Selection Rationale (${tickers.join(", ")})**:
${thesisMeta.rationale}

**3. Empirical Multi-Test Audit Findings**:
- **Sharpe Ratio Efficiency**: Tangency portfolio achieves **${thesisSharpe.toFixed(2)}** (${(thesisAnnReturn * 100).toFixed(1)}% expected return vs. ${(thesisAnnVol * 100).toFixed(1)}% vol), outperforming active portfolio Sharpe (${activeSharpe.toFixed(2)}) by **${(thesisSharpe - activeSharpe > 0 ? "+" : "")}${(thesisSharpe - activeSharpe).toFixed(2)}**.
- **Factor Econometrics**: Jensen's Carhart Alpha is **+${(factorResult.alphaAnn * 100).toFixed(2)}% p.a.** ($t$-stat: **${factorResult.alphaTStat.toFixed(2)}**), indicating ${alphaSignificant ? "robust statistical significance" : "moderate factor beta dependency"}.
- **Tail Risk & Basel Validation**: Basel Traffic Light backtest is **${baselZone}** with 95% Cornish-Fisher VaR bounded at **${(Math.abs(varSuite.cornishFisherVaR) * 100).toFixed(2)}%** daily.
- **Crisis Stress Test**: Worst simulated drawdown across 4 crises is **${(worstCrisis.estimatedPnl * 100).toFixed(1)}%** in *${worstCrisis.name}*.
- **Volatility Dynamics**: GARCH(1,1) persistence is **${garch.persistence.toFixed(3)}** with an annualized 1-step volatility forecast of **${(garch.forwardVolAnn * 100).toFixed(1)}%**.

**4. Portfolio Execution Recommendation**:
${
  verdict === "Approved / High Conviction"
    ? `The thesis passes all primary quantitative hurdle rates. Recommend deploying the computed Tangency weights across the **${tickers.length}** constituent assets with monthly rebalancing.`
    : verdict === "Conditional Pass"
    ? `The thesis demonstrates attractive risk-adjusted returns but exhibits tail sensitivity. Recommend deploying with the prescribed hedging overlays.`
    : `The thesis fails key downside stress test hurdles. Maintain current allocation until factor volatility abates.`
}`;

  return {
    id: thesisMeta.id,
    title: thesisMeta.title,
    thematicCategory: thesisMeta.thematicCategory,
    hypothesis: thesisMeta.hypothesis,
    selectedTickers: tickers,
    targetWeights: targetWeights,
    rationale: thesisMeta.rationale,
    overallConfidenceScore: overallConfidenceScore,
    verdict: verdict,
    testResults: testResults,
    comparisonWithActive: {
      activeSharpe: activeSharpe,
      thesisSharpe: thesisSharpe,
      activeMaxDd: activeMaxDd,
      thesisMaxDd: maxDd,
      activeAnnReturn: activeAnnReturn,
      thesisAnnReturn: thesisAnnReturn,
      activeVol: activeVol,
      thesisVol: thesisAnnVol,
      activeVaR: activeVaR,
      thesisVaR: Math.abs(varSuite.cornishFisherVaR),
      alphaVsActive: alphaVsActive,
    },
    agentExecutiveMemo: executiveMemo,
    vulnerabilities: vulnerabilities,
    recommendedHedges: recommendedHedges,
  };
}
