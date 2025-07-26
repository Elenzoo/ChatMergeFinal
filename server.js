const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const tmi = require("tmi.js");
const { startYouTubeChat } = require("./ytChatReader");

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

io.on("connection", (socket) => {
  console.log("✅ Nowe połączenie z frontendem");

  // ZAWSZE nasłuchuj na pingi
  socket.on("ping-server", () => {
    console.log("📡 Otrzymano ping od klienta – odsyłam gotowość");
    socket.emit("server-status", "ready");
  });

  // Jednorazowa informacja na start (opcjonalna)
  socket.emit("server-status", "ready");

  // Start czatu YT (tylko raz)
  if (!youtubeStarted) {
    youtubeStarted = true;
    console.log("▶️ Uruchamiam czat YouTube...");
    startYouTubeChat(io);
  }

  // Manualny reset czatu przez frontend
  socket.on("force-reset-chat", () => {
    console.log("🔁 Manualny reset czatu YouTube!");
    startYouTubeChat(io);
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
