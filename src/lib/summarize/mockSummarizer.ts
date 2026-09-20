import type { DraftArticle, FeedItem, Summarizer } from "../../types.js";

/**
 * ANTHROPIC_API_KEY未設定時に使う決定的な要約実装。
 * 実際の要約は行わず、元記事のタイトル・冒頭・出典リンクをそのまま整形するだけ。
 */
export class MockSummarizer implements Summarizer {
  async summarize(item: FeedItem): Promise<DraftArticle> {
    const body = [
      "## 表 — 報道されている事実",
      "",
      `${item.sourceName} が伝えた「${item.title}」の紹介です。`,
      "",
      item.contentSnippet || "(本文の抜粋を取得できませんでした)",
      "",
      "## 裏 — 背景・文脈",
      "",
      "(ANTHROPIC_API_KEY未設定のため、背景分析は生成されていません)",
      "",
      `出典: ${item.sourceName} 「${item.title}」 ${item.link}`,
    ].join("\n");

    return { title: item.title, body };
  }
}
