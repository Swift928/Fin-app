import { AssetFundamental, ReturnObservation } from "../types";

export const INITIAL_FUNDAMENTALS: Record<string, AssetFundamental> = {
  AAPL: {
    ticker: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    currentPrice: 228.45,
    marketCap: 3480,
    pe: 34.2,
    forwardPe: 29.8,
    peg: 2.35,
    pb: 46.8,
    evEbitda: 24.6,
    dividendYield: 0.0044,
    roe: 1.47,
    fcfYield: 0.032,
    debtToEquity: 1.82,
    beta: 1.12,
  },
  MSFT: {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    sector: "Technology",
    currentPrice: 442.8,
    marketCap: 3290,
    pe: 36.8,
    forwardPe: 31.4,
    peg: 2.15,
    pb: 12.4,
    evEbitda: 23.9,
    dividendYield: 0.0068,
    roe: 0.38,
    fcfYield: 0.026,
    debtToEquity: 0.42,
    beta: 1.08,
  },
  NVDA: {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Semiconductors",
    currentPrice: 126.5,
    marketCap: 3110,
    pe: 58.4,
    forwardPe: 38.2,
    peg: 1.28,
    pb: 42.1,
    evEbitda: 44.8,
    dividendYield: 0.0003,
    roe: 1.15,
    fcfYield: 0.021,
    debtToEquity: 0.22,
    beta: 1.68,
  },
  GOOGL: {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    sector: "Communication Services",
    currentPrice: 178.2,
    marketCap: 2210,
    pe: 24.8,
    forwardPe: 21.2,
    peg: 1.42,
    pb: 6.8,
    evEbitda: 16.2,
    dividendYield: 0.0045,
    roe: 0.31,
    fcfYield: 0.038,
    debtToEquity: 0.09,
    beta: 1.05,
  },
  AMZN: {
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    sector: "Consumer Discretionary",
    currentPrice: 186.4,
    marketCap: 1940,
    pe: 42.5,
    forwardPe: 32.8,
    peg: 1.55,
    pb: 8.2,
    evEbitda: 17.5,
    dividendYield: 0.0,
    roe: 0.21,
    fcfYield: 0.028,
    debtToEquity: 0.58,
    beta: 1.15,
  },
  META: {
    ticker: "META",
    name: "Meta Platforms Inc.",
    sector: "Communication Services",
    currentPrice: 512.3,
    marketCap: 1300,
    pe: 27.4,
    forwardPe: 22.9,
    peg: 1.18,
    pb: 8.9,
    evEbitda: 16.8,
    dividendYield: 0.0039,
    roe: 0.34,
    fcfYield: 0.039,
    debtToEquity: 0.18,
    beta: 1.22,
  },
  TSLA: {
    ticker: "TSLA",
    name: "Tesla Inc.",
    sector: "Consumer Discretionary",
    currentPrice: 218.6,
    marketCap: 698,
    pe: 64.2,
    forwardPe: 52.0,
    peg: 3.4,
    pb: 10.4,
    evEbitda: 38.6,
    dividendYield: 0.0,
    roe: 0.19,
    fcfYield: 0.012,
    debtToEquity: 0.14,
    beta: 2.14,
  },
  MU: {
    ticker: "MU",
    name: "Micron Technology Inc.",
    sector: "Semiconductors",
    currentPrice: 104.2,
    marketCap: 115,
    pe: 28.6,
    forwardPe: 12.8,
    peg: 0.74,
    pb: 2.4,
    evEbitda: 9.8,
    dividendYield: 0.0044,
    roe: 0.12,
    fcfYield: 0.042,
    debtToEquity: 0.31,
    beta: 1.52,
  },
  WDC: {
    ticker: "WDC",
    name: "Western Digital Corp.",
    sector: "Technology",
    currentPrice: 68.4,
    marketCap: 23,
    pe: 22.1,
    forwardPe: 10.5,
    peg: 0.65,
    pb: 2.1,
    evEbitda: 8.4,
    dividendYield: 0.0,
    roe: 0.14,
    fcfYield: 0.051,
    debtToEquity: 0.78,
    beta: 1.48,
  },
  WMT: {
    ticker: "WMT",
    name: "Walmart Inc.",
    sector: "Consumer Staples",
    currentPrice: 72.8,
    marketCap: 585,
    pe: 31.2,
    forwardPe: 27.4,
    peg: 3.12,
    pb: 6.4,
    evEbitda: 15.6,
    dividendYield: 0.0118,
    roe: 0.22,
    fcfYield: 0.035,
    debtToEquity: 0.72,
    beta: 0.54,
  },
  UNH: {
    ticker: "UNH",
    name: "UnitedHealth Group",
    sector: "Healthcare",
    currentPrice: 565.4,
    marketCap: 520,
    pe: 23.8,
    forwardPe: 19.4,
    peg: 1.62,
    pb: 5.6,
    evEbitda: 13.9,
    dividendYield: 0.0148,
    roe: 0.26,
    fcfYield: 0.048,
    debtToEquity: 0.69,
    beta: 0.62,
  },
  DELL: {
    ticker: "DELL",
    name: "Dell Technologies Inc.",
    sector: "Technology",
    currentPrice: 118.9,
    marketCap: 84,
    pe: 21.6,
    forwardPe: 14.8,
    peg: 1.15,
    pb: 9.8,
    evEbitda: 10.2,
    dividendYield: 0.0151,
    roe: 0.48,
    fcfYield: 0.058,
    debtToEquity: 2.45,
    beta: 1.36,
  },
  CAT: {
    ticker: "CAT",
    name: "Caterpillar Inc.",
    sector: "Industrials",
    currentPrice: 348.2,
    marketCap: 168,
    pe: 16.4,
    forwardPe: 15.2,
    peg: 1.48,
    pb: 8.9,
    evEbitda: 11.4,
    dividendYield: 0.0162,
    roe: 0.54,
    fcfYield: 0.052,
    debtToEquity: 1.94,
    beta: 1.14,
  },
  BIDU: {
    ticker: "BIDU",
    name: "Baidu Inc.",
    sector: "Communication Services",
    currentPrice: 88.5,
    marketCap: 31,
    pe: 11.2,
    forwardPe: 9.4,
    peg: 0.98,
    pb: 0.85,
    evEbitda: 5.8,
    dividendYield: 0.0,
    roe: 0.09,
    fcfYield: 0.076,
    debtToEquity: 0.28,
    beta: 0.98,
  },
  JPM: {
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    sector: "Financials",
    currentPrice: 218.4,
    marketCap: 620,
    pe: 12.4,
    forwardPe: 11.8,
    peg: 1.35,
    pb: 1.85,
    evEbitda: 10.5,
    dividendYield: 0.0215,
    roe: 0.17,
    fcfYield: 0.045,
    debtToEquity: 1.45,
    beta: 1.05,
  },
  XOM: {
    ticker: "XOM",
    name: "Exxon Mobil Corp.",
    sector: "Energy",
    currentPrice: 116.8,
    marketCap: 465,
    pe: 13.8,
    forwardPe: 12.2,
    peg: 1.42,
    pb: 2.1,
    evEbitda: 6.8,
    dividendYield: 0.0325,
    roe: 0.18,
    fcfYield: 0.078,
    debtToEquity: 0.19,
    beta: 0.78,
  },
  LLY: {
    ticker: "LLY",
    name: "Eli Lilly and Company",
    sector: "Healthcare",
    currentPrice: 945.2,
    marketCap: 898,
    pe: 65.2,
    forwardPe: 38.4,
    peg: 1.65,
    pb: 52.4,
    evEbitda: 42.1,
    dividendYield: 0.0055,
    roe: 0.58,
    fcfYield: 0.019,
    debtToEquity: 1.85,
    beta: 0.68,
  },
  COST: {
    ticker: "COST",
    name: "Costco Wholesale Corp.",
    sector: "Consumer Staples",
    currentPrice: 875.6,
    marketCap: 388,
    pe: 52.4,
    forwardPe: 46.2,
    peg: 4.1,
    pb: 15.2,
    evEbitda: 26.4,
    dividendYield: 0.0052,
    roe: 0.28,
    fcfYield: 0.025,
    debtToEquity: 0.32,
    beta: 0.74,
  },
  AMD: {
    ticker: "AMD",
    name: "Advanced Micro Devices",
    sector: "Semiconductors",
    currentPrice: 152.4,
    marketCap: 246,
    pe: 48.6,
    forwardPe: 28.5,
    peg: 1.38,
    pb: 4.4,
    evEbitda: 32.1,
    dividendYield: 0.0,
    roe: 0.08,
    fcfYield: 0.022,
    debtToEquity: 0.05,
    beta: 1.72,
  },
  ASML: {
    ticker: "ASML",
    name: "ASML Holding N.V.",
    sector: "Semiconductors",
    currentPrice: 812.5,
    marketCap: 325,
    pe: 41.2,
    forwardPe: 27.8,
    peg: 1.45,
    pb: 18.5,
    evEbitda: 28.6,
    dividendYield: 0.0085,
    roe: 0.46,
    fcfYield: 0.034,
    debtToEquity: 0.35,
    beta: 1.45,
  },
  GLD: {
    ticker: "GLD",
    name: "SPDR Gold Shares ETF",
    sector: "Commodities",
    currentPrice: 232.1,
    marketCap: 72,
    pe: 0,
    forwardPe: 0,
    peg: 0,
    pb: 1.0,
    evEbitda: 0,
    dividendYield: 0.0,
    roe: 0.0,
    fcfYield: 0.0,
    debtToEquity: 0.0,
    beta: 0.12,
  },
  TLT: {
    ticker: "TLT",
    name: "iShares 20+ Year Treasury Bond ETF",
    sector: "Fixed Income",
    currentPrice: 94.8,
    marketCap: 58,
    pe: 0,
    forwardPe: 0,
    peg: 0,
    pb: 1.0,
    evEbitda: 0,
    dividendYield: 0.0385,
    roe: 0.0,
    fcfYield: 0.0,
    debtToEquity: 0.0,
    beta: -0.18,
  },
  NEE: {
    ticker: "NEE",
    name: "NextEra Energy Inc.",
    sector: "Utilities",
    currentPrice: 81.2,
    marketCap: 167,
    pe: 24.5,
    forwardPe: 21.8,
    peg: 2.45,
    pb: 3.2,
    evEbitda: 14.8,
    dividendYield: 0.0255,
    roe: 0.13,
    fcfYield: 0.038,
    debtToEquity: 1.55,
    beta: 0.58,
  },
  MS: {
    ticker: "MS",
    name: "Morgan Stanley",
    sector: "Financials",
    currentPrice: 104.5,
    marketCap: 170,
    pe: 15.2,
    forwardPe: 13.6,
    peg: 1.55,
    pb: 1.68,
    evEbitda: 11.2,
    dividendYield: 0.0325,
    roe: 0.12,
    fcfYield: 0.041,
    debtToEquity: 2.1,
    beta: 1.22,
  },
};

