import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Activity,
  ShieldCheck,
  PieChart as PieIcon,
  Sparkles,
  BarChart3,
  Award,
  Info,
} from "lucide-react";
import { AssetFundamental, PortfolioSummaryMetrics, ReturnObservation } from "../types";

interface PositionsTabProps {
  tickers: string[];
  weights: Record<string, number>;
  fundamentals: Record<string, AssetFundamental>;
  observations: ReturnObservation[];
  metrics: PortfolioSummaryMetrics;
  onAskAI: (prompt: string, section: string) => Promise<string>;
}

const SECTOR_COLORS = [
  "#58a6ff",
  "#3fb950",
  "#d29922",
  "#f85149",
  "#a371f7",
  "#2da44e",
  "#e3b341",
  "#f0883e",
  "#79c0ff",
  "#56d364",
];

export const PositionsTab: React.FC<PositionsTabProps> = ({
  tickers,
  weights,
  fundamentals,
  observations,
  metrics,
  onAskAI,
}) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Compute cumulative returns time series
  let portVal = 100;
  let bmkVal = 100;
  const growthData = observations.map((obs) => {
    let portRet = 0;
    tickers.forEach((t) => {
      portRet += (weights[t] || 0) * (obs.returns[t] || 0);
    });
    portVal *= 1 + portRet;
    bmkVal *= 1 + obs.marketReturn;
    return {
      date: obs.date,
      portfolio: parseFloat(portVal.toFixed(2)),
      benchmark: parseFloat(bmkVal.toFixed(2)),
    };
  });

  // Sector breakdown
  const sectorMap: Record<string, number> = {};
  tickers.forEach((t) => {
    const sec = fundamentals[t]?.sector || "Other";
    sectorMap[sec] = (sectorMap[sec] || 0) + (weights[t] || 0);
  });

  const sectorData = Object.entries(sectorMap).map(([name, weight]) => ({
    name,
    value: parseFloat((weight * 100).toFixed(2)),
  }));

  const handleGenerateAiSummary = async () => {
    setLoadingAi(true);
    try {
      const prompt = `Provide an institutional commentary on the current portfolio positions and asset allocation.
Asset Weights: ${JSON.stringify(weights)}
Sector Allocation: ${JSON.stringify(sectorMap)}
Annualized Return: ${(metrics.annualizedReturn * 100).toFixed(2)}%, Volatility: ${(metrics.annualizedVol * 100).toFixed(2)}%, Sharpe: ${metrics.sharpeRatio.toFixed(2)}.
Address style tilts (e.g. tech/growth vs defensive), concentration risks, and strategic rebalancing suggestions in 3 concise sentences.`;
      const res = await onAskAI(prompt, "positions");
      setAiInsight(res);
    } catch (e) {
      setAiInsight("Unable to generate AI insight at this time.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Annualized CAGR
          </div>
          <div className="text-xl font-bold font-mono text-[#3fb950] mt-1">
            {(metrics.annualizedReturn * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Realized growth rate</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Annual Volatility
          </div>
          <div className="text-xl font-bold font-mono text-[#58a6ff] mt-1">
            {(metrics.annualizedVol * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Standard deviation (σ)</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Sharpe Ratio
          </div>
          <div className="text-xl font-bold font-mono text-[#f0f6fc] mt-1">
            {metrics.sharpeRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Excess return / Vol</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Sortino Ratio
          </div>
          <div className="text-xl font-bold font-mono text-[#a371f7] mt-1">
            {metrics.sortinoRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Downside deviation adj.</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Max Drawdown
          </div>
          <div className="text-xl font-bold font-mono text-[#f85149] mt-1">
            {(metrics.maxDrawdown * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Peak-to-trough drop</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Diversification Ratio
          </div>
          <div className="text-xl font-bold font-mono text-[#d29922] mt-1">
            {metrics.diversificationRatio.toFixed(2)}x
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Weighted vol / Port vol</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative Performance Chart */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#58a6ff]" />
                Cumulative Wealth Trajectory (Base = $100)
              </h3>
              <p className="text-xs text-[#8b949e] mt-0.5">
                Tangency Optimized Portfolio vs S&P 500 Market Benchmark
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#58a6ff]">
                <span className="h-2 w-2 rounded-full bg-[#58a6ff]"></span> Portfolio
              </span>
              <span className="flex items-center gap-1.5 text-[#8b949e]">
                <span className="h-2 w-2 rounded-full bg-[#8b949e]"></span> S&P 500
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="bmkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b949e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b949e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                  domain={["dataMin - 5", "dataMax + 5"]}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#161b22",
                    borderColor: "#30363d",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f0f6fc",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="portfolio"
                  name="Portfolio"
                  stroke="#58a6ff"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#portGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  name="S&P 500"
                  stroke="#8b949e"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  fillOpacity={1}
                  fill="url(#bmkGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Allocation Breakdown */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 flex flex-col">
          <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2 mb-1">
            <PieIcon className="h-4 w-4 text-[#3fb950]" />
            Sector Concentration
          </h3>
          <p className="text-xs text-[#8b949e] mb-4">
            Aggregated exposure across industry sectors
          </p>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sectorData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Weight"]}
                  contentStyle={{
                    backgroundColor: "#161b22",
                    borderColor: "#30363d",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f0f6fc",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5 mt-auto pt-2 border-t border-[#21262d]">
            {sectorData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#8b949e] truncate">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                  ></span>
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-mono font-medium text-[#f0f6fc] ml-1">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings & Weights Table */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#f0f6fc]">Portfolio Holdings & Risk Profile</h3>
            <p className="text-xs text-[#8b949e]">
              Individual asset allocations, beta sensitivities, multiples, and dividend yields
            </p>
          </div>
          <span className="text-xs font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-2.5 py-1 rounded-full border border-[#58a6ff]/20">
            {tickers.length} Assets Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0d1117] text-[#8b949e] font-semibold uppercase tracking-wider border-b border-[#21262d]">
              <tr>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Optimal Weight</th>
                <th className="px-4 py-3 text-right">Beta</th>
                <th className="px-4 py-3 text-right">P/E Ratio</th>
                <th className="px-4 py-3 text-right">Div Yield</th>
                <th className="px-4 py-3 text-right">ROE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] text-[#c9d1d9] font-mono">
              {tickers.map((t) => {
                const fund = fundamentals[t] || {
                  ticker: t,
                  name: t,
                  sector: "Technology",
                  currentPrice: 100,
                  marketCap: 50,
                  pe: 20,
                  forwardPe: 18,
                  peg: 1.5,
                  pb: 3.0,
                  evEbitda: 14.0,
                  dividendYield: 0.01,
                  roe: 0.2,
                  fcfYield: 0.03,
                  debtToEquity: 0.5,
                  beta: 1.0,
                };
                const w = weights[t] || 0;
                return (
                  <tr key={t} className="hover:bg-[#0d1117]/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-[#58a6ff]">{t}</td>
                    <td className="px-4 py-3 font-sans text-[#f0f6fc]">{fund.name}</td>
                    <td className="px-4 py-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-[#21262d] text-[11px] text-[#8b949e]">
                        {fund.sector}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#f0f6fc]">
                      ${fund.currentPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#3fb950]">
                      {(w * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          fund.beta > 1.3
                            ? "text-[#f85149]"
                            : fund.beta < 0.9
                            ? "text-[#3fb950]"
                            : "text-[#c9d1d9]"
                        }
                      >
                        {fund.beta.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{fund.pe ? fund.pe.toFixed(1) : "N/A"}</td>
                    <td className="px-4 py-3 text-right">
                      {(fund.dividendYield * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-[#f0f6fc]">
                      {(fund.roe * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* On-Demand AI Summary Box */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#58a6ff]" />
            <h3 className="text-sm font-bold text-[#f0f6fc]">AI Portfolio Overview & Sizing Commentary</h3>
          </div>
          <button
            onClick={handleGenerateAiSummary}
            disabled={loadingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loadingAi ? "Analyzing..." : "Generate AI Commentary"}
          </button>
        </div>

        {aiInsight ? (
          <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d] text-xs text-[#c9d1d9] leading-relaxed">
            {aiInsight}
          </div>
        ) : (
          <div className="text-xs text-[#8b949e] italic">
            Click "Generate AI Commentary" to get a concise institutional executive assessment of this portfolio's asset mix and risk concentration.
          </div>
        )}
      </div>
    </div>
  );
};
