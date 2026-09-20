# 世界情勢の表と裏 自動投稿ツール

国際ニュースのRSS/Atomフィードから今日のトピックを取得し、トピックごとに
「表(報道されている事実)」と「裏(確認済みの背景・文脈)」の2部構成でAIに記事を
書かせ、note.comへ**下書きとして**自動投稿するバッチツールです。トピック1件につき
記事1本を投稿します(1回の実行で `MAX_ARTICLES_PER_RUN` 件まで)。

```
src/config.ts          環境変数の読み込み
src/lib/feeds.ts        RSS/Atomフィードの取得・パース
src/lib/state.ts        投稿済み記事IDの管理 (data/state.json)
src/lib/summarize/      記事要約 (Claude / モック)
src/lib/note/           note.comへの投稿クライアント (非公式API / モック)
src/run.ts              一連の処理を実行するエントリーポイント
.github/workflows/      毎日定時実行するGitHub Actionsワークフロー
```

## 重要な注意事項

- **note.comは記事投稿用の公式APIを提供していません。** このツールはnote.com Web版が
  内部的に利用しているエンドポイント(`/api/v1/...`)を非公式に呼び出しています。
  note.com側の仕様変更でいつ動かなくなってもおかしくありません。動かなくなった場合は
  `src/lib/note/realNoteClient.ts` のエンドポイント・パラメータを見直してください。
- **他サイトのRSS記事を要約して転載する行為は、元サイトの利用規約や著作権に抵触する
  可能性があります。** 必ず出典(元記事タイトル・URL)を明記し、対象フィードの利用規約を
  事前に確認してください。要約実装(`ClaudeSummarizer`)は元文章をそのまま複製しないよう
  指示していますが、最終的な内容は投稿前に確認することを推奨します。
- **「裏」(背景・文脈)は、AIが確信を持てる確認済みの事実のみを書くよう指示しています
  が、断定的に書かれていても誤りを含む可能性はあります。** 特に国際情勢のような
  デリケートな話題では、公開前に内容を自分で確認することを強く推奨します。
- そのため既定では **下書き保存のみ** を行い、自動公開はしません
  (`NOTE_AUTO_PUBLISH=true` を明示的に設定した場合のみ公開まで行います)。

## セットアップ

```bash
cp .env.example .env   # FEED_URLS / NOTE_EMAIL / NOTE_PASSWORD などを設定
npm install
npm run post:dry        # まずはDRY_RUN(投稿せず内容をログ出力するだけ)で確認
npm run post            # 実際に下書き保存 (認証情報未設定ならMockNoteClientでログ出力のみ)
```

### 環境変数 (`.env`)

| 変数名 | 説明 |
| --- | --- |
| `FEED_URLS` | 要約元にする国際ニュースRSS/AtomのURL。カンマ区切りで複数指定可(候補は`.env.example`参照) |
| `ANTHROPIC_API_KEY` | Claudeで「表/裏」記事を書かせる場合に設定。未設定時は簡易的なMockSummarizerで動作 |
| `NOTE_EMAIL` / `NOTE_PASSWORD` | note.comのログイン情報。未設定時は投稿せずログ出力するだけのMockNoteClientで動作 |
| `NOTE_AUTO_PUBLISH` | `true`で下書きではなく公開まで実行(既定は`false`) |
| `MAX_ARTICLES_PER_RUN` | 1回の実行で処理するトピック(=投稿記事数)の上限(既定5件) |
| `DRY_RUN` | `true`でnote.comへの投稿・状態保存をスキップし、内容確認のみ行う |

`ANTHROPIC_API_KEY` / `NOTE_EMAIL` / `NOTE_PASSWORD` をすべて未設定のまま `npm run post`
を実行すると、実際には外部に一切投稿せずログだけで動作を確認できます。

`.env.example` に国際ニュースRSSの候補URLを記載していますが、開発環境からは動作確認
できていません(メディア側の都合でURLが変わることがあります)。`npm run post:dry` で
実際に記事が取得できるか、まず確認してから使ってください。

## 重複投稿の防止

`data/state.json` に投稿済み記事のID(フィードのguid/link)を記録し、次回実行時は
未投稿の記事のみを処理します。GitHub Actionsワークフローは実行後にこのファイルの
変更をコミット・pushして状態を永続化します。

## 定期実行 (GitHub Actions)

`.github/workflows/auto-post.yml` が毎日 09:00 (JST) に自動実行されます。リポジトリの
Settings で以下を設定してください。

- **Secrets**: `ANTHROPIC_API_KEY`, `NOTE_EMAIL`, `NOTE_PASSWORD`
- **Variables**: `FEED_URLS`, `NOTE_AUTO_PUBLISH`, `MAX_ARTICLES_PER_RUN`

手動実行したい場合はActionsタブから `workflow_dispatch` で起動できます。

## テスト

```bash
npm run typecheck
npm test
```
