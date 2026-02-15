import { waitFor, type ControllerGen } from "../../src/index.js";
import type { App } from "./app.js";
import { RoomLog } from "./room-log.js";

export function* roomController(app: App, roomName: string): ControllerGen {
  // `using` scopes the log to this generator's lifetime.
  // When the ChildScope disposes this generator, RoomLog[Symbol.dispose]() runs.
  using log = new RoomLog(roomName);

  console.log(`[room:${roomName}] controller started`);

  // yield waitFor(...) — suspends until the next event, then resumes with payload.
  while (true) {
    const msg = yield waitFor(app.chat.onMessage);
    if (msg.room !== roomName) continue;
    log.append(msg.user, msg.text);
    console.log(`[room:${roomName}] ${msg.user}: ${msg.text}`);
  }
}
