import Anthropic from "@anthropic-ai/sdk";
import type { DraftArticle, FeedItem, Summarizer } from "../../types.js";

const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `あなたはnote.comに投稿する紹介記事を書くライターです。
与えられた元記事の情報をもとに、その内容を要約・紹介する日本語記事を書いてください。

必ず守ること:
- 元記事の文章をそのまま長くコピーしない。自分の言葉で要約・紹介すること。
- 記事の最後に必ず出典(元記事のタイトルとURL)を明記すること。
- 出力はJSON以外の説明文を含めず、次の形式のJSONオブジェクトのみを返すこと:
  {"title": "記事タイトル", "body": "本文(Markdown可)"}`;

export class ClaudeSummarizer implements Summarizer {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async summarize(item: FeedItem): Promise<DraftArticle> {
    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            `出典: ${item.sourceName}`,
            `タイトル: ${item.title}`,
            `URL: ${item.link}`,
            `本文抜粋: ${item.contentSnippet}`,
          ].join("\n"),
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claudeからテキスト応答を取得できませんでした");
    }

    const parsed = JSON.parse(textBlock.text) as DraftArticle;
    if (!parsed.title || !parsed.body) {
      throw new Error("Claudeの応答がtitle/bodyを含むJSONではありません");
    }
    return parsed;
  }
}
