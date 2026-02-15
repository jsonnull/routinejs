export class RoomLog implements Disposable {
  readonly entries: string[] = [];

  constructor(private roomName: string) {
    console.log(`[room:${roomName}] log opened`);
  }

  append(user: string, text: string) {
    this.entries.push(`${user}: ${text}`);
  }

  [Symbol.dispose]() {
    console.log(
      `[room:${this.roomName}] log closed (${this.entries.length} messages)`,
    );
  }
}
