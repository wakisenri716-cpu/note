import type { DraftArticle, NoteClient } from "../../types.js";

/**
 * NOTE_EMAIL/NOTE_PASSWORD未設定時に使う。実際にはnote.comへ通信せず、
 * 何が投稿されるはずだったかをログ出力するだけ。
 */
export class MockNoteClient implements NoteClient {
  async createArticle(draft: DraftArticle, publish: boolean): Promise<{ url: string | null }> {
    console.log("--- [MockNoteClient] note.comへは投稿していません ---");
    console.log(`タイトル: ${draft.title}`);
    console.log(`公開設定: ${publish ? "公開" : "下書き保存"}`);
    console.log(draft.body);
    console.log("--------------------------------------------------");
    return { url: null };
  }
}
