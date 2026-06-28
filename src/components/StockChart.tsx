"use client";

import { useEffect, useRef } from "react";

interface StockChartProps {
  ticker: string; // Yahoo Finance format e.g. AAPL, TCS.NS
}

function toTradingViewSymbol(ticker: string): string {
  if (!ticker) return "";
  const t = ticker.toUpperCase();
  if (t.endsWith(".NS")) return `NSE:${t.replace(".NS", "")}`;
  if (t.endsWith(".BO")) return `BSE:${t.replace(".BO", "")}`;
  // Common US tickers
  const nasdaq = ["AAPL","MSFT","GOOGL","GOOG","META","AMZN","NVDA","TSLA","NFLX","INTC","AMD","PYPL","ADBE","CSCO","QCOM","ORCL","CRM","UBER","LYFT","SNAP","TWTR","SPOT","ZOOM","DOCU","ROKU","SHOP","SQ","COIN"];
  if (nasdaq.includes(t)) return `NASDAQ:${t}`;
  return t; // TradingView can auto-resolve most US tickers
}

export function StockChart({ ticker }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  const tvSymbol = toTradingViewSymbol(ticker);

  useEffect(() => {
    if (!containerRef.current || !tvSymbol) return;
    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "W",
      range: "60M",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "2",
      locale: "en",
      backgroundColor: "rgba(0,0,0,0)",
      gridColor: "rgba(255,255,255,0.05)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_volume: true,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [tvSymbol]);

  if (!ticker) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="px-6 pt-5 pb-2 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg">5-Year Price Chart</h3>
          <p className="text-zinc-400 text-sm mt-0.5">Weekly candles — {tvSymbol}</p>
        </div>
        <span className="text-xs text-zinc-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          Powered by TradingView
        </span>
      </div>
      <div
        ref={containerRef}
        className="tradingview-widget-container w-full"
        style={{ height: "500px" }}
      />
    </div>
  );
}
