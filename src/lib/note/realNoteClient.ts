import type { DraftArticle, NoteClient } from "../../types.js";
import { markdownToNoteHtml } from "./markdown.js";

const BASE_URL = "https://note.com";

/**
 * note.comは記事投稿用の公式APIを提供していないため、Web版が内部で使っている
 * 非公式なエンドポイントを利用する。仕様変更でいつ壊れてもおかしくない点に注意。
 * (参考: 各種OSSのnote.com自動投稿ツールが利用している /api/v1/... 系のエンドポイント)
 */
export class RealNoteClient implements NoteClient {
  private readonly email: string;
  private readonly password: string;
  private sessionCookie: string | null = null;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  private async login(): Promise<string> {
    if (this.sessionCookie) return this.sessionCookie;

    const response = await fetch(`${BASE_URL}/api/v1/sessions/sign_in`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login_id: this.email, password: this.password }),
    });

    if (!response.ok) {
      throw new Error(
        `note.comへのログインに失敗しました (status=${response.status}): ${await response.text()}`,
      );
    }

    const cookies = response.headers.getSetCookie?.() ?? [];
    const sessionCookie = cookies
      .map((cookie) => cookie.split(";")[0])
      .find((cookie) => cookie.startsWith("_note_session_v5="));

    if (!sessionCookie) {
      throw new Error(
        "note.comのログイン応答からセッションCookieを取得できませんでした" +
          "(note.com側の仕様変更でCookie名が変わっている可能性があります)",
      );
    }

    this.sessionCookie = sessionCookie;
    return sessionCookie;
  }

  async createArticle(draft: DraftArticle, publish: boolean): Promise<{ url: string | null }> {
    const cookie = await this.login();

    const draftResponse = await fetch(`${BASE_URL}/api/v1/text_notes/draft_save`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        note: {
          name: draft.title,
          body: markdownToNoteHtml(draft.body),
        },
      }),
    });

    if (!draftResponse.ok) {
      throw new Error(
        `下書きの作成に失敗しました (status=${draftResponse.status}): ${await draftResponse.text()}`,
      );
    }

    const draftJson = (await draftResponse.json()) as {
      data?: { id?: number; key?: string };
    };
    const noteId = draftJson.data?.id;
    const noteKey = draftJson.data?.key;

    if (!noteId) {
      throw new Error("下書き作成応答からnote IDを取得できませんでした");
    }

    const draftUrl = noteKey ? `${BASE_URL}/notes/${noteKey}` : null;
    if (!publish) {
      return { url: draftUrl };
    }

    const publishResponse = await fetch(`${BASE_URL}/api/v1/text_notes/${noteId}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({}),
    });

    if (!publishResponse.ok) {
      throw new Error(
        `記事の公開に失敗しました (status=${publishResponse.status}): ${await publishResponse.text()}`,
      );
    }

    return { url: draftUrl };
  }
}
