import React from "react";
import { PortfolioSummaryMetrics } from "../types";
import { TrendingUp, ShieldAlert, Activity, Landmark, Sparkles, Download } from "lucide-react";

interface HeaderProps {
  metrics: PortfolioSummaryMetrics;
  tickers: string[];
  rfRate: number;
  aiOnline: boolean;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  tickers,
  rfRate,
  aiOnline,
  onExport,
}) => {
  return (
    <header className="bg-[#161b22] border-b border-[#21262d] px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#58a6ff]/10 border border-[#58a6ff]/30 flex items-center justify-center text-[#58a6ff]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#f0f6fc]">
                  Institutional Portfolio Analytics
                </h1>
                <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30">
                  v3.5 PRO
                </span>
                {aiOnline ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30">
                    <Sparkles className="h-3 w-3" />
                    Gemini AI Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#21262d] text-[#8b949e]">
                    Quant Engine
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8b949e] mt-0.5">
                Markowitz & Black-Litterman Optimization · VaR / CVaR · Factor Econometrics · Stress Testing · HMM Regimes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-3.5 py-1.5 min-w-[130px]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[#8b949e]">
              Return (Ann.)
            </div>
            <div className="text-base font-bold font-mono text-[#3fb950] flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {(metrics.annualizedReturn * 100).toFixed(2)}%
            </div>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-3.5 py-1.5 min-w-[130px]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[#8b949e]">
              Volatility (Ann.)
            </div>
            <div className="text-base font-bold font-mono text-[#58a6ff] flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              {(metrics.annualizedVol * 100).toFixed(2)}%
            </div>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-3.5 py-1.5 min-w-[120px]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[#8b949e]">
              Sharpe Ratio
            </div>
            <div className="text-base font-bold font-mono text-[#f0f6fc]">
              {metrics.sharpeRatio.toFixed(2)}
            </div>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-3.5 py-1.5 min-w-[120px]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[#8b949e]">
              Risk-Free 10Y
            </div>
            <div className="text-base font-bold font-mono text-[#d29922] flex items-center gap-1">
              <Landmark className="h-3.5 w-3.5" />
              {(rfRate * 100).toFixed(2)}%
            </div>
          </div>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            title="Export Institutional Analysis (SR 11-7 Manifest)"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span> JSON
          </button>
        </div>
      </div>
    </header>
  );
};
