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

// === SYSTEM AKTYWNYCH KLIENTÓW + YT CHAT ===
const activeClients = new Set();
const YT_CHANNEL_ID = "UCa3HO9MlbTpEUjLjyslBuHg"; // 👈 wpisz swój kanał YT (np. Kajmy)

io.on("connection", (socket) => {
  console.log(`🟢 Klient połączony: ${socket.id}`);
  activeClients.add(socket.id);

  // Pierwszy klient – start czatu
  if (activeClients.size === 1) {
    console.log("▶️ Pierwszy klient – startuję czat YouTube");
    startYouTubeChat(io, YT_CHANNEL_ID);
  }

  // Odpowiedź na ping
  socket.on("ping-server", () => {
    console.log("📡 Otrzymano ping od klienta");
    socket.emit("server-status", "ready");
  });

  // Ręczny reset czatu z frontu
  socket.on("force-reset-chat", () => {
    console.log("🔁 Manualny reset czatu YouTube!");
    startYouTubeChat(io, YT_CHANNEL_ID);
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Klient rozłączony: ${socket.id}`);
    activeClients.delete(socket.id);

    // Ostatni klient się rozłączył – stop czatu
    if (activeClients.size === 0) {
      console.log("⛔ Brak klientów – zatrzymuję czat YouTube");
      stopYouTubeChat();
    }
  });
});

// Co 30 sek. wysyłamy ping tylko do aktywnych klientów
setInterval(() => {
  activeClients.forEach(socketId => {
    const clientSocket = io.sockets.sockets.get(socketId);
    if (clientSocket) {
      clientSocket.emit('pingCheck', { timestamp: Date.now() });
    }
  });
}, 30000);

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
