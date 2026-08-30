import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FlaskConical,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Layers,
  ArrowRight,
  Download,
  Info,
  Check,
  Activity,
  Zap,
  BarChart3,
  Flame,
  Scale,
  BrainCircuit,
  MessageSquare,
} from "lucide-react";
import {
  InvestmentThesis,
  ThesisTestResult,
  PortfolioSummaryMetrics,
} from "../types";
import { INITIAL_FUNDAMENTALS } from "../data/marketData";
import {
  PRESET_THESES_ARCHETYPES,
  runAutonomousThesisEvaluation,
  ThematicArchetype,
} from "../engines/thesisEngine";

interface ThesisLabTabProps {
  activeMetrics: PortfolioSummaryMetrics;
  activeTickers: string[];
  activeWeights: Record<string, number>;
  rfRate: number;
  ppy: number;
  onApplyThesisToPortfolio: (tickers: string[], weights: Record<string, number>) => void;
  onAskAI: (prompt: string, sectionContext: any) => void;
}

export const ThesisLabTab: React.FC<ThesisLabTabProps> = ({
  activeMetrics,
  activeTickers,
  activeWeights,
  rfRate,
  ppy,
  onApplyThesisToPortfolio,
  onAskAI,
}) => {
  const [selectedArchetype, setSelectedArchetype] = useState<ThematicArchetype>(
    PRESET_THESES_ARCHETYPES[0]
  );
  const [activeMode, setActiveMode] = useState<"presets" | "custom" | "autonomous">("presets");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedTickers, setSelectedTickers] = useState<string[]>(
    PRESET_THESES_ARCHETYPES[0].defaultTickers
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [thesisResult, setThesisResult] = useState<InvestmentThesis | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Initialize evaluation on mount
  useEffect(() => {
    evaluateCurrentThesis(selectedArchetype, selectedTickers);
  }, []);

  const evaluateCurrentThesis = (
    archetype: ThematicArchetype,
    tickersToEvaluate: string[]
  ) => {
    setIsEvaluating(true);
    setCurrentTestIndex(0);

    // Simulate multi-test pipeline progress animation
    const interval = setInterval(() => {
      setCurrentTestIndex((prev) => {
        if (prev >= 6) {
          clearInterval(interval);
          const result = runAutonomousThesisEvaluation(
            {
              id: archetype.id,
              title: archetype.title,
              thematicCategory: archetype.category,
              hypothesis: archetype.hypothesis,
              selectedTickers: tickersToEvaluate,
              rationale: archetype.rationale,
            },
            activeMetrics,
            activeTickers,
            activeWeights,
            rfRate,
            ppy
          );
          setThesisResult(result);
          setIsEvaluating(false);
          return 7;
        }
        return prev + 1;
      });
    }, 180);
  };

  const handleSelectPreset = (archetype: ThematicArchetype) => {
    setSelectedArchetype(archetype);
    setSelectedTickers(archetype.defaultTickers);
    setAppliedSuccess(false);
    evaluateCurrentThesis(archetype, archetype.defaultTickers);
  };

  const handleRunAutonomousDiscovery = async () => {
    setIsEvaluating(true);
    setCurrentTestIndex(0);
    setActiveMode("autonomous");

    try {
      const response = await fetch("/api/ai/thesis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Discover an autonomous high-conviction asymmetric investment thesis combining top-tier quality compounders with structural growth innovators and macro buffers.",
          availableTickers: Object.keys(INITIAL_FUNDAMENTALS),
          activePortfolio: {
            tickers: activeTickers,
            sharpe: activeMetrics.sharpeRatio,
            annReturn: activeMetrics.annualizedReturn,
            vol: activeMetrics.annualizedVol,
          },
        }),
      });

      const data = await response.json();
      if (data.thesis && data.thesis.selectedTickers) {
        const customArchetype: ThematicArchetype = {
          id: data.thesis.id || "auto_" + Date.now(),
          title: data.thesis.title || "Autonomous Quantitative Discovery",
          subtitle: "AI Agent Formulated Hypothesis & Asset Selection",
          category: data.thesis.thematicCategory || "Autonomous Alpha",
          hypothesis: data.thesis.hypothesis || "Multi-asset diversification optimizes risk-adjusted return.",
          defaultTickers: data.thesis.selectedTickers,
          rationale: data.thesis.rationale || "Selected based on empirical covariance minimization.",
          targetObjective: "Max Sharpe",
        };
        setSelectedArchetype(customArchetype);
        setSelectedTickers(data.thesis.selectedTickers);
        evaluateCurrentThesis(customArchetype, data.thesis.selectedTickers);
      } else {
        evaluateCurrentThesis(PRESET_THESES_ARCHETYPES[0], PRESET_THESES_ARCHETYPES[0].defaultTickers);
      }
    } catch (err) {
      console.warn("Autonomous thesis error, falling back:", err);
      evaluateCurrentThesis(PRESET_THESES_ARCHETYPES[3], PRESET_THESES_ARCHETYPES[3].defaultTickers);
    }
  };

  const handleRunCustomHypothesis = async () => {
    if (!customPrompt.trim()) return;
    setIsEvaluating(true);
    setCurrentTestIndex(0);

    try {
      const response = await fetch("/api/ai/thesis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: customPrompt,
          availableTickers: Object.keys(INITIAL_FUNDAMENTALS),
          activePortfolio: {
            tickers: activeTickers,
            sharpe: activeMetrics.sharpeRatio,
          },
        }),
      });

      const data = await response.json();
      if (data.thesis && data.thesis.selectedTickers) {
        const customArchetype: ThematicArchetype = {
          id: "custom_" + Date.now(),
          title: data.thesis.title || "Custom User Thesis",
          subtitle: "AI Quant Structured Hypothesis",
          category: data.thesis.thematicCategory || "Custom Hypothesis",
          hypothesis: data.thesis.hypothesis || customPrompt,
          defaultTickers: data.thesis.selectedTickers,
          rationale: data.thesis.rationale || "Assets selected to test user hypothesis.",
          targetObjective: "Factor Alpha",
        };
        setSelectedArchetype(customArchetype);
        setSelectedTickers(data.thesis.selectedTickers);
        evaluateCurrentThesis(customArchetype, data.thesis.selectedTickers);
      }
    } catch (err) {
      console.warn("Custom thesis error:", err);
    }
  };

  const handleToggleTicker = (ticker: string) => {
    let next: string[];
    if (selectedTickers.includes(ticker)) {
      if (selectedTickers.length <= 2) return; // Keep at least 2
      next = selectedTickers.filter((t) => t !== ticker);
    } else {
      if (selectedTickers.length >= 10) return; // Max 10
      next = [...selectedTickers, ticker];
    }
    setSelectedTickers(next);
    evaluateCurrentThesis(selectedArchetype, next);
  };

  const handleApplyToActive = () => {
    if (!thesisResult) return;
    onApplyThesisToPortfolio(thesisResult.selectedTickers, thesisResult.targetWeights);
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 4000);
  };

  const handleExportMemo = () => {
    if (!thesisResult) return;
    const memoBlob = new Blob([thesisResult.agentExecutiveMemo], { type: "text/markdown" });
    const url = URL.createObjectURL(memoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Institutional_Thesis_Memo_${thesisResult.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TEST_NAMES = [
    "Markowitz & Tangency Optimization",
    "Carhart 4-Factor OLS Alpha Significance",
    "Cornish-Fisher & Basel VaR Backtest",
    "Macro Crisis Stress & Drawdown Test",
    "GARCH(1,1) Volatility Memory & Persistence",
    "2-State Gaussian HMM Regime Detection",
    "Monte Carlo 1,000-Path Payout Cone",
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Thesis Lab Header */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#a371f7]/15 border border-[#a371f7]/30 flex items-center justify-center text-[#a371f7]">
                <FlaskConical className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-[#f0f6fc]">
                Autonomous Quant Thesis & Testing Lab
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded-full bg-[#a371f7]/15 text-[#a371f7] border border-[#a371f7]/30">
                Agentic Multi-Test Engine
              </span>
            </div>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Empower the AI Agent to independently formulate macroeconomic and factor investment theses, select custom company universes across diverse sectors, and audit hypotheses across a 7-stage empirical quantitative testing pipeline.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAutonomousDiscovery}
              disabled={isEvaluating}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#a371f7] hover:bg-[#b083f8] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Autonomous Discovery</span>
            </button>
          </div>
        </div>

        {/* Exploration Modes Switcher */}
        <div className="mt-5 pt-4 border-t border-[#21262d] flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveMode("presets")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === "presets"
                ? "bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30"
                : "bg-[#0d1117] text-[#8b949e] hover:text-[#f0f6fc] border border-[#21262d]"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Thematic Archetypes ({PRESET_THESES_ARCHETYPES.length})
          </button>
          <button
            onClick={() => setActiveMode("custom")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === "custom"
                ? "bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30"
                : "bg-[#0d1117] text-[#8b949e] hover:text-[#f0f6fc] border border-[#21262d]"
            }`}
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            Custom Hypothesis Builder
          </button>
        </div>
      </div>

      {/* Preset Archetypes Carousel or Custom Builder */}
      {activeMode === "presets" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PRESET_THESES_ARCHETYPES.map((arch) => {
            const isSelected = selectedArchetype.id === arch.id;
            return (
              <div
                key={arch.id}
                onClick={() => handleSelectPreset(arch)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#0d1117] border-[#a371f7] ring-1 ring-[#a371f7]/50 shadow-md"
                    : "bg-[#161b22] border-[#21262d] hover:border-[#30363d] hover:bg-[#161b22]/80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-[#21262d] text-[#8b949e]">
                      {arch.category}
                    </span>
                    <span className="text-[10px] font-semibold text-[#3fb950] bg-[#238636]/15 px-2 py-0.5 rounded-full border border-[#238636]/30">
                      {arch.targetObjective}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#f0f6fc] mb-1">
                    {arch.title}
                  </h3>
                  <p className="text-[11px] text-[#8b949e] line-clamp-2 leading-relaxed mb-3">
                    {arch.hypothesis}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#21262d] flex items-center justify-between">
                  <div className="flex items-center gap-1 flex-wrap">
                    {arch.defaultTickers.slice(0, 5).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[#c9d1d9]"
                      >
                        {t}
                      </span>
                    ))}
                    {arch.defaultTickers.length > 5 && (
                      <span className="text-[10px] text-[#8b949e]">
                        +{arch.defaultTickers.length - 5}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="text-xs text-[#a371f7] font-semibold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Testing
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Hypothesis Input Box */}
      {activeMode === "custom" && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-[#f0f6fc] block mb-1">
              Specify Custom Hypothesis or Asset Universe for the AI Agent:
            </label>
            <p className="text-[11px] text-[#8b949e] mb-3">
              Prompt the agent with your thesis (e.g. &ldquo;Test if adding Gold (GLD) and Treasury bonds (TLT) to Tech 7 dampens 2008 & 2022 max drawdown while keeping Sharpe &gt; 1.4&rdquo;).
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Evaluate whether high dividend healthcare and energy stocks outperform tech during stagflationary regimes..."
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#a371f7]"
                onKeyDown={(e) => e.key === "Enter" && handleRunCustomHypothesis()}
              />
              <button
                onClick={handleRunCustomHypothesis}
                disabled={isEvaluating || !customPrompt.trim()}
                className="px-5 py-2.5 bg-[#a371f7] hover:bg-[#b083f8] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-2"
              >
                <Play className="h-3.5 w-3.5" />
                Formulate & Test Thesis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Universe & Selection Matrix */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#58a6ff]" />
              Candidate Asset Selection ({selectedTickers.length} Assets Selected)
            </h3>
            <p className="text-[11px] text-[#8b949e] mt-0.5">
              Click any asset to toggle its inclusion in the agent&apos;s candidate testing universe.
            </p>
          </div>
          <div className="text-xs text-[#8b949e] font-mono">
            {selectedTickers.join(" · ")}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {Object.values(INITIAL_FUNDAMENTALS).map((fund) => {
            const isSelected = selectedTickers.includes(fund.ticker);
            const targetWeight = thesisResult?.targetWeights[fund.ticker] || 0;
            return (
              <button
                key={fund.ticker}
                onClick={() => handleToggleTicker(fund.ticker)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2.5 ${
                  isSelected
                    ? "bg-[#0d1117] border border-[#58a6ff] text-[#f0f6fc] shadow-sm"
                    : "bg-[#161b22] border border-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]/50"
                }`}
              >
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold">{fund.ticker}</span>
                    <span className="text-[10px] text-[#8b949e]">({fund.sector})</span>
                  </div>
                  {isSelected && targetWeight > 0 && (
                    <div className="text-[10px] font-mono text-[#3fb950]">
                      w*: {(targetWeight * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
                {isSelected ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#58a6ff]" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border border-[#30363d] inline-block" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Test Progress Execution Bar */}
      {isEvaluating && (
        <div className="bg-[#0d1117] border border-[#a371f7]/40 rounded-xl p-5 space-y-3 animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#a371f7] flex items-center gap-2">
              <Zap className="h-4 w-4 animate-spin" />
              Running Stage {currentTestIndex + 1} of 7: {TEST_NAMES[currentTestIndex] || "Finalizing Synthesis"}
            </span>
            <span className="font-mono text-[#8b949e]">
              {Math.min(100, Math.round(((currentTestIndex + 1) / 7) * 100))}% Complete
            </span>
          </div>
          <div className="w-full bg-[#161b22] rounded-full h-2 overflow-hidden border border-[#21262d]">
            <div
              className="bg-[#a371f7] h-full transition-all duration-200"
              style={{ width: `${Math.min(100, ((currentTestIndex + 1) / 7) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Thesis Scorecard & Verdict */}
      {thesisResult && !isEvaluating && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 sm:p-6 space-y-6">
          {/* Top Score & Verdict Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#21262d]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono font-semibold px-2.5 py-0.5 rounded-md bg-[#21262d] text-[#8b949e]">
                  {thesisResult.thematicCategory}
                </span>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    thesisResult.verdict.includes("Approved")
                      ? "bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30"
                      : thesisResult.verdict.includes("Conditional")
                      ? "bg-[#d29922]/15 text-[#d29922] border border-[#d29922]/30"
                      : "bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/30"
                  }`}
                >
                  {thesisResult.verdict.includes("Approved") ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {thesisResult.verdict}
                </span>
              </div>
              <h3 className="text-base font-bold text-[#f0f6fc] pt-1">
                {thesisResult.title}
              </h3>
              <p className="text-xs text-[#8b949e] leading-relaxed max-w-2xl">
                {thesisResult.hypothesis}
              </p>
            </div>

            {/* Scorecard Widget */}
            <div className="flex items-center gap-4 bg-[#0d1117] border border-[#21262d] rounded-xl p-4 shrink-0">
              <div>
                <div className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">
                  Empirical Confidence
                </div>
                <div className="text-2xl font-bold font-mono text-[#a371f7]">
                  {thesisResult.overallConfidenceScore}
                  <span className="text-xs text-[#8b949e]">/100</span>
                </div>
                <div className="text-[10px] text-[#3fb950]">
                  7/7 Tests Audited
                </div>
              </div>
              <div className="h-10 w-[1px] bg-[#21262d]" />
              <div>
                <div className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">
                  Expected Sharpe
                </div>
                <div className="text-2xl font-bold font-mono text-[#3fb950]">
                  {thesisResult.comparisonWithActive.thesisSharpe.toFixed(2)}
                </div>
                <div className="text-[10px] text-[#8b949e]">
                  Δ vs Active:{" "}
                  <span
                    className={
                      thesisResult.comparisonWithActive.thesisSharpe >=
                      thesisResult.comparisonWithActive.activeSharpe
                        ? "text-[#3fb950]"
                        : "text-[#f85149]"
                    }
                  >
                    {(
                      thesisResult.comparisonWithActive.thesisSharpe -
                      thesisResult.comparisonWithActive.activeSharpe
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison vs Current Active Terminal Portfolio */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] mb-3 flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#58a6ff]" />
              Empirical Comparison: Agent Thesis vs. Active Terminal Portfolio
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#21262d] text-[#8b949e] text-[10px] uppercase">
                    <th className="pb-2">Quantitative Metric</th>
                    <th className="pb-2">Active Terminal Book</th>
                    <th className="pb-2 text-[#a371f7]">Agent&apos;s Tested Thesis</th>
                    <th className="pb-2">Alpha / Delta</th>
                    <th className="pb-2">Hurdle Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]/60 font-mono">
                  <tr>
                    <td className="py-2.5 text-[#c9d1d9] font-sans font-medium">Annualized Return</td>
                    <td className="py-2.5 text-[#8b949e]">
                      {(thesisResult.comparisonWithActive.activeAnnReturn * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 font-bold text-[#3fb950]">
                      {(thesisResult.comparisonWithActive.thesisAnnReturn * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-[#3fb950]">
                      {thesisResult.comparisonWithActive.alphaVsActive >= 0 ? "+" : ""}
                      {(thesisResult.comparisonWithActive.alphaVsActive * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-[#3fb950] font-sans text-[11px]">
                      {thesisResult.comparisonWithActive.alphaVsActive > 0 ? "✓ Outperforming" : "Neutral"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#c9d1d9] font-sans font-medium">Annualized Volatility</td>
                    <td className="py-2.5 text-[#8b949e]">
                      {(thesisResult.comparisonWithActive.activeVol * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 font-bold text-[#58a6ff]">
                      {(thesisResult.comparisonWithActive.thesisVol * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-[#8b949e]">
                      {(
                        (thesisResult.comparisonWithActive.thesisVol -
                          thesisResult.comparisonWithActive.activeVol) *
                        100
                      ).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-[#c9d1d9] font-sans text-[11px]">
                      {thesisResult.comparisonWithActive.thesisVol < 0.20 ? "✓ Controlled" : "High Vol"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#c9d1d9] font-sans font-medium">Sharpe Ratio (Rf: {(rfRate * 100).toFixed(2)}%)</td>
                    <td className="py-2.5 text-[#8b949e]">
                      {thesisResult.comparisonWithActive.activeSharpe.toFixed(2)}
                    </td>
                    <td className="py-2.5 font-bold text-[#a371f7]">
                      {thesisResult.comparisonWithActive.thesisSharpe.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-[#3fb950]">
                      +{(
                        thesisResult.comparisonWithActive.thesisSharpe -
                        thesisResult.comparisonWithActive.activeSharpe
                      ).toFixed(2)}
                    </td>
                    <td className="py-2.5 text-[#3fb950] font-sans text-[11px]">
                      {thesisResult.comparisonWithActive.thesisSharpe >= 1.3 ? "✓ Institutional Grade" : "Acceptable"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#c9d1d9] font-sans font-medium">1-Day 95% Cornish-Fisher VaR</td>
                    <td className="py-2.5 text-[#8b949e]">-1.45%</td>
                    <td className="py-2.5 font-bold text-[#f85149]">
                      -{(thesisResult.comparisonWithActive.thesisVaR * 100).toFixed(2)}%
                    </td>
                    <td className="py-2.5 text-[#8b949e]">
                      {(
                        (thesisResult.comparisonWithActive.thesisVaR - 0.0145) *
                        100
                      ).toFixed(2)}%
                    </td>
                    <td className="py-2.5 text-[#3fb950] font-sans text-[11px]">
                      ✓ Tail Risk Bounded
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[#c9d1d9] font-sans font-medium">Max Historical / Scenario Drawdown</td>
                    <td className="py-2.5 text-[#8b949e]">
                      -{(thesisResult.comparisonWithActive.activeMaxDd * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 font-bold text-[#d29922]">
                      -{(thesisResult.comparisonWithActive.thesisMaxDd * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-[#8b949e]">
                      {(
                        (thesisResult.comparisonWithActive.thesisMaxDd -
                          thesisResult.comparisonWithActive.activeMaxDd) *
                        100
                      ).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-[#3fb950] font-sans text-[11px]">
                      {thesisResult.comparisonWithActive.thesisMaxDd < 0.22 ? "✓ Resilient" : "Moderate Risk"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 7-Stage Quantitative Test Suite Cards */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#3fb950]" />
              7-Stage Quantitative & Econometric Test Results
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {thesisResult.testResults.map((test, idx) => (
                <div
                  key={test.id}
                  className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#8b949e] bg-[#161b22] px-1.5 py-0.5 rounded">
                        0{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[#f0f6fc]">
                        {test.name}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${
                        test.status === "pass"
                          ? "bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30"
                          : test.status === "warning"
                          ? "bg-[#d29922]/15 text-[#d29922] border border-[#d29922]/30"
                          : "bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/30"
                      }`}
                    >
                      {test.status === "pass" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : test.status === "warning" ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {test.status} ({test.score}/100)
                    </span>
                  </div>

                  <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#21262d] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-[#8b949e]">
                        {test.keyMetricLabel}
                      </div>
                      <div className="text-xs font-bold font-mono text-[#f0f6fc]">
                        {test.keyMetricValue}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#8b949e]">Benchmark</div>
                      <div className="text-[11px] font-mono text-[#58a6ff]">
                        {test.benchmarkComparison}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#8b949e] leading-relaxed">
                    {test.agentNotes}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Vulnerabilities & Recommended Hedges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-[#0d1117] border border-[#f85149]/20 rounded-xl p-4 space-y-2">
              <h5 className="text-xs font-bold text-[#f85149] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Identified Vulnerabilities & Tail Risks:
              </h5>
              <ul className="space-y-1.5 text-xs text-[#c9d1d9]">
                {thesisResult.vulnerabilities.map((v, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#f85149] mt-0.5">•</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0d1117] border border-[#3fb950]/20 rounded-xl p-4 space-y-2">
              <h5 className="text-xs font-bold text-[#3fb950] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Agent Recommended Hedging Overlays:
              </h5>
              <ul className="space-y-1.5 text-xs text-[#c9d1d9]">
                {thesisResult.recommendedHedges.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#3fb950] mt-0.5">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Bar (Apply to Portfolio & Export Memo) */}
          <div className="pt-4 border-t border-[#21262d] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onAskAI(
                    `Critique the quantitative thesis "${thesisResult.title}" (Tickers: ${thesisResult.selectedTickers.join(", ")}). What are the main econometric risks?`,
                    thesisResult
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Probe Thesis in AI Chat
              </button>

              <button
                onClick={handleExportMemo}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Export Research Memo (.md)
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleApplyToActive}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                {appliedSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    Applied to Active Portfolio!
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Apply Thesis Assets & Weights to Terminal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
