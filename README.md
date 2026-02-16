# routinejs

Express ownership graphs and control flow together, with automatic resource management.

## How it works

- **Ownership graph**: objects and routines form a tree; disposing a node tears down its entire subtree
- **Control flow**: generator-based routines suspend and resume within the ownership graph

### Ownership and scoped lifetimes

`RoutineNode` is the base class for objects that own resources and child routines. Call `.own()` to tie a resource to the node's lifetime, and `.child()` to spawn a child generator routine. When a node is disposed, teardown propagates through the entire subtree: children, their resources, everything.

```ts
class App extends RoutineNode {
  readonly db: Database;

  constructor() {
    super();
    this.db = this.own(new Database()); // disposed when App is disposed
  }
}
```

Inside generator routines, `using` declarations tie resource lifetimes to the generator's scope:

```ts
function* worker(app: App): RoutineGen {
  using conn = app.db.connect(); // cleaned up when this routine ends
  yield INDEFINITELY;
}
```

### Generators as routines

A generator function becomes a long-lived routine. Routines suspend with `yield` and resume when something happens:

- `yield INDEFINITELY` – park the routine forever (it stays alive until its parent disposes it)
- `yield waitFor(someEmitter)` – suspend until the next event, then resume with the payload

```ts
const MyRoutine = routine(function* (app: App): RoutineGen {
  while (true) {
    const msg = yield waitFor(app.messages);
    console.log(msg);
  }
});
```

### Synchronous execution

Currently everything is synchronous: events fire, generators resume, the stack unwinds. No promises, no microtask queues. Async generator and `AsyncDisposable` support is planned.

## Install

```
npm install @routinejs/core
```

## Quick example

```ts
import { RoutineNode, routine, emitter, waitFor, type RoutineGen, type RoutineEmitter } from "@routinejs/core";

class Counter extends RoutineNode {
  readonly onIncrement: RoutineEmitter<number>;
  #listeners = new Set<(n: number) => void>();

  constructor() {
    super();
    this.onIncrement = emitter((cb) => {
      this.#listeners.add(cb);
      return { [Symbol.dispose]: () => void this.#listeners.delete(cb) };
    });
  }

  increment(n: number) {
    for (const cb of [...this.#listeners]) cb(n);
  }
}

const CountRoutine = routine(function* (counter: Counter): RoutineGen {
  let total = 0;
  while (true) {
    const n = yield waitFor(counter.onIncrement);
    total += n;
    console.log(`total: ${total}`);
  }
});

const counter = new Counter();
CountRoutine.run(counter);

counter.increment(1); // total: 1
counter.increment(5); // total: 6

counter[Symbol.dispose](); // tears down the routine and all owned resources
```

## API

### `RoutineNode`

Abstract base class for objects that own resources and child routines.

- `.own(resource)` – ties a `Disposable` or `AsyncDisposable` to this node's lifetime
- `.child(make)` – spawns a child generator routine, owned by this node
- `[Symbol.dispose]()` – tears down the node and everything it owns

```ts
class App extends RoutineNode {
  readonly chat = this.own(new ChatService());
  readonly rooms = this.own(new RoomManager());
}

const app = new App();
app[Symbol.dispose](); // disposes rooms, then chat (LIFO)
```

### `routine(make)`

Wraps a generator function into a `Routine<T>`. Call `.run(root)` to start the routine as a child of `root`.

```ts
const MyRoutine = routine(function* (app: App): RoutineGen {
  console.log("started");
  yield INDEFINITELY;
});

MyRoutine.run(app); // starts a child generator owned by app
```

### `eventRoutine(defs, make)`

Like `routine()`, but passes a map of event emitters (plus `root`) into the generator's context. Constrains `yield` to only the declared events.

```ts
const ChatRoutine = eventRoutine(
  { onJoin: app.chat.onJoin, onMessage: app.chat.onMessage },
  function* (_opts, { onJoin, onMessage, root }) {
    const join = yield waitFor(onJoin);
    console.log(`${join.user} joined`);
  },
);
```

### `emitter(subscribe)`

Creates a `RoutineEmitter<T>` from a subscribe function. The subscribe function receives a callback and returns a `Disposable` for cleanup.

```ts
const onClick = emitter<MouseEvent>((cb) => {
  el.addEventListener("click", cb);
  return { [Symbol.dispose]: () => el.removeEventListener("click", cb) };
});
```

### `waitFor(emitter)`

Yield token. `yield waitFor(e)` suspends the routine until `e` fires, then resumes with the event payload.

```ts
function* listen(app: App): RoutineGen {
  while (true) {
    const msg = yield waitFor(app.chat.onMessage);
    console.log(msg.text);
  }
}
```

### `INDEFINITELY`

Yield token. `yield INDEFINITELY` parks the routine forever; it stays alive until its parent disposes it. Useful for routines that hold resources via `using` but don't need to react to events.

```ts
app.child(function* (): RoutineGen {
  using conn = new ConnectionPool();
  yield INDEFINITELY; // conn stays open until app disposes this child
});
```

### `ChildScope`

Low-level scope created by `RoutineNode.child()`. Manages a single generator's lifetime. You typically don't construct this directly (`RoutineNode.child()` and `routine()` handle it).

### Types

- `RoutineGen` – `Generator<Yieldable, void, any>`, the return type for routine generator functions
- `RoutineEmitter<T>` – object with `_subscribe(cb): Disposable`, created by `emitter()`
- `Routine<T>` – object with `.run(root: T): void`, created by `routine()`
- `EventRoutine<T, Defs>` – object with `.run(root: T): void`, created by `eventRoutine()`
- `EventReq<T>` – opaque yield token returned by `waitFor()`
- `EventDefs` – `Record<string, RoutineEmitter<any>>`, map of named emitters for `eventRoutine()`
- `AllowedYield<Defs>` – union of `INDEFINITELY` and `EventReq` for each emitter in `Defs`
- `Yieldable` – `typeof INDEFINITELY | EventReq<any>`, anything a routine can yield

## Examples

| Example | Events | `using` | Ownership graph | Generator lifetimes |
|---|---|---|---|---|
| [`examples/chat/`](examples/chat/) | x | x | x | x |

## License

MIT
