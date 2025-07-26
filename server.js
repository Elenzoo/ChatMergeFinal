const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const tmi = require("tmi.js");
const { startYouTubeChat, stopYouTubeChat } = require("./ytChatReader");

const app = express();
const server = http.createServer(app);

// 🔒 CORS – pozwalamy tylko Twojej aplikacji frontendowej
const io = new Server(server, {
  cors: {
    origin: "https://chatmerge.onrender.com",
    methods: ["GET", "POST"]
  }
});

// ✅ Socket.IO client (dla Electron) – nie stanowi zagrożenia
app.use("/socket.io", express.static(__dirname + "/node_modules/socket.io/client-dist"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Serwer działa na http://localhost:${PORT}`);
});

// === YOUTUBE CHAT ===
let youtubeStarted = false;
let isYouTubeChatReady = false;

// Funkcja pomocnicza do sprawdzenia statusu czatu YT
function getChatStatus() {
  return isYouTubeChatReady;
}

// === POŁĄCZENIE SOCKET.IO ===
io.on("connection", (socket) => {
  console.log("✅ Nowe połączenie z frontendem");

  // 🔁 Nasłuch pingów – odpowiadamy tylko jeśli czat działa
  socket.on("ping-server", () => {
    if (getChatStatus()) {
      console.log("📡 Otrzymano ping – czat działa ✔️");
      socket.emit("server-status", "ready");
    } else {
      console.log("📡 Otrzymano ping – czat NIEDOSTĘPNY ❌");
      socket.emit("server-status", "not-ready");
    }
  });

  // 👋 Info powitalne na start
  socket.emit("server-status", getChatStatus() ? "ready" : "not-ready");

  // ▶️ Start czatu YT (tylko raz)
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

  // 🔁 Manualny reset czatu przez frontend
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

  // 🔐 NIE nasłuchujemy żadnych innych danych od klienta!
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
