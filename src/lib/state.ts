import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const DEFAULT_STATE_PATH = new URL("../../data/state.json", import.meta.url).pathname;

interface State {
  postedIds: string[];
}

export async function loadPostedIds(path: string = DEFAULT_STATE_PATH): Promise<Set<string>> {
  try {
    const raw = await readFile(path, "utf-8");
    const state = JSON.parse(raw) as State;
    return new Set(state.postedIds ?? []);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Set();
    }
    throw error;
  }
}

export async function savePostedIds(
  postedIds: Set<string>,
  path: string = DEFAULT_STATE_PATH,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const state: State = { postedIds: Array.from(postedIds) };
  await writeFile(path, JSON.stringify(state, null, 2), "utf-8");
}
