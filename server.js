const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const tmi = require("tmi.js");
const { startYouTubeChat } = require("./ytChatReader");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Serwer działa na http://localhost:${PORT}`);
});

// === STATIC SOCKET.IO CLIENT (dla Electron) ===
app.use("/socket.io", express.static(__dirname + "/node_modules/socket.io/client-dist"));

// === YOUTUBE ===
let youtubeStarted = false;

// === SOCKET.IO – połączenie z frontendem ===
io.on("connection", (socket) => {
  console.log("✅ Nowe połączenie z frontendem");

  // natychmiastowy status do aplikacji
  socket.emit("server-status", "ready");

  // odpowiedź na ping od frontendowego czujnika
  socket.on("ping-server", () => {
    socket.emit("server-status", "ready");
  });

  // tylko raz startuj YouTube czat
  if (!youtubeStarted) {
    youtubeStarted = true;
    console.log("▶️ Uruchamiam czat YouTube...");
    startYouTubeChat(io);
  }

  // rozłączenie
  socket.on("disconnect", () => {
    console.log("🔌 Rozłączono frontend");
  });
});

// === TWITCH CHAT ===
const twitchClient = new tmi.Client({
  options: { debug: true },
  connection: { reconnect: true, secure: true },
  channels: ['kajma']
});

twitchClient.connect();

twitchClient.on("message", (channel, tags, message, self) => {
  if (self) return;

  const msg = {
    source: "Twitch",
    text: `${tags["display-name"]}: ${message}`,
    timestamp: Date.now()
  };

  console.log("🎮 Twitch:", msg.text);
  io.emit("chatMessage", msg);
});
