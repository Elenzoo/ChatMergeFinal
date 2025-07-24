const axios = require("axios");

const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_ID = "UC4kNxGD9VWcYEMrYtdV7oFA"; // @alsotom

// === API: jedna próba pobrania live ID ===
async function tryGetLiveIdFromAPI(channelId) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${API_KEY}`;
    const res = await axios.get(url);
    const items = res.data.items;
    if (items && items.length > 0) {
      console.log("✅ Stream znaleziony przez API:", items[0].id.videoId);
      return items[0].id.videoId;
    }
    console.warn("⚠️ API nie znalazło aktywnego streama – przechodzę do scrapera...");
  } catch (err) {
    console.warn("❌ Błąd API:", err.message);
  }

  return null;
}

// === SCRAPER: fallback jeśli API zawiedzie ===
async function tryGetLiveIdFromScraper(channelHandle) {
  try {
    const url = `https://www.youtube.com/@${channelHandle}/live`;
    const html = await axios.get(url).then(res => res.data);

    const match = html.match(/"videoId":"(.*?)"/);
    if (match) {
      console.log("✅ Stream znaleziony przez scraper:", match[1]);
      return match[1];
    } else {
      console.warn("❌ Scraper nie znalazł videoId w HTML");
    }
  } catch (err) {
    console.warn("❌ Błąd scrapera:", err.message);
  }

  return null;
}

// === Główna funkcja: API + scraper fallback ===
async function getLiveVideoId() {
  const apiResult = await tryGetLiveIdFromAPI(CHANNEL_ID);
  if (apiResult) return apiResult;

  const scraperResult = await tryGetLiveIdFromScraper("alsotom");
  if (scraperResult) return scraperResult;

  throw new Error("❌ Nie znaleziono transmisji na żywo (API + scraper zawiodły)");
}

module.exports = {
  getLiveVideoId
};
