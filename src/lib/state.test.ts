import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadPostedIds, savePostedIds } from "./state.js";

test("存在しない state ファイルは空集合として読み込める", async () => {
  const dir = await mkdtemp(join(tmpdir(), "note-state-"));
  try {
    const ids = await loadPostedIds(join(dir, "state.json"));
    assert.equal(ids.size, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("保存した投稿済みIDを読み戻せる", async () => {
  const dir = await mkdtemp(join(tmpdir(), "note-state-"));
  const path = join(dir, "nested", "state.json");
  try {
    await savePostedIds(new Set(["a", "b"]), path);
    const ids = await loadPostedIds(path);
    assert.deepEqual([...ids].sort(), ["a", "b"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
