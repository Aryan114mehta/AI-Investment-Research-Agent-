import { GraphStateType } from "./state";

export async function gatherData(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const { companyName } = state;
  let rawData = "";
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (tavilyKey && tavilyKey.trim() !== "") {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: `${companyName} stock financial performance investment outlook 2024 2025`,
          search_depth: "basic",
          max_results: 6,
        }),
      });
      if (!response.ok) throw new Error(`Tavily error: ${response.status}`);
      const data = await response.json();
      rawData = (data.results as any[])
        .map((r) => `Title: ${r.title}\nContent: ${r.content}`)
        .join("\n\n---\n\n");
      console.log("[Agent] Tavily search successful, results:", data.results.length);
    } catch (e: any) {
      console.warn("[Agent] Tavily failed:", e.message);
      rawData = "No live data available.";
    }
  } else {
    rawData = "No search API configured.";
  }

  return { rawData, status: "Analyzing fundamentals..." };
}

export async function analyzeData(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const { companyName, rawData } = state;

  // Step 1 — Is this a valid company?
  const validityResult = checkValidity(companyName);
  if (validityResult === "INVALID") {
    return {
      analysis: `VERDICT:INVALID\n\n"${companyName}" does not appear to be a real company, stock ticker, or tradable asset. Please enter a valid name like Apple, Tesla, or Infosys.`,
      status: "Generating decision...",
    };
  }

  // Build the LLM prompt
  const prompt = `You are a senior financial analyst. Evaluate "${companyName}" as an investment.

Research Data:
---
${rawData}
---

STEP 1: Is "${companyName}" a real, publicly known company, stock ticker, or cryptocurrency?
- If NOT real (gibberish, random words, food, etc.), return: {"verdict":"INVALID","ticker":"","analysis":"\"${companyName}\" is not a valid company or tradable asset."}

STEP 2: If real, provide the Yahoo Finance ticker symbol (e.g. AAPL, TCS.NS, RELIANCE.NS, META, NVDA).

STEP 3: Is it a GOOD or BAD investment?
- GOOD: healthy growth, strong fundamentals, positive outlook
- BAD: poor financials, bankruptcy risk, fraud, declining, heavy debt

Return ONLY valid JSON (no markdown, no code fences):
{"verdict":"GOOD","ticker":"AAPL","analysis":"### Pros\\n- specific point\\n\\n### Growth Potential\\n- specific point\\n\\n### Risks\\n- specific point"}
or
{"verdict":"BAD","ticker":"ENRNQ","analysis":"### Red Flags\\n- specific point\\n\\n### Key Risks\\n- specific point\\n\\n### Why to Avoid\\n- specific point"}
or
{"verdict":"INVALID","ticker":"","analysis":"explanation"}

Use real, specific facts about ${companyName}. No generic statements.`;

  // Step 2 — Groq (Llama 3.3 70B)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey.trim() !== "") {
    try {
      console.log("[Agent] Calling Groq (Llama 3.3 70B)...");
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        throw new Error(`Groq error ${groqRes.status}: ${errText}`);
      }

      const groqData = await groqRes.json();
      let raw: string = groqData?.choices?.[0]?.message?.content || "";
      raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

      const parsed = JSON.parse(raw);
      const verdict = parsed.verdict?.toUpperCase();
      const analysis = parsed.analysis || "";

      if ((verdict === "GOOD" || verdict === "BAD" || verdict === "INVALID") && analysis.length > 5) {
        console.log("[Agent] Groq verdict:", verdict, "ticker:", parsed.ticker);
        return {
          analysis: `VERDICT:${verdict}\n\n${analysis}`,
          ticker: parsed.ticker || "",
          status: "Generating decision...",
        };
      }
    } catch (e: any) {
      console.warn("[Agent] Groq failed:", e.message);
    }
  }

  // Step 3 — Fallback: use company knowledge base
  console.log("[Agent] Using knowledge base fallback for:", companyName);
  const fallback = getKnowledgeBaseFallback(companyName, rawData);
  return {
    analysis: `VERDICT:${fallback.verdict}\n\n${fallback.analysis}`,
    status: "Generating decision...",
  };
}

