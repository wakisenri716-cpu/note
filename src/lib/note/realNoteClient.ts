import type { DraftArticle, NoteClient } from "../../types.js";
import { markdownToNoteHtml } from "./markdown.js";

const BASE_URL = "https://note.com";
// 記事作成系のAPIは、note.comの記事編集画面が動いているサブドメイン
// (editor.note.com)からの呼び出しとしてOriginを検証している
// (実際のDevTools応答で Access-Control-Allow-Origin: https://editor.note.com
//  だったことを確認済み。Originがこれと違うと「ログインしていない」扱いになる)
const EDITOR_ORIGIN = "https://editor.note.com";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/128.0.0.0 Safari/537.36";

// ログインページ(note.com)向けのヘッダー。note.com側のボット対策で弾かれないよう、
// 実ブラウザに近い値を付与する
const LOGIN_HEADERS = {
  "user-agent": USER_AGENT,
  accept: "application/json, text/plain, */*",
  origin: BASE_URL,
  referer: `${BASE_URL}/login`,
};

// 記事作成・保存・公開(editor.note.com)向けのヘッダー
const EDITOR_HEADERS = {
  "user-agent": USER_AGENT,
  accept: "application/json, text/plain, */*",
  origin: EDITOR_ORIGIN,
  referer: `${EDITOR_ORIGIN}/notes/new`,
};

function cookieExpiredHint(status: number): string {
  return status === 401 || status === 403
    ? " NOTE_SESSION_COOKIEの有効期限が切れている可能性があります。" +
        "ブラウザで再ログインしてCookieの値を更新してください。"
    : "";
}

/**
 * 応答JSONの厳密な形(ネストの深さなど)が不明なため、指定したキー名かつ
 * 条件を満たす値を再帰的に探す。見つからない場合はundefined。
 */
