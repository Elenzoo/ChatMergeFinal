/*!
 * ChatMerge App | Autor: ElEnzo | © 2025
 */

const axios = require("axios");

// 🔐 Twój klucz API i ID kanału
const YT_API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_ID = "UC0OgEeq5GBS7qVbn9J1P4OQ";

async function getLiveVideoId() {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}`;
    const { data } = await axios.get(url);

    // 🔍 LOGI DEBUGUJĄCE
    console.log("📌 URL zapytania:", url);
    console.log("📦 Odpowiedź z YouTube API:");
    console.log(JSON.stringify(data, null, 2));

    const video = data.items && data.items[0];

    if (!video) {
      console.log("📭 Brak aktywnego streama na YouTube (API response bez items)");
      return null;
    }

    console.log("✅ Znaleziono ID streama:", video.id.videoId);
    return video.id.videoId;
  } catch (err) {
    console.error("❌ Błąd przy pobieraniu ID streama:", err.message);
    return null;
  }
}

module.exports = { getLiveVideoId };
