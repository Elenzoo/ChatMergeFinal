/*!
 * ChatMerge App | Autor: ElEnzo | © 2025
 */

const axios = require("axios");

const YT_API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const VIDEO_ID = "LHD3LSAiDi0";

async function getLiveVideoId() {
  try {
    console.log("📡 Sprawdzam status live dla ID:", VIDEO_ID);
    
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet,status,contentDetails&id=${VIDEO_ID}&key=${YT_API_KEY}`;
    const { data } = await axios.get(url);

    if (!data.items || data.items.length === 0) {
      console.log("❌ Video nie istnieje lub API nie zwróciło danych.");
      return null;
    }

    const item = data.items[0];
    const live = item?.liveStreamingDetails;
    const status = item?.status?.liveBroadcastContent;
    const isLive = status === "live";
    const chatEnabled = !!live?.activeLiveChatId;

    console.log("📺 Status LIVE:", isLive);
    console.log("💬 Czat włączony:", chatEnabled);

    if (!isLive) {
      console.log("⏹️ Stream nie jest aktywny.");
      return null;
    }

    if (!chatEnabled) {
      console.log("🙈 Czat jest wyłączony lub niedostępny.");
      return null;
    }

    return VIDEO_ID;
  } catch (err) {
    console.error("❌ Błąd przy sprawdzaniu statusu czatu:", err.message);
    return null;
  }
}

module.exports = { getLiveVideoId };