// Seeded pseudorandom number generator for strictly reproducible time series
function makePrng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function sampleNormal(rand: () => number, mean = 0, std = 1): number {
  const u1 = Math.max(1e-7, rand());
  const u2 = rand();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

// Generate realistic multi-year institutional time series
export function generateHistoricalObservations(
  tickers: string[],
  nPeriods = 104, // 2 years of weekly or ~252 daily
  intervalOrPpy: "1d" | "1wk" | "1mo" | number = "1wk",
  seed = 42
): ReturnObservation[] {
  const rand = makePrng(seed);
  const observations: ReturnObservation[] = [];

  let periodsPerYear = 52;
  let interval: "1d" | "1wk" | "1mo" = "1wk";
  if (typeof intervalOrPpy === "number") {
    periodsPerYear = intervalOrPpy;
    interval = periodsPerYear >= 250 ? "1d" : periodsPerYear >= 50 ? "1wk" : "1mo";
  } else {
    interval = intervalOrPpy;
    periodsPerYear = interval === "1d" ? 252 : interval === "1wk" ? 52 : 12;
  }
  const dt = 1 / periodsPerYear;

  // Base prices initialization
  const pricesState: Record<string, number> = {};
  tickers.forEach((t) => {
    pricesState[t] = INITIAL_FUNDAMENTALS[t]?.currentPrice || 100.0;
  });

  const now = new Date();
  const dates: string[] = [];
  for (let i = nPeriods - 1; i >= 0; i--) {
    const d = new Date(now);
    if (interval === "1d") {
      d.setDate(d.getDate() - i);
    } else if (interval === "1wk") {
      d.setDate(d.getDate() - i * 7);
    } else {
      d.setMonth(d.getMonth() - i);
    }
    dates.push(d.toISOString().split("T")[0]);
  }

  let vixLevel = 16.5;
  let currentMarketPrice = 520.0;

  for (let i = 0; i < nPeriods; i++) {
    // Macro factor shocks
    const mktShock = sampleNormal(rand, 0, 1);
    const mktVol = (vixLevel / 100) * Math.sqrt(dt);
    const marketReturn = 0.09 * dt + mktVol * mktShock;
    currentMarketPrice *= 1 + marketReturn;

    // VIX mean-reverting OU process
    const vixShock = sampleNormal(rand, 0, 1);
    vixLevel = Math.max(10.5, vixLevel + 1.8 * (17.0 - vixLevel) * dt - 12.0 * marketReturn + 2.5 * Math.sqrt(dt) * vixShock);

    // Fama-French Factors (SMB, HML, MOM)
    const smb = sampleNormal(rand, 0.015 * dt, 0.08 * Math.sqrt(dt));
    const hml = sampleNormal(rand, -0.01 * dt, 0.09 * Math.sqrt(dt));
    const mom = sampleNormal(rand, 0.03 * dt, 0.12 * Math.sqrt(dt));
    const rfRate = 0.0425; // 4.25% 10-Yr Treasury

    const returnsMap: Record<string, number> = {};
    const newPricesMap: Record<string, number> = {};

    tickers.forEach((ticker) => {
      const fund = INITIAL_FUNDAMENTALS[ticker] || { beta: 1.0, ticker, name: ticker, sector: "Technology" };
      const beta = fund.beta || 1.0;
      const idioVol = 0.22 * Math.sqrt(dt);
      const idioShock = sampleNormal(rand, 0, idioVol);

      // Sector-specific factor loadings
      let factorLoading = 0;
      if (fund.sector === "Technology" || fund.sector === "Semiconductors") {
        factorLoading = 0.35 * smb - 0.25 * hml + 0.22 * mom;
      } else if (fund.sector === "Energy") {
        factorLoading = -0.15 * smb + 0.45 * hml - 0.1 * mom;
      } else if (fund.sector === "Financials") {
        factorLoading = -0.1 * smb + 0.35 * hml + 0.05 * mom;
      } else if (fund.sector === "Healthcare" || fund.sector === "Consumer Staples" || fund.sector === "Utilities") {
        factorLoading = -0.2 * smb + 0.15 * hml - 0.05 * mom;
      } else if (fund.sector === "Commodities") {
        factorLoading = 0.05 * hml - 0.05 * marketReturn + (vixShock > 0 ? 0.005 : 0);
      } else if (fund.sector === "Fixed Income") {
        factorLoading = -0.3 * marketReturn + 0.002 * (1 / periodsPerYear);
      }

      // Factor model return equation
      const ret = beta * marketReturn + factorLoading + idioShock;

      returnsMap[ticker] = ret;
      pricesState[ticker] = Math.max(1.0, pricesState[ticker] * (1 + ret));
      newPricesMap[ticker] = parseFloat(pricesState[ticker].toFixed(2));
    });

    observations.push({
      date: dates[i],
      prices: { ...newPricesMap },
      returns: { ...returnsMap },
      marketReturn,
      vix: parseFloat(vixLevel.toFixed(2)),
      rfRate,
      smb,
      hml,
      mom,
    });
  }

  return observations;
}