export async function makeDecision(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const { analysis } = state;

  let decision: "PASS" | "FAIL" | "INVALID" = "FAIL";

  if (analysis.startsWith("VERDICT:GOOD")) {
    decision = "PASS";
  } else if (analysis.startsWith("VERDICT:BAD")) {
    decision = "FAIL";
  } else if (analysis.startsWith("VERDICT:INVALID")) {
    decision = "INVALID";
  }

  const cleanAnalysis = analysis.replace(/^VERDICT:(GOOD|BAD|INVALID)\n\n/, "");
  console.log("[Agent] Final decision:", decision);

  return { decision, analysis: cleanAnalysis, status: "Done" };
}

/** Check if company name is gibberish using multiple signals */
function checkValidity(name: string): "VALID" | "INVALID" {
  const n = name.trim();
  
  // Too short
  if (n.length < 2) return "INVALID";
  
  // Must have at least one letter
  if (!/[a-zA-Z]/.test(n)) return "INVALID";
  
  // Common gibberish patterns — long consonant clusters (5+ consecutive consonants)
  if (/[^aeiou\s]{5,}/i.test(n)) return "INVALID";
  
  // Random keyboard smash patterns (same char repeated 4+ times)
  if (/(.)\1{3,}/.test(n)) return "INVALID";
  
  // Pure numbers or symbols only
  if (/^[0-9\s\W]+$/.test(n)) return "INVALID";
  
  // No vowel at all and length > 3 (real company abbreviations like IBM, BMW are fine)
  if (!/[aeiou]/i.test(n) && n.replace(/\s/g, "").length > 3) return "INVALID";
  
  return "VALID";
}

