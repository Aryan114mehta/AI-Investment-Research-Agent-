import { Annotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
  companyName: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  status: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  rawData: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  analysis: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  decision: Annotation<"PASS" | "FAIL" | "INVALID" | "">({
    reducer: (x, y) => y ?? x,
  }),
  ticker: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
});

export type GraphStateType = typeof GraphState.State;
