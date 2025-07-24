/*!

ChatMerge App | Testowy kanał YouTube | Autor: ElEnzo | © 2025 */


const axios = require("axios"); const cheerio = require("cheerio");

const YT_API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw"; const TEST_CHANNEL_ID = "UC_x5XG1OV2P6uZZ5FSM9Ttw"; // Google Developers (kanał testowy na czas rozwoju) const CHANNEL_HANDLE_URL = "https://www.youtube.com/@GoogleDevelopers/live"; // Do scrapera

async function getLiveVideoId() { console.log("🌐 Próba pobrania ID przez YouTube API...");

try { const url = https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${TEST_CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}; const { data } = await axios.get(url);

console.log("📦 API response:", JSON.stringify(data, null, 2));

const item = data.items?.[0];
const videoId = item?.id?.videoId;

if (videoId) {
  console.log("✅ YouTube API zwróciło ID:", videoId);
  return videoId;
}

console.log("⚠️ Brak aktywnego streama w API — próbuję scrapować stronę kanału...");

} catch (err) { console.error("❌ Błąd w zapytaniu do YouTube API:", err.message); }

// === SCRAPER (Fallback) try { console.log("🔍 Scraper: próbuję wyciągnąć ID ze strony:", CHANNEL_HANDLE_URL);

const { data: html } = await axios.get(CHANNEL_HANDLE_URL);
const $ = cheerio.load(html);

const initialData = $("script")
  .map((_, el) => $(el).html())
  .get()
  .find(txt => txt?.includes("videoId"));

const match = initialData?.match(/"videoId":"(.*?)"/);
const scrapedId = match?.[1];

if (scrapedId) {
  console.log("✅ ID streama ze scrapera:", scrapedId);
  return scrapedId;
}

console.log("❌ Scraper nie znalazł ID.");

} catch (err) { console.error("❌ Błąd scrapera:", err.message); }

console.log("📭 Brak aktywnego streama na YouTube (API + scraper zawiodły)"); return null; }

module.exports = { getLiveVideoId };

