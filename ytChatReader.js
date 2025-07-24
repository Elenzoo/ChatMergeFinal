const axios = require("axios");

const cheerio = require("cheerio");
const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_HANDLE = "alsotom"; // <-- TYLKO TO ZMIENIASZ!

// Krok 1: Pobierz channelId z @handle
async function getChannelIdFromHandle(handle) {
  try {
    const html = await axios.get(`https://www.youtube.com/@${handle}`).then(r => r.data);
    const match = html.match(/"channelId":"(UC[\w-]+)"/);
    return match ? match[1] : null;
  } catch (e) {
    console.warn("❌ Nie udało się znaleźć channelId:", e.message);
    return null;
  }
}

// Krok 2: Sprawdź przez API czy jest aktywny stream
async function getLiveVideoId(channelId) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${API_KEY}`;
    const res = await axios.get(url);
    const items = res.data.items;
    if (items && items.length > 0) {
      return items[0].id.videoId;
    }
  } catch (err) {
    console.warn("❌ Błąd API:", err.message);
  }

  // fallback: scraper
  try {
    const html = await axios.get(`https://www.youtube.com/@${CHANNEL_HANDLE}/live`).then(r => r.data);
    const match = html.match(/"videoId":"(.*?)"/);
    return match ? match[1] : null;
  } catch (err) {
    console.warn("❌ Błąd scrapera:", err.message);
    return null;
  }
}

// Krok 3: Retry co 30 sekund
async function waitForLiveVideoId(retries = 10, delay = 30000) {
  const channelId = await getChannelIdFromHandle(CHANNEL_HANDLE);
  if (!channelId) throw new Error("Brak channelId");

  for (let i = 0; i < retries; i++) {
    const videoId = await getLiveVideoId(channelId);
    if (videoId) {
      console.log("✅ Wykryto stream:", videoId);
      return videoId;
    }
    console.log(`⏳ Brak transmisji – ponowna próba za ${delay / 1000}s...`);
    await new Promise(r => setTimeout(r, delay));
  }

  throw new Error("❌ Nie znaleziono transmisji live");
}

module.exports = {
  waitForLiveVideoId
};
