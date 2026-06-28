"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFormProps {
  onSearch: (companyName: string) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSearch(input.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
      <div className="relative flex items-center bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-white/10 p-2 shadow-2xl">
        <div className="pl-4 text-zinc-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a company name (e.g., Apple, Tesla, Reliance)"
          className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-500 px-4 py-3 text-lg font-medium"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={cn(
            "px-6 py-3 rounded-xl font-semibold transition-all duration-300",
            input.trim() && !isLoading
              ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              : "bg-white/5 text-white/30 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing</span>
            </div>
          ) : (
            "Research"
          )}
        </button>
      </div>
    </form>
  );
}
