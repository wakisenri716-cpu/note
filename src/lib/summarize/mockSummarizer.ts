import type { DraftArticle, FeedItem, Summarizer } from "../../types.js";

/**
 * ANTHROPIC_API_KEY未設定時に使う決定的な要約実装。
 * 実際の要約は行わず、元記事のタイトル・冒頭・出典リンクをそのまま整形するだけ。
 */
export class MockSummarizer implements Summarizer {
  async summarize(item: FeedItem): Promise<DraftArticle> {
    const body = [
      `${item.sourceName} の記事「${item.title}」の紹介です。`,
      "",
      item.contentSnippet || "(本文の抜粋を取得できませんでした)",
      "",
      `詳しくは元記事をご覧ください: ${item.link}`,
    ].join("\n");

    return { title: item.title, body };
  }
}
