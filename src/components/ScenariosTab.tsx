import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  Flame,
  Activity,
  Sliders,
  Sparkles,
  AlertTriangle,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { AssetFundamental, StressScenario } from "../types";
import { HISTORICAL_SCENARIOS, runStressScenario } from "../engines/scenarios";

interface ScenariosTabProps {
  tickers: string[];
  weights: Record<string, number>;
  fundamentals: Record<string, AssetFundamental>;
  onAskAI: (prompt: string, section: string) => Promise<string>;
}

export const ScenariosTab: React.FC<ScenariosTabProps> = ({
  tickers,
  weights,
  fundamentals,
  onAskAI,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("gfc_2008");
  const [portfolioBaseValue, setPortfolioBaseValue] = useState<number>(1000000); // $1M standard book

  // Custom shock sliders
  const [customMarketDrop, setCustomMarketDrop] = useState<number>(-0.2);
  const [customVixSurge, setCustomVixSurge] = useState<number>(25);
  const [customRateBps, setCustomRateBps] = useState<number>(150);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const scenarioResult = runStressScenario(
    selectedScenarioId,
    tickers,
    weights,
    fundamentals,
    portfolioBaseValue,
    selectedScenarioId === "custom"
      ? {
          marketDrop: customMarketDrop,
          vixSurge: customVixSurge,
          rateChangeBps: customRateBps,
        }
      : undefined
  );

  const barData = scenarioResult.assetImpacts
    .map((a) => ({
      ticker: a.ticker,
      dropPct: parseFloat((a.expectedDrop * 100).toFixed(2)),
      dollarLoss: Math.round(a.dollarLoss),
    }))
    .sort((a, b) => a.dollarLoss - b.dollarLoss);

  const handleGenerateAiScenario = async () => {
    setLoadingAi(true);
    try {
      const assetSummary = scenarioResult.assetImpacts
        .map((a) => `${a.ticker} (w=${(a.weight * 100).toFixed(1)}%, beta=${a.beta.toFixed(2)}): drop ${(a.expectedDrop * 100).toFixed(1)}%`)
        .join(", ");

      const prompt = `Interpret the following portfolio stress scenario analysis:
Scenario: ${scenarioResult.name} (${scenarioResult.period})
Market Shock: ${(scenarioResult.marketDrop * 100).toFixed(1)}%, VIX Surge: +${scenarioResult.vixSurge} pts, Rate Shift: ${scenarioResult.rateChangeBps} bps
Estimated Portfolio Loss: ${(scenarioResult.estimatedPnl * 100).toFixed(2)}% ($${Math.abs(Math.round(scenarioResult.dollarImpact)).toLocaleString()})
Asset Breakdown: ${assetSummary}

Address in 3 concise sentences:
1. What the overall portfolio drawdown implies for book solvency & capital preservation.
2. Which high-beta or sector-specific assets drive the largest component losses.
3. Concrete macro hedging actions (e.g. index put spreads, rate duration swaps, or defensive rebalancing).`;

      const res = await onAskAI(prompt, "scenarios");
      setAiInsight(res);
    } catch (e) {
      setAiInsight("Unable to generate scenario analysis.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Scenario Selection */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#f0f6fc] flex items-center gap-2">
            <Flame className="h-5 w-5 text-[#f85149]" />
            Macro Crisis Stress Testing & Shock Simulation
          </h2>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Simulate portfolio vulnerability under extreme historical market liquidity shocks and custom macro disruptions.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0d1117] p-1.5 rounded-lg border border-[#21262d]">
          <span className="text-xs text-[#8b949e] px-2 font-medium">Book Value:</span>
          <select
            value={portfolioBaseValue}
            onChange={(e) => setPortfolioBaseValue(parseFloat(e.target.value))}
            className="bg-transparent text-xs font-mono font-bold text-[#3fb950] focus:outline-none cursor-pointer"
          >
            <option value={100000} className="bg-[#161b22]">
              $100,000
            </option>
            <option value={1000000} className="bg-[#161b22]">
              $1,000,000 (Standard Book)
            </option>
            <option value={10000000} className="bg-[#161b22]">
              $10,000,000 (Institutional)
            </option>
          </select>
        </div>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {HISTORICAL_SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => setSelectedScenarioId(sc.id)}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
              selectedScenarioId === sc.id
                ? "bg-[#f85149]/15 border-[#f85149]/50 text-[#f0f6fc] shadow-sm"
                : "bg-[#161b22] border-[#21262d] text-[#c9d1d9] hover:border-[#30363d]"
            }`}
          >
            <div>
              <div className="text-xs font-bold truncate">{sc.name.split("(")[0]}</div>
              <div className="text-[10px] text-[#8b949e] mt-0.5">{sc.period}</div>
            </div>
            <div className="text-xs font-mono font-bold text-[#f85149] mt-2">
              {(sc.marketDrop * 100).toFixed(0)}% Mkt
            </div>
          </button>
        ))}

        {/* Custom Scenario Button */}
        <button
          onClick={() => setSelectedScenarioId("custom")}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
            selectedScenarioId === "custom"
              ? "bg-[#58a6ff]/15 border-[#58a6ff]/50 text-[#f0f6fc]"
              : "bg-[#161b22] border-[#21262d] text-[#c9d1d9] hover:border-[#30363d]"
          }`}
        >
          <div>
            <div className="text-xs font-bold">Custom Multi-Shock</div>
            <div className="text-[10px] text-[#8b949e] mt-0.5">User Configured</div>
          </div>
          <div className="text-xs font-mono font-bold text-[#58a6ff] mt-2 flex items-center gap-1">
            <Sliders className="h-3 w-3" /> Sliders
          </div>
        </button>
      </div>

      {/* Custom Controls (if Custom selected) */}
      {selectedScenarioId === "custom" && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Market Return Shock</span>
              <span className="font-mono text-[#f85149]">
                {(customMarketDrop * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="-0.6"
              max="0.0"
              step="0.02"
              value={customMarketDrop}
              onChange={(e) => setCustomMarketDrop(parseFloat(e.target.value))}
              className="w-full accent-[#f85149]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>VIX Volatility Surge</span>
              <span className="font-mono text-[#d29922]">+{customVixSurge} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={customVixSurge}
              onChange={(e) => setCustomVixSurge(parseInt(e.target.value))}
              className="w-full accent-[#d29922]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Yield Curve Shift</span>
              <span className="font-mono text-[#58a6ff]">
                {customRateBps > 0 ? `+${customRateBps}` : customRateBps} bps
              </span>
            </div>
            <input
              type="range"
              min="-300"
              max="400"
              step="25"
              value={customRateBps}
              onChange={(e) => setCustomRateBps(parseInt(e.target.value))}
              className="w-full accent-[#58a6ff]"
            />
          </div>
        </div>
      )}

      {/* Scenario Impact Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Simulated Portfolio Drawdown
          </div>
          <div className="text-3xl font-bold font-mono text-[#f85149] mt-2 flex items-center gap-2">
            <TrendingDown className="h-6 w-6" />
            {(scenarioResult.estimatedPnl * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-[#8b949e] mt-1.5">
            Scenario: {scenarioResult.name}
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Estimated Dollar P&L Impact
          </div>
          <div className="text-3xl font-bold font-mono text-[#f85149] mt-2 flex items-center gap-1">
            <DollarSign className="h-6 w-6" />-
            {Math.abs(Math.round(scenarioResult.dollarImpact)).toLocaleString()}
          </div>
          <div className="text-xs text-[#8b949e] mt-1.5">
            Based on ${portfolioBaseValue.toLocaleString()} book
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Macro Environment Shocks
          </div>
          <div className="text-xs font-mono text-[#c9d1d9] space-y-1.5 mt-2.5">
            <div className="flex justify-between">
              <span className="text-[#8b949e]">Market Index:</span>
              <span className="font-bold text-[#f85149]">
                {(scenarioResult.marketDrop * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">VIX Spike:</span>
              <span className="font-bold text-[#d29922]">
                +{scenarioResult.vixSurge} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b949e]">Rate Shift:</span>
              <span className="font-bold text-[#58a6ff]">
                {scenarioResult.rateChangeBps} bps
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Level Breakdown Chart & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Dollar Loss Waterfall */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <h3 className="text-sm font-bold text-[#f0f6fc] mb-1">
            Asset-Level P&L Attribution ($ Loss)
          </h3>
          <p className="text-xs text-[#8b949e] mb-4">
            Component dollar drawdowns adjusted for beta and sector interest-rate duration
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <XAxis
                  type="number"
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                  tickFormatter={(v) => `-$${Math.abs(v / 1000)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="ticker"
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                  width={60}
                />
                <Tooltip
                  formatter={(val: any) => [`-$${Math.abs(val).toLocaleString()}`, "P&L Loss"]}
                  contentStyle={{
                    backgroundColor: "#161b22",
                    borderColor: "#30363d",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f0f6fc",
                  }}
                />
                <ReferenceLine x={0} stroke="#30363d" />
                <Bar dataKey="dollarLoss" fill="#f85149" radius={[0, 4, 4, 0]}>
                  {barData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#f85149" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Position Loss Table */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#21262d]">
            <h3 className="text-sm font-bold text-[#f0f6fc]">Positions Stress Severity</h3>
            <p className="text-xs text-[#8b949e]">Individual asset percentage drawdowns</p>
          </div>

          <div className="overflow-y-auto max-h-64 flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0d1117] text-[#8b949e] font-semibold uppercase tracking-wider border-b border-[#21262d]">
                <tr>
                  <th className="px-3 py-2">Asset</th>
                  <th className="px-3 py-2 text-right">Beta</th>
                  <th className="px-3 py-2 text-right">Drop %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] text-[#c9d1d9] font-mono">
                {scenarioResult.assetImpacts.map((a) => (
                  <tr key={a.ticker} className="hover:bg-[#0d1117]/60">
                    <td className="px-3 py-2 font-bold text-[#58a6ff]">{a.ticker}</td>
                    <td className="px-3 py-2 text-right text-[#8b949e]">
                      {a.beta.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-[#f85149]">
                      {(a.expectedDrop * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* On-Demand AI Stress Testing Commentary */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#58a6ff]" />
            <h3 className="text-sm font-bold text-[#f0f6fc]">AI Stress Testing & Tail Hedging Strategy</h3>
          </div>
          <button
            onClick={handleGenerateAiScenario}
            disabled={loadingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loadingAi ? "Analyzing..." : "Generate Stress Commentary"}
          </button>
        </div>

        {aiInsight ? (
          <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d] text-xs text-[#c9d1d9] leading-relaxed">
            {aiInsight}
          </div>
        ) : (
          <div className="text-xs text-[#8b949e] italic">
            Click "Generate Stress Commentary" for an institutional assessment of potential systemic liquidity losses and tactical hedging overlays.
          </div>
        )}
      </div>
    </div>
  );
};
