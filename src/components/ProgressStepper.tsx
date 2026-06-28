"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface ProgressStepperProps {
  currentStatus: string | null;
  steps: string[];
}

export function ProgressStepper({ currentStatus, steps }: ProgressStepperProps) {
  if (!currentStatus) return null;

  // Determine current step index based on the status
  // Since LangGraph statuses are arbitrary strings from nodes, we map them here
  let currentIndex = 0;
  if (currentStatus === "Starting...") currentIndex = 0;
  else if (currentStatus.includes("Analyzing")) currentIndex = 1;
  else if (currentStatus.includes("decision")) currentIndex = 2;
  else if (currentStatus === "Done") currentIndex = steps.length;

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 mb-8">
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -translate-y-1/2"></div>
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -translate-y-1/2 transition-all duration-700 ease-in-out"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        ></div>
        
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = currentIndex > index;
            const isCurrent = currentIndex === index;

            return (
              <div key={step} className="flex flex-col items-center gap-3">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.2 : 1,
                    backgroundColor: isCompleted || isCurrent ? "rgb(16 185 129)" : "rgb(39 39 42)",
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center border-4 border-black relative z-10"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-black" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-black animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-500" />
                  )}
                </motion.div>
                <div className="text-center">
                  <span
                    className={`text-sm font-medium ${
                      isCompleted || isCurrent ? "text-zinc-200" : "text-zinc-500"
                    }`}
                  >
                    {step}
                  </span>
                  {isCurrent && currentStatus !== step && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-emerald-400 mt-1"
                    >
                      {currentStatus}
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
