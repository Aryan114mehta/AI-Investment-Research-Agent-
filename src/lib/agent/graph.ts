import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "./state";
import { gatherData, analyzeData, makeDecision } from "./nodes";

export const createAgentGraph = () => {
  const workflow = new StateGraph(GraphState)
    .addNode("gatherData", gatherData)
    .addNode("analyzeData", analyzeData)
    .addNode("makeDecision", makeDecision)
    .addEdge(START, "gatherData")
    .addEdge("gatherData", "analyzeData")
    .addEdge("analyzeData", "makeDecision")
    .addEdge("makeDecision", END);

  return workflow.compile();
};
