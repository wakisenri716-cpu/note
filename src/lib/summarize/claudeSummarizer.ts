import Anthropic from "@anthropic-ai/sdk";
import type { DraftArticle, FeedItem, Summarizer } from "../../types.js";

const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `あなたは note.com で「世界情勢の表と裏」という連載記事を書いているライターです。
与えられた1件の海外・国際ニュース(1トピック)について、日本語の紹介記事を書いてください。

記事本文は必ず次の2つの見出しで構成すること:

## 表 — 報道されている事実
与えられた記事の内容を、自分の言葉で要約して紹介する。

## 裏 — 背景・文脈
そのニュースの経緯・背景など、あなたが確信を持って言える確認済みの事実のみを淡々と
補足する。与えられた記事に書かれていない事柄を付け加える場合も、一般的によく知られた
確立した事実の範囲にとどめること。

必ず守ること:
- 元記事の文章をそのまま長くコピーしない。自分の言葉で要約・紹介すること。
- 推測・憶測・陰謀論的な解釈は一切書かないこと。断定できない情報は
  「〜と報じられている」のように書き、確信が持てない場合は無理に埋めず
  「特筆すべき追加の背景情報はありません」のように正直に書くこと。
- 記事の最後に必ず出典(元記事のメディア名・タイトル・URL)を明記すること。
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
