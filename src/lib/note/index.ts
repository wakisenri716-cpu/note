import type { NoteClient } from "../../types.js";
import { MockNoteClient } from "./mockNoteClient.js";
import { RealNoteClient } from "./realNoteClient.js";

export function createNoteClient(email: string | null, password: string | null): NoteClient {
  if (!email || !password) {
    console.warn("NOTE_EMAIL/NOTE_PASSWORD未設定のため、MockNoteClientを使用します");
    return new MockNoteClient();
  }
  return new RealNoteClient(email, password);
}

export { RealNoteClient } from "./realNoteClient.js";
export { MockNoteClient } from "./mockNoteClient.js";
