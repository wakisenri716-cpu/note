import { loadConfig } from "./config.js";
import { fetchAllFeedItems } from "./lib/feeds.js";
import { createNoteClient } from "./lib/note/index.js";
import { createSummarizer } from "./lib/summarize/index.js";
import { loadPostedIds, savePostedIds } from "./lib/state.js";

async function main() {
  const config = loadConfig();

  if (config.feedUrls.length === 0) {
    console.error("FEED_URLSが設定されていません。.env.exampleを参考に設定してください。");
    process.exitCode = 1;
    return;
  }

  const summarizer = createSummarizer(config.anthropicApiKey);
  const noteClient = createNoteClient(config.noteSessionCookie, config.noteEmail, config.notePassword);

  const postedIds = await loadPostedIds();
  const allItems = await fetchAllFeedItems(config.feedUrls);

  const newItems = allItems
    .filter((item) => !postedIds.has(item.id))
    .slice(0, config.maxArticlesPerRun);

  if (newItems.length === 0) {
    console.log("新着記事はありませんでした。");
    return;
  }

  console.log(`${newItems.length}件の新着記事を処理します。`);

  for (const item of newItems) {
    console.log(`[要約中] ${item.title} (${item.link})`);
    const draft = await summarizer.summarize(item);

    const publish = config.autoPublish && !config.dryRun;
    if (config.dryRun) {
      console.log("[DRY_RUN] note.comへの投稿はスキップします");
      console.log(draft);
    } else {
      const result = await noteClient.createArticle(draft, publish);
      console.log(
        `[${publish ? "公開" : "下書き保存"}] ${draft.title}${result.url ? ` -> ${result.url}` : ""}`,
      );
    }

    postedIds.add(item.id);
  }

  if (!config.dryRun) {
    await savePostedIds(postedIds);
  }
}

main().catch((error) => {
  console.error("処理中にエラーが発生しました:", error);
  process.exitCode = 1;
});
