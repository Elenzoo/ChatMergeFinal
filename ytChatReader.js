/*!
 * ChatMerge App | Autor: ElEnzo | © 2025
 */

const axios = require("axios");

const YT_API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_ID = "UC0OgEeq5GBS7qVbn9J1P4OQ"; // Kajma

// === Pobieranie ID aktywnego streama z YouTube Data API ===
async function getLiveVideoId() {
  try {
    console.log("🌐 Próbuję pobrać aktywny stream z YouTube API...");

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}`;
    const { data } = await axios.get(url);

    console.log("📦 API search response:", JSON.stringify(data, null, 2));

    const item = data.items?.[0];
    const videoId = item?.id?.videoId;

    if (!videoId) {
      console.log("📭 Brak aktywnego streama w wyszukiwarce API");
      return null;
    }

    console.log("🔍 Znaleziono videoId:", videoId);

    // Walidujemy status live i czatu
    const isUsable = await validateLiveStatus(videoId);

    if (!isUsable) {
      console.log("⛔️ Live nie spełnia warunków (brak czatu / niedostępny)");
      return null;
    }

    console.log("✅ Live dostępny, zwracam videoId:", videoId);
    return videoId;
  } catch (err) {
    console.error("❌ Błąd w getLiveVideoId:", err.message);
    return null;
  }
}

// === Sprawdzanie szczegółów transmisji (czy czat aktywny, czy nie dla dzieci) ===
async function validateLiveStatus(videoId) {
  try {
    const infoUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet,status,contentDetails&id=${videoId}&key=${YT_API_KEY}`;
    const { data } = await axios.get(infoUrl);

    const item = data.items?.[0];
    if (!item) {
      console.log("⚠️ API nie zwróciło danych o transmisji.");
      return false;
    }

    const live = item.liveStreamingDetails;
    const snippet = item.snippet;
    const status = item.status;
    const contentRating = item.contentDetails?.contentRating;

    const hasChat = !!live?.activeLiveChatId;
    const isLive = hasChat || snippet?.liveBroadcastContent === "live";
    const isAgeRestricted = contentRating?.ytRating === "ytAgeRestricted";
    const madeForKids = status?.madeForKids || item.contentDetails?.madeForKids;

    // 🔍 DEBUG
    console.log("🧠 Debug transmisji:");
    console.log("📺 liveBroadcastContent:", snippet?.liveBroadcastContent);
    console.log("💬 activeLiveChatId:", live?.activeLiveChatId);
    console.log("🔞 ytRating:", contentRating?.ytRating);
    console.log("👶 madeForKids:", madeForKids);
    console.log("✅ FINAL isLive =", isLive);

    return isLive && hasChat && !isAgeRestricted && !madeForKids;
  } catch (err) {
    console.error("❌ Błąd walidacji statusu:", err.message);
    return false;
  }
}

module.exports = { getLiveVideoId };
