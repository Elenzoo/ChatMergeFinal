const axios = require("axios");

const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_ID = "UC6QZtlRJvCyZkJX7WBs5QIQ"; // IzakLive

async function getLiveVideoId() {
  console.log("🔍 [DEBUG] Rozpoczynam wyszukiwanie transmisji LIVE na YouTube...");

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

    console.log("📦 [DEBUG] Odpowiedź z YouTube Search API:", {
      totalItems: res.data.pageInfo?.totalResults,
      items: res.data.items?.length
    });

    const video = res.data.items?.[0];
    if (video) {
      console.log("✅ [DEBUG] Znalazłem aktywny stream:", video.id.videoId);
      return video.id.videoId;
    } else {
      console.log("📭 [DEBUG] Brak wyników w API Search.");
    }

  } catch (err) {
    console.warn("❌ [DEBUG] Błąd pobierania videoId:", err.message);
  }

  return null;
}

async function startYouTubeChat(videoId, io) {
  console.log("🔄 [DEBUG] Rozpoczynam pobieranie liveChatId dla:", videoId);

  try {
    const res = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "liveStreamingDetails",
        id: videoId,
        key: API_KEY
      }
    });

    const fullDetails = res.data.items?.[0]?.liveStreamingDetails;
    console.log("📦 [DEBUG] Szczegóły streama:", fullDetails);

    const liveChatId = fullDetails?.activeLiveChatId;

    if (!liveChatId) {
      console.warn("❗ [DEBUG] Brak pola activeLiveChatId. Możliwe powody:");
      console.warn("- Live jeszcze nie rozpoczęty oficjalnie?");
      console.warn("- Chat wyłączony przez twórcę?");
      console.warn("- Brak uprawnień lub dane nieaktualne?");
      throw new Error("Brak liveChatId w odpowiedzi API.");
    }

    console.log("💬 [DEBUG] liveChatId:", liveChatId);
    startPollingChat(liveChatId, io);

  } catch (err) {
    console.warn("❌ [DEBUG] Błąd przy pobieraniu liveChatId:", err.message);
  }
}

async function startPollingChat(liveChatId, io) {
  let nextPageToken = "";
  let pollingInterval = 5000;

  console.log("📡 [DEBUG] Rozpoczynam polling czatu YouTube...");

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
      console.log(`📨 [DEBUG] Otrzymano ${messages.length} wiadomości`);

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
      console.warn("❌ [DEBUG] Błąd pobierania wiadomości z czatu:", err.message);
    }

    setTimeout(poll, pollingInterval);
  };

  poll();
}

module.exports = {
  getLiveVideoId,
  startYouTubeChat
};
