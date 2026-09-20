export interface FeedItem {
  /** フィード内で一意なID (dedup用。guid > link > title+pubDate の優先度で決定) */
  id: string;
  title: string;
  link: string;
  sourceName: string;
  contentSnippet: string;
  publishedAt: string | null;
}

export interface DraftArticle {
  title: string;
  /** note.comのMarkdownライクな本文 */
  body: string;
}

export interface Summarizer {
  summarize(item: FeedItem): Promise<DraftArticle>;
}

export interface NoteClient {
  /** 下書きを作成する。publish=true なら公開まで行う */
  createArticle(draft: DraftArticle, publish: boolean): Promise<{ url: string | null }>;
}
