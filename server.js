/*!
 * ChatMerge App | Autor: ElEnzo | © 2025
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const tmi = require("tmi.js");
const { getLiveVideoId, startYouTubeChat } = require("./ytChatReader"); // <-- używamy jednej funkcji

const app = express();

// 🔧 Udostępnianie Socket.IO klientowi (np. frontend w Electronie)
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
  channels: ['kajma'] // <- wpisz swoją nazwę kanału jeśli zmieniasz
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

// === YOUTUBE CHAT (API + fallback Puppeteer) ===
async function startYouTubeChatWrapper() {
  try {
    console.log("🎯 Szukam aktywnego streama dla kanału @alsotom...");
    const videoId = await getLiveVideoId();

    if (!videoId) {
      console.log("📭 Brak aktywnego streama na YouTube");
      return;
    }

    console.log("🔴 YouTube Live ID:", videoId);
    startYouTubeChat(videoId, io); // --> automatyczne API lub Puppeteer

  } catch (err) {
    console.log("❌ Błąd przy pobieraniu ID streama:", err.message);
  }
}

// ✅ Start YouTube Chat
startYouTubeChatWrapper();
