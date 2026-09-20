export interface Config {
  feedUrls: string[];
  anthropicApiKey: string | null;
  noteEmail: string | null;
  notePassword: string | null;
  autoPublish: boolean;
  maxArticlesPerRun: number;
  dryRun: boolean;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const feedUrls = (env.FEED_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);

  return {
    feedUrls,
    anthropicApiKey: env.ANTHROPIC_API_KEY || null,
    noteEmail: env.NOTE_EMAIL || null,
    notePassword: env.NOTE_PASSWORD || null,
    autoPublish: parseBool(env.NOTE_AUTO_PUBLISH, false),
    maxArticlesPerRun: Number(env.MAX_ARTICLES_PER_RUN ?? "3") || 3,
    dryRun: parseBool(env.DRY_RUN, false),
  };
}
