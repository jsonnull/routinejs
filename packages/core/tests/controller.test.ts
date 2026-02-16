import { describe, it, expect } from "vitest";
import {
  Controllable,
  controller,
  eventController,
  eventable,
  waitFor,
  INDEFINITELY,
} from "../src/index.js";
import type { ControllerGen, Eventable } from "../src/index.js";

class App extends Controllable {}

describe("controller()", () => {
  it("runs generator via root.child()", () => {
    const log: string[] = [];

    const MyRoutine = controller(function* (app: App): ControllerGen {
      log.push("running");
      yield INDEFINITELY;
    });

    const app = new App();
    MyRoutine.run(app);

    expect(log).toEqual(["running"]);

    app[Symbol.dispose]();
  });

  it("child is owned by root — disposing root disposes child", () => {
    let childDisposed = false;

    const MyRoutine = controller(function* (app: App): ControllerGen {
      try {
        yield INDEFINITELY;
      } finally {
        childDisposed = true;
      }
    });

    const app = new App();
    MyRoutine.run(app);

    expect(childDisposed).toBe(false);
    app[Symbol.dispose]();
    expect(childDisposed).toBe(true);
  });
});

describe("eventController()", () => {
  it("passes eventable defs and root to generator", () => {
    const listeners = new Set<(v: string) => void>();
    const myEvent: Eventable<string> = eventable((cb) => {
      listeners.add(cb);
      return { [Symbol.dispose]: () => void listeners.delete(cb) };
    });

    const received: string[] = [];
    let gotRoot: App | undefined;

    const MyRoutine = eventController(
      { myEvent },
      function* (_opts, { myEvent, root }) {
        gotRoot = root;
        const v = yield waitFor(myEvent);
        received.push(v);
      },
    );

    const app = new App();
    MyRoutine.run(app);

    expect(gotRoot).toBe(app);
    expect(listeners.size).toBe(1);

    // Fire event
    for (const cb of listeners) cb("hello");
    expect(received).toEqual(["hello"]);

    app[Symbol.dispose]();
  });
});
