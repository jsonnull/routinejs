import { describe, it, expectTypeOf } from "vitest";
import {
  INDEFINITELY,
  emitter,
  waitFor,
  routine,
  eventRoutine,
  RoutineNode,
  type EventReq,
  type RoutineEmitter as RoutineEmitterType,
  type RoutineGen,
  type AllowedYield,
} from "../src/index.js";

class App extends RoutineNode {}

describe("type-level tests", () => {
  it("waitFor() returns EventReq<T> matching the RoutineEmitter<T>", () => {
    const e = emitter<number>(() => ({ [Symbol.dispose]() {} }));
    const req = waitFor(e);
    expectTypeOf(req).toEqualTypeOf<EventReq<number>>();
  });

  it("INDEFINITELY is a unique symbol type", () => {
    expectTypeOf(INDEFINITELY).toBeSymbol();
  });

  it("routine() infers root type from make function", () => {
    const r = routine(function* (app: App): RoutineGen {
      yield INDEFINITELY;
    });
    // run should accept App
    expectTypeOf(r.run).toBeCallableWith(new App());
  });

  it("eventRoutine() ctx has event defs plus root", () => {
    const e = emitter<string>(() => ({ [Symbol.dispose]() {} }));

    eventRoutine(
      { myEvent: e },
      function* (_opts, ctx) {
        expectTypeOf(ctx.myEvent).toEqualTypeOf<RoutineEmitterType<string>>();
        expectTypeOf(ctx.root).toEqualTypeOf<App>();
      },
    );
  });

  it("AllowedYield constrains to INDEFINITELY or EventReq of registered events", () => {
    type Defs = { a: RoutineEmitterType<number>; b: RoutineEmitterType<string> };
    type Allowed = AllowedYield<Defs>;
    expectTypeOf<typeof INDEFINITELY>().toMatchTypeOf<Allowed>();
    expectTypeOf<EventReq<number>>().toMatchTypeOf<Allowed>();
    expectTypeOf<EventReq<string>>().toMatchTypeOf<Allowed>();
  });
});
