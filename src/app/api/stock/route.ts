import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "No ticker" }, { status: 400 });

  try {
    // Fetch quote summary (price, market cap, P/E, etc.)
    const summaryRes = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,price,defaultKeyStatistics`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );

    // Fetch 5-year monthly chart data
    const chartRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1mo&range=5y`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );

    if (!summaryRes.ok || !chartRes.ok) {
      return NextResponse.json({ error: "Yahoo Finance fetch failed" }, { status: 502 });
    }

    const summaryData = await summaryRes.json();
    const chartData = await chartRes.json();

    const price = summaryData?.quoteSummary?.result?.[0]?.price;
    const summary = summaryData?.quoteSummary?.result?.[0]?.summaryDetail;
    const keyStats = summaryData?.quoteSummary?.result?.[0]?.defaultKeyStatistics;

    const chart = chartData?.chart?.result?.[0];
    const timestamps: number[] = chart?.timestamp || [];
    const closes: number[] = chart?.indicators?.quote?.[0]?.close || [];

    const chartPoints = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        price: closes[i] ? parseFloat(closes[i].toFixed(2)) : null,
      }))
      .filter((p) => p.price !== null);

    const formatNum = (n: number | undefined) => {
      if (!n) return "N/A";
      if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
      if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
      return `$${n.toFixed(2)}`;
    };

    return NextResponse.json({
      currentPrice: price?.regularMarketPrice?.raw,
      currency: price?.currency || "USD",
      change: price?.regularMarketChangePercent?.raw,
      marketCap: formatNum(price?.marketCap?.raw),
      peRatio: summary?.trailingPE?.raw?.toFixed(2) || keyStats?.trailingEps?.raw ? (price?.regularMarketPrice?.raw / keyStats?.trailingEps?.raw).toFixed(2) : "N/A",
      week52High: summary?.fiftyTwoWeekHigh?.raw?.toFixed(2),
      week52Low: summary?.fiftyTwoWeekLow?.raw?.toFixed(2),
      volume: price?.regularMarketVolume?.fmt || "N/A",
      avgVolume: price?.averageDailyVolume3Month?.fmt || "N/A",
      eps: keyStats?.trailingEps?.raw?.toFixed(2) || "N/A",
      chartPoints,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
