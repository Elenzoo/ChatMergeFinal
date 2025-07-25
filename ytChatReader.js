// ytChatReader.js
const axios = require("axios");

const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw"; // Twój klucz API
const CHANNEL_ID = "UCUNZKbCLVO-6QRIwU4zOZQw"; // kanał @kajma

let nextPageToken = null;
let interval = null;

async function getLiveVideoId() {
  try {
    const res = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "id",
        channelId: CHANNEL_ID,
        eventType: "live",
        type: "video",
        key: API_KEY
      }
    });

    const videoId = res.data.items[0]?.id?.videoId;
    if (videoId) {
      console.log("🎯 Wykryto aktywny stream:", videoId);
      return videoId;
    } else {
      console.warn("📭 Brak aktywnego streama.");
      return null;
    }
  } catch (err) {
    console.error("❌ Błąd podczas pobierania ID streama:", err.message);
    return null;
  }
}

async function getLiveChatId(videoId) {
  try {
    const res = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "liveStreamingDetails",
        id: videoId,
        key: API_KEY
      }
    });

    const chatId = res.data.items[0]?.liveStreamingDetails?.activeLiveChatId;
    if (chatId) {
      console.log("💬 ID czatu:", chatId);
      return chatId;
    } else {
      console.warn("⚠️ Nie znaleziono aktywnego czatu.");
      return null;
    }
  } catch (err) {
    console.error("❌ Błąd pobierania ID czatu:", err.message);
    return null;
  }
}

async function startPollingChat(chatId, io) {
  console.log("🚀 Rozpoczynam polling czatu...");

  interval = setInterval(async () => {
    try {
      const res = await axios.get("https://www.googleapis.com/youtube/v3/liveChat/messages", {
        params: {
          part: "snippet,authorDetails",
          liveChatId: chatId,
          key: API_KEY,
          pageToken: nextPageToken
        }
      });

      nextPageToken = res.data.nextPageToken;

      res.data.items.forEach(msg => {
        const author = msg.authorDetails.displayName;
        const text = msg.snippet.displayMessage;
        const formatted = `${author}: ${text}`;
        console.log("💬 [YT Chat]", formatted);
        io.emit("chatMessage", {
          source: "YouTube",
          text: formatted,
          timestamp: Date.now()
        });
      });

    } catch (err) {
      console.error("❌ [POLLING] Błąd:", err.message);
    }
  }, 3000); // co 3 sekundy
}

async function startYouTubeChat(io) {
  const videoId = await getLiveVideoId();
  if (!videoId) return;

  const chatId = await getLiveChatId(videoId);
  if (!chatId) return;

  await startPollingChat(chatId, io);
}

module.exports = { startYouTubeChat };
