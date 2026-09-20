import Parser from "rss-parser";
import type { FeedItem } from "../types.js";

const parser = new Parser();

function buildId(item: Parser.Item): string {
  return item.guid || item.link || `${item.title ?? ""}-${item.pubDate ?? ""}`;
}

export async function fetchFeedItems(feedUrl: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(feedUrl);
  const sourceName = feed.title ?? new URL(feedUrl).hostname;

  return (feed.items ?? [])
    .filter((item) => item.link)
    .map((item) => ({
      id: buildId(item),
      title: item.title ?? "(無題)",
      link: item.link as string,
      sourceName,
      contentSnippet: (item.contentSnippet ?? item.content ?? "").slice(0, 4000),
      publishedAt: item.isoDate ?? item.pubDate ?? null,
    }));
}

export async function fetchAllFeedItems(feedUrls: string[]): Promise<FeedItem[]> {
  const results = await Promise.allSettled(feedUrls.map((url) => fetchFeedItems(url)));

  const items: FeedItem[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      console.error(`フィード取得に失敗しました: ${feedUrls[index]}`, result.reason);
    }
  });
  return items;
}
