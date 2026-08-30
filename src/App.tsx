import React, { useState, useMemo, useEffect } from "react";
import {
  PieChart as PieIcon,
  ShieldAlert,
  Layers,
  Flame,
  Compass,
  DollarSign,
  Cpu,
  MessageSquare,
  FlaskConical,
} from "lucide-react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { PositionsTab } from "./components/PositionsTab";
import { RiskTab } from "./components/RiskTab";
import { EconometricsTab } from "./components/EconometricsTab";
import { ScenariosTab } from "./components/ScenariosTab";
import { OptimizationTab } from "./components/OptimizationTab";
import { ValuationTab } from "./components/ValuationTab";
import { MLSimulationTab } from "./components/MLSimulationTab";
import { ChatAssistantTab } from "./components/ChatAssistantTab";
import { ThesisLabTab } from "./components/ThesisLabTab";

import { INITIAL_FUNDAMENTALS, generateHistoricalObservations } from "./data/marketData";
import {
  computeCovarianceMatrix,
  computeExpectedReturns,
  computeKurtosis,
  computeSkewness,
} from "./engines/math";
import {
  optimizeTangency,
  optimizeMinVariance,
  optimizeEqualWeight,
  optimizeRiskParity,
  computeBlackLitterman,
} from "./engines/optimization";
import {
  calculatePortfolioSummaryMetrics,
  calculateVaRSuite,
  fitGARCH11,
} from "./engines/risk";

