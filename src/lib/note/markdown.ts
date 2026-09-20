function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * ごく簡易的なMarkdown(改行区切りの段落)をnote.comのnote本文用HTMLに変換する。
 * 要約結果が高度なMarkdown記法を含む場合は、必要に応じて拡張すること。
 */
export function markdownToNoteHtml(markdown: string): string {
  return markdown
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}
