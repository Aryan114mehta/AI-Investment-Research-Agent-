# AI Investment Research Agent

## Overview — What It Does
The AI Investment Research Agent is an intelligent, autonomous web application that acts as a senior financial analyst. It takes a company name or stock ticker as input and performs real-time financial research to deliver a definitive "PASS", "FAIL", or "INVALID" investment verdict. 

It accomplishes this by:
1. Fetching live market news and sentiment data using **Tavily**.
2. Fetching real-time stock valuation metrics and historical price data using **Yahoo Finance**.
3. Processing the data through a powerful LLM (**Groq's Llama 3.3 70B**) using **LangGraph.js** to generate specific, actionable pros, cons, and investment reasoning.
4. Presenting the results in a beautiful, interactive, and responsive UI built with **Next.js**, **Tailwind CSS**, and **Framer Motion**.

---

## How to Run It — Setup and Run Steps

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 1. Clone & Install
```bash
git clone <repository-url>
cd ai-investment-agent
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory and add the following API keys:
```env
TAVILY_API_KEY=your_tavily_key_here
GROQ_API_KEY=your_groq_key_here
```
- **Tavily Key:** Get it from [tavily.com](https://tavily.com/)
- **Groq Key:** Get it from [console.groq.com/keys](https://console.groq.com/keys)

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How It Works — Approach and Architecture

The application uses a modern **Next.js App Router** architecture with Server-Sent Events (SSE) for real-time streaming updates from the agent to the client.

### Architecture Breakdown:
1. **Frontend (Client):** 
   - A highly polished, dynamic UI using Tailwind CSS for styling and Framer Motion for entrance animations. 
   - It maintains state for the multi-step progress stepper and streams agent updates visually.
   - Includes embedded **TradingView** charts and a real-time **Valuation Card**.

2. **Backend (API Routes):**
   - `/api/research`: Manages the LangGraph agent execution and streams status updates and the final LLM decision back to the client using SSE.
   - `/api/stock`: A custom proxy route that securely fetches real-time quote data, market cap, P/E ratios, and chart data from Yahoo Finance without exposing client-side CORS issues.

3. **Agent Logic (LangGraph.js):**
   - **Node 1 (`gatherData`):** Calls Tavily API to fetch the latest news and fundamental analysis data for the given company.
   - **Node 2 (`analyzeData`):** 
     - First, validates if the input is gibberish using RegEx heuristics.
     - Calls Groq's API (Llama 3.3 70B) with strict JSON-schema instructions to output a verdict (`GOOD`, `BAD`, or `INVALID`), a stock ticker, and a detailed markdown analysis.
     - Implements a resilient 3-tier fallback system: Groq LLM → Local Knowledge Base (for high-profile companies like Apple, Enron) → Heuristic keyword scoring of Tavily data.
   - **Node 3 (`makeDecision`):** Cleans the JSON response and maps the final verdict to `PASS` or `FAIL`.

---

## Key Decisions & Trade-offs

### 1. Groq (Llama 3.3 70B) over OpenAI/Gemini
Initially, the agent was built with Google's Gemini Flash. However, due to restrictive free-tier rate limits (15 RPM / 1,500 RPD), the app frequently threw `429 Quota Exceeded` errors during heavy testing. **Decision:** Switched to Groq, which offers an incredibly fast Llama 3.3 70B model with a generous 14,400 requests/day free tier. 
*Trade-off:* We had to bypass LangChain's native wrappers and write direct REST API `fetch` calls to Groq for better control over the JSON parsing and error handling.

### 2. Strict JSON LLM Prompting
Early versions of the agent relied on searching the LLM's raw text for keywords like "INVEST" or "DO NOT INVEST". This was brittle (e.g., the LLM saying "There are risks to this INVESTment" triggered a false positive). **Decision:** Forced the LLM to return a strict JSON object (`{"verdict": "GOOD", "ticker": "AAPL", "analysis": "..."}`).
*Trade-off:* Requires careful string manipulation (`replace(/^```json/`, etc.) to clean up the LLM's markdown formatting before `JSON.parse()`.

### 3. Server-Sent Events (SSE) over WebSockets
**Decision:** Used standard HTTP streaming via Next.js Edge Runtime / SSE instead of Socket.io for the loading steps. 
*Trade-off:* Much simpler infrastructure (no separate WebSocket server needed) and works perfectly in serverless environments like Vercel, though it is one-way communication (Server → Client).

### 4. Yahoo Finance Proxy
**Decision:** Built a custom `/api/stock` backend route instead of fetching Yahoo Finance data directly from the React components.
*Trade-off:* Avoids CORS blocks and hides API implementation details, but adds slightly more latency than a direct client-side fetch.

---

## Example Runs

### Example 1: Apple Inc. (Valid, Strong Company)
- **Input:** "Apple"
- **Verdict:** `PASS`
- **Output Snippet:** 
  - *Pros:* Dominant ecosystem lock-in, $100B+ annual free cash flow.
  - *Valuation:* Shows real-time Market Cap (~$3T+), P/E ratio, and 52-week High/Low.
  - *Chart:* Loads the 5-year interactive AAPL chart.

### Example 2: Enron (Valid, Defunct/Fraud)
- **Input:** "Enron"
- **Verdict:** `FAIL`
- **Output Snippet:** 
  - *Red Flags:* Massive accounting fraud discovered in 2001. Company is bankrupt and delisted. 100% loss of equity for shareholders.

### Example 3: "asdfghjkl" (Gibberish)
- **Input:** "asdfghjkl"
- **Verdict:** `INVALID`
- **Output Snippet:** Caught by the local heuristic checker before even hitting the LLM API to save costs. "Input is not a valid company or tradable asset."

---

## What I Would Improve with More Time

1. **Financial Data Integration:** Currently, the agent relies on Tavily web search for fundamentals. Given more time, I would integrate a dedicated financial API (like AlphaVantage, FMP, or Polygon.io) to feed hard quantitative metrics (Debt-to-Equity, FCF margins, Revenue YoY) directly into the LLM prompt for more objective analysis.
2. **Caching Layer:** Implement a Redis cache for LLM responses. If two users search "Microsoft" within an hour, the second user should instantly receive the cached analysis instead of waiting 3 seconds for a new LLM generation.
3. **Multi-Agent Workflow:** Split the single `analyzeData` node into a "Researcher Agent" (gathers data), a "Quantitative Analyst Agent" (crunches numbers), and a "Portfolio Manager Agent" (makes the final PASS/FAIL call based on the other two agents' reports).

---

## BONUS: LLM Chat Session Logs
*(Note to Reviewer: The complete LLM conversational logs that show the iterative building, debugging, and architectural pivots of this project are included in the repository. Please review the attached `transcript.jsonl` or chat export file for full insights into the thought process.)*