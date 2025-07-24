/*!
 * ChatMerge App | Autor: ElEnzo | © 2025 | tryb testowy
 */

const axios = require("axios");
const cheerio = require("cheerio");

const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_ID = "UC_x5XG1OV2P6uZZ5FSM9Ttw"; // Google Developers
const CHANNEL_URL = "https://www.youtube.com/@GoogleDevelopers";

async function getLiveVideoIdFromAPI() {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;
  const { data } = await axios.get(url);

  console.log("📦 API response:", JSON.stringify(data, null, 2));

  const video = data.items?.[0];
  return video?.id?.videoId || null;
}

async function getLiveVideoIdFromScraper() {
  try {
    const { data: html } = await axios.get(CHANNEL_URL);
    const $ = cheerio.load(html);
    const scriptData = $("script")
      .map((_, el) => $(el).html())
      .get()
      .find((txt) => txt && txt.includes("videoId"));

    const match = scriptData?.match(/"videoId":"(.*?)"/);
    return match ? match[1] : null;
  } catch (err) {
    console.error("❌ Scraper error:", err.message);
    return null;
  }
}

async function getLiveVideoId() {
  try {
    console.log("🌐 Próbuję przez YouTube API...");
    const videoId = await getLiveVideoIdFromAPI();

    if (videoId) {
      console.log("✅ ID streama z API:", videoId);
      return videoId;
    }

    console.log("⚠️ API nie znalazło live – przechodzę do scrapera...");
    const fallbackId = await getLiveVideoIdFromScraper();

    if (fallbackId) {
      console.log("✅ ID streama ze scrapera:", fallbackId);
      return fallbackId;
    }

    console.log("📭 Nie znaleziono aktywnego streama (API i scraper)");
    return null;
  } catch (err) {
    console.error("❌ Błąd w getLiveVideoId:", err.message);
    return null;
  }
}

module.exports = { getLiveVideoId };
