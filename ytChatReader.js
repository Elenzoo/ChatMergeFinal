const axios = require("axios");

const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_ID = "UCncWk2_GvD8Jz0tExK5dQpw"; // @izaklive
const CHANNEL_HANDLE = "izaklive"; // używane w scraperze

// DEBUG: wypisz wszystkie znalezione streamy w API
async function debugListAllLiveStreams() {
  try {
    const res = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "snippet",
        channelId: CHANNEL_ID,
        eventType: "live",
        type: "video",
        key: API_KEY
      }
    });

    const items = res.data.items || [];
    console.log("📺 [DEBUG] Znalezione transmisje live:");
    items.forEach((item, i) => {
      const title = item.snippet.title;
      const id = item.id.videoId;
      console.log(`  ${i + 1}. ${title} (ID: ${id})`);
    });
  } catch (err) {
    console.warn("❌ [DEBUG] Błąd podczas listowania transmisji:", err.message);
  }
}

async function getLiveVideoId() {
  await debugListAllLiveStreams(); // włączamy debugowanie

  try {
    const res = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "snippet",
        channelId: CHANNEL_ID,
        eventType: "live",
        type: "video",
        key: API_KEY
      }
    });
    const video = res.data.items?.[0];
    if (video) {
      console.log("✅ Znalazłem aktywny stream:", video.id.videoId);
      return video.id.videoId;
    }
  } catch (err) {
    console.warn("❌ Błąd pobierania videoId:", err.message);
  }
  return null;
}

async function startYouTubeChat(videoId, io) {
  try {
    const res = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "liveStreamingDetails",
        id: videoId,
        key: API_KEY
      }
    });
    const liveChatId = res.data.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (!liveChatId) throw new Error("Brak liveChatId");

    console.log("💬 Czatujemy z:", liveChatId);
    startPollingChat(liveChatId, io);
  } catch (err) {
    console.warn("❌ Błąd przy pobieraniu liveChatId:", err.message);
  }
}

async function startPollingChat(liveChatId, io) {
  let nextPageToken = "";
  let pollingInterval = 5000;

  const poll = async () => {
    try {
      const res = await axios.get("https://www.googleapis.com/youtube/v3/liveChat/messages", {
        params: {
          liveChatId,
          part: "snippet,authorDetails",
          key: API_KEY,
          pageToken: nextPageToken
        }
      });

      const messages = res.data.items || [];
      messages.forEach(msg => {
        const text = `${msg.authorDetails.displayName}: ${msg.snippet.displayMessage}`;
        console.log("▶️ YouTube:", text);
        io.emit("chatMessage", {
          source: "YouTube",
          text,
          timestamp: Date.now()
        });
      });

      nextPageToken = res.data.nextPageToken;
      pollingInterval = res.data.pollingIntervalMillis || 5000;
    } catch (err) {
      console.warn("❌ Błąd pobierania wiadomości:", err.message);
    }

    setTimeout(poll, pollingInterval);
  };

  poll();
}

module.exports = {
  getLiveVideoId,
  startYouTubeChat
};
