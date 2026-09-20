import assert from "node:assert/strict";
import { test } from "node:test";
import type { FeedItem } from "../../types.js";
import { MockSummarizer } from "./mockSummarizer.js";

test("MockSummarizerは出典リンクを本文に含める", async () => {
  const item: FeedItem = {
    id: "1",
    title: "テスト記事",
    link: "https://example.com/a",
    sourceName: "Example Blog",
    contentSnippet: "本文の抜粋",
    publishedAt: null,
  };

  const draft = await new MockSummarizer().summarize(item);

  assert.equal(draft.title, item.title);
  assert.match(draft.body, /https:\/\/example\.com\/a/);
  assert.match(draft.body, /本文の抜粋/);
});
