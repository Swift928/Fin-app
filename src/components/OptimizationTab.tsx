import React, { useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Line,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts";
import {
  SlidersHorizontal,
  TrendingUp,
  Activity,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { AssetFundamental, BlackLittermanView, FrontierPoint } from "../types";
import {
  optimizeTangency,
  optimizeMinVariance,
  optimizeEqualWeight,
  optimizeRiskParity,
  computeBlackLitterman,
  generateEfficientFrontier,
} from "../engines/optimization";
import { dotProduct, matVecMul } from "../engines/math";

interface OptimizationTabProps {
  tickers: string[];
  fundamentals: Record<string, AssetFundamental>;
  covMatrix: number[][];
  expectedReturns: number[];
  rfRate: number;
  activeModel: "tangency" | "minVariance" | "equalWeight" | "riskParity" | "blackLitterman";
  onChangeActiveModel: (model: "tangency" | "minVariance" | "equalWeight" | "riskParity" | "blackLitterman") => void;
  onAskAI: (prompt: string, section: string) => Promise<string>;
}

export const OptimizationTab: React.FC<OptimizationTabProps> = ({
  tickers,
  fundamentals,
  covMatrix,
  expectedReturns,
  rfRate,
  activeModel,
  onChangeActiveModel,
  onAskAI,
}) => {
  // Black Litterman views state
  const [blViews, setBlViews] = useState<BlackLittermanView[]>([
    {
      id: "v1",
      type: "absolute",
      asset1: tickers.includes("NVDA") ? "NVDA" : tickers[0],
      expectedOutperformance: 0.12, // +12%
      confidence: 0.75,
    },
    {
      id: "v2",
      type: "relative",
      asset1: tickers.includes("MSFT") ? "MSFT" : tickers[0],
      asset2: tickers.includes("AAPL") ? "AAPL" : tickers[1] || tickers[0],
      expectedOutperformance: 0.04, // +4% outperformance
      confidence: 0.65,
    },
  ]);

  const [newViewType, setNewViewType] = useState<"absolute" | "relative">("absolute");
  const [newAsset1, setNewAsset1] = useState<string>(tickers[0]);
  const [newAsset2, setNewAsset2] = useState<string>(tickers[1] || tickers[0]);
  const [newExpectedOutperf, setNewExpectedOutperf] = useState<number>(0.05);
  const [newConfidence, setNewConfidence] = useState<number>(0.6);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Market cap weights
  const totalMktCap = tickers.reduce(
    (sum, t) => sum + (fundamentals[t]?.marketCap || 50),
    0
  );
  const mktCapWeights = tickers.map(
    (t) => (fundamentals[t]?.marketCap || 50) / totalMktCap
  );

  // Compute all model weights
  const tangencyW = optimizeTangency(expectedReturns, covMatrix, rfRate, true);
  const minVarW = optimizeMinVariance(covMatrix);
  const equalW = optimizeEqualWeight(tickers.length);
  const riskParityW = optimizeRiskParity(covMatrix);

  const blResult = computeBlackLitterman(
    tickers,
    mktCapWeights,
    covMatrix,
    blViews,
    2.5,
    0.05,
    rfRate
  );

  // Efficient Frontier
  const frontierPoints = generateEfficientFrontier(
    expectedReturns,
    covMatrix,
    tickers,
    rfRate,
    25
  );

  // Individual assets for scatter
  const assetScatter = tickers.map((t, idx) => {
    const vol = Math.sqrt(covMatrix[idx][idx] || 0.04);
    const ret = expectedReturns[idx] || 0.1;
    return {
      name: t,
      volatility: parseFloat((vol * 100).toFixed(2)),
      expectedReturn: parseFloat((ret * 100).toFixed(2)),
      sharpe: parseFloat(((ret - rfRate) / vol).toFixed(2)),
    };
  });

  // Comparison Bar Chart Data
  const weightComparisonData = tickers.map((t, idx) => ({
    ticker: t,
    tangency: parseFloat((tangencyW[idx] * 100).toFixed(1)),
    minVariance: parseFloat((minVarW[idx] * 100).toFixed(1)),
    equalWeight: parseFloat((equalW[idx] * 100).toFixed(1)),
    riskParity: parseFloat((riskParityW[idx] * 100).toFixed(1)),
    blackLitterman: parseFloat((blResult.posteriorWeights[idx] * 100).toFixed(1)),
  }));

  // Capital Allocation Line (CAL)
  const tanVol = Math.sqrt(dotProduct(tangencyW, matVecMul(covMatrix, tangencyW)));
  const tanRet = dotProduct(tangencyW, expectedReturns);
  const calPoints = [
    { volatility: 0, expectedReturn: parseFloat((rfRate * 100).toFixed(2)) },
    {
      volatility: parseFloat((tanVol * 100).toFixed(2)),
      expectedReturn: parseFloat((tanRet * 100).toFixed(2)),
    },
    {
      volatility: parseFloat((tanVol * 150).toFixed(2)),
      expectedReturn: parseFloat(
        ((rfRate + 1.5 * (tanRet - rfRate)) * 100).toFixed(2)
      ),
    },
  ];

  const handleAddView = () => {
    const newView: BlackLittermanView = {
      id: `v_${Date.now()}`,
      type: newViewType,
      asset1: newAsset1,
      asset2: newViewType === "relative" ? newAsset2 : undefined,
      expectedOutperformance: newExpectedOutperf,
      confidence: newConfidence,
    };
    setBlViews([...blViews, newView]);
  };

  const handleRemoveView = (id: string) => {
    setBlViews(blViews.filter((v) => v.id !== id));
  };

  const handleGenerateAiOptimization = async () => {
    setLoadingAi(true);
    try {
      const prompt = `Interpret the portfolio optimization results comparing Tangency (Max Sharpe), Min Variance, Risk Parity, and Black-Litterman:
Active Model: ${activeModel}
Number of Assets: ${tickers.length}
Tangency Expected Return: ${(tanRet * 100).toFixed(2)}%, Volatility: ${(tanVol * 100).toFixed(2)}%, Sharpe: ${((tanRet - rfRate) / tanVol).toFixed(2)}
Black-Litterman Active Views: ${blViews.length} views configured.
Posterior Returns vs Equilibrium: ${JSON.stringify(blResult.posteriorReturns.map((r) => `${(r * 100).toFixed(1)}%`))}

Explain in 3 concise sentences:
1. How Black-Litterman shunts Markowitz corner solutions into stable, well-diversified posterior weights.
2. The trade-off between Minimum Variance defensiveness and Max Sharpe factor harvesting.
3. Recommended allocation framework for institutional implementation.`;

      const res = await onAskAI(prompt, "optimization");
      setAiInsight(res);
    } catch (e) {
      setAiInsight("Unable to generate optimization analysis.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Model Selector Top Bar */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#f0f6fc] flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#58a6ff]" />
            Modern Portfolio Theory & Black-Litterman Allocation Engine
          </h2>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Compare mean-variance frontiers, risk parity budgets, and Bayesian Black-Litterman posterior views.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-[#0d1117] p-1.5 rounded-lg border border-[#21262d]">
          {(
            [
              { id: "tangency", label: "Max Sharpe (Tangency)" },
              { id: "minVariance", label: "Min Variance" },
              { id: "riskParity", label: "Risk Parity (ERC)" },
              { id: "blackLitterman", label: "Black-Litterman" },
              { id: "equalWeight", label: "1/N Equal" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => onChangeActiveModel(m.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeModel === m.id
                  ? "bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/40 shadow-sm"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Row: Efficient Frontier & Weight Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Efficient Frontier Plot */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#3fb950]" />
                Markowitz Efficient Frontier & Capital Allocation Line
              </h3>
              <p className="text-xs text-[#8b949e]">
                Risk (σ) vs Expected Return (μ) · Optimal Tangency Sharpe:{" "}
                <span className="font-mono text-[#3fb950]">
                  {((tanRet - rfRate) / tanVol).toFixed(2)}
                </span>
              </p>
            </div>
            <div className="text-xs font-mono text-[#8b949e] flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#58a6ff]"></span> Frontier
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#d29922]"></span> Assets
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <XAxis
                  type="number"
                  dataKey="volatility"
                  name="Volatility (σ)"
                  unit="%"
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="expectedReturn"
                  name="Expected Return (μ)"
                  unit="%"
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    backgroundColor: "#161b22",
                    borderColor: "#30363d",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f0f6fc",
                  }}
                />
                {/* Efficient Frontier Curve */}
                <Scatter
                  name="Efficient Frontier"
                  data={frontierPoints.map((p) => ({
                    volatility: parseFloat((p.volatility * 100).toFixed(2)),
                    expectedReturn: parseFloat((p.expectedReturn * 100).toFixed(2)),
                    sharpe: parseFloat(p.sharpe.toFixed(2)),
                  }))}
                  fill="#58a6ff"
                  line={{ stroke: "#58a6ff", strokeWidth: 2 }}
                  shape="circle"
                />
                {/* Individual Assets */}
                <Scatter
                  name="Assets"
                  data={assetScatter}
                  fill="#d29922"
                  shape="diamond"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weights Comparison Across Methods */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#a371f7]" />
                Optimal Weight Comparison by Methodology
              </h3>
              <p className="text-xs text-[#8b949e]">
                Compare allocation weights across classical Markowitz, Risk Parity, and BL
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weightComparisonData}>
                <XAxis
                  dataKey="ticker"
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                />
                <YAxis
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
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
                <Legend wrapperStyle={{ fontSize: "11px", color: "#8b949e" }} />
                <Bar dataKey="tangency" name="Max Sharpe" fill="#58a6ff" />
                <Bar dataKey="minVariance" name="Min Variance" fill="#3fb950" />
                <Bar dataKey="riskParity" name="Risk Parity" fill="#d29922" />
                <Bar dataKey="blackLitterman" name="Black-Litterman" fill="#a371f7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Black-Litterman Interactive Views Manager */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#a371f7]" />
              Black-Litterman Subjective Views & Confidence Calibration
            </h3>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Incorporate analyst forward views into market equilibrium to produce stable Bayesian posterior returns.
            </p>
          </div>
          <span className="text-xs font-mono text-[#a371f7] bg-[#a371f7]/10 px-2.5 py-1 rounded-full border border-[#a371f7]/30">
            {blViews.length} Active Views
          </span>
        </div>

        {/* Existing Views List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {blViews.map((view) => (
            <div
              key={view.id}
              className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3.5 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono bg-[#21262d] text-[#8b949e]">
                    {view.type}
                  </span>
                  <span className="text-xs font-bold text-[#f0f6fc]">
                    {view.type === "absolute"
                      ? `${view.asset1} outperformance`
                      : `${view.asset1} vs ${view.asset2}`}
                  </span>
                </div>
                <div className="text-xs font-mono text-[#3fb950] font-bold mt-1">
                  Expected Delta: +{(view.expectedOutperformance * 100).toFixed(1)}% ·{" "}
                  <span className="text-[#58a6ff]">
                    Confidence: {(view.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleRemoveView(view.id)}
                className="p-1.5 text-[#8b949e] hover:text-[#f85149] rounded hover:bg-[#21262d] transition-colors"
                title="Remove view"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add New View Form */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
          <div className="text-xs font-bold text-[#f0f6fc] mb-3">Add Analyst View</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-[10px] text-[#8b949e] font-semibold block mb-1">
                View Type
              </label>
              <select
                value={newViewType}
                onChange={(e: any) => setNewViewType(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#f0f6fc]"
              >
                <option value="absolute">Absolute View</option>
                <option value="relative">Relative View</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#8b949e] font-semibold block mb-1">
                Primary Asset
              </label>
              <select
                value={newAsset1}
                onChange={(e) => setNewAsset1(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#f0f6fc]"
              >
                {tickers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {newViewType === "relative" && (
              <div>
                <label className="text-[10px] text-[#8b949e] font-semibold block mb-1">
                  Benchmarked Asset
                </label>
                <select
                  value={newAsset2}
                  onChange={(e) => setNewAsset2(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#f0f6fc]"
                >
                  {tickers.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex justify-between text-[10px] text-[#8b949e] font-semibold mb-1">
                <span>Expected Delta</span>
                <span className="text-[#3fb950]">
                  +{(newExpectedOutperf * 100).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="-0.15"
                max="0.30"
                step="0.01"
                value={newExpectedOutperf}
                onChange={(e) => setNewExpectedOutperf(parseFloat(e.target.value))}
                className="w-full accent-[#3fb950]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-[#8b949e] font-semibold mb-1">
                <span>Confidence</span>
                <span className="text-[#58a6ff]">
                  {(newConfidence * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={newConfidence}
                onChange={(e) => setNewConfidence(parseFloat(e.target.value))}
                className="w-full accent-[#58a6ff]"
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleAddView}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Apply View to Posterior
            </button>
          </div>
        </div>
      </div>

      {/* On-Demand AI Allocation Commentary */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#58a6ff]" />
            <h3 className="text-sm font-bold text-[#f0f6fc]">AI Asset Allocation & Black-Litterman Commentary</h3>
          </div>
          <button
            onClick={handleGenerateAiOptimization}
            disabled={loadingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loadingAi ? "Analyzing..." : "Generate Optimization Analysis"}
          </button>
        </div>

        {aiInsight ? (
          <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d] text-xs text-[#c9d1d9] leading-relaxed">
            {aiInsight}
          </div>
        ) : (
          <div className="text-xs text-[#8b949e] italic">
            Click "Generate Optimization Analysis" for an institutional assessment of optimal weights, risk parity budgets, and Black-Litterman view shrinkage.
          </div>
        )}
      </div>
    </div>
  );
};
