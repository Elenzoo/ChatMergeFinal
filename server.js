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

// === STATUSY ===
let youtubeStarted = false;
let isYouTubeChatReady = false;
let isTwitchConnected = false;

function getChatStatus() {
  return isYouTubeChatReady;
}

// === SOCKET.IO ===
io.on("connection", (socket) => {
  console.log("✅ Nowe połączenie z frontendem");

  // Ping z frontendu – odpowiadamy statusem
  socket.on("ping-server", () => {
    const status = {
      server: true,
      youtube: getChatStatus(),
      twitch: isTwitchConnected
    };
    console.log("📡 Ping → status:", status);
    socket.emit("server-status", status);
  });

  // Status powitalny przy połączeniu
  socket.emit("server-status", {
    server: true,
    youtube: getChatStatus(),
    twitch: isTwitchConnected
  });

  // Start czatu YT (raz)
  if (!youtubeStarted) {
    youtubeStarted = true;
    console.log("▶️ Uruchamiam czat YouTube...");
    startYouTubeChat(io)
      .then((success) => {
        isYouTubeChatReady = success;
        console.log(success ? "✅ Czat YT działa!" : "❌ Czat YT nie działa.");
      })
      .catch((err) => {
        isYouTubeChatReady = false;
        console.error("❌ Błąd przy starcie czatu YT:", err.message);
      });
  }

  socket.on("force-reset-chat", () => {
    console.log("🔁 Manualny reset czatu YouTube!");
    stopYouTubeChat();
    startYouTubeChat(io)
      .then((success) => {
        isYouTubeChatReady = success;
        console.log(success ? "✅ Czat YT działa po resecie!" : "❌ Czat YT NIE działa po resecie.");
      })
      .catch((err) => {
        isYouTubeChatReady = false;
        console.error("❌ Błąd po resecie czatu YT:", err.message);
      });
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

twitchClient.on("connected", () => {
  isTwitchConnected = true;
  console.log("✅ Twitch połączony");
});

twitchClient.on("disconnected", () => {
  isTwitchConnected = false;
  console.log("🔌 Twitch rozłączony");
});

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
