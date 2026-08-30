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
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Cpu,
  TrendingUp,
  Activity,
  Sparkles,
  RefreshCw,
  Layers,
  CheckCircle,
  AlertOctagon,
} from "lucide-react";
import {
  BacktestSummary,
  HMMStateOutput,
  MonteCarloOutput,
  PortfolioSummaryMetrics,
  ReturnObservation,
} from "../types";
import {
  estimateHMMRegimes,
  runMonteCarloSimulation,
  runWalkForwardBacktest,
} from "../engines/simulation";

interface MLSimulationTabProps {
  tickers: string[];
  weights: Record<string, number>;
  expectedReturns: number[];
  covMatrix: number[][];
  observations: ReturnObservation[];
  metrics: PortfolioSummaryMetrics;
  rfRate: number;
  ppy: number;
  onAskAI: (prompt: string, section: string) => Promise<string>;
}

export const MLSimulationTab: React.FC<MLSimulationTabProps> = ({
  tickers,
  weights,
  expectedReturns,
  covMatrix,
  observations,
  metrics,
  rfRate,
  ppy,
  onAskAI,
}) => {
  const [numSimulations, setNumSimulations] = useState<number>(1000);
  const [forecastHorizonMonths, setForecastHorizonMonths] = useState<number>(12);
  const [initialInvestment, setInitialInvestment] = useState<number>(1000000);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Compute portfolio returns
  const portfolioReturns = observations.map((obs) => {
    let r = 0;
    tickers.forEach((t) => {
      r += (weights[t] || 0) * (obs.returns[t] || 0);
    });
    return r;
  });

  const weightArr = tickers.map((t) => weights[t] || 0);

  // 1. Monte Carlo Simulation Engine
  const mcResult: MonteCarloOutput = runMonteCarloSimulation(
    expectedReturns,
    covMatrix,
    weightArr,
    forecastHorizonMonths,
    numSimulations,
    initialInvestment
  );

  const mcChartData = mcResult.timeSteps.map((step, idx) => ({
    step,
    p5: Math.round(mcResult.percentile5[idx]),
    p25: Math.round(mcResult.percentile25[idx]),
    p50: Math.round(mcResult.percentile50[idx]),
    p75: Math.round(mcResult.percentile75[idx]),
    p95: Math.round(mcResult.percentile95[idx]),
    path1: Math.round(mcResult.samplePaths[0]?.[idx] || initialInvestment),
    path2: Math.round(mcResult.samplePaths[1]?.[idx] || initialInvestment),
    path3: Math.round(mcResult.samplePaths[2]?.[idx] || initialInvestment),
  }));

  // 2. HMM 2-State Gaussian Regime Switching
  const hmmResult: HMMStateOutput = estimateHMMRegimes(
    portfolioReturns,
    observations.map((o) => o.date),
    ppy
  );

  const hmmChartData = hmmResult.regimeSeries.map((item) => ({
    date: item.date,
    bearProb: parseFloat((item.bearProb * 100).toFixed(1)),
    bullProb: parseFloat((item.bullProb * 100).toFixed(1)),
    state: item.state,
  }));

  // 3. Walk-Forward Backtesting
  const wfResult: BacktestSummary = runWalkForwardBacktest(
    observations,
    tickers,
    weights,
    ppy
  );

  const wfChartData = wfResult.dates.map((date, idx) => ({
    date,
    portfolio: wfResult.portfolioGrowth[idx],
    benchmark: wfResult.benchmarkGrowth[idx],
    equalWeight: wfResult.equalWeightGrowth[idx],
  }));

  const handleGenerateAiSimulation = async () => {
    setLoadingAi(true);
    try {
      const prompt = `Interpret the Monte Carlo simulation, HMM regime-switching model, and out-of-sample backtest results:
Initial Book: $${initialInvestment.toLocaleString()}, Horizon: ${forecastHorizonMonths} months
Monte Carlo: Median Terminal Wealth = $${mcResult.terminalStats.median.toLocaleString()}, 95% Dollar VaR = $${mcResult.terminalStats.var95Dollar.toLocaleString()}, Prob of Loss = ${(mcResult.terminalStats.probLoss * 100).toFixed(1)}%
HMM Regimes:
  - Current Regime: ${hmmResult.currentRegime} (Persistence / Stay Prob: ${(hmmResult.stayProbability * 100).toFixed(1)}%, Duration: ${hmmResult.consecutivePeriods} periods)
  - Low-Vol Regime: Ann Return = ${(hmmResult.bullMeanAnn * 100).toFixed(1)}%, Vol = ${(hmmResult.bullVolAnn * 100).toFixed(1)}%
  - High-Vol Regime: Ann Return = ${(hmmResult.bearMeanAnn * 100).toFixed(1)}%, Vol = ${(hmmResult.bearVolAnn * 100).toFixed(1)}%
Walk-Forward Out-of-Sample: Portfolio Realized CAGR = ${(wfResult.metrics.tangencyCagr * 100).toFixed(2)}% vs Benchmark ${(wfResult.metrics.benchmarkCagr * 100).toFixed(2)}%, Max DD = ${(wfResult.metrics.tangencyMaxDd * 100).toFixed(2)}%.

Address in 3 concise sentences:
1. Expected terminal distribution and downside dollar risk over the forecast horizon.
2. Current regime probability and risk of switching to the high-volatility regime.
3. Walk-forward stability and dynamic tactical de-risking trigger recommendations.`;

      const res = await onAskAI(prompt, "simulation");
      setAiInsight(res);
    } catch (e) {
      setAiInsight("Unable to generate simulation analysis.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#f0f6fc] flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#58a6ff]" />
            Quantitative Machine Learning & Stochastic Simulation
          </h2>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Geometric Brownian Motion Monte Carlo cones, 2-State Expectation-Maximization Gaussian HMMs, and Walk-Forward OOS validation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs bg-[#0d1117] px-3 py-1.5 rounded-lg border border-[#21262d] font-mono">
            <span className="text-[#8b949e]">Sims: </span>
            <span className="text-[#58a6ff] font-bold">
              {numSimulations.toLocaleString()} paths
            </span>
          </div>
        </div>
      </div>

      {/* Monte Carlo KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Median Terminal Wealth (50th)
          </div>
          <div className="text-2xl font-bold font-mono text-[#3fb950] mt-1">
            ${mcResult.terminalStats.median.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">
            +
            {(
              ((mcResult.terminalStats.median - initialInvestment) /
                initialInvestment) *
              100
            ).toFixed(1)}
            % expected
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            95% Dollar VaR (5th %ile)
          </div>
          <div className="text-2xl font-bold font-mono text-[#f85149] mt-1">
            ${mcResult.terminalStats.var95Dollar.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">
            Worst 5% tail boundary
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Probability of Loss
          </div>
          <div className="text-2xl font-bold font-mono text-[#d29922] mt-1">
            {(mcResult.terminalStats.probLoss * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">
            P(Terminal &lt; ${initialInvestment.toLocaleString()})
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            Current Market Regime
          </div>
          <div
            className={`text-2xl font-bold font-mono mt-1 ${
              hmmResult.currentRegime.includes("Bull")
                ? "text-[#3fb950]"
                : "text-[#f85149]"
            }`}
          >
            {hmmResult.currentRegime}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">
            Stay Prob: {(hmmResult.stayProbability * 100).toFixed(1)}% (
            {hmmResult.consecutivePeriods} periods)
          </div>
        </div>
      </div>

      {/* Main Row: Monte Carlo Simulation Fan Chart */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#58a6ff]" />
              Stochastic Monte Carlo Geometric Brownian Motion Trajectory Fan
            </h3>
            <p className="text-xs text-[#8b949e]">
              12-month forward distribution with 5th, 25th, Median, 75th, and 95th confidence percentile corridors
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-[#8b949e]">
            <span className="flex items-center gap-1 text-[#3fb950]">
              <span className="h-2 w-2 rounded-full bg-[#3fb950]"></span> Median (50th)
            </span>
            <span className="flex items-center gap-1 text-[#58a6ff]">
              <span className="h-2 w-2 rounded-full bg-[#58a6ff]"></span> 25th-75th Band
            </span>
            <span className="flex items-center gap-1 text-[#f85149]">
              <span className="h-2 w-2 rounded-full bg-[#f85149]"></span> 5th Tail
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mcChartData}>
              <defs>
                <linearGradient id="mcCone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#58a6ff" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="step"
                stroke="#30363d"
                tick={{ fill: "#8b949e", fontSize: 10 }}
              />
              <YAxis
                stroke="#30363d"
                tick={{ fill: "#8b949e", fontSize: 10 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val: any, name: any) => [
                  `$${Number(val).toLocaleString()}`,
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
              <ReferenceLine y={initialInvestment} stroke="#8b949e" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="p95"
                name="95th Percentile"
                stroke="#58a6ff"
                strokeWidth={1}
                fillOpacity={1}
                fill="url(#mcCone)"
              />
              <Area
                type="monotone"
                dataKey="p50"
                name="Median Path"
                stroke="#3fb950"
                strokeWidth={2}
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="p5"
                name="5th Percentile VaR"
                stroke="#f85149"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                fill="none"
              />
              <Line
                type="monotone"
                dataKey="path1"
                name="Sample Path #1"
                stroke="#a371f7"
                strokeWidth={1}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: HMM Regime Switching & Walk-Forward OOS Backtest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HMM Regime Switching State Probability Chart */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#f85149]" />
                2-State Hidden Markov Model (HMM) Regime Detection
              </h3>
              <p className="text-xs text-[#8b949e]">
                Smoothed posterior probability of High-Volatility / Crisis Market State
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hmmChartData}>
                <defs>
                  <linearGradient id="bearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f85149" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f85149" stopOpacity={0.0} />
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
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "P(Crisis State)"]}
                  contentStyle={{
                    backgroundColor: "#161b22",
                    borderColor: "#30363d",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f0f6fc",
                  }}
                />
                <ReferenceLine y={50} stroke="#d29922" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="bearProb"
                  name="Crisis Probability"
                  stroke="#f85149"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#bearGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* HMM Parameters Summary */}
          <div className="grid grid-cols-2 gap-3 mt-3 font-mono text-xs">
            <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
              <div className="text-[#3fb950] font-bold">State 0: Low-Vol Bull</div>
              <div className="text-[#8b949e] mt-1">
                Ann. μ: {(hmmResult.bullMeanAnn * 100).toFixed(1)}% | σ:{" "}
                {(hmmResult.bullVolAnn * 100).toFixed(1)}%
              </div>
              <div className="text-[#8b949e]">
                P(Stay): {(hmmResult.transitionMatrix[0][0] * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
              <div className="text-[#f85149] font-bold">State 1: High-Vol Crisis</div>
              <div className="text-[#8b949e] mt-1">
                Ann. μ: {(hmmResult.bearMeanAnn * 100).toFixed(1)}% | σ:{" "}
                {(hmmResult.bearVolAnn * 100).toFixed(1)}%
              </div>
              <div className="text-[#8b949e]">
                P(Stay): {(hmmResult.transitionMatrix[1][1] * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Walk-Forward Rolling Backtest Chart */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#58a6ff]" />
                Walk-Forward Out-of-Sample Wealth Growth
              </h3>
              <p className="text-xs text-[#8b949e]">
                Historical trajectory (Base = $100) vs S&P 500 & Equal Weight
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wfChartData}>
                <XAxis
                  dataKey="date"
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis
                  stroke="#30363d"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                  tickFormatter={(v) => `$${v}`}
                  domain={["dataMin - 5", "dataMax + 5"]}
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
                <Legend wrapperStyle={{ fontSize: "11px", color: "#8b949e" }} />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  name="Tangency Portfolio"
                  stroke="#58a6ff"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name="S&P 500"
                  stroke="#8b949e"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="equalWeight"
                  name="1/N Benchmark"
                  stroke="#d29922"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] text-[11px] text-[#8b949e] mt-3">
            <span className="text-[#58a6ff] font-semibold">Walk-Forward Summary:</span>{" "}
            Portfolio CAGR is {(wfResult.metrics.tangencyCagr * 100).toFixed(1)}% (Sharpe: {wfResult.metrics.tangencySharpe.toFixed(2)}) vs Benchmark CAGR {(wfResult.metrics.benchmarkCagr * 100).toFixed(1)}% (Sharpe: {wfResult.metrics.benchmarkSharpe.toFixed(2)}).
          </div>
        </div>
      </div>

      {/* On-Demand AI Simulation Commentary */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#58a6ff]" />
            <h3 className="text-sm font-bold text-[#f0f6fc]">AI Machine Learning & Quantitative Simulation Commentary</h3>
          </div>
          <button
            onClick={handleGenerateAiSimulation}
            disabled={loadingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loadingAi ? "Analyzing..." : "Generate Simulation Analysis"}
          </button>
        </div>

        {aiInsight ? (
          <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d] text-xs text-[#c9d1d9] leading-relaxed">
            {aiInsight}
          </div>
        ) : (
          <div className="text-xs text-[#8b949e] italic">
            Click "Generate Simulation Analysis" for an institutional assessment of Monte Carlo tail percentiles, HMM regime transitions, and walk-forward alpha persistence.
          </div>
        )}
      </div>
    </div>
  );
};
