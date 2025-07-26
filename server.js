const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const tmi = require("tmi.js");
const ytChat = require("./ytChatReader");

const app = express();
const server = http.createServer(app);

// ✅ POPRAWKA: CORS dla Socket.IO (Render.com HTTPS)
const io = new Server(server, {
  cors: {
    origin: "https://chatmerge.onrender.com", // lub ["https://..."] jako tablica
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 🔁 WAKE endpoint dla Render
app.get("/wake", (req, res) => {
  console.log("📡 Wake ping otrzymany");
  res.send("OK");
});

// ✅ Użycie portu przydzielonego przez Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Serwer działa na porcie ${PORT} (Render.com live!)`);
});

// === ZMIENNE ===
const activeClients = new Set();
const YT_CHANNEL_ID = "UCa3HO9MlbTpEUjLjyslBuHg";
let twitchConnected = false;
let youtubeActive = false;

// === YOUTUBE INTEGRACJA ===
ytChat.injectSetYouTubeActive((status) => {
  youtubeActive = status;
});
const { startYouTubeChat, stopYouTubeChat } = ytChat;

// === SOCKET.IO HANDLERY ===
io.on("connection", (socket) => {
  console.log(`🟢 Klient połączony: ${socket.id}`);
  activeClients.add(socket.id);

  if (activeClients.size === 1) {
    console.log("▶️ Pierwszy klient – startuję czat YouTube");
    startYouTubeChat(io, YT_CHANNEL_ID);
  }

  socket.on("ping-server", () => {
    console.log("📡 Otrzymano ping od klienta");
    socket.emit("server-status", {
      server: true,
      twitch: twitchConnected,
      youtube: youtubeActive
    });
  });

  socket.on("force-reset-chat", () => {
    console.log("🔁 Manualny reset czatu YouTube!");
    startYouTubeChat(io, YT_CHANNEL_ID);
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Klient rozłączony: ${socket.id}`);
    activeClients.delete(socket.id);

    if (activeClients.size === 0) {
      console.log("⛔ Brak klientów – zatrzymuję czat YouTube");
      stopYouTubeChat();
      youtubeActive = false;
    }
  });
});

// 🔄 Ping co 30s do każdego klienta (do pomiaru opóźnień itp.)
setInterval(() => {
  activeClients.forEach(socketId => {
    const clientSocket = io.sockets.sockets.get(socketId);
    if (clientSocket) {
      clientSocket.emit("pingCheck", { timestamp: Date.now() });
    }
  });
}, 30000);

// === TWITCH CZAT ===
const twitchClient = new tmi.Client({
  options: { debug: true },
  connection: { reconnect: true, secure: true },
  channels: ['kajma']
});

twitchClient.connect();

twitchClient.on("connected", () => {
  twitchConnected = true;
  console.log("🟣 Twitch czat połączony");
});

twitchClient.on("disconnected", () => {
  twitchConnected = false;
  console.log("⚫ Twitch czat rozłączony");
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