export const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    | "positions"
    | "risk"
    | "econometrics"
    | "scenarios"
    | "optimization"
    | "valuation"
    | "simulation"
    | "thesis_lab"
    | "chat"
  >("positions");

  // Core portfolio configuration
  const [selectedTickers, setSelectedTickers] = useState<string[]>([
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "NVDA",
    "META",
    "TSLA",
    "MU",
    "WDC",
    "WMT",
    "UNH",
    "DELL",
    "CAT",
    "BIDU",
  ]);

  const [interval, setInterval] = useState<"1d" | "1wk" | "1mo">("1d");
  const [rfRate, setRfRate] = useState<number>(0.0425); // 4.25% 10Y UST
  const [confidence, setConfidence] = useState<number>(0.95);
  const [activeOptimizationModel, setActiveOptimizationModel] = useState<
    "tangency" | "minVariance" | "equalWeight" | "riskParity" | "blackLitterman"
  >("tangency");

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [aiOnline, setAiOnline] = useState<boolean>(true);

  // Periods per year
  const ppy = interval === "1d" ? 252 : interval === "1wk" ? 52 : 12;

  // 1. Generate multi-year deterministic historical observations
  const observations = useMemo(() => {
    return generateHistoricalObservations(
      selectedTickers,
      500,
      ppy,
      42 + refreshTrigger
    );
  }, [selectedTickers, ppy, refreshTrigger]);

  // 2. Statistical parameters
  const { covMatrix, expectedReturns } = useMemo(() => {
    const cov = computeCovarianceMatrix(observations, selectedTickers, ppy);
    const exp = computeExpectedReturns(observations, selectedTickers, ppy);
    return { covMatrix: cov, expectedReturns: exp };
  }, [observations, selectedTickers, ppy]);

  // 3. Optimization Weights Calculation
  const weights = useMemo(() => {
    const n = selectedTickers.length;
    if (n === 0) return {};

    let rawWeights: number[] = [];
    if (activeOptimizationModel === "tangency") {
      rawWeights = optimizeTangency(expectedReturns, covMatrix, rfRate, true);
    } else if (activeOptimizationModel === "minVariance") {
      rawWeights = optimizeMinVariance(covMatrix);
    } else if (activeOptimizationModel === "riskParity") {
      rawWeights = optimizeRiskParity(covMatrix);
    } else if (activeOptimizationModel === "blackLitterman") {
      const totalMktCap = selectedTickers.reduce(
        (sum, t) => sum + (INITIAL_FUNDAMENTALS[t]?.marketCap || 50),
        0
      );
      const mktCapWeights = selectedTickers.map(
        (t) => (INITIAL_FUNDAMENTALS[t]?.marketCap || 50) / totalMktCap
      );
      const bl = computeBlackLitterman(
        selectedTickers,
        mktCapWeights,
        covMatrix,
        [],
        2.5,
        0.05,
        rfRate
      );
      rawWeights = bl.posteriorWeights;
    } else {
      rawWeights = optimizeEqualWeight(n);
    }

    const weightMap: Record<string, number> = {};
    selectedTickers.forEach((t, i) => {
      weightMap[t] = rawWeights[i] || 0;
    });
    return weightMap;
  }, [
    selectedTickers,
    activeOptimizationModel,
    expectedReturns,
    covMatrix,
    rfRate,
  ]);

  // 4. Portfolio Return Series
  const portfolioReturns = useMemo(() => {
    return observations.map((obs) => {
      let r = 0;
      selectedTickers.forEach((t) => {
        r += (weights[t] || 0) * (obs.returns[t] || 0);
      });
      return r;
    });
  }, [observations, selectedTickers, weights]);

  // 5. Portfolio Summary Metrics
  const metrics = useMemo(() => {
    return calculatePortfolioSummaryMetrics(
      portfolioReturns,
      weights,
      covMatrix,
      selectedTickers,
      rfRate,
      ppy
    );
  }, [portfolioReturns, weights, covMatrix, selectedTickers, rfRate, ppy]);

  // 6. Value-at-Risk & Backtesting Suite
  const varSuite = useMemo(() => {
    return calculateVaRSuite(
      portfolioReturns,
      observations.map((o) => o.date),
      confidence,
      ppy
    );
  }, [portfolioReturns, observations, confidence, ppy]);

  // 7. GARCH(1,1) Volatility
  const garchMetrics = useMemo(() => {
    return fitGARCH11(portfolioReturns, observations.map((o) => o.date), ppy);
  }, [portfolioReturns, observations, ppy]);

  const skewness = useMemo(() => computeSkewness(portfolioReturns), [portfolioReturns]);
  const excessKurtosis = useMemo(
    () => computeKurtosis(portfolioReturns),
    [portfolioReturns]
  );

  // Check health of Gemini AI endpoint on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(() => setAiOnline(true))
      .catch(() => setAiOnline(false));
  }, []);

  // Server-side AI narration request helper
  const handleAskAI = async (prompt: string, section: string): Promise<string> => {
    try {
      const response = await fetch("/api/ai/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          section,
          portfolioData: {
            tickers: selectedTickers,
            weights,
            annualizedReturn: metrics.annualizedReturn,
            annualizedVol: metrics.annualizedVol,
            sharpe: metrics.sharpeRatio,
            var95: varSuite.historicalVaR,
            cvar95: varSuite.cvar,
            rfRate,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.text || "No AI response generated.";
    } catch (e: any) {
      console.warn("AI Narrate fallback:", e);
      return `Quantitative Insight: The portfolio exhibits annualized return of ${(metrics.annualizedReturn * 100).toFixed(2)}% with volatility of ${(metrics.annualizedVol * 100).toFixed(2)}% (Sharpe: ${metrics.sharpeRatio.toFixed(2)}). GARCH persistence remains at ${garchMetrics.persistence.toFixed(3)}.`;
    }
  };

  // Server-side AI Chat helper
  const handleSendChatMessage = async (
    message: string,
    history: any[]
  ): Promise<string> => {
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          portfolioContext: {
            tickers: selectedTickers,
            weights,
            metrics,
            varSuite: {
              historicalVaR: varSuite.historicalVaR,
              cornishFisherVaR: varSuite.cornishFisherVaR,
              cvar: varSuite.cvar,
              baselZone: varSuite.rollingBacktest.baselZone,
            },
            garch: {
              alpha: garchMetrics.alpha,
              beta: garchMetrics.beta,
              persistence: garchMetrics.persistence,
              forwardVolAnn: garchMetrics.forwardVolAnn,
            },
            rfRate,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.reply || data.response || data.text || "Analysis complete.";
    } catch (e: any) {
      console.warn("AI Chat fallback:", e);
      return `Quantitative Insight (Holdings: ${selectedTickers.join(", ")}): Current portfolio Sharpe stands at ${metrics.sharpeRatio.toFixed(2)} with 95% Historical VaR of ${(Math.abs(varSuite.historicalVaR) * 100).toFixed(2)}% and GARCH volatility persistence at ${garchMetrics.persistence.toFixed(3)}.`;
    }
  };

  // Export JSON SR 11-7 Manifest
  const handleExportJson = () => {
    const manifest = {
      modelName: "Institutional Portfolio Analytics Framework",
      version: "3.5 PRO",
      timestamp: new Date().toISOString(),
      governanceCompliance: "Federal Reserve SR 11-7 / OCC 2011-12",
      universe: selectedTickers,
      weights,
      riskFreeRate10Y: rfRate,
      metrics: {
        annualizedCAGR: metrics.annualizedReturn,
        annualizedVolatility: metrics.annualizedVol,
        sharpeRatio: metrics.sharpeRatio,
        sortinoRatio: metrics.sortinoRatio,
        calmarRatio: metrics.calmarRatio,
        maxDrawdown: metrics.maxDrawdown,
        diversificationRatio: metrics.diversificationRatio,
      },
      varAndTailRisk: {
        confidenceLevel: confidence,
        historicalVaR: varSuite.historicalVaR,
        cornishFisherVaR: varSuite.cornishFisherVaR,
        parametricVaR: varSuite.parametricVaR,
        expectedShortfallCVaR: varSuite.cvar,
        skewness,
        excessKurtosis,
        baselZone: varSuite.rollingBacktest.baselZone,
        breachCount: varSuite.rollingBacktest.breachCount,
      },
      volatilityModel: {
        type: "GARCH(1,1)",
        alpha: garchMetrics.alpha,
        beta: garchMetrics.beta,
        persistence: garchMetrics.persistence,
        halfLife: garchMetrics.halfLife,
        forwardVolAnn: garchMetrics.forwardVolAnn,
      },
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio_risk_manifest_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyThesisToPortfolio = (
    newTickers: string[],
    newWeights?: Record<string, number>
  ) => {
    setSelectedTickers(newTickers);
  };

  const navTabs = [
    { id: "positions", label: "Positions & Weights", icon: PieIcon },
    { id: "thesis_lab", label: "Autonomous Thesis Lab", icon: FlaskConical },
    { id: "risk", label: "VaR & Volatility Suite", icon: ShieldAlert },
    { id: "econometrics", label: "Factor Econometrics", icon: Layers },
    { id: "scenarios", label: "Stress Testing", icon: Flame },
    { id: "optimization", label: "Optimization & BL", icon: Compass },
    { id: "valuation", label: "Fundamentals & DCF", icon: DollarSign },
    { id: "simulation", label: "ML & Stochastic Cone", icon: Cpu },
    { id: "chat", label: "AI Quant Analyst", icon: MessageSquare },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col font-sans selection:bg-[#58a6ff]/30 selection:text-white">
      {/* Top Institutional Header */}
      <Header
        metrics={metrics}
        tickers={selectedTickers}
        rfRate={rfRate}
        aiOnline={aiOnline}
        onExport={handleExportJson}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Universe & Config Sidebar */}
        <Sidebar
          selectedTickers={selectedTickers}
          onChangeTickers={setSelectedTickers}
          interval={interval}
          onChangeInterval={setInterval}
          rfRate={rfRate}
          onChangeRfRate={setRfRate}
          aiOnline={aiOnline}
          onRefreshData={() => setRefreshTrigger((prev) => prev + 1)}
          onExportJson={handleExportJson}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-5 lg:p-7 overflow-y-auto max-w-7xl">
          {/* Navigation Bar */}
          <div className="flex items-center gap-1.5 border-b border-[#21262d] pb-4 mb-6 overflow-x-auto">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#58a6ff]/15 border border-[#58a6ff]/40 text-[#58a6ff] shadow-sm"
                      : "text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#161b22]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab View */}
          <div className="transition-opacity duration-200">
            {activeTab === "positions" && (
              <PositionsTab
                tickers={selectedTickers}
                weights={weights}
                fundamentals={INITIAL_FUNDAMENTALS}
                observations={observations}
                metrics={metrics}
                onAskAI={handleAskAI}
              />
            )}

            {activeTab === "risk" && (
              <RiskTab
                varSuite={varSuite}
                garchMetrics={garchMetrics}
                skewness={skewness}
                excessKurtosis={excessKurtosis}
                confidence={confidence}
                onChangeConfidence={setConfidence}
                onAskAI={handleAskAI}
              />
            )}

            {activeTab === "econometrics" && (
              <EconometricsTab
                tickers={selectedTickers}
                weights={weights}
                observations={observations}
                ppy={ppy}
                onAskAI={handleAskAI}
              />
            )}

            {activeTab === "scenarios" && (
              <ScenariosTab
                tickers={selectedTickers}
                weights={weights}
                fundamentals={INITIAL_FUNDAMENTALS}
                onAskAI={handleAskAI}
              />
            )}

            {activeTab === "optimization" && (
              <OptimizationTab
                tickers={selectedTickers}
                fundamentals={INITIAL_FUNDAMENTALS}
                covMatrix={covMatrix}
                expectedReturns={expectedReturns}
                rfRate={rfRate}
                activeModel={activeOptimizationModel}
                onChangeActiveModel={setActiveOptimizationModel}
                onAskAI={handleAskAI}
              />
            )}

            {activeTab === "valuation" && (
              <ValuationTab
                tickers={selectedTickers}
                fundamentals={INITIAL_FUNDAMENTALS}
                weights={weights}
                rfRate={rfRate}
                onAskAI={handleAskAI}
              />
            )}

            {activeTab === "thesis_lab" && (
              <ThesisLabTab
                activeMetrics={metrics}
                activeTickers={selectedTickers}
                activeWeights={weights}
                rfRate={rfRate}
                ppy={ppy}
                onApplyThesisToPortfolio={handleApplyThesisToPortfolio}
                onAskAI={handleAskAI}
              />
            )}

            {activeTab === "simulation" && (
              <MLSimulationTab
                tickers={selectedTickers}
                weights={weights}
                expectedReturns={expectedReturns}
                covMatrix={covMatrix}
                observations={observations}
                metrics={metrics}
                rfRate={rfRate}
                ppy={ppy}
                onAskAI={handleAskAI}
              />
            )}

            {activeTab === "chat" && (
              <ChatAssistantTab
                tickers={selectedTickers}
                weights={weights}
                metrics={metrics}
                rfRate={rfRate}
                onSendChatMessage={handleSendChatMessage}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

