const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const tmi = require("tmi.js");
const { startYouTubeChat, stopYouTubeChat } = require("./ytChatReader");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://chatmerge.onrender.com",
    methods: ["GET", "POST"]
  }
});

app.use("/socket.io", express.static(__dirname + "/node_modules/socket.io/client-dist"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Serwer działa na http://localhost:${PORT}`);
});

// === YOUTUBE CHAT ===
let youtubeStarted = false;
const CHANNEL_ID = "UC4GcVWu_yAseBVZqlygv6Cw"; // Kajma

io.on("connection", (socket) => {
  console.log("✅ Nowe połączenie z frontendem");

  socket.emit("server-status", "ready");

  socket.on("ping-server", () => {
    socket.emit("server-status", "ready");
  });

  // Start czatu YT (tylko raz przy pierwszym połączeniu)
  if (!youtubeStarted) {
    youtubeStarted = true;
    console.log("▶️ Uruchamiam czat YouTube...");
    startYouTubeChat(io, CHANNEL_ID);
  }

  // Manualny reset czatu przez frontend
  socket.on("force-reset-chat", () => {
    console.log("🔁 Manualny reset czatu YouTube!");
    stopYouTubeChat();
    startYouTubeChat(io, CHANNEL_ID);
  });

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
