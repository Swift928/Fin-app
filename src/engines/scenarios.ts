import { AssetFundamental, StressScenario } from "../types";

export const HISTORICAL_SCENARIOS: {
  id: string;
  name: string;
  period: string;
  description: string;
  marketDrop: number;
  vixSurge: number;
  rateChangeBps: number;
  techFactor: number;
}[] = [
  {
    id: "gfc_2008",
    name: "2008 Global Financial Crisis (Lehman Shock)",
    period: "Sep - Nov 2008",
    description: "Systemic banking collapse, severe credit freeze, VIX spike to 80, liquidity dry-up.",
    marketDrop: -0.42,
    vixSurge: 55,
    rateChangeBps: -250,
    techFactor: 1.15,
  },
  {
    id: "covid_2020",
    name: "2020 COVID-19 Liquidity Shock",
    period: "Feb - Mar 2020",
    description: "Rapid global lockdowns, unprecedented velocity of drawdown, margin calls across equities.",
    marketDrop: -0.34,
    vixSurge: 62,
    rateChangeBps: -150,
    techFactor: 0.95,
  },
  {
    id: "rate_hike_2022",
    name: "2022 Fed Rate Hike & Inflation Shock",
    period: "Jan - Oct 2022",
    description: "Rapid 500bps monetary tightening, high-multiple growth and tech equity multiple compression.",
    marketDrop: -0.25,
    vixSurge: 18,
    rateChangeBps: 350,
    techFactor: 1.45,
  },
  {
    id: "dotcom_2000",
    name: "2000 Dot-com Bubble Deflation",
    period: "Mar 2000 - Oct 2002",
    description: "Speculative tech valuation collapse, severe tech drawdowns with defensive rotation.",
    marketDrop: -0.49,
    vixSurge: 25,
    rateChangeBps: -200,
    techFactor: 1.85,
  },
  {
    id: "flash_crash_2010",
    name: "2010 Flash Crash & Sovereign Debt",
    period: "May 2010",
    description: "Intraday algorithmic dislocation combined with European sovereign debt contagion.",
    marketDrop: -0.16,
    vixSurge: 30,
    rateChangeBps: -40,
    techFactor: 1.05,
  },
];

export function runStressScenario(
  scenarioId: string,
  tickers: string[],
  weights: Record<string, number>,
  fundamentals: Record<string, AssetFundamental>,
  portfolioValue = 1000000,
  customParams?: { marketDrop: number; vixSurge: number; rateChangeBps: number }
): StressScenario {
  const base = HISTORICAL_SCENARIOS.find((s) => s.id === scenarioId) || {
    id: "custom",
    name: "Custom Multi-Factor Stress Shock",
    period: "Hypothetical Event",
    description: "User-configured simultaneous market shock, volatility surge, and interest rate adjustment.",
    marketDrop: customParams?.marketDrop ?? -0.2,
    vixSurge: customParams?.vixSurge ?? 25,
    rateChangeBps: customParams?.rateChangeBps ?? 100,
    techFactor: 1.2,
  };

  const marketDrop = customParams?.marketDrop ?? base.marketDrop;
  const vixSurge = customParams?.vixSurge ?? base.vixSurge;
  const rateChangeBps = customParams?.rateChangeBps ?? base.rateChangeBps;

  let totalWeightedReturn = 0;

  const assetImpacts = tickers.map((ticker) => {
    const w = weights[ticker] || 0;
    const fund = fundamentals[ticker] || { beta: 1.0, sector: "Technology" };
    const beta = fund.beta || 1.0;

    // Multiple compression impact from interest rates on growth/tech
    const rateImpactPct = (rateChangeBps / 10000) * (fund.sector === "Technology" ? -2.5 : -1.0);
    const expectedDrop = beta * marketDrop + rateImpactPct * base.techFactor;
    const dollarLoss = w * portfolioValue * expectedDrop;

    totalWeightedReturn += w * expectedDrop;

    return {
      ticker,
      weight: w,
      beta,
      expectedDrop,
      dollarLoss,
    };
  });

  return {
    id: base.id,
    name: base.name,
    period: base.period,
    description: base.description,
    marketDrop,
    vixSurge,
    rateChangeBps,
    estimatedPnl: totalWeightedReturn,
    dollarImpact: totalWeightedReturn * portfolioValue,
    assetImpacts,
  };
}
