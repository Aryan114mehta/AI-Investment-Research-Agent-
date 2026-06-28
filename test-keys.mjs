// Quick API key test script
// Run with: node test-keys.mjs

import fs from "fs";
import path from "path";

// Read .env.local manually
const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
}

const GEMINI_KEY = env["GEMINI_API_KEY"] || "";
const GROQ_KEY = env["GROQ_API_KEY"] || "";
const TAVILY_KEY = env["TAVILY_API_KEY"] || "";

console.log("\n========================================");
console.log("  API KEY DIAGNOSTICS");
console.log("========================================\n");

// ---- TAVILY ----
console.log("🔍 Testing TAVILY_API_KEY...");
if (!TAVILY_KEY) {
  console.log("  ❌ TAVILY_API_KEY is empty or missing in .env.local\n");
} else {
  console.log(`  Key found: ${TAVILY_KEY.substring(0, 12)}...`);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: "Apple stock price today",
        max_results: 1,
      }),
    });
    const data = await res.json();
    if (res.ok && data.results) {
      console.log(`  ✅ TAVILY WORKING — returned ${data.results.length} result(s)`);
      console.log(`     Sample: "${data.results[0]?.title?.substring(0, 60)}..."\n`);
    } else {
      console.log(`  ❌ TAVILY FAILED — Status: ${res.status}`);
      console.log(`     Response: ${JSON.stringify(data).substring(0, 200)}\n`);
    }
  } catch (e) {
    console.log(`  ❌ TAVILY ERROR — ${e.message}\n`);
  }
}

// ---- GEMINI ----
console.log("🤖 Testing GEMINI_API_KEY...");
if (!GEMINI_KEY) {
  console.log("  ❌ GEMINI_API_KEY is empty or missing in .env.local\n");
} else {
  console.log(`  Key found: ${GEMINI_KEY.substring(0, 12)}...`);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with exactly: {"status":"ok"}' }] }],
          generationConfig: { temperature: 0 },
        }),
      }
    );
    const data = await res.json();
    if (res.ok && data.candidates) {
      const text = data.candidates[0]?.content?.parts[0]?.text || "";
      console.log(`  ✅ GEMINI WORKING — Response: ${text.trim().substring(0, 100)}\n`);
    } else {
      console.log(`  ❌ GEMINI FAILED — Status: ${res.status}`);
      console.log(`     Error: ${JSON.stringify(data?.error || data).substring(0, 300)}\n`);
    }
  } catch (e) {
    console.log(`  ❌ GEMINI ERROR — ${e.message}\n`);
  }
}

// ---- GROQ ----
console.log("⚡ Testing GROQ_API_KEY...");
if (!GROQ_KEY) {
  console.log("  ❌ GROQ_API_KEY is empty or missing in .env.local\n");
} else {
  console.log(`  Key found: ${GROQ_KEY.substring(0, 12)}...`);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        messages: [{ role: "user", content: "Reply with exactly the word: OK" }],
      }),
    });
    const data = await res.json();
    if (res.ok && data.choices) {
      const text = data.choices[0]?.message?.content || "";
      console.log(`  ✅ GROQ WORKING — Response: "${text.trim()}"`);
      console.log(`     Model: ${data.model}\n`);
    } else {
      console.log(`  ❌ GROQ FAILED — Status: ${res.status}`);
      console.log(`     Error: ${JSON.stringify(data?.error || data).substring(0, 200)}\n`);
    }
  } catch (e) {
    console.log(`  ❌ GROQ ERROR — ${e.message}\n`);
  }
}

console.log("========================================\n");
