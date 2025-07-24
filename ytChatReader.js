/*!
 * ChatMerge App | Autor: ElEnzo | © 2025
 */

const axios = require("axios");
const cheerio = require("cheerio");

const YT_API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const VIDEO_ID = "LHD3LSAiDi0";
const CHANNEL_URL = "https://www.youtube.com/@GoogleDevelopers";

async function getLiveVideoId() {
  // Można też sprawdzić przez API, ale my znamy ID
  console.log("📡 Używam ręcznego ID do testów:", VIDEO_ID);

  const isRestricted = await isAgeRestricted(VIDEO_ID);
  if (isRestricted) {
    console.log("🔞 Stream ma ograniczenia wiekowe – czat niedostępny");
    return null;
  }

  return VIDEO_ID;
}

async function isAgeRestricted(videoId) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YT_API_KEY}`;
    const { data } = await axios.get(url);
    const item = data.items && data.items[0];
    const restricted = item?.contentDetails?.contentRating?.ytRating === "ytAgeRestricted";

    console.log(`🔍 Ograniczenie wiekowe: ${restricted}`);
    return restricted;
  } catch (err) {
    console.error("❌ Błąd sprawdzania ograniczenia wieku:", err.message);
    return false;
  }
}

module.exports = { getLiveVideoId };
