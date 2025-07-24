const axios = require("axios");

// 🔐 Twój klucz do YouTube Data API v3
const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";

// 🎯 Stały channelId kanału @alsotom
const CHANNEL_ID = "UC4kNxGD9VWcYEMrYtdV7oFA";

// 🔍 Sprawdź, czy aktywny stream jest dostępny
async function getLiveVideoIdFromChannel(channelId) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${API_KEY}`;
    const res = await axios.get(url);
    const items = res.data.items;
    if (items && items.length > 0) {
      console.log("✅ Stream znaleziony przez API");
      return items[0].id.videoId;
    }
  } catch (err) {
    console.warn("❌ Błąd API:", err.message);
  }

  return null;
}

// 🔁 Próbuj co 30 sekund przez maksymalnie 10 prób
async function waitForLiveVideoId(retries = 10, delay = 30000) {
  for (let i = 0; i < retries; i++) {
    const videoId = await getLiveVideoIdFromChannel(CHANNEL_ID);
    if (videoId) {
      console.log("✅ Wykryto aktywny stream:", videoId);
      return videoId;
    }

    console.log(`⏳ Próba ${i + 1}/${retries} – ponowne sprawdzenie za ${delay / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error("❌ Nie znaleziono transmisji na żywo");
}

// 🌍 Eksport funkcji używanej w server.js
module.exports = {
  getLiveVideoId: waitForLiveVideoId
};
