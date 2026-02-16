import { INDEFINITELY, type RoutineGen, type RoutineEmitter, type Yieldable } from "./yieldables.js";

export interface Runner {
  attach(gen: RoutineGen): void;
  step(gen: RoutineGen, resumeValue?: any): void;
  disposeGen(gen: RoutineGen): void;
}

type GenState = {
  stack: DisposableStack;
  parked: boolean;
  waiting?: { unsub: Disposable; active: boolean };
};

export function defaultRunner(): Runner {
  const states = new WeakMap<RoutineGen, GenState>();

  function state(gen: RoutineGen): GenState {
    let s = states.get(gen);
    if (!s) {
      s = { stack: new DisposableStack(), parked: false };
      states.set(gen, s);
    }
    return s;
  }

  function clearWait(s: GenState) {
    s.waiting = undefined;
  }

  const runner: Runner = {
    attach(gen) {
      state(gen);
    },

    step(gen, resumeValue) {
      const s = state(gen);
      if (s.parked) return;

      clearWait(s);

      let r: IteratorResult<Yieldable, void>;
      try {
        r = gen.next(resumeValue);
      } catch (err) {
        runner.disposeGen(gen);
        throw err;
      }

      if (r.done) {
        runner.disposeGen(gen);
        return;
      }

      const y = r.value;

      if (y === INDEFINITELY) {
        s.parked = true;
        return;
      }

      const maybeRoutineEmitter = y as any as RoutineEmitter<any>;
      if (maybeRoutineEmitter && typeof maybeRoutineEmitter._subscribe === "function") {
        let active = true;

        const unsub = maybeRoutineEmitter._subscribe((ev) => {
          if (!active) return;
          active = false;
          try {
            unsub[Symbol.dispose]();
          } catch {}
          runner.step(gen, ev);
        });

        s.waiting = { unsub, active: true };
        s.stack.use(unsub);
        return;
      }

      throw new Error(
        "Invalid yield: only INDEFINITELY or EventReq<T> are allowed.",
      );
    },

    disposeGen(gen) {
      const s = states.get(gen);
      if (!s) return;
      states.delete(gen);

      try {
        gen.return?.();
      } catch {}

      try {
        s.stack.dispose();
      } catch {}
    },
  };

  return runner;
}