/** Rich, company-specific knowledge base used when Gemini is unavailable */
function getKnowledgeBaseFallback(
  companyName: string,
  rawData: string
): { verdict: "GOOD" | "BAD" | "INVALID"; analysis: string } {
  const name = companyName.toLowerCase();

  const db: Record<string, { verdict: "GOOD" | "BAD" | "INVALID"; analysis: string }> = {
    apple: {
      verdict: "GOOD",
      analysis: `### Pros\n- World's most valuable company with a fiercely loyal premium customer base.\n- Services segment (App Store, iCloud, Apple Pay) drives high-margin recurring revenue.\n- Exceptional free cash flow and aggressive share buyback program ($90B+ annually).\n\n### Growth Potential\n- Apple Intelligence (AI) integration into iOS/MacOS could drive a massive iPhone upgrade cycle.\n- India manufacturing expansion reduces China supply-chain risk and opens a huge new market.\n- Apple Vision Pro establishes a foothold in the emerging spatial computing category.\n\n### Risks\n- iPhone accounts for ~52% of revenue, creating concentration risk.\n- EU App Store regulation threatens the high-margin Services business.\n- US-China geopolitical tensions remain an ongoing supply chain and revenue risk.`,
    },
    microsoft: {
      verdict: "GOOD",
      analysis: `### Pros\n- Azure is the #2 cloud globally, growing 28%+ YoY with massive enterprise adoption.\n- $13B investment in OpenAI gives Microsoft a first-mover advantage in enterprise AI (Copilot).\n- Highly diversified: cloud, Office 365, LinkedIn, Xbox/Gaming, and Dynamics ERP.\n\n### Growth Potential\n- Copilot integration across Office 365 is driving significant ARPU expansion.\n- Azure AI services are becoming the go-to platform for enterprise AI workloads.\n- Healthcare AI through Nuance and gaming via Activision Blizzard open major new verticals.\n\n### Risks\n- Antitrust scrutiny in the US and EU over its OpenAI relationship.\n- Enterprise software spending slowdowns during economic downturns.\n- Intense competition from AWS and Google Cloud for cloud market share.`,
    },
    google: {
      verdict: "GOOD",
      analysis: `### Pros\n- Controls ~90% of global search — one of the strongest competitive moats in business history.\n- YouTube is the world's #2 website with both advertising and subscription revenue.\n- Google Cloud is the #3 provider but accelerating with 28%+ growth.\n\n### Growth Potential\n- Gemini AI deeply integrated into Search, Workspace, and Cloud is a major growth catalyst.\n- Waymo is a potential multi-trillion-dollar autonomous vehicle opportunity.\n- DeepMind's scientific breakthroughs (AlphaFold, GNoME) have long-term commercial value.\n\n### Risks\n- AI chatbots (ChatGPT, Perplexity) are beginning to erode search query volume.\n- US DOJ antitrust case could force structural changes to its search monopoly.\n- Digital ad revenue is cyclical and sensitive to macro slowdowns.`,
    },
    alphabet: {
      verdict: "GOOD",
      analysis: `### Pros\n- Controls ~90% of global search — one of the strongest competitive moats in business history.\n- YouTube is the world's #2 website with both advertising and subscription revenue.\n- Google Cloud is the #3 provider but accelerating with 28%+ growth.\n\n### Growth Potential\n- Gemini AI deeply integrated into Search, Workspace, and Cloud is a major growth catalyst.\n- Waymo is a potential multi-trillion-dollar autonomous vehicle opportunity.\n- DeepMind's scientific breakthroughs create long-term commercial value.\n\n### Risks\n- AI chatbots are beginning to erode search query volume.\n- US DOJ antitrust case could force structural changes.\n- Digital ad revenue is cyclical and sensitive to macro slowdowns.`,
    },
    tesla: {
      verdict: "GOOD",
      analysis: `### Pros\n- The definitive global leader in EVs with a proprietary Supercharger network that is now an industry standard.\n- Megapack energy storage is a fast-growing, high-margin business.\n- FSD (Full Self-Driving) software subscription creates recurring revenue with near-zero marginal cost.\n\n### Growth Potential\n- Robotaxi (Cybercab) launch could unlock a new multi-billion-dollar revenue stream.\n- Optimus humanoid robot, if successful, represents a trillion-dollar market opportunity.\n- India market entry and global factory expansion could double production capacity.\n\n### Risks\n- Brutal EV price war with BYD is compressing automotive gross margins.\n- High valuation (P/E 70x+) requires flawless execution on ambitious timelines.\n- CEO Elon Musk's political controversies are creating brand erosion, especially in Europe.`,
    },
    amazon: {
      verdict: "GOOD",
      analysis: `### Pros\n- AWS holds ~31% of global cloud market share and generates the majority of Amazon's profits.\n- Prime membership locks in 200M+ subscribers to a flywheel of retail, video, and music.\n- Advertising is a high-margin, fast-growing ($50B+) business that is largely recession-resistant.\n\n### Growth Potential\n- AWS Bedrock and SageMaker are positioned to capture enterprise AI infrastructure spending.\n- International e-commerce in India and Southeast Asia is still in early innings.\n- Amazon Pharmacy and healthcare services are a massive potential new revenue vertical.\n\n### Risks\n- Core retail has razor-thin margins and faces intense competition from Walmart and Temu.\n- FTC antitrust investigations into both retail and cloud practices.\n- Massive capex requirements for fulfilment centres and data centres.`,
    },
    nvidia: {
      verdict: "GOOD",
      analysis: `### Pros\n- Holds 80%+ market share in data centre AI training GPUs — a near-monopoly.\n- H100/H200 and Blackwell GPU demand massively exceeds supply, with backlogs stretching quarters.\n- CUDA software ecosystem represents a decade of lock-in that competitors cannot easily replicate.\n\n### Growth Potential\n- Sovereign AI (national AI infrastructure projects) is an entirely new, government-funded market.\n- NVIDIA Inference Microservices (NIM) could evolve NVIDIA into a high-margin software company.\n- Automotive AI (DRIVE Orin/Thor platform) and humanoid robotics are multi-year growth drivers.\n\n### Risks\n- US export controls on H100/H200 to China have cut off a major revenue market.\n- Sky-high valuation (P/E 50x+) leaves zero room for an earnings miss.\n- AMD MI300X and Intel Gaudi 3 are closing the performance gap in inference workloads.`,
    },
    meta: {
      verdict: "GOOD",
      analysis: `### Pros\n- Family of Apps (Facebook, Instagram, WhatsApp) reaches 3.27B daily active people — unmatched scale.\n- AI-driven ad targeting is highly effective, keeping advertiser ROI strong.\n- LLaMA open-source models have cemented Meta's credibility in the AI research community.\n\n### Growth Potential\n- WhatsApp Business monetisation (click-to-chat ads, payments) is barely scratched.\n- Ray-Ban Meta smart glasses are an early commercial success in the AR wearables space.\n- Threads growing as a Twitter/X alternative, adding a new content surface for advertisers.\n\n### Risks\n- Reality Labs has burned through $45B+ with no clear profitability path.\n- Core platform faces a long-term user demographic aging problem (younger users prefer TikTok).\n- Ongoing FTC antitrust case could force a divestiture of Instagram or WhatsApp.`,
    },
    reliance: {
      verdict: "GOOD",
      analysis: `### Pros\n- India's largest company by revenue with an unrivalled diversified conglomerate structure.\n- Jio Platforms dominates Indian telecoms with 470M+ subscribers and a growing digital ecosystem.\n- Reliance Retail is India's largest retailer with 18,000+ stores and a strong omnichannel strategy.\n\n### Growth Potential\n- New Energy business (green hydrogen, solar giga-factories) represents a $75B+ capex opportunity.\n- Jio Financial Services (JFS) is a nascent fintech arm with massive distribution potential.\n- India's structural economic growth provides one of the strongest macro tailwinds globally.\n\n### Risks\n- Complex cross-subsidiary structure makes accurate valuation difficult for investors.\n- Highly concentrated on the vision and leadership of the Ambani family.\n- Significant ongoing capital expenditure commitments across multiple new verticals simultaneously.`,
    },
    infosys: {
      verdict: "GOOD",
      analysis: `### Pros\n- India's second-largest IT services firm with a diversified blue-chip global client roster.\n- Consistent dividend payout track record and a shareholder-friendly capital return policy.\n- Topaz Gen AI platform is winning new digital transformation mandates from large enterprises.\n\n### Growth Potential\n- Secular demand for cloud migration and enterprise AI implementation is a multi-year tailwind.\n- Large deal TCV (total contract value) wins are growing in both size and frequency.\n- Strong momentum in the European market is offsetting some US slowdown.\n\n### Risks\n- Macro slowdown in the US and EU (Infosys' largest markets) could freeze IT budgets.\n- Intense competition from TCS, Accenture, Wipro, and large global system integrators.\n- Structurally high attrition in the IT sector keeps talent acquisition costs elevated.`,
    },
    tcs: {
      verdict: "GOOD",
      analysis: `### Pros\n- India's largest IT company and a global leader with a presence in 55+ countries.\n- Exceptionally consistent financial performance with industry-leading EBIT margins of 24-25%.\n- Massive talent pool of 600,000+ employees and deep client relationships across BFSI, retail, and manufacturing.\n\n### Growth Potential\n- AI and generative AI services (WisdomNext platform) are opening new large-deal opportunities.\n- BSNL deal and other large government contracts provide long-term revenue visibility.\n- North American and European market growth continues despite near-term macro headwinds.\n\n### Risks\n- Large scale makes it harder to grow at a fast rate compared to mid-cap IT peers.\n- US immigration policy changes can raise costs for on-site employee deployments.\n- Heavy dependency on BFSI clients makes it vulnerable to banking sector slowdowns.`,
    },
    enron: {
      verdict: "BAD",
      analysis: `### Red Flags\n- Enron committed one of the largest accounting frauds in US corporate history, deliberately hiding billions in debt using off-balance-sheet special purpose entities (SPEs).\n- Top executives including CEO Jeffrey Skilling and CFO Andrew Fastow were convicted of multiple federal crimes.\n- The stock went from $90 to effectively $0 when the fraud was exposed in 2001.\n\n### Key Risks\n- Enron no longer exists as a publicly traded company — it was delisted and liquidated in bankruptcy.\n- Employees and investors lost their entire savings and investments.\n- The scandal directly led to the Sarbanes-Oxley Act, reshaping corporate governance law permanently.\n\n### Why to Avoid\nEnron is the definitive case study in catastrophic corporate fraud. No investment is possible as the company is permanently defunct.`,
    },
    lehman: {
      verdict: "BAD",
      analysis: `### Red Flags\n- Lehman Brothers filed for Chapter 11 bankruptcy in September 2008 — the largest in US history at $639B in assets.\n- The firm was leveraged 31:1 and had massive, undisclosed exposure to toxic subprime mortgage-backed securities.\n- Used fraudulent "Repo 105" accounting tricks to temporarily move $50B in liabilities off its balance sheet before each quarter-end.\n\n### Key Risks\n- The firm is fully liquidated. All equity holders lost 100% of their investment.\n- Creditors received only a fraction of owed amounts during multi-year bankruptcy proceedings.\n\n### Why to Avoid\nLehman Brothers ceased to exist in 2008. This is a historical case study in systemic risk and leverage failure, not a current investment option.`,
    },
    wirecard: {
      verdict: "BAD",
      analysis: `### Red Flags\n- Wirecard AG (Germany) collapsed in 2020 after auditors discovered €1.9 billion in cash simply did not exist.\n- CEO Markus Braun was arrested; COO Jan Marsalek fled and is an international fugitive.\n- The fraud was enabled by years of failures by auditor EY and German financial regulator BaFin.\n\n### Key Risks\n- The company filed for insolvency in June 2020 and all equity was wiped out.\n- Shareholders, including several major institutional funds, lost their entire investment.\n\n### Why to Avoid\nWirecard is a defunct, fraudulent entity. No investment is possible.`,
    },
    ftx: {
      verdict: "BAD",
      analysis: `### Red Flags\n- FTX crypto exchange collapsed in November 2022 after customer funds were illegally moved to sister firm Alameda Research.\n- Founder Sam Bankman-Fried was convicted of fraud and sentenced to 25 years in prison.\n- $8B+ in customer funds went missing, making it one of the largest financial frauds in history.\n\n### Key Risks\n- FTX is bankrupt and in liquidation proceedings. Customers are still recovering partial funds years later.\n- The collapse triggered a severe crypto market contagion, taking down multiple other firms.\n\n### Why to Avoid\nFTX is a defunct fraudulent enterprise. There is no investable entity remaining.`,
    },
    tata: {
      verdict: "GOOD",
      analysis: `### Pros\n- Tata Group is one of India's oldest and most diversified conglomerates with operations spanning 100+ countries.\n- TCS (Tata Consultancy Services) is a global IT powerhouse and India's most valuable company.\n- Strong brand trust built over 150+ years with a reputation for ethical governance.\n\n### Growth Potential\n- Tata Motors' EV push (Nexon EV, Punch EV) is capturing a dominant share of India's fast-growing EV market.\n- Tata Electronics (Apple supplier) and semiconductor ambitions position the group at the heart of India's manufacturing push.\n- Air India turnaround after acquisition is a major long-term value creation opportunity.\n\n### Risks\n- Highly complex group structure across dozens of listed entities makes stock-specific analysis essential.\n- Some verticals (Jaguar Land Rover, steel) are exposed to global cyclical downturns.\n- High capital intensity across new ventures (semis, EVs, aviation) requires patient capital.`,
    },
    wipro: {
      verdict: "GOOD",
      analysis: `### Pros\n- Wipro is a top-5 Indian IT services company with a strong presence in North America and Europe.\n- Consistent cash generation and a disciplined capital return policy (buybacks + dividends).\n- Strategic acquisitions (Capco, Rizing) have strengthened its BFSI and SAP consulting capabilities.\n\n### Growth Potential\n- ai360 strategy (embedding AI across all service lines) is designed to win next-gen transformation deals.\n- Europe is an underpenetrated market with significant room for expansion vs. peers.\n- Cloud and cybersecurity practices are seeing accelerating demand from enterprise clients.\n\n### Risks\n- Revenue growth has lagged top-tier peers TCS and Infosys in recent years.\n- Client concentration and exposure to discretionary IT spending makes it macro-sensitive.\n- Leadership transition risk after multiple CEO changes in recent years.`,
    },
    hcl: {
      verdict: "GOOD",
      analysis: `### Pros\n- HCL Tech is India's 3rd largest IT firm with particular strength in engineering R&D services and infrastructure management.\n- Strong deal momentum driven by cloud modernisation and digital transformation mandates.\n- HCL Software products business provides a high-margin recurring revenue stream.\n\n### Growth Potential\n- Engineering and R&D services (ER&D) is a structurally high-growth segment as global firms outsource product engineering.\n- New deal wins in Europe and North America are diversifying the revenue base.\n- Strategic partnerships with Microsoft, Google Cloud, and SAP drive co-selling opportunities.\n\n### Risks\n- Services commoditisation risk as AI tools automate portions of traditional IT delivery.\n- Margin pressure from wage inflation and higher visa costs for onsite delivery.\n- Product business profitability could be challenged as legacy software faces cloud competition.`,
    },
    hdfc: {
      verdict: "GOOD",
      analysis: `### Pros\n- HDFC Bank is India's largest private sector bank and one of the most consistently profitable banks in the world.\n- Strong CASA (Current Account Savings Account) ratio provides low-cost funding advantage.\n- Merger with parent HDFC Ltd creates a financial powerhouse with unmatched distribution and product breadth.\n\n### Growth Potential\n- India's underpenetrated credit market provides a multi-decade structural growth runway.\n- Digital banking investments (HDFC app, net banking) are driving customer acquisition at low cost.\n- Insurance and wealth management cross-sell to the existing 90M+ customer base is a large opportunity.\n\n### Risks\n- Post-merger integration complexity could weigh on near-term margins and NIMs.\n- Any slowdown in India's economic growth directly impacts loan book quality.\n- Rising competition from digital-first banks (Jio Finance, Paytm) in retail deposits and lending.`,
    },
    zomato: {
      verdict: "GOOD",
      analysis: `### Pros\n- Zomato is India's dominant food delivery platform with 60%+ market share and a growing quick-commerce business (Blinkit).\n- Achieved profitability milestone with consistent EBITDA-positive quarters.\n- Blinkit (10-minute grocery delivery) is scaling rapidly and establishing a new market category in India.\n\n### Growth Potential\n- India's food delivery market is still in early innings with massive headroom vs. more mature markets.\n- Hyperpure (B2B restaurant supply) and District (events/ticketing) are new high-potential verticals.\n- Going Out segment (dining out, events) adds a third pillar beyond delivery.\n\n### Risks\n- Heavy competition from Swiggy and potential new entrants (Amazon, Tata) could intensify pricing wars.\n- Profitability remains fragile and depends on continued scale without margin dilution.\n- Regulatory risks around gig worker classification and platform fee caps.`,
    },
  };

  // Match against knowledge base
  for (const [key, data] of Object.entries(db)) {
    if (name.includes(key) || key.includes(name.split(" ")[0])) {
      return data;
    }
  }

  // For unknown companies, use Tavily search data signals to infer verdict
  const negativeSignals = [
    "bankrupt", "fraud", "scandal", "investigation", "lawsuit",
    "collapse", "delisted", "insolvency", "losses", "declining",
    "layoffs", "restructuring", "debt crisis", "default",
  ];
  const positiveSignals = [
    "profit", "revenue growth", "earnings beat", "market leader",
    "expansion", "acquisition", "strong", "record", "growth",
    "dividend", "investment grade", "upgrade",
  ];

  // If Tavily found strong negative signals, mark as BAD
  const dataLower = rawData.toLowerCase();
  const negScore = negativeSignals.filter((s) => dataLower.includes(s)).length;
  const posScore = positiveSignals.filter((s) => dataLower.includes(s)).length;

  console.log(`[Agent] Fallback signal scores for ${companyName}: pos=${posScore} neg=${negScore}`);

  // If Tavily returned real data (not just fallback text), use signal scores
  const hasTavilyData = !rawData.includes("No live data") && !rawData.includes("No search API") && rawData.length > 100;

  if (hasTavilyData) {
    if (negScore > posScore && negScore > 0) {
      return {
        verdict: "BAD",
        analysis: `### Red Flags\n- Market data and recent news suggest significant financial or operational challenges for ${companyName}.\n- Negative signals detected: restructuring, losses, or declining fundamentals.\n- Risk-to-reward ratio appears unfavorable.\n\n### Key Risks\n- Deteriorating financial metrics compared to sector peers.\n- Regulatory or competitive headwinds may further pressure performance.\n\n### Why to Avoid\nBased on available data, ${companyName} presents more downside risk than opportunity at this time.`,
      };
    }
    // Tavily found real data with positive signals → treat as valid company, recommend further research
    return {
      verdict: "GOOD",
      analysis: `### Pros\n- ${companyName} has demonstrated positive signals in recent market data and news coverage.\n- The company appears to have an established presence in its sector.\n- Recent reporting suggests stable-to-improving operational fundamentals.\n\n### Growth Potential\n- Industry tailwinds and ongoing business expansion could drive further upside.\n- Management strategy appears aligned with long-term value creation.\n\n### Risks\n- Macroeconomic headwinds may dampen near-term growth.\n- Competitive intensity in the sector requires careful monitoring.\n- Independent due diligence recommended before taking a position.`,
    };
  }

  // No Tavily data AND not in knowledge base → INVALID
  return {
    verdict: "INVALID",
    analysis: `"${companyName}" could not be verified as a known publicly traded company or asset. No reliable financial data was found. Please check the spelling and try again with a well-known company like Apple, Tesla, Infosys, Tata, or Wipro.`,
  };
}
