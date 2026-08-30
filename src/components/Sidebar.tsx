import React, { useState } from "react";
import {
  SlidersHorizontal,
  Layers,
  Calendar,
  Sparkles,
  RefreshCw,
  Plus,
  X,
  FileJson,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { INITIAL_FUNDAMENTALS } from "../data/marketData";

interface SidebarProps {
  selectedTickers: string[];
  onChangeTickers: (tickers: string[]) => void;
  interval: "1d" | "1wk" | "1mo";
  onChangeInterval: (interval: "1d" | "1wk" | "1mo") => void;
  rfRate: number;
  onChangeRfRate: (rate: number) => void;
  aiOnline: boolean;
  onRefreshData: () => void;
  onExportJson: () => void;
}

const PRESETS: { label: string; tickers: string[] }[] = [
  {
    label: "Institutional Default",
    tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "MU", "WDC", "WMT", "UNH", "DELL", "CAT", "BIDU"],
  },
  {
    label: "AI Infrastructure & Compute",
    tickers: ["NVDA", "ASML", "MU", "DELL", "MSFT", "AMD"],
  },
  {
    label: "All-Weather Quality Compounders",
    tickers: ["UNH", "WMT", "JPM", "XOM", "COST", "LLY"],
  },
  {
    label: "Stagflation Real Asset Shield",
    tickers: ["XOM", "GLD", "CAT", "NEE", "WMT", "JPM"],
  },
  {
    label: "Asymmetric Tech + Flight Hedge",
    tickers: ["AAPL", "MSFT", "GOOGL", "META", "TLT", "GLD"],
  },
  {
    label: "Mega-Cap Tech 7",
    tickers: ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  selectedTickers,
  onChangeTickers,
  interval,
  onChangeInterval,
  rfRate,
  onChangeRfRate,
  aiOnline,
  onRefreshData,
  onExportJson,
}) => {
  const [tickerInput, setTickerInput] = useState("");
  const [inputError, setInputError] = useState("");

  const handleAddTicker = (tickerToAdd?: string) => {
    const sym = (tickerToAdd || tickerInput).trim().toUpperCase();
    if (!sym) return;

    if (selectedTickers.includes(sym)) {
      setInputError(`${sym} already in portfolio.`);
      return;
    }

    if (selectedTickers.length >= 30) {
      setInputError("Maximum 30 assets supported for optimal matrix stability.");
      return;
    }

    onChangeTickers([...selectedTickers, sym]);
    setTickerInput("");
    setInputError("");
  };

  const handleRemoveTicker = (tickerToRemove: string) => {
    if (selectedTickers.length <= 2) {
      setInputError("Portfolio requires at least 2 assets for covariance matrix.");
      return;
    }
    onChangeTickers(selectedTickers.filter((t) => t !== tickerToRemove));
    setInputError("");
  };

  return (
    <aside className="w-full lg:w-80 bg-[#161b22] border-r border-[#21262d] p-5 flex flex-col gap-6 overflow-y-auto max-h-screen">
      {/* Portfolio Universe Configuration */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#f0f6fc]">
            <SlidersHorizontal className="h-4 w-4 text-[#58a6ff]" />
            Portfolio Universe
          </div>
          <span className="text-xs font-mono text-[#8b949e]">
            {selectedTickers.length} Assets
          </span>
        </div>

        {/* Preset Selector */}
        <div className="mb-3">
          <label className="text-xs text-[#8b949e] font-medium block mb-1.5">
            Universe Presets
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => onChangeTickers(p.tickers)}
                className={`px-2.5 py-1.5 text-xs text-left rounded border transition-colors ${
                  selectedTickers.join(",") === p.tickers.join(",")
                    ? "bg-[#58a6ff]/15 border-[#58a6ff]/40 text-[#58a6ff] font-medium"
                    : "bg-[#0d1117] border-[#21262d] text-[#c9d1d9] hover:border-[#30363d]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add Ticker Input */}
        <div className="flex gap-1.5 mb-2">
          <input
            type="text"
            placeholder="Add ticker (e.g. SPY, JPM)..."
            value={tickerInput}
            onChange={(e) => {
              setTickerInput(e.target.value.toUpperCase());
              setInputError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAddTicker()}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs font-mono text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
          />
          <button
            onClick={() => handleAddTicker()}
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#f0f6fc] rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        {inputError && (
          <div className="text-xs text-[#f85149] mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {inputError}
          </div>
        )}

        {/* Ticker Badges */}
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1.5 bg-[#0d1117] rounded-lg border border-[#21262d]">
          {selectedTickers.map((ticker) => {
            const fund = INITIAL_FUNDAMENTALS[ticker];
            return (
              <span
                key={ticker}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#f0f6fc]"
              >
                <span className="font-bold">{ticker}</span>
                {fund && (
                  <span className="text-[10px] text-[#8b949e]">
                    ({fund.sector.slice(0, 4)})
                  </span>
                )}
                <button
                  onClick={() => handleRemoveTicker(ticker)}
                  className="text-[#8b949e] hover:text-[#f85149] p-0.5 transition-colors"
                  title={`Remove ${ticker}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {/* Return Frequency & Time Horizon */}
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f0f6fc] mb-3">
          <Calendar className="h-4 w-4 text-[#58a6ff]" />
          Return Frequency
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: "1d", label: "Daily", sub: "252 ppy" },
              { id: "1wk", label: "Weekly", sub: "52 ppy" },
              { id: "1mo", label: "Monthly", sub: "12 ppy" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeInterval(item.id)}
              className={`p-2 rounded-lg border text-center transition-all ${
                interval === item.id
                  ? "bg-[#58a6ff]/15 border-[#58a6ff]/50 text-[#58a6ff]"
                  : "bg-[#0d1117] border-[#21262d] text-[#c9d1d9] hover:border-[#30363d]"
              }`}
            >
              <div className="text-xs font-bold">{item.label}</div>
              <div className="text-[10px] text-[#8b949e]">{item.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark & Risk-Free Calibration */}
      <div>
        <div className="flex items-center justify-between text-sm font-semibold text-[#f0f6fc] mb-2">
          <span>10Y Treasury Rate (Rf)</span>
          <span className="font-mono text-[#d29922]">{(rfRate * 100).toFixed(2)}%</span>
        </div>
        <input
          type="range"
          min="0.0"
          max="0.08"
          step="0.0025"
          value={rfRate}
          onChange={(e) => onChangeRfRate(parseFloat(e.target.value))}
          className="w-full accent-[#58a6ff] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#8b949e] font-mono mt-1">
          <span>0.00%</span>
          <span>4.25% (UST)</span>
          <span>8.00%</span>
        </div>
      </div>

      {/* AI Assistant Status */}
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f0f6fc]">
            <Sparkles className="h-3.5 w-3.5 text-[#58a6ff]" />
            AI Analytical Layer
          </div>
          {aiOnline ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-[#3fb950]">
              <CheckCircle2 className="h-3 w-3" /> Online
            </span>
          ) : (
            <span className="text-[10px] text-[#8b949e]">Quant Mode</span>
          )}
        </div>
        <p className="text-[11px] text-[#8b949e] leading-relaxed">
          Powered by server-side Gemini 2.5 Flash. Provides real-time plain-English risk commentary, GARCH volatility insights, and stress scenario explanations.
        </p>
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-[#21262d]">
        <button
          onClick={onRefreshData}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#21262d] hover:bg-[#30363d] text-[#f0f6fc] rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Re-estimate Models
        </button>

        <button
          onClick={onExportJson}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <FileJson className="h-3.5 w-3.5" />
          Export SR 11-7 Manifest (JSON)
        </button>
      </div>
    </aside>
  );
};
