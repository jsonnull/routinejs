import { eventable, type Eventable } from "../../src/index.js";

export type JoinEvent = { user: string; room: string };
export type MessageEvent = { user: string; room: string; text: string };
export type LeaveEvent = { user: string; room: string };

export class ChatService implements Disposable {
  #joinListeners = new Set<(e: JoinEvent) => void>();
  #messageListeners = new Set<(e: MessageEvent) => void>();
  #leaveListeners = new Set<(e: LeaveEvent) => void>();

  readonly onJoin: Eventable<JoinEvent> = eventable((cb) => {
    this.#joinListeners.add(cb);
    return { [Symbol.dispose]: () => void this.#joinListeners.delete(cb) };
  });

  readonly onMessage: Eventable<MessageEvent> = eventable((cb) => {
    this.#messageListeners.add(cb);
    return { [Symbol.dispose]: () => void this.#messageListeners.delete(cb) };
  });

  readonly onLeave: Eventable<LeaveEvent> = eventable((cb) => {
    this.#leaveListeners.add(cb);
    return { [Symbol.dispose]: () => void this.#leaveListeners.delete(cb) };
  });

  join(user: string, room: string) {
    // Snapshot: callbacks may re-subscribe synchronously during dispatch
    for (const cb of [...this.#joinListeners]) cb({ user, room });
  }

  message(user: string, room: string, text: string) {
    for (const cb of [...this.#messageListeners]) cb({ user, room, text });
  }

  leave(user: string, room: string) {
    for (const cb of [...this.#leaveListeners]) cb({ user, room });
  }

  [Symbol.dispose]() {
    this.#joinListeners.clear();
    this.#messageListeners.clear();
    this.#leaveListeners.clear();
  }
}
