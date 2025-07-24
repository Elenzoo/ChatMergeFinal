/*!
 * ChatMerge App | Autor: ElEnzo | © 2025
 * Dynamiczne pobieranie ID transmisji live z kanału testowego
 */

const axios = require("axios");
const cheerio = require("cheerio");

const YT_API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";

// 👇 Ustawiamy tymczasowo testowy kanał (z Twojego linku)
const TEST_CHANNEL_ID = "UCmM04mnVaGzchz0VcGZDT0g";
const TEST_CHANNEL_HANDLE_URL = "https://www.youtube.com/@user-kb7kk2nk5s/live";

async function getLiveVideoId() {
  console.log("🌐 Próba pobrania ID przez YouTube API...");

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${TEST_CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}`;
    const { data } = await axios.get(url);

    console.log("📦 API response:", JSON.stringify(data, null, 2));

    const item = data.items?.[0];
    const videoId = item?.id?.videoId;

    if (videoId) {
      console.log("✅ YouTube API zwróciło ID:", videoId);
      return videoId;
    }

    console.log("⚠️ Brak aktywnego streama w API — fallback do scrapera...");
  } catch (err) {
    console.log("❌ Błąd w zapytaniu do YouTube API:", err.message);
  }

  // === SCRAPER (Fallback)
  try {
    console.log("🔍 Scraper: próbuję wyciągnąć ID ze strony:", TEST_CHANNEL_HANDLE_URL);

    const { data: html } = await axios.get(TEST_CHANNEL_HANDLE_URL);
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
  } catch (err) {
    console.error("❌ Błąd scrapera:", err.message);
  }

  console.log("📭 Brak aktywnego streama na YouTube (API + scraper zawiodły)");
  return null;
}

module.exports = { getLiveVideoId };
