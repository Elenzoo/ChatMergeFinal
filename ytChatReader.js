// ytChatReader.js
const axios = require("axios");

const API_KEY = "AIzaSyDZkmm3O6qea-3MKCV0Rd8ymIXlC7B_d5o";
const CHANNEL_ID = "UC4GcVWu_yAseBVZqlygv6Cw"; // Kajma

let latestMessageTimestamp = 0;

async function getLiveVideoId() {
  const url = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;
  const res = await axios.get(url);
  const items = res.data.items;
  if (items.length > 0) {
    return items[0].id.videoId;
  } else {
    return null;
  }
}

async function getLiveChatId(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${API_KEY}`;
  const res = await axios.get(url);
  const items = res.data.items;
  if (items.length > 0 && items[0].liveStreamingDetails?.activeLiveChatId) {
    return items[0].liveStreamingDetails.activeLiveChatId;
  }
  return null;
}

async function startYouTubeChat(io) {
  console.log("📡 Szukam live streama i czatu...");
  const videoId = await getLiveVideoId();
  if (!videoId) {
    console.log("❌ Brak aktywnego streama.");
    return;
  }
  console.log("✅ Live stream znaleziony:", videoId);

  const liveChatId = await getLiveChatId(videoId);
  if (!liveChatId) {
    console.log("❌ Nie znaleziono aktywnego czatu.");
    return;
  }

  let nextPageToken = null;

  setInterval(async () => {
    try {
      let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${API_KEY}`;
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }

      const res = await axios.get(url);
      nextPageToken = res.data.nextPageToken;

      res.data.items.forEach(msg => {
        const author = msg.authorDetails.displayName;
        const text = msg.snippet.displayMessage;
        const timestamp = new Date(msg.snippet.publishedAt).getTime();

        if (timestamp > latestMessageTimestamp) {
          latestMessageTimestamp = timestamp;
          const formatted = `${author}: ${text}`;
          console.log("💬 [YT Chat]", formatted);
          io.emit("chatMessage", { source: "YouTube", text: formatted, timestamp });
        }
      });
    } catch (err) {
      console.error("❌ [YT API] Błąd:", err.response?.data?.error || err.message);
    }
  }, 3000);
}

module.exports = { startYouTubeChat };
