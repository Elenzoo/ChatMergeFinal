/*!
 * ChatMerge App | Autor: ElEnzo | © 2025
 */

const axios = require("axios");
const cheerio = require("cheerio");

const YT_API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_ID = "UC0OgEeq5GBS7qVbn9J1P4OQ"; // Kajma

async function getLiveVideoId() {
  console.log("🌐 Próba pobrania ID przez YouTube API...");

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${YT_API_KEY}`;
    const { data } = await axios.get(url);

    console.log("📦 API search response:", JSON.stringify(data, null, 2));

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
    const channelUrl = `https://www.youtube.com/@kajma/live`;
    console.log("🔍 Próbuję wyciągnąć ID ze strony:", channelUrl);

    const { data: html } = await axios.get(channelUrl);
    const $ = cheerio.load(html);

    const initialData = $("script")
      .map((_, el) => $(el).html())
      .get()
      .find(txt => txt?.includes("videoId"));

    const match = initialData?.match(/"videoId":"(.*?)"/);
    const scrapedId = match?.[1];

    if (scrapedId) {
      console.log("✅ ID streama ze scrapera:", scrapedId);
      console.log("🔴 YouTube Live ID:", scrapedId);
      return scrapedId;
    }

    console.log("❌ Scraper nie znalazł ID.");
  } catch (err) {
    console.log("❌ Błąd scrapera:", err.message);
  }

  console.log("📭 Brak aktywnego streama na YouTube");
  return null;
}

module.exports = { getLiveVideoId };
