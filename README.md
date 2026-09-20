# note.com 自動投稿ツール

RSS/Atomフィードで配信されている記事を取得し、要約したうえで note.com へ**下書きとして**
自動投稿するバッチツールです。

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
| `FEED_URLS` | 要約元にするRSS/AtomのURL。カンマ区切りで複数指定可 |
| `ANTHROPIC_API_KEY` | Claudeで要約する場合に設定。未設定時は簡易的なMockSummarizerで動作 |
| `NOTE_EMAIL` / `NOTE_PASSWORD` | note.comのログイン情報。未設定時は投稿せずログ出力するだけのMockNoteClientで動作 |
| `NOTE_AUTO_PUBLISH` | `true`で下書きではなく公開まで実行(既定は`false`) |
| `MAX_ARTICLES_PER_RUN` | 1回の実行で処理する新着記事数の上限(既定3件) |
| `DRY_RUN` | `true`でnote.comへの投稿・状態保存をスキップし、内容確認のみ行う |

`ANTHROPIC_API_KEY` / `NOTE_EMAIL` / `NOTE_PASSWORD` をすべて未設定のまま `npm run post`
を実行すると、実際には外部に一切投稿せずログだけで動作を確認できます。

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
