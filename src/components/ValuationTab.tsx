import React, { useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Award,
  Sparkles,
  PieChart as PieIcon,
  Calculator,
} from "lucide-react";
import { AssetFundamental } from "../types";

interface ValuationTabProps {
  tickers: string[];
  fundamentals: Record<string, AssetFundamental>;
  weights: Record<string, number>;
  rfRate: number;
  onAskAI: (prompt: string, section: string) => Promise<string>;
}

export const ValuationTab: React.FC<ValuationTabProps> = ({
  tickers,
  fundamentals,
  weights,
  rfRate,
  onAskAI,
}) => {
  const [selectedStockForDcf, setSelectedStockForDcf] = useState<string>(tickers[0]);
  const [discountRate, setDiscountRate] = useState<number>(0.09); // 9% WACC
  const [terminalGrowth, setTerminalGrowth] = useState<number>(0.03); // 3% Perpetual growth

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Portfolio weighted fundamental metrics
  let weightedPe = 0;
  let weightedPeg = 0;
  let weightedEvEbitda = 0;
  let weightedRoe = 0;
  let weightedFcfYield = 0;
  let weightedDivYield = 0;

  tickers.forEach((t) => {
    const f = fundamentals[t];
    const w = weights[t] || 0;
    if (f) {
      weightedPe += w * (f.pe || 25);
      weightedPeg += w * (f.peg || 1.5);
      weightedEvEbitda += w * (f.evEbitda || 15);
      weightedRoe += w * (f.roe || 0.2);
      weightedFcfYield += w * (f.fcfYield || 0.03);
      weightedDivYield += w * (f.dividendYield || 0.01);
    }
  });

  // Scatter data: Valuation (P/E) vs Quality (ROE)
  const valuationScatter = tickers.map((t) => {
    const f = fundamentals[t] || { pe: 20, roe: 0.2, currentPrice: 100, marketCap: 50 };
    return {
      ticker: t,
      pe: parseFloat(f.pe.toFixed(1)),
      roe: parseFloat((f.roe * 100).toFixed(1)),
      fcfYield: parseFloat((f.fcfYield * 100).toFixed(2)),
      weight: parseFloat(((weights[t] || 0) * 100).toFixed(1)),
    };
  });

  // DCF Intrinsic Value computation (Gordon Growth / Multi-Stage FCF)
  const dcfAsset = fundamentals[selectedStockForDcf] || fundamentals[tickers[0]];
  const eps = dcfAsset ? dcfAsset.currentPrice / (dcfAsset.pe || 25) : 5.0;
  const fcfPerShare = eps * (dcfAsset.fcfYield / (1 / (dcfAsset.pe || 25) || 0.04));
  const intrinsicVal =
    discountRate > terminalGrowth
      ? (fcfPerShare * (1 + terminalGrowth)) / (discountRate - terminalGrowth)
      : dcfAsset.currentPrice * 1.2;

  const valuationGapPct =
    ((intrinsicVal - dcfAsset.currentPrice) / dcfAsset.currentPrice) * 100;

  const handleGenerateAiValuation = async () => {
    setLoadingAi(true);
    try {
      const metricsSummary = tickers
        .map((t) => {
          const f = fundamentals[t];
          return `${t}: P/E=${f?.pe}, PEG=${f?.peg}, ROE=${((f?.roe || 0) * 100).toFixed(1)}%, FCF Yield=${((f?.fcfYield || 0) * 100).toFixed(1)}%`;
        })
        .join("; ");

      const prompt = `Interpret the portfolio fundamental valuation profile:
Weighted P/E: ${weightedPe.toFixed(1)}x, Weighted PEG: ${weightedPeg.toFixed(2)}, Weighted ROE: ${(weightedRoe * 100).toFixed(1)}%, Weighted FCF Yield: ${(weightedFcfYield * 100).toFixed(2)}%
Constituent Metrics: ${metricsSummary}

Explain in 3 concise sentences:
1. What the valuation multiples indicate about growth vs value styles and multiple compression vulnerability.
2. The portfolio's earnings quality and cash-flow generation capability based on ROE and FCF yield.
3. Strategic valuation adjustment recommendation.`;

      const res = await onAskAI(prompt, "valuation");
      setAiInsight(res);
    } catch (e) {
      setAiInsight("Unable to generate valuation analysis.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Valuation Header */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#f0f6fc] flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#3fb950]" />
            Fundamental Valuation & Quality Multiple Aggregation
          </h2>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Institutional fundamental multiples, Return on Equity (ROE), Free Cash Flow (FCF) yields, and DCF intrinsic pricing.
          </p>
        </div>
      </div>

      {/* Portfolio Weighted Multiples */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Weighted P/E
          </div>
          <div className="text-xl font-bold font-mono text-[#58a6ff] mt-1">
            {weightedPe.toFixed(1)}x
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Price to Earnings</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Weighted PEG
          </div>
          <div className="text-xl font-bold font-mono text-[#3fb950] mt-1">
            {weightedPeg.toFixed(2)}x
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">P/E to Growth ratio</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            EV / EBITDA
          </div>
          <div className="text-xl font-bold font-mono text-[#f0f6fc] mt-1">
            {weightedEvEbitda.toFixed(1)}x
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Enterprise Multiple</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Weighted ROE
          </div>
          <div className="text-xl font-bold font-mono text-[#a371f7] mt-1">
            {(weightedRoe * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Return on Equity</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            FCF Yield
          </div>
          <div className="text-xl font-bold font-mono text-[#3fb950] mt-1">
            {(weightedFcfYield * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Free Cash Flow Yield</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Dividend Yield
          </div>
          <div className="text-xl font-bold font-mono text-[#d29922] mt-1">
            {(weightedDivYield * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Cash payout yield</div>
        </div>
      </div>

      {/* Main Row: Valuation Scatter (P/E vs ROE) & DCF Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scatter: Quality (ROE) vs Multiple (P/E) */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                <Award className="h-4 w-4 text-[#58a6ff]" />
                Quality vs Valuation Multiples (ROE vs P/E)
              </h3>
              <p className="text-xs text-[#8b949e]">
                Upper-left quadrant represents high-quality capital compounders at attractive multiples
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <XAxis
                  type="number"
                  dataKey="pe"
                  name="P/E Ratio"
                  unit="x"
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="roe"
                  name="ROE"
                  unit="%"
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(val: any, name: any) => [
                    name === "P/E Ratio" ? `${val}x` : `${val}%`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "#161b22",
                    borderColor: "#30363d",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f0f6fc",
                  }}
                />
                <Scatter name="Assets" data={valuationScatter} fill="#58a6ff" shape="circle" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intrinsic DCF & Gordon Valuation Model */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-[#3fb950]" />
                  Intrinsic DCF / Gordon Growth Model
                </h3>
                <p className="text-xs text-[#8b949e]">
                  Evaluate intrinsic discount / premium based on cost of capital and terminal growth
                </p>
              </div>

              <select
                value={selectedStockForDcf}
                onChange={(e) => setSelectedStockForDcf(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-[#58a6ff]"
              >
                {tickers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* DCF Inputs */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Discount Rate (WACC)</span>
                  <span className="font-mono text-[#58a6ff]">
                    {(discountRate * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.15"
                  step="0.005"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                  className="w-full accent-[#58a6ff]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Terminal Growth (g)</span>
                  <span className="font-mono text-[#3fb950]">
                    {(terminalGrowth * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.05"
                  step="0.005"
                  value={terminalGrowth}
                  onChange={(e) => setTerminalGrowth(parseFloat(e.target.value))}
                  className="w-full accent-[#3fb950]"
                />
              </div>
            </div>

            {/* DCF Output Cards */}
            <div className="grid grid-cols-3 gap-3 font-mono text-center">
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
                <div className="text-[10px] text-[#8b949e] uppercase">Current Price</div>
                <div className="text-base font-bold text-[#f0f6fc] mt-1">
                  ${dcfAsset?.currentPrice.toFixed(2)}
                </div>
              </div>

              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
                <div className="text-[10px] text-[#8b949e] uppercase">Intrinsic Fair Value</div>
                <div className="text-base font-bold text-[#3fb950] mt-1">
                  ${intrinsicVal.toFixed(2)}
                </div>
              </div>

              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
                <div className="text-[10px] text-[#8b949e] uppercase">Margin of Safety</div>
                <div
                  className={`text-base font-bold mt-1 ${
                    valuationGapPct >= 0 ? "text-[#3fb950]" : "text-[#f85149]"
                  }`}
                >
                  {valuationGapPct >= 0 ? "+" : ""}
                  {valuationGapPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] text-[11px] text-[#8b949e] mt-4">
            <span className="text-[#3fb950] font-semibold">DCF Assessment:</span>{" "}
            {valuationGapPct >= 10
              ? `${selectedStockForDcf} is trading at a discount relative to its cash flow compound potential.`
              : valuationGapPct <= -10
              ? `${selectedStockForDcf} multiple embeds aggressive terminal growth expectations.`
              : `${selectedStockForDcf} is priced near intrinsic fair value.`}
          </div>
        </div>
      </div>

      {/* On-Demand AI Valuation Commentary */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#58a6ff]" />
            <h3 className="text-sm font-bold text-[#f0f6fc]">AI Fundamental Valuation Assessment</h3>
          </div>
          <button
            onClick={handleGenerateAiValuation}
            disabled={loadingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loadingAi ? "Analyzing..." : "Generate Valuation Analysis"}
          </button>
        </div>

        {aiInsight ? (
          <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d] text-xs text-[#c9d1d9] leading-relaxed">
            {aiInsight}
          </div>
        ) : (
          <div className="text-xs text-[#8b949e] italic">
            Click "Generate Valuation Analysis" for an institutional fundamental breakdown of style tilts, cash flow quality, and multiple compression risks.
          </div>
        )}
      </div>
    </div>
  );
};
