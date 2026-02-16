import {
  Controllable,
  controller,
  waitFor,
  INDEFINITELY,
  type ControllerGen,
} from "@routinejs/core";
import { ChatService } from "./chat-service.js";
import { ConnectionPool } from "./connection-pool.js";
import { RoomManager } from "./room-manager.js";
import { roomController } from "./room-controller.js";

export class App extends Controllable {
  readonly chat: ChatService;
  readonly rooms: RoomManager;

  constructor() {
    super();
    this.chat = this.own(new ChatService());
    this.rooms = this.own(new RoomManager());
  }
}

export const AppRoutine = controller(function* (app: App): ControllerGen {
  console.log("[app] started");

  // yield INDEFINITELY — parks this child generator forever. The `using`
  // resource stays alive until the app disposes this child on shutdown.
  // Contrast with the yield waitFor() loop below, which suspends and resumes.
  app.child(function* (): ControllerGen {
    using _conn = new ConnectionPool();
    console.log("[app] connection pool ready");
    yield INDEFINITELY;
  });

  // yield waitFor(...) — suspends until the next join event, then resumes.
  while (true) {
    const ev = yield waitFor(app.chat.onJoin);

    if (!app.rooms.has(ev.room)) {
      console.log(`[app] opening room "${ev.room}"`);
      app.rooms.open(ev.room, () => roomController(app, ev.room));
    }

    console.log(`[app] ${ev.user} joined "${ev.room}"`);
  }
});
