import type { NoteClient } from "../../types.js";
import { MockNoteClient } from "./mockNoteClient.js";
import { RealNoteClient } from "./realNoteClient.js";

export function createNoteClient(
  sessionCookie: string | null,
  email: string | null,
  password: string | null,
): NoteClient {
  if (sessionCookie) {
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
