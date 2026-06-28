"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Activity, Clock } from "lucide-react";

interface StockData {
  currentPrice: number;
  currency: string;
  change: number;
  marketCap: string;
  peRatio: string;
  week52High: string;
  week52Low: string;
  volume: string;
  avgVolume: string;
  eps: string;
}

interface ValuationCardProps {
  ticker: string;
  decision: "PASS" | "FAIL" | "INVALID" | "";
}

export function ValuationCard({ ticker, decision }: ValuationCardProps) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setError(false);

    fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error || !d.currentPrice) { setError(true); }
        else setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (!ticker || (!loading && error)) return null;

  const accentColor = decision === "PASS" ? "emerald" : decision === "FAIL" ? "rose" : "zinc";

  const Metric = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex flex-col gap-1 bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:bg-white/10 transition-colors duration-200">
      <div className="flex items-center gap-2 text-zinc-400 text-xs">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <div className="text-white font-semibold text-sm">{value}</div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-white/10">
        <h3 className="text-white font-bold text-lg">Current Valuation</h3>
        <p className="text-zinc-400 text-sm mt-0.5">Live market data for {ticker}</p>
      </div>

      {loading ? (
        <div className="px-6 py-8 flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm">Fetching live market data...</span>
        </div>
      ) : data ? (
        <div className="p-6 space-y-5">
          {/* Price + Change */}
          <div className="flex items-end gap-4">
            <div>
              <div className="text-4xl font-extrabold text-white tracking-tight">
                {data.currency === "INR" ? "₹" : "$"}
                {data.currentPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${data.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {data.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {data.change >= 0 ? "+" : ""}{(data.change * 100).toFixed(2)}% today
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Metric icon={DollarSign} label="Market Cap" value={data.marketCap} />
            <Metric icon={BarChart2} label="P/E Ratio" value={data.peRatio || "N/A"} />
            <Metric icon={Activity} label="EPS (TTM)" value={data.eps !== "N/A" ? `${data.currency === "INR" ? "₹" : "$"}${data.eps}` : "N/A"} />
            <Metric icon={TrendingUp} label="52W High" value={`${data.currency === "INR" ? "₹" : "$"}${data.week52High}`} />
            <Metric icon={TrendingDown} label="52W Low" value={`${data.currency === "INR" ? "₹" : "$"}${data.week52Low}`} />
            <Metric icon={Clock} label="Avg Volume" value={data.avgVolume} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
