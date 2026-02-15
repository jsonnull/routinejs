import { App, AppRoutine } from "./app.js";

const app = new App();
AppRoutine.run(app);

// Alice joins #general — opens the room, spawns a room controller
app.chat.join("alice", "general");

// Message in #general
app.chat.message("alice", "general", "hello everyone!");

// Bob joins #general — room already open, no new controller
app.chat.join("bob", "general");
app.chat.message("bob", "general", "hey alice!");

// Charlie joins #random — opens a second room
app.chat.join("charlie", "random");
app.chat.message("charlie", "random", "anyone here?");

// Another message in #general (both rooms active)
app.chat.message("alice", "general", "welcome bob!");

// Close #general — disposes that room's controller (scoped lifetime ends)
app.rooms.close("general");

// #random is still alive
app.chat.message("charlie", "random", "still chatting");

// Shut down the app — disposes all remaining rooms + ChatService
app[Symbol.dispose]();

console.log("[main] done");
