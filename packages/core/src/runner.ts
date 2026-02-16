import { INDEFINITELY, type ControllerGen, type Eventable, type Yieldable } from "./yieldables.js";

export interface Runner {
  attach(gen: ControllerGen): void;
  step(gen: ControllerGen, resumeValue?: any): void;
  disposeGen(gen: ControllerGen): void;
}

type GenState = {
  stack: DisposableStack;
  parked: boolean;
  waiting?: { unsub: Disposable; active: boolean };
};

export function defaultRunner(): Runner {
  const states = new WeakMap<ControllerGen, GenState>();

  function state(gen: ControllerGen): GenState {
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

      const maybeEventable = y as any as Eventable<any>;
      if (maybeEventable && typeof maybeEventable._subscribe === "function") {
        let active = true;

        const unsub = maybeEventable._subscribe((ev) => {
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
