"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { TrendingUp, TrendingDown, AlertCircle, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { ValuationCard } from "./ValuationCard";
import { StockChart } from "./StockChart";

interface ResultsDashboardProps {
  decision: "PASS" | "FAIL" | "INVALID" | "";
  analysis: string;
  ticker: string;
}

export function ResultsDashboard({ decision, analysis, ticker }: ResultsDashboardProps) {
  if (!decision && !analysis) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      {decision && (
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-8 border backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between",
          decision === "PASS" 
            ? "bg-emerald-950/40 border-emerald-500/30 shadow-emerald-900/20" 
            : decision === "FAIL"
            ? "bg-rose-950/40 border-rose-500/30 shadow-rose-900/20"
            : "bg-amber-950/40 border-amber-500/30 shadow-amber-900/20"
        )}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-6">
            <div className={cn(
              "p-4 rounded-2xl",
              decision === "PASS" ? "bg-emerald-500/20 text-emerald-400" 
              : decision === "FAIL" ? "bg-rose-500/20 text-rose-400"
              : "bg-amber-500/20 text-amber-400"
            )}>
              {decision === "PASS" ? <TrendingUp className="w-10 h-10" /> 
               : decision === "FAIL" ? <TrendingDown className="w-10 h-10" /> 
               : <AlertCircle className="w-10 h-10" />}
            </div>
            <div>
              <h2 className="text-zinc-400 font-medium text-lg mb-1">Final Verdict</h2>
              <div className={cn(
                "text-5xl font-extrabold tracking-tight",
                decision === "PASS" ? "text-emerald-400" 
                : decision === "FAIL" ? "text-rose-400"
                : "text-amber-400"
              )}>
                {decision}
              </div>
            </div>
          </div>
          
          <div className="relative z-10 mt-6 md:mt-0 text-right">
            <p className="text-zinc-400 text-sm max-w-xs ml-auto">
              Based on fundamental analysis, market sentiment, and recent news data processed by the AI agent.
            </p>
          </div>
        </div>
      )}

      {ticker && decision !== "INVALID" && (
        <div className="flex flex-col space-y-6">
          <ValuationCard ticker={ticker} decision={decision} />
          <StockChart ticker={ticker} />
        </div>
      )}

      {analysis && (
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
            <LineChart className="w-6 h-6 text-indigo-400" />
            <h3 className="text-2xl font-bold text-white">Detailed Reasoning</h3>
          </div>
          
          <div className="prose prose-invert prose-emerald max-w-none">
            <ReactMarkdown
              components={{
                h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-zinc-100 mt-8 mb-4 flex items-center gap-2" {...props} />,
                ul: ({node, ...props}) => <ul className="space-y-3 mb-6" {...props} />,
                li: ({node, ...props}) => <li className="flex items-start text-zinc-300" {...props} />,
                strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </motion.div>
  );
}
