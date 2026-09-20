import type { NoteClient } from "../../types.js";
import { MockNoteClient } from "./mockNoteClient.js";
import { RealNoteClient } from "./realNoteClient.js";

export function createNoteClient(
  sessionCookie: string | null,
  email: string | null,
  password: string | null,
): NoteClient {
  if (sessionCookie) {
    // 値そのものは出さず、形式のチェックに必要な範囲だけログに出す
    console.log(
      `NOTE_SESSION_COOKIEを使用します(長さ${sessionCookie.length}文字、先頭25文字: ` +
        `${sessionCookie.slice(0, 25)}...)`,
    );
    if (!sessionCookie.includes("=")) {
      console.warn(
        "NOTE_SESSION_COOKIEに \"=\" が含まれていません。" +
          "\"Cookie名=値\" の形式(例: _note_session_v5=xxxxx)になっているか確認してください。",
      );
    }
    return new RealNoteClient({ sessionCookie });
  }
  if (email && password) {
    console.warn(
      "NOTE_SESSION_COOKIE未設定のためNOTE_EMAIL/NOTE_PASSWORDでの自動ログインを試みますが、" +
        "note.com側のreCAPTCHA要求により失敗する可能性が高いです(README参照)",
    );
    return new RealNoteClient({ email, password });
  }
  console.warn("note.comの認証情報未設定のため、MockNoteClientを使用します");
  return new MockNoteClient();
}

export { RealNoteClient } from "./realNoteClient.js";
export { MockNoteClient } from "./mockNoteClient.js";
