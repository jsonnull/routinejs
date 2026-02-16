import { waitFor, type RoutineGen } from "@routinejs/core";
import type { App } from "./app.js";
import { RoomLog } from "./room-log.js";

export function* roomRoutine(app: App, roomName: string): RoutineGen {
  // `using` scopes the log to this generator's lifetime.
  // When the ChildScope disposes this generator, RoomLog[Symbol.dispose]() runs.
  using log = new RoomLog(roomName);

  console.log(`[room:${roomName}] routine started`);

  // yield waitFor(...) — suspends until the next event, then resumes with payload.
  while (true) {
    const msg = yield waitFor(app.chat.onMessage);
    if (msg.room !== roomName) continue;
    log.append(msg.user, msg.text);
    console.log(`[room:${roomName}] ${msg.user}: ${msg.text}`);
  }
}
