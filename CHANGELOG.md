# Changelog

## 0.0.1

Initial release of `@routinejs/core`.

### Core

- `RoutineNode` — abstract base class implementing `Disposable`; owns resources via `.own()` and child routines via `.child()`
- `ChildScope` — manages a single generator routine's lifetime; implements `Disposable`
- `Runner` / `defaultRunner()` — drives generator execution: parks on `INDEFINITELY`, subscribes on `EventReq`, single-shot unsubscribe on resume

### Routine wrappers

- `routine(make)` — wraps a sync generator into a `Routine<T>` with `.run(root)`
- `eventRoutine(defs, make)` — like `routine()` but passes a typed event-emitter map plus `root` into the generator context

### Yieldables

- `INDEFINITELY` — yield token to park a routine forever
- `waitFor(emitter)` — yield token to suspend until the next event
- `emitter(subscribe)` — creates a `RoutineEmitter<T>` from a subscribe function

### Types

- `RoutineGen` — `Generator<Yieldable, void, any>`
- `RoutineEmitter<T>`, `EventReq<T>`, `Yieldable`
- `Routine<T>`, `EventRoutine<T, Defs>`
- `EventDefs`, `AllowedYield<Defs>`
