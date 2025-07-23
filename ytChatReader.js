/*!
 * ChatMerge App | Autor: ElEnzo | © 2025
 */

const axios = require("axios");
const cheerio = require("cheerio");

async function getLiveVideoId(channelUrl) {
  try {
    const { data: html } = await axios.get(channelUrl);
    const $ = cheerio.load(html);
    const initialData = $("script")
      .map((_, el) => $(el).html())
      .get()
      .find((txt) => txt && txt.includes("videoId"));

    const match = initialData.match(/"videoId":"(.*?)"/);
    return match ? match[1] : null;
  } catch (err) {
    console.error("❌ Błąd przy pobieraniu ID streama:", err.message);
    return null;
  }
}

module.exports = { getLiveVideoId };
