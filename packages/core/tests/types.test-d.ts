import { describe, it, expectTypeOf } from "vitest";
import {
  INDEFINITELY,
  eventable,
  waitFor,
  controller,
  eventController,
  Controllable,
  type EventReq,
  type Eventable as EventableType,
  type ControllerGen,
  type AllowedYield,
} from "../src/index.js";

class App extends Controllable {}

describe("type-level tests", () => {
  it("waitFor() returns EventReq<T> matching the Eventable<T>", () => {
    const e = eventable<number>(() => ({ [Symbol.dispose]() {} }));
    const req = waitFor(e);
    expectTypeOf(req).toEqualTypeOf<EventReq<number>>();
  });

  it("INDEFINITELY is a unique symbol type", () => {
    expectTypeOf(INDEFINITELY).toBeSymbol();
  });

  it("controller() infers root type from make function", () => {
    const r = controller(function* (app: App): ControllerGen {
      yield INDEFINITELY;
    });
    // run should accept App
    expectTypeOf(r.run).toBeCallableWith(new App());
  });

  it("eventController() ctx has event defs plus root", () => {
    const e = eventable<string>(() => ({ [Symbol.dispose]() {} }));

    eventController(
      { myEvent: e },
      function* (_opts, ctx) {
        expectTypeOf(ctx.myEvent).toEqualTypeOf<EventableType<string>>();
        expectTypeOf(ctx.root).toEqualTypeOf<App>();
      },
    );
  });

  it("AllowedYield constrains to INDEFINITELY or EventReq of registered events", () => {
    type Defs = { a: EventableType<number>; b: EventableType<string> };
    type Allowed = AllowedYield<Defs>;
    expectTypeOf<typeof INDEFINITELY>().toMatchTypeOf<Allowed>();
    expectTypeOf<EventReq<number>>().toMatchTypeOf<Allowed>();
    expectTypeOf<EventReq<string>>().toMatchTypeOf<Allowed>();
  });
});
