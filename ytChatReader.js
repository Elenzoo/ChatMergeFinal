const axios = require("axios");

const API_KEY = "AIzaSyDZkmm3O6qea-3MKCV0Rd8ymIXlC7B_d5o";
const CHANNEL_ID = "UC4GcVWu_yAseBVZqlygv6Cw"; // Kajma

let latestMessageTimestamp = 0;

async function getLiveVideoId() {
  console.log("🔍 Szukam ID transmisji live...");
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;
    const res = await axios.get(url);
    const items = res.data.items;
    if (items.length > 0) {
      const videoId = items[0].id.videoId;
      console.log("✅ Znaleziono videoId:", videoId);
      return videoId;
    } else {
      console.log("⚠️ Brak aktywnej transmisji.");
      return null;
    }
  } catch (err) {
    console.error("❌ Błąd w getLiveVideoId:", err.response?.data?.error || err.message);
    return null;
  }
}

async function getLiveChatId(videoId) {
  console.log("🔍 Pobieram liveChatId dla videoId:", videoId);
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${API_KEY}`;
    const res = await axios.get(url);
    const items = res.data.items;
    if (items.length > 0 && items[0].liveStreamingDetails?.activeLiveChatId) {
      const liveChatId = items[0].liveStreamingDetails.activeLiveChatId;
      console.log("✅ Znaleziono liveChatId:", liveChatId);
      return liveChatId;
    } else {
      console.log("⚠️ Nie znaleziono liveChatId.");
      return null;
    }
  } catch (err) {
    console.error("❌ Błąd w getLiveChatId:", err.response?.data?.error || err.message);
    return null;
  }
}

async function startYouTubeChat(io) {
  console.log("🚀 startYouTubeChat() odpalony");

  const videoId = await getLiveVideoId();
  if (!videoId) {
    console.log("⛔️ Przerwano – brak videoId.");
    return;
  }

  const liveChatId = await getLiveChatId(videoId);
  if (!liveChatId) {
    console.log("⛔️ Przerwano – brak liveChatId.");
    return;
  }

  console.log("📡 Rozpoczynam nasłuch czatu YouTube...");

  let nextPageToken = null;

  setInterval(async () => {
    try {
      let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${API_KEY}`;
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }

      const res = await axios.get(url);
      nextPageToken = res.data.nextPageToken;

      if (!res.data.items || res.data.items.length === 0) {
        console.log("📭 Brak nowych wiadomości z czatu.");
        return;
      }

      console.log(`📥 Odebrano ${res.data.items.length} wiadomości`);

      res.data.items.forEach(msg => {
        const author = msg.authorDetails.displayName;
        const text = msg.snippet.displayMessage;
        const timestamp = new Date(msg.snippet.publishedAt).getTime();

        if (timestamp > latestMessageTimestamp) {
          latestMessageTimestamp = timestamp;
          const formatted = `${author}: ${text}`;
          console.log("💬 [YT Chat]", formatted);
          io.emit("chatMessage", {
            source: "YouTube",
            text: formatted,
            timestamp
          });
        } else {
          // Komentarz niepotrzebny w logu, bo będzie spamować
        }
      });
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const reason = err.response.data?.error?.message || "Brak informacji";

        if (status === 403) {
          console.error("⛔️ Błąd 403: API limit? Brak uprawnień? Powód:", reason);
        } else {
          console.error(`❌ [YT API] Błąd ${status}:`, reason);
        }
      } else {
        console.error("❌ Błąd połączenia z YouTube API:", err.message);
      }
    }
  }, 3000);
}

module.exports = { startYouTubeChat };
