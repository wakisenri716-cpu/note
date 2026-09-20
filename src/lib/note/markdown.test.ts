import assert from "node:assert/strict";
import { test } from "node:test";
import { markdownToNoteHtml } from "./markdown.js";

test("段落ごとに<p>タグへ変換し、HTMLはエスケープする", () => {
  const html = markdownToNoteHtml("1段落目 <script>\n\n2段落目");
  assert.equal(html, "<p>1段落目 &lt;script&gt;</p>\n<p>2段落目</p>");
});
