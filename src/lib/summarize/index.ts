import type { Summarizer } from "../../types.js";
import { ClaudeSummarizer } from "./claudeSummarizer.js";
import { MockSummarizer } from "./mockSummarizer.js";

export function createSummarizer(anthropicApiKey: string | null): Summarizer {
  if (!anthropicApiKey) {
    console.warn("ANTHROPIC_API_KEY未設定のため、MockSummarizerを使用します");
    return new MockSummarizer();
  }
  return new ClaudeSummarizer(anthropicApiKey);
}

export { ClaudeSummarizer } from "./claudeSummarizer.js";
export { MockSummarizer } from "./mockSummarizer.js";
