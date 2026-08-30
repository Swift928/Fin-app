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
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { FactorModelResult, ReturnObservation } from "../types";
import { runFactorRegression } from "../engines/econometrics";

interface EconometricsTabProps {
  tickers: string[];
  weights: Record<string, number>;
  observations: ReturnObservation[];
  ppy: number;
  onAskAI: (prompt: string, section: string) => Promise<string>;
}

export const EconometricsTab: React.FC<EconometricsTabProps> = ({
  tickers,
  weights,
  observations,
  ppy,
  onAskAI,
}) => {
  const [modelType, setModelType] = useState<
    "CAPM (1-Factor)" | "Fama-French (3-Factor)" | "Carhart (4-Factor)"
  >("Fama-French (3-Factor)");

  const [selectedAsset, setSelectedAsset] = useState<string>("Portfolio");
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Compute returns series for selected asset or portfolio
  const assetReturns = observations.map((obs) => {
    if (selectedAsset === "Portfolio") {
      let r = 0;
      tickers.forEach((t) => {
        r += (weights[t] || 0) * (obs.returns[t] || 0);
      });
      return r;
    }
    return obs.returns[selectedAsset] || 0;
  });

  const regressionResult = runFactorRegression(
    assetReturns,
    observations,
    modelType,
    selectedAsset,
    ppy
  );

  const factorBarData = [
    {
      name: "Alpha (Ann.)",
      value: parseFloat((regressionResult.alphaAnn * 100).toFixed(2)),
      tStat: regressionResult.alphaTStat,
    },
    ...regressionResult.factors.map((f) => ({
      name: f.name,
      value: parseFloat(f.coefficient.toFixed(3)),
      tStat: f.tStat,
    })),
  ];

  const handleGenerateAiEconometrics = async () => {
    setLoadingAi(true);
    try {
      const factorSummary = regressionResult.factors
        .map((f) => `${f.name}: beta=${f.coefficient.toFixed(3)} (t=${f.tStat.toFixed(2)}, p=${f.pValue.toFixed(3)})`)
        .join(", ");

      const prompt = `Interpret the following econometric factor regression:
Asset: ${selectedAsset}, Model: ${modelType}
R-squared: ${(regressionResult.r2 * 100).toFixed(2)}%, Adj R-squared: ${(regressionResult.adjR2 * 100).toFixed(2)}%
Annualized Jensen's Alpha: ${(regressionResult.alphaAnn * 100).toFixed(2)}% (t=${regressionResult.alphaTStat.toFixed(2)}, p=${regressionResult.alphaPValue.toFixed(3)})
Information Ratio: ${regressionResult.informationRatio.toFixed(2)}, Tracking Error: ${(regressionResult.trackingError * 100).toFixed(2)}%
Factors: ${factorSummary}
Diagnostics: Durbin-Watson=${regressionResult.residualDiagnostics.durbinWatson.toFixed(2)}, Jarque-Bera p=${regressionResult.residualDiagnostics.jarqueBeraP.toFixed(3)}

Explain in 3 concise sentences:
1. What the factor loadings reveal about the risk/style tilts (market, size, value, momentum).
2. Whether alpha is statistically significant manager skill vs factor beta.
3. Residual model validation diagnostics.`;

      const res = await onAskAI(prompt, "econometrics");
      setAiInsight(res);
    } catch (e) {
      setAiInsight("Unable to generate econometric analysis.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#f0f6fc] flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#58a6ff]" />
            Multi-Factor Econometric Regression & Style Attribution
          </h2>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Decompose returns into Jensen's Alpha, Market Beta, Size (SMB), Value (HML), and Momentum (MOM) premia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Asset Picker */}
          <div className="flex items-center gap-1.5 text-xs bg-[#0d1117] px-2.5 py-1.5 rounded-lg border border-[#21262d]">
            <span className="text-[#8b949e]">Target:</span>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="bg-transparent font-mono font-bold text-[#f0f6fc] focus:outline-none cursor-pointer"
            >
              <option value="Portfolio" className="bg-[#161b22]">
                Portfolio (Aggregate)
              </option>
              {tickers.map((t) => (
                <option key={t} value={t} className="bg-[#161b22]">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Model Picker */}
          <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-[#21262d]">
            {(
              [
                "CAPM (1-Factor)",
                "Fama-French (3-Factor)",
                "Carhart (4-Factor)",
              ] as const
            ).map((m) => (
              <button
                key={m}
                onClick={() => setModelType(m)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  modelType === m
                    ? "bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/40"
                    : "text-[#8b949e] hover:text-[#f0f6fc]"
                }`}
              >
                {m.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Jensen's Alpha (Ann.)
          </div>
          <div className="text-xl font-bold font-mono text-[#3fb950] mt-1">
            {(regressionResult.alphaAnn * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">
            t = {regressionResult.alphaTStat.toFixed(2)} (p:{" "}
            {regressionResult.alphaPValue.toFixed(3)})
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            R-Squared (R²)
          </div>
          <div className="text-xl font-bold font-mono text-[#58a6ff] mt-1">
            {(regressionResult.r2 * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">
            Adj. R²: {(regressionResult.adjR2 * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Tracking Error
          </div>
          <div className="text-xl font-bold font-mono text-[#f0f6fc] mt-1">
            {(regressionResult.trackingError * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Residual volatility</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Information Ratio
          </div>
          <div className="text-xl font-bold font-mono text-[#a371f7] mt-1">
            {regressionResult.informationRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Alpha / Tracking Error</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Treynor Ratio
          </div>
          <div className="text-xl font-bold font-mono text-[#d29922] mt-1">
            {(regressionResult.treynorRatio * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Excess return / Beta</div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Durbin-Watson
          </div>
          <div className="text-xl font-bold font-mono text-[#f0f6fc] mt-1">
            {regressionResult.residualDiagnostics.durbinWatson.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">
            {Math.abs(regressionResult.residualDiagnostics.durbinWatson - 2.0) < 0.3
              ? "No autocorrelation"
              : "Autocorrelated residuals"}
          </div>
        </div>
      </div>

      {/* Regression Factor Table & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Regression Factor Coefficients Table */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#f0f6fc]">
                {modelType} Parameter Estimates & Statistical Significance
              </h3>
              <p className="text-xs text-[#8b949e]">
                Ordinary Least Squares (OLS) with asymptotic standard errors
              </p>
            </div>
            <span className="text-xs font-mono text-[#8b949e]">
              F-Stat: {regressionResult.fStat.toFixed(2)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0d1117] text-[#8b949e] font-semibold uppercase tracking-wider border-b border-[#21262d]">
                <tr>
                  <th className="px-4 py-3">Factor Term</th>
                  <th className="px-4 py-3 text-right">Coefficient (β)</th>
                  <th className="px-4 py-3 text-right">Std. Error</th>
                  <th className="px-4 py-3 text-right">t-Statistic</th>
                  <th className="px-4 py-3 text-right">p-Value</th>
                  <th className="px-4 py-3 text-center">Significance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] text-[#c9d1d9] font-mono">
                {/* Alpha row */}
                <tr className="hover:bg-[#0d1117]/60">
                  <td className="px-4 py-3 font-bold text-[#3fb950]">
                    Alpha (Annualized)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#3fb950]">
                    {(regressionResult.alphaAnn * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-[#8b949e]">
                    {(
                      (regressionResult.alphaAnn /
                        (regressionResult.alphaTStat || 1)) *
                      100
                    ).toFixed(2)}
                    %
                  </td>
                  <td className="px-4 py-3 text-right text-[#f0f6fc]">
                    {regressionResult.alphaTStat.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {regressionResult.alphaPValue.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {regressionResult.alphaPValue < 0.01 ? (
                      <span className="text-[#3fb950] font-bold">*** (p&lt;0.01)</span>
                    ) : regressionResult.alphaPValue < 0.05 ? (
                      <span className="text-[#3fb950] font-bold">** (p&lt;0.05)</span>
                    ) : regressionResult.alphaPValue < 0.1 ? (
                      <span className="text-[#d29922]">* (p&lt;0.10)</span>
                    ) : (
                      <span className="text-[#8b949e]">n.s.</span>
                    )}
                  </td>
                </tr>

                {/* Factor rows */}
                {regressionResult.factors.map((factor) => (
                  <tr key={factor.name} className="hover:bg-[#0d1117]/60">
                    <td className="px-4 py-3 font-bold text-[#58a6ff]">
                      {factor.name}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#f0f6fc]">
                      {factor.coefficient.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#8b949e]">
                      {factor.stdError.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#f0f6fc]">
                      {factor.tStat.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {factor.pValue.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {factor.pValue < 0.01 ? (
                        <span className="text-[#3fb950] font-bold">*** (p&lt;0.01)</span>
                      ) : factor.pValue < 0.05 ? (
                        <span className="text-[#3fb950] font-bold">** (p&lt;0.05)</span>
                      ) : factor.pValue < 0.1 ? (
                        <span className="text-[#d29922]">* (p&lt;0.10)</span>
                      ) : (
                        <span className="text-[#8b949e]">n.s.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Factor Exposure Bar Chart */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#f0f6fc] mb-1">
              Factor Exposure Profile
            </h3>
            <p className="text-xs text-[#8b949e] mb-4">
              Visual sensitivity to systematic market factors
            </p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factorBarData} layout="vertical">
                  <XAxis
                    type="number"
                    stroke="#30363d"
                    tick={{ fill: "#8b949e", fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#30363d"
                    tick={{ fill: "#8b949e", fontSize: 10 }}
                    width={80}
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
                  <ReferenceLine x={0} stroke="#30363d" />
                  <Bar dataKey="value" fill="#58a6ff" radius={[0, 4, 4, 0]}>
                    {factorBarData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.value >= 0
                            ? index === 0
                              ? "#3fb950"
                              : "#58a6ff"
                            : "#f85149"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] text-[11px] text-[#8b949e] mt-4">
            <span className="text-[#58a6ff] font-semibold">Style Tilt:</span>{" "}
            {modelType.includes("3-Factor") || modelType.includes("4-Factor")
              ? "Positive SMB indicates small-cap tilt; negative HML indicates growth tilt over value."
              : "Single-index model capturing systematic market sensitivity."}
          </div>
        </div>
      </div>

      {/* On-Demand AI Econometrics Commentary */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#58a6ff]" />
            <h3 className="text-sm font-bold text-[#f0f6fc]">AI Econometrics & Style Tilt Assessment</h3>
          </div>
          <button
            onClick={handleGenerateAiEconometrics}
            disabled={loadingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loadingAi ? "Analyzing..." : "Generate Factor Analysis"}
          </button>
        </div>

        {aiInsight ? (
          <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d] text-xs text-[#c9d1d9] leading-relaxed">
            {aiInsight}
          </div>
        ) : (
          <div className="text-xs text-[#8b949e] italic">
            Click "Generate Factor Analysis" for an institutional econometric breakdown of factor tilts, manager alpha significance, and residual diagnostics.
          </div>
        )}
      </div>
    </div>
  );
};
