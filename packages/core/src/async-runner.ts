import {
  INDEFINITELY,
  type AsyncRoutineGen,
  type RoutineEmitter,
  type Yieldable,
} from "./yieldables.js";

export interface AsyncRunner {
  attach(gen: AsyncRoutineGen): void;
  step(gen: AsyncRoutineGen, resumeValue?: any): Promise<void>;
  disposeGen(gen: AsyncRoutineGen): Promise<void>;
}

type GenState = {
  stack: DisposableStack;
  parked: boolean;
  waiting?: { unsub: Disposable; active: boolean };
};

export function defaultAsyncRunner(): AsyncRunner {
  const states = new WeakMap<AsyncRoutineGen, GenState>();

  function state(gen: AsyncRoutineGen): GenState {
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

  const runner: AsyncRunner = {
    attach(gen) {
      state(gen);
    },

    async step(gen, resumeValue) {
      const s = state(gen);
      if (s.parked) return;

      clearWait(s);

      let r: IteratorResult<Yieldable, void>;
      try {
        r = await gen.next(resumeValue);
      } catch (err) {
        await runner.disposeGen(gen);
        throw err;
      }

      if (r.done) {
        await runner.disposeGen(gen);
        return;
      }

      const y = r.value;

      if (y === INDEFINITELY) {
        s.parked = true;
        return;
      }

      const maybeRoutineEmitter = y as any as RoutineEmitter<any>;
      if (
        maybeRoutineEmitter &&
        typeof maybeRoutineEmitter._subscribe === "function"
      ) {
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

    async disposeGen(gen) {
      const s = states.get(gen);
      if (!s) return;
      states.delete(gen);

      try {
        await gen.return(undefined as any);
      } catch {}

      try {
        s.stack.dispose();
      } catch {}
    },
  };

  return runner;
}
