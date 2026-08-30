import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  HelpCircle,
  TrendingUp,
  ShieldAlert,
  Flame,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { PortfolioSummaryMetrics } from "../types";

interface ChatAssistantTabProps {
  tickers: string[];
  weights: Record<string, number>;
  metrics: PortfolioSummaryMetrics;
  rfRate: number;
  onSendChatMessage: (message: string, history: any[]) => Promise<string>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Formulate your best autonomous investment thesis using a custom selection of companies and test it.",
  "Test if adding Gold (GLD) and Treasuries (TLT) dampens 2022 Fed rate shock drawdown while keeping Sharpe > 1.4.",
  "What is our highest-beta holding and how does it impact portfolio VaR?",
  "How vulnerable is this portfolio to a 300bps Federal Reserve rate hike?",
  "Summarize our factor tilts across Fama-French SMB, HML, and Carhart Momentum.",
  "Suggest a Black-Litterman view overlay to enhance portfolio Sharpe ratio.",
];

export const ChatAssistantTab: React.FC<ChatAssistantTabProps> = ({
  tickers,
  weights,
  metrics,
  rfRate,
  onSendChatMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I am your **Institutional Portfolio AI Quant Analyst**, powered by server-side Gemini.
I have full real-time access to your portfolio holdings (${tickers.join(", ")}), Markowitz & Black-Litterman optimization parameters, VaR/CVaR risk surfaces, GARCH volatility forecasts, and macroeconomic stress testing results.

How can I assist your investment committee or risk management team today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build context history
      const history = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const reply = await onSendChatMessage(text, history);

      const assistantMsg: Message = {
        role: "assistant",
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      const errorMsg: Message = {
        role: "assistant",
        content: `Error: ${e.message || "Failed to reach AI Quant server."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl flex flex-col h-[780px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-[#21262d] flex items-center justify-between bg-[#0d1117]/80">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#58a6ff]/15 border border-[#58a6ff]/30 flex items-center justify-center text-[#58a6ff]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f0f6fc]">
              AI Portfolio Quantitative Analyst
            </h2>
            <p className="text-[11px] text-[#8b949e]">
              Institutional dialogue on factor exposure, tail risk, and Black-Litterman calibration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#3fb950] bg-[#238636]/15 border border-[#238636]/30 px-2 py-0.5 rounded-full">
            Online · Live State Connected
          </span>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2.5 bg-[#0d1117]/40 border-b border-[#21262d] flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] text-[#8b949e] font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
          <HelpCircle className="h-3 w-3" /> Quick Prompts:
        </span>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            className="text-xs bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] border border-[#30363d] px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer text-left"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 max-w-4xl ${
              msg.role === "user" ? "ml-auto justify-end" : "mr-auto justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-lg bg-[#58a6ff]/15 border border-[#58a6ff]/30 flex items-center justify-center text-[#58a6ff] shrink-0 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`rounded-xl p-3.5 text-xs leading-relaxed max-w-[85%] relative group ${
                msg.role === "user"
                  ? "bg-[#58a6ff]/20 text-[#f0f6fc] border border-[#58a6ff]/40"
                  : "bg-[#0d1117] text-[#c9d1d9] border border-[#21262d]"
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-1">
                <span className="text-[10px] font-bold text-[#8b949e]">
                  {msg.role === "user" ? "Portfolio Manager" : "AI Quant Analyst"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8b949e]">{msg.timestamp}</span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="opacity-0 group-hover:opacity-100 text-[#8b949e] hover:text-[#f0f6fc] transition-opacity"
                      title="Copy response"
                    >
                      {copiedIdx === idx ? (
                        <Check className="h-3 w-3 text-[#3fb950]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="whitespace-pre-wrap font-sans text-[13px] text-[#f0f6fc]">
                {msg.content}
              </div>
            </div>

            {msg.role === "user" && (
              <div className="h-7 w-7 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#c9d1d9] shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-4xl mr-auto">
            <div className="h-7 w-7 rounded-lg bg-[#58a6ff]/15 border border-[#58a6ff]/30 flex items-center justify-center text-[#58a6ff] shrink-0 mt-0.5 animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3 text-xs text-[#8b949e] flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#58a6ff] animate-ping"></div>
              Synthesizing institutional quantitative insights...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-[#21262d] bg-[#0d1117]/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a quantitative question (e.g. 'Evaluate our downside risk in a 2008 liquidity crunch')..."
            className="flex-1 bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-2.5 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
