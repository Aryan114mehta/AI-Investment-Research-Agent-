"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SearchForm } from "@/components/SearchForm";
import { ProgressStepper } from "@/components/ProgressStepper";
import { ResultsDashboard } from "@/components/ResultsDashboard";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [decision, setDecision] = useState<"PASS" | "FAIL" | "INVALID" | "">("");
  const [analysis, setAnalysis] = useState("");
  const [ticker, setTicker] = useState("");

  const steps = ["Starting...", "Analyzing fundamentals...", "Generating decision...", "Done"];

  const handleSearch = async (companyName: string) => {
    setIsLoading(true);
    setCurrentStatus("Starting...");
    setDecision("");
    setAnalysis("");
    setTicker("");

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");
          
          for (const line of lines) {
            if (line.startsWith("event: close")) {
              done = true;
              break;
            }
            if (line.startsWith("data: ")) {
              try {
                const dataStr = line.replace("data: ", "").trim();
                if (!dataStr) continue;
                
                const data = JSON.parse(dataStr);
                
                if (data.error) {
                  console.error("Agent error:", data.error);
                  setCurrentStatus("Error occurred");
                  setIsLoading(false);
                  return;
                }
                
                if (data.status) setCurrentStatus(data.status);
                if (data.analysis) setAnalysis(data.analysis);
                if (data.decision) setDecision(data.decision);
                if (data.ticker) setTicker(data.ticker);
                
              } catch (e) {
                console.error("Error parsing SSE chunk:", e, "Line:", line);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setCurrentStatus("Error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white selection:bg-emerald-500/30 relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 transition-opacity duration-1000"
        style={{ backgroundImage: "url('/bg.png')" }}
      ></div>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/20 via-black/60 to-black pointer-events-none"></div>

      {/* Ambient effects */}
      <div className="fixed inset-0 z-0 flex justify-center items-center pointer-events-none">
        <div className="absolute top-[-10%] w-[800px] h-[600px] bg-emerald-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[500px] bg-indigo-600/20 blur-[100px] rounded-full mix-blend-screen"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent hover:scale-[1.02] transition-transform duration-300 cursor-default"
          >
            AI Investment <br className="hidden md:block" /> Research Agent
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-xl text-zinc-400 max-w-2xl mx-auto"
          >
            Enter a company name to unleash an autonomous agent that gathers real-time financial data, analyzes fundamentals, and delivers a definitive verdict.
          </motion.p>
        </div>

        <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        
        {currentStatus && (
          <ProgressStepper currentStatus={currentStatus} steps={steps} />
        )}
        
        {(decision || analysis) && (
          <div className="mt-16">
            <ResultsDashboard decision={decision} analysis={analysis} ticker={ticker} />
          </div>
        )}
      </div>
    </main>
  );
}
