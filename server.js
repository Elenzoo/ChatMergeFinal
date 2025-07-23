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
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Serwer działa na http://localhost:${PORT}`);
});

// === TWITCH ===
const twitchClient = new tmi.Client({
  options: { debug: true },
  connection: {
    reconnect: true,
    secure: true
  },
  channels: ['kajma']
});

twitchClient.connect();

twitchClient.on('message', (channel, tags, message, self) => {
  if (self) return;

  io.emit('chatMessage', {
    source: 'Twitch',
    text: `${tags['display-name']}: ${message}`,
    timestamp: Date.now()
  });
});

// === YOUTUBE ===
async function startYouTubeChat(channelUrl) {
  const videoId = await getLiveVideoId(channelUrl);
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

    io.emit("chatMessage", {
      source: "YouTube",
      text,
      timestamp: Date.now()
    });
  });

  chat.on("end", () => {
    console.log("📴 Live zakończony");
  });

  await chat.start();
}

startYouTubeChat("https://www.youtube.com/watch?v=OxA769Y-5E4&ab_channel=Kajma");
