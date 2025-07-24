/*!
 * ChatMerge App | Autor: ElEnzo | © 2025
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const tmi = require("tmi.js");
const { LiveChat } = require("youtube-chat");
const { getLiveVideoId } = require("./ytChatReader");

const app = express();

// 🔧 Udostępnianie klienta Socket.IO do frontendu (np. Electron)
app.use("/socket.io", express.static(__dirname + "/node_modules/socket.io/client-dist"));

const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Serwer działa na http://localhost:${PORT}`);
});

// === TWITCH CHAT ===
const twitchClient = new tmi.Client({
  options: { debug: true },
  connection: {
    reconnect: true,
    secure: true
  },
  channels: ['kajma'] // <- tutaj wpisz nazwę kanału Twitch
});

twitchClient.connect();

twitchClient.on('message', (channel, tags, message, self) => {
  if (self) return;

  const msg = {
    source: 'Twitch',
    text: `${tags['display-name']}: ${message}`,
    timestamp: Date.now()
  };

  console.log("🎮 Twitch:", msg.text);
  io.emit('chatMessage', msg);
});

// === YOUTUBE CHAT ===
async function startYouTubeChat() {
  try {
    console.log("🎯 Szukam aktywnego streama dla kanału @alsotom...");
    const videoId = await getLiveVideoId();
    if (!videoId) {
      console.log("📭 Brak aktywnego streama na YouTube");
      return;
    }

    console.log("🔴 YouTube Live ID:", videoId);

    const chat = new LiveChat({ liveId: videoId });

    chat.on("chat", (msg) => {
      const messageText = Array.isArray(msg.message)
        ? msg.message.map(m => m.text).join(' ')
        : msg.message.text || msg.message;

      const text = `${msg.author.name}: ${messageText}`;
      const data = {
        source: "YouTube",
        text,
        timestamp: Date.now()
      };

      console.log("▶️ YouTube:", data.text);
      io.emit("chatMessage", data);
    });

    chat.on("end", () => {
      console.log("📴 Live zakończony");
    });

    await chat.start();
  } catch (err) {
    console.log("❌ Błąd przy pobieraniu ID streama:", err.message);
  }
}

// Start czatu YouTube po starcie serwera
startYouTubeChat();
