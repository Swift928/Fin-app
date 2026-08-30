export interface AssetFundamental {
  ticker: string;
  name: string;
  sector: string;
  currentPrice: number;
  marketCap: number; // in Billions USD
  pe: number;
  forwardPe: number;
  peg: number;
  pb: number;
  evEbitda: number;
  dividendYield: number; // decimal (0.015 = 1.5%)
  roe: number; // decimal
  fcfYield: number; // decimal
  debtToEquity: number;
  beta: number;
}

export interface ReturnObservation {
  date: string;
  prices: Record<string, number>;
  returns: Record<string, number>;
  marketReturn: number;
  vix: number;
  rfRate: number; // annual
  smb: number; // Fama-French Small Minus Big
  hml: number; // Fama-French High Minus Low
  mom: number; // Momentum factor
}

export interface PortfolioSummaryMetrics {
  annualizedReturn: number;
  annualizedVol: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  skewness: number;
  kurtosis: number;
  diversificationRatio: number;
  riskFreeRate: number;
}

export interface OptimizationWeights {
  tangency: Record<string, number>;
  minVariance: Record<string, number>;
  equalWeight: Record<string, number>;
  riskParity: Record<string, number>;
  blackLitterman: Record<string, number>;
}

export interface FrontierPoint {
  volatility: number;
  expectedReturn: number;
  sharpe: number;
  weights: Record<string, number>;
}

export interface BlackLittermanView {
  id: string;
  type: "absolute" | "relative";
  asset1: string;
  asset2?: string;
  expectedOutperformance: number; // decimal (0.05 = +5%)
  confidence: number; // 0 to 1
}

export interface GarchMetrics {
  alpha: number; // shock sensitivity
  beta: number; // persistence
  omega: number; // baseline
  persistence: number; // alpha + beta
  forwardVolAnn: number; // annualized 1-step forecast
  halfLife: number; // days until shock is halved
  conditionalVolSeries: { date: string; vol: number }[];
}

export interface VaRSuite {
  confidence: number;
  historicalVaR: number;
  parametricVaR: number;
  cornishFisherVaR: number;
  cvar: number; // Expected Shortfall
  rollingBacktest: {
    dates: string[];
    portfolioReturns: number[];
    varBounds: number[];
    breaches: boolean[];
    breachCount: number;
    expectedBreaches: number;
    kupiecLR: number;
    kupiecPValue: number;
    baselZone: "Green" | "Yellow" | "Red";
  };
}

export interface FactorModelResult {
  modelName: "CAPM (1-Factor)" | "Fama-French (3-Factor)" | "Carhart (4-Factor)";
  asset: string;
  r2: number;
  adjR2: number;
  fStat: number;
  alphaAnn: number;
  alphaTStat: number;
  alphaPValue: number;
  trackingError: number;
  informationRatio: number;
  treynorRatio: number;
  factors: {
    name: string;
    coefficient: number;
    stdError: number;
    tStat: number;
    pValue: number;
  }[];
  residualDiagnostics: {
    durbinWatson: number; // ~2.0 is ideal
    jarqueBera: number;
    jarqueBeraP: number;
    breuschPaganP: number;
  };
}

export interface StressScenario {
  id: string;
  name: string;
  period: string;
  description: string;
  marketDrop: number;
  vixSurge: number;
  rateChangeBps: number;
  estimatedPnl: number;
  dollarImpact: number;
  assetImpacts: {
    ticker: string;
    weight: number;
    beta: number;
    expectedDrop: number;
    dollarLoss: number;
  }[];
}

export interface HMMStateOutput {
  currentRegime: "Bull (Low Vol)" | "Bear (High Vol)";
  consecutivePeriods: number;
  stayProbability: number;
  bearFrequency: number;
  bullMeanAnn: number;
  bearMeanAnn: number;
  bullVolAnn: number;
  bearVolAnn: number;
  transitionMatrix: number[][];
  regimeSeries: {
    date: string;
    state: 0 | 1;
    bullProb: number;
    bearProb: number;
    marketReturn: number;
  }[];
}

export interface MonteCarloOutput {
  horizonMonths: number;
  numSimulations: number;
  initialValue: number;
  timeSteps: string[];
  percentile5: number[];
  percentile25: number[];
  percentile50: number[];
  percentile75: number[];
  percentile95: number[];
  samplePaths: number[][];
  terminalStats: {
    mean: number;
    median: number;
    min: number;
    max: number;
    probLoss: number;
    var95Dollar: number;
    cvar95Dollar: number;
  };
}

export interface BacktestSummary {
  dates: string[];
  portfolioGrowth: number[];
  benchmarkGrowth: number[];
  equalWeightGrowth: number[];
  rebalanceDates: string[];
  metrics: {
    tangencyCagr: number;
    tangencyVol: number;
    tangencySharpe: number;
    tangencyMaxDd: number;
    benchmarkCagr: number;
    benchmarkVol: number;
    benchmarkSharpe: number;
    benchmarkMaxDd: number;
  };
}

export interface RunManifest {
  generated_at: string;
  git_hash: string;
  tickers: string[];
  interval: string;
  date_range: {
    start: string;
    end: string;
    n_observations: number;
  };
  rng_seed: number;
  parameters: Record<string, any>;
  governance: {
    sr11_7_compliant: boolean;
    covariance_conditioning: string;
    reporting_lag_days: number;
    look_ahead_bias_free: boolean;
  };
}

export type ThesisTestType =
  | "optimization"
  | "econometrics"
  | "var_backtest"
  | "stress_testing"
  | "garch_vol"
  | "hmm_regime"
  | "monte_carlo";

export interface ThesisTestResult {
  id: string;
  name: string;
  category: string;
  status: "pass" | "warning" | "fail";
  score: number; // 0 to 100
  keyMetricLabel: string;
  keyMetricValue: string;
  benchmarkComparison: string;
  details: Record<string, any>;
  agentNotes: string;
}

export interface InvestmentThesis {
  id: string;
  title: string;
  thematicCategory: string;
  hypothesis: string;
  selectedTickers: string[];
  targetWeights: Record<string, number>;
  rationale: string;
  overallConfidenceScore: number; // 0 to 100
  verdict: "Approved / High Conviction" | "Conditional Pass" | "Rejected / Excess Tail Risk";
  testResults: ThesisTestResult[];
  comparisonWithActive: {
    activeSharpe: number;
    thesisSharpe: number;
    activeMaxDd: number;
    thesisMaxDd: number;
    activeAnnReturn: number;
    thesisAnnReturn: number;
    activeVol: number;
    thesisVol: number;
    activeVaR: number;
    thesisVaR: number;
    alphaVsActive: number;
  };
  agentExecutiveMemo: string;
  vulnerabilities: string[];
  recommendedHedges: string[];
}

