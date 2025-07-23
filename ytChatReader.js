/*!
 * ChatMerge App | Autor: ElEnzo | © 2025
 */

const axios = require("axios");

const YT_API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw"; // 🔐 Twój klucz
const CHANNEL_ID = "UC0OgEeq5GBS7qVbn9J1P4OQ"; // 🔔 ID kanału Kajmy

async function getLiveVideoId() {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}`;

    const { data } = await axios.get(url);
    console.log("📦 YouTube API RESPONSE:");
    console.log(JSON.stringify(data, null, 2));

    const video = data.items && data.items[0];

    if (!video) {
      console.log("📭 Brak aktywnego streama na YouTube");
      return null;
    }

    return video.id.videoId;
  } catch (err) {
    console.error("❌ Błąd przy pobieraniu ID streama:", err.message);
    return null;
  }
}

module.exports = { getLiveVideoId };
