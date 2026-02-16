# Changelog

## 0.0.2

### Async generator and `AsyncDisposable` support

- `AsyncRoutineNode` — abstract base class implementing `AsyncDisposable`; uses `AsyncDisposableStack` so `.own()` accepts both `Disposable` and `AsyncDisposable`
- `AsyncChildScope` — manages a single async generator routine's lifetime; implements `AsyncDisposable`
- `AsyncRunner` / `defaultAsyncRunner()` — async mirror of `Runner`; awaits `gen.next()` and `gen.return()`
- `asyncRoutine(make)` — wraps an async generator into an `AsyncRoutine<T>` with `.run(root): Promise<void>`
- `asyncEventRoutine(defs, make)` — async counterpart of `eventRoutine()`
- `AsyncRoutineGen` type — `AsyncGenerator<Yieldable, void, any>`

### Breaking changes

- `RoutineNode.own()` no longer accepts `AsyncDisposable` (was fire-and-forget; use `AsyncRoutineNode` instead)

### Other

- `isAsyncDisposable()` type guard exported from `@routinejs/core`

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
