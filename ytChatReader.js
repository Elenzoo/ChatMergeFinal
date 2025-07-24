const axios = require("axios");
const cheerio = require("cheerio");

const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_HANDLE = "alsotom"; // <-- testowy kanał

// Krok 1: Pobierz channelId z handle
async function getChannelIdFromHandle(handle) {
  try {
    const html = await axios.get(`https://www.youtube.com/@${handle}`);
    const match = html.data.match(/"channelId":"(UC[\w-]+)"/);
    if (match) {
      console.log("✅ channelId wykryty:", match[1]);
      return match[1];
    }
  } catch (e) {
    console.warn("❌ Błąd przy pobieraniu channelId:", e.message);
  }
  return null;
}

// Krok 2: Pobierz ID transmisji live
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

  // Fallback: scraper
  try {
    const html = await axios.get(`https://www.youtube.com/@${CHANNEL_HANDLE}/live`);
    const match = html.data.match(/"videoId":"(.*?)"/);
    if (match) {
      console.log("✅ Stream znaleziony przez scraper:", match[1]);
      return match[1];
    }
  } catch (err) {
    console.warn("❌ Błąd scrapera:", err.message);
  }

  return null;
}

// Krok 3: Retry co 30s przez 10 prób
async function waitForLiveVideoId(retries = 10, delay = 30000) {
  const channelId = await getChannelIdFromHandle(CHANNEL_HANDLE);
  if (!channelId) throw new Error("Brak channelId");

  for (let i = 0; i < retries; i++) {
    const videoId = await getLiveVideoIdFromChannel(channelId);
    if (videoId) {
      console.log("✅ Wykryto aktywny stream:", videoId);
      return videoId;
    }
    console.log(`⏳ Próba ${i + 1}/${retries} – ponowne sprawdzenie za ${delay / 1000}s...`);
    await new Promise(r => setTimeout(r, delay));
  }

  throw new Error("❌ Nie znaleziono transmisji na żywo");
}

module.exports = {
  getLiveVideoId: waitForLiveVideoId
};