function findField(value: unknown, key: string, isMatch: (v: unknown) => boolean, depth = 3): unknown {
  if (depth < 0 || value === null || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (key in record && isMatch(record[key])) return record[key];
  for (const nested of Object.values(record)) {
    const found = findField(nested, key, isMatch, depth - 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * note.comは記事投稿用の公式APIを提供していないため、Web版が内部で使っている
 * 非公式なエンドポイントを利用する。仕様変更でいつ壊れてもおかしくない点に注意。
 * (参考: 各種OSSのnote.com自動投稿ツールが利用している /api/v1/... 系のエンドポイント)
 */
export interface RealNoteClientOptions {
  /** ブラウザでログイン後に取得したセッションCookie(推奨)。あればこれをそのまま使う */
  sessionCookie?: string;
  /** メール+パスワードでの自動ログイン(reCAPTCHA要求時は失敗する。README参照) */
  email?: string;
  password?: string;
}

export class RealNoteClient implements NoteClient {
  private readonly email?: string;
  private readonly password?: string;
  private sessionCookie: string | null;

  constructor(options: RealNoteClientOptions) {
    this.email = options.email;
    this.password = options.password;
    this.sessionCookie = options.sessionCookie ?? null;
  }

  private async login(): Promise<string> {
    if (this.sessionCookie) return this.sessionCookie;

    if (!this.email || !this.password) {
      throw new Error(
        "note.comの認証情報がありません。NOTE_SESSION_COOKIE(推奨)または " +
          "NOTE_EMAIL/NOTE_PASSWORD を設定してください。",
      );
    }

    const response = await fetch(`${BASE_URL}/api/v1/sessions/sign_in`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...LOGIN_HEADERS,
      },
      // note.com側は "login" というキー名を期待している("login_id"だと
      // {"error":"login is missing"} で400が返ってくることを実際のログで確認済み)
      body: JSON.stringify({ login: this.email, password: this.password }),
    });

    if (!response.ok) {
      const body = await response.text();
      const recaptchaHint = body.includes("required_recaptcha")
        ? " note.com側がreCAPTCHA認証を要求しています。データセンターIP(CI環境など)からの" +
          "自動ログインは突破できないため、NOTE_SESSION_COOKIEでの認証に切り替えてください(README参照)。"
        : "";
      throw new Error(
        `note.comへのログインに失敗しました (status=${response.status}): ${body}${recaptchaHint}`,
      );
    }

    const cookies = response.headers.getSetCookie?.() ?? [];
    if (cookies.length === 0) {
      const bodySnippet = (await response.text()).slice(0, 500);
      throw new Error(
        "note.comのログイン応答にCookieが含まれていませんでした" +
          "(ボット対策等でログイン自体が成立していない可能性があります)。" +
          `応答本文の先頭: ${bodySnippet}`,
      );
    }

    // 個別のCookie名を決め打ちせず、返ってきたCookieをすべてそのまま次のリクエストに使う
    // (値は機密情報なのでログには出さず、名前だけ出す)
    console.log(`note.comログイン成功。受け取ったCookie: ${cookies.map((c) => c.split("=")[0]).join(", ")}`);
    this.sessionCookie = cookies.map((cookie) => cookie.split(";")[0]).join("; ");
    return this.sessionCookie;
  }

  async createArticle(draft: DraftArticle, publish: boolean): Promise<{ url: string | null }> {
    const cookie = await this.login();

    // 1. まず空のnoteを作成してIDを取得する(ブラウザのDevToolsで実際の挙動を確認済み)
    const createResponse = await fetch(`${BASE_URL}/api/v1/text_notes`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie, ...EDITOR_HEADERS },
      body: JSON.stringify({ template_key: null }),
    });

    if (!createResponse.ok) {
      throw new Error(
        `noteの作成に失敗しました (status=${createResponse.status}): ` +
          `${await createResponse.text()}${cookieExpiredHint(createResponse.status)}`,
      );
    }

    const createJson = await createResponse.json();
    // note.comは認証エラー等でも200系で {"error":{"code":"...","message":"..."}} を返すことがある
    const errorField = (createJson as { error?: unknown }).error;
    if (errorField) {
      const message =
        typeof errorField === "string" ? errorField : (errorField as { message?: string }).message;
      throw new Error(
        `note作成がnote.com側で拒否されました: ${message ?? JSON.stringify(errorField)}` +
          cookieExpiredHint(401),
      );
    }

    const noteId = findField(createJson, "id", (v) => typeof v === "number") as number | undefined;
    const noteKey = findField(createJson, "key", (v) => typeof v === "string") as string | undefined;

    if (!noteId) {
      throw new Error(
        `note作成応答からIDを取得できませんでした。応答: ${JSON.stringify(createJson).slice(0, 500)}`,
      );
    }

    // 2. タイトル・本文を保存する(エディタの自動保存と同じAPI)
    const html = markdownToNoteHtml(draft.body);
    const bodyLength = draft.body.replace(/\s+/g, "").length;

    const draftResponse = await fetch(
      `${BASE_URL}/api/v1/text_notes/draft_save?id=${noteId}&is_temp_saved=true`,
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie, ...EDITOR_HEADERS },
        body: JSON.stringify({
          name: draft.title,
          body: html,
          body_length: bodyLength,
          index: false,
          is_lead_form: false,
        }),
      },
    );

    if (!draftResponse.ok) {
      throw new Error(
        `下書きの保存に失敗しました (status=${draftResponse.status}): ` +
          `${await draftResponse.text()}${cookieExpiredHint(draftResponse.status)}`,
      );
    }

    const draftUrl = noteKey ? `${BASE_URL}/notes/${noteKey}` : null;
    if (!publish) {
      return { url: draftUrl };
    }

    const publishResponse = await fetch(`${BASE_URL}/api/v1/text_notes/${noteId}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie, ...EDITOR_HEADERS },
      body: JSON.stringify({}),
    });

    if (!publishResponse.ok) {
      throw new Error(
        `記事の公開に失敗しました (status=${publishResponse.status}): ` +
          `${await publishResponse.text()}${cookieExpiredHint(publishResponse.status)}`,
      );
    }

    return { url: draftUrl };
  }
}
