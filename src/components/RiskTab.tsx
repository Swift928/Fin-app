import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Zap,
  CheckCircle,
  Sparkles,
  Info,
} from "lucide-react";
import { GarchMetrics, VaRSuite } from "../types";

interface RiskTabProps {
  varSuite: VaRSuite;
  garchMetrics: GarchMetrics;
  skewness: number;
  excessKurtosis: number;
  confidence: number;
  onChangeConfidence: (conf: number) => void;
  onAskAI: (prompt: string, section: string) => Promise<string>;
}

export const RiskTab: React.FC<RiskTabProps> = ({
  varSuite,
  garchMetrics,
  skewness,
  excessKurtosis,
  confidence,
  onChangeConfidence,
  onAskAI,
}) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const backtestData = varSuite.rollingBacktest.dates.map((date, idx) => ({
    date,
    portfolioReturn: parseFloat(
      (varSuite.rollingBacktest.portfolioReturns[idx] * 100).toFixed(2)
    ),
    varBound: parseFloat(
      (varSuite.rollingBacktest.varBounds[idx] * 100).toFixed(2)
    ),
    isBreach: varSuite.rollingBacktest.breaches[idx],
  }));

  const handleGenerateAiRisk = async () => {
    setLoadingAi(true);
    try {
      const prompt = `Interpret the following institutional portfolio risk and volatility metrics:
Confidence Level: ${(confidence * 100).toFixed(0)}%
Historical VaR: ${(varSuite.historicalVaR * 100).toFixed(2)}%
Cornish-Fisher VaR: ${(varSuite.cornishFisherVaR * 100).toFixed(2)}%
Expected Shortfall (CVaR): ${(varSuite.cvar * 100).toFixed(2)}%
Skewness: ${skewness.toFixed(3)}, Excess Kurtosis: ${excessKurtosis.toFixed(3)}
GARCH(1,1): alpha=${garchMetrics.alpha.toFixed(4)}, beta=${garchMetrics.beta.toFixed(4)}, persistence=${garchMetrics.persistence.toFixed(4)}, 1-step forward vol=${(garchMetrics.forwardVolAnn * 100).toFixed(2)}%
Rolling VaR Backtest: ${varSuite.rollingBacktest.breachCount} breaches vs ${varSuite.rollingBacktest.expectedBreaches} expected, Kupiec LR=${varSuite.rollingBacktest.kupiecLR.toFixed(2)}, Basel Zone=${varSuite.rollingBacktest.baselZone}

Address in exactly 3 concise sentences:
1. Daily/periodic loss estimate and what tail fatness (kurtosis/skewness) implies.
2. GARCH volatility persistence and conditional shock duration.
3. Basel zone status and concrete hedging action.`;
      const res = await onAskAI(prompt, "risk");
      setAiInsight(res);
    } catch (e) {
      setAiInsight("Unable to generate risk analysis.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Confidence Selector */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#f0f6fc] flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#f85149]" />
            Value-at-Risk (VaR) & Volatility Econometrics Suite
          </h2>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Non-parametric historical VaR, Cornish-Fisher fat-tail expansion, GARCH(1,1) persistence, and Basel traffic light validation.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0d1117] p-1.5 rounded-lg border border-[#21262d]">
          <span className="text-xs text-[#8b949e] font-medium px-2">Confidence:</span>
          {[0.9, 0.95, 0.99].map((c) => (
            <button
              key={c}
              onClick={() => onChangeConfidence(c)}
              className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${
                confidence === c
                  ? "bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/40"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
            >
              {(c * 100).toFixed(0)}%
            </button>
          ))}
        </div>
      </div>

      {/* VaR / CVaR Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Historical VaR ({confidence * 100}%)
          </div>
          <div className="text-2xl font-bold font-mono text-[#f85149] mt-1">
            -{(varSuite.historicalVaR * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Empirical quantile loss</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Cornish-Fisher VaR
          </div>
          <div className="text-2xl font-bold font-mono text-[#f0883e] mt-1">
            -{(varSuite.cornishFisherVaR * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Skew & kurtosis adjusted</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Expected Shortfall (CVaR)
          </div>
          <div className="text-2xl font-bold font-mono text-[#da3633] mt-1">
            -{(varSuite.cvar * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Mean loss in tail exceedance</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            GARCH(1,1) Forward Vol
          </div>
          <div className="text-2xl font-bold font-mono text-[#58a6ff] mt-1">
            {(garchMetrics.forwardVolAnn * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">
            Persistence: {garchMetrics.persistence.toFixed(3)}
          </div>
        </div>
      </div>

      {/* GARCH & Tail Distribution Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conditional Volatility Time Series */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#58a6ff]" />
                GARCH(1,1) Conditional Volatility Series (σ_t)
              </h3>
              <p className="text-xs text-[#8b949e]">
                Model: σ_t² = ω + α·ε_(t-1)² + β·σ_(t-1)² · Half-life of shocks:{" "}
                <span className="font-mono text-[#f0f6fc]">{garchMetrics.halfLife} periods</span>
              </p>
            </div>
            <span className="text-xs font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-2 py-1 rounded">
              α={garchMetrics.alpha.toFixed(3)} | β={garchMetrics.beta.toFixed(3)}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={garchMetrics.conditionalVolSeries}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0.0} />
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
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(val: any) => [`${(val * 100).toFixed(2)}%`, "Ann. Volatility"]}
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
                  dataKey="vol"
                  name="Conditional Vol"
                  stroke="#58a6ff"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#volGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tail Shape & Distribution Stats */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-[#d29922]" />
              Return Distribution Moments
            </h3>
            <p className="text-xs text-[#8b949e] mb-4">
              Higher-order statistical moments for non-Gaussian tail behavior
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d] flex justify-between items-center">
                <span className="text-[#8b949e]">Skewness (S)</span>
                <span
                  className={`font-bold ${
                    skewness < -0.3 ? "text-[#f85149]" : "text-[#f0f6fc]"
                  }`}
                >
                  {skewness.toFixed(3)}
                </span>
              </div>

              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d] flex justify-between items-center">
                <span className="text-[#8b949e]">Excess Kurtosis (K)</span>
                <span
                  className={`font-bold ${
                    excessKurtosis > 1.0 ? "text-[#f85149]" : "text-[#f0f6fc]"
                  }`}
                >
                  {excessKurtosis.toFixed(3)}
                </span>
              </div>

              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d] flex justify-between items-center">
                <span className="text-[#8b949e]">Parametric Normal VaR</span>
                <span className="text-[#c9d1d9]">
                  -{(varSuite.parametricVaR * 100).toFixed(2)}%
                </span>
              </div>

              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d] flex justify-between items-center">
                <span className="text-[#8b949e]">Fat-Tail Penalty Gap</span>
                <span className="text-[#f85149] font-bold">
                  {Math.max(
                    0,
                    (varSuite.cornishFisherVaR - varSuite.parametricVaR) * 100
                  ).toFixed(2)}
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] text-[11px] text-[#8b949e] mt-4">
            <span className="text-[#d29922] font-semibold">Risk Note:</span>{" "}
            {excessKurtosis > 0.5
              ? "Significant leptokurtic fat-tails detected. Standard Gaussian assumptions underestimate tail risk. Rely on Cornish-Fisher & CVaR."
              : "Distribution exhibits near-Gaussian tail behavior with moderate tail risk."}
          </div>
        </div>
      </div>

      {/* Rolling VaR Backtest & Basel Traffic Light */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#3fb950]" />
              Rolling Out-of-Sample VaR Backtest & Breach Validation
            </h3>
            <p className="text-xs text-[#8b949e]">
              Actual returns vs rolling VaR bounds · Kupiec POF Test: LR ={" "}
              <span className="font-mono text-[#f0f6fc]">
                {varSuite.rollingBacktest.kupiecLR.toFixed(2)}
              </span>{" "}
              (p-val: {varSuite.rollingBacktest.kupiecPValue.toFixed(3)})
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#8b949e]">Breaches:</span>
              <span
                className={`font-bold ${
                  varSuite.rollingBacktest.breachCount >
                  varSuite.rollingBacktest.expectedBreaches * 1.5
                    ? "text-[#f85149]"
                    : "text-[#3fb950]"
                }`}
              >
                {varSuite.rollingBacktest.breachCount} /{" "}
                {varSuite.rollingBacktest.expectedBreaches} Exp.
              </span>
            </div>

            <div
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                varSuite.rollingBacktest.baselZone === "Green"
                  ? "bg-[#238636]/15 border-[#238636]/40 text-[#3fb950]"
                  : varSuite.rollingBacktest.baselZone === "Yellow"
                  ? "bg-[#d29922]/15 border-[#d29922]/40 text-[#d29922]"
                  : "bg-[#da3633]/15 border-[#da3633]/40 text-[#f85149]"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current"></span>
              Basel: {varSuite.rollingBacktest.baselZone} Zone
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={backtestData}>
              <XAxis
                dataKey="date"
                stroke="#30363d"
                tick={{ fill: "#8b949e", fontSize: 10 }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis
                stroke="#30363d"
                tick={{ fill: "#8b949e", fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
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
              <ReferenceLine y={0} stroke="#30363d" />
              <Line
                type="monotone"
                dataKey="portfolioReturn"
                name="Actual Return"
                stroke="#58a6ff"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="stepAfter"
                dataKey="varBound"
                name={`VaR (${confidence * 100}%) Bound`}
                stroke="#f85149"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* On-Demand AI Risk Commentary */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#58a6ff]" />
            <h3 className="text-sm font-bold text-[#f0f6fc]">AI Chief Risk Officer Commentary</h3>
          </div>
          <button
            onClick={handleGenerateAiRisk}
            disabled={loadingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loadingAi ? "Analyzing..." : "Generate Risk Assessment"}
          </button>
        </div>

        {aiInsight ? (
          <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d] text-xs text-[#c9d1d9] leading-relaxed">
            {aiInsight}
          </div>
        ) : (
          <div className="text-xs text-[#8b949e] italic">
            Click "Generate Risk Assessment" for an institutional executive interpretation of VaR bounds, GARCH volatility shocks, and tail risk hedging recommendations.
          </div>
        )}
      </div>
    </div>
  );
};
