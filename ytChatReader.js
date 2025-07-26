const axios = require("axios");

const apiKeys = [
  "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw",
  "AIzaSyDZkmm3O6qea-3MKCV0Rd8ymIXlC7B_d5o",
  "AIzaSyC6zEr4DnnljJkAEl5MzynFIdnEMtAdXY4",
  "AIzaSyB4Gaa2UvOpwMI7qKJDwKADPuERZHSQ2VI",
  "AIzaSyDNuapAUp4EMwkbzmsItShSm962Loe2KSk"
];
let currentKeyIndex = 0;

let chatId = null;
let nextPageToken = null;
let isPolling = false;
let intervalId = null;
let latestMessageTimestamp = 0;

const tokensUsed = apiKeys.map(() => 0);

// === RESET TOKENÓW O PÓŁNOCY ===
function scheduleDailyReset() {
  const now = new Date();
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = nextMidnight - now;

  setTimeout(() => {
    for (let i = 0; i < tokensUsed.length; i++) tokensUsed[i] = 0;
    console.log("🔄 Tokeny zresetowane o północy.");
    scheduleDailyReset();
  }, msUntilMidnight);
}
scheduleDailyReset();

// === POBIERANIE ID TRANSMISJI LIVE ===
async function getLiveVideoId(channelId) {
  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${key}`;
      const response = await axios.get(url);
      tokensUsed[i] += 100;
      if (response.data.items && response.data.items.length > 0) {
        currentKeyIndex = i;
        const videoId = response.data.items[0].id.videoId;
        console.log(`✅ Aktywna transmisja znaleziona: ${videoId}`);
        return videoId;
      }
    } catch (err) {
      console.warn(`❌ Błąd przy pobieraniu videoId z kluczem ${i}: ${err.response?.status}`);
    }
  }
  console.error("🚫 Nie znaleziono aktywnej transmisji.");
  return null;
}

// === SAFE AXIOS GET Z OBSŁUGĄ LIMITÓW I PRZEŁĄCZENIEM KLUCZY ===
async function safeAxiosGet(url) {
  for (let i = 0; i < apiKeys.length; i++) {
    const realIndex = (currentKeyIndex + i) % apiKeys.length;
    const key = apiKeys[realIndex];
    try {
      const response = await axios.get(`${url}&key=${key}`);
      tokensUsed[realIndex] += 1;
      if (tokensUsed[realIndex] > 9000) {
        console.warn(`⚠️ Klucz ${realIndex} przekroczył 9000 tokenów. Przełączam...`);
        currentKeyIndex = (realIndex + 1) % apiKeys.length;
      } else {
        currentKeyIndex = realIndex;
      }
      return response.data;
    } catch (err) {
      if (err.response?.status === 403) {
        console.warn(`⛔ Klucz ${realIndex} zablokowany (403). Próbuję kolejny...`);
        continue;
      } else {
        console.error(`❌ Inny błąd dla klucza ${realIndex}:`, err.message);
        throw err;
      }
    }
  }
  throw new Error("🚫 Wszystkie klucze zawiodły.");
}

// === START POLLERA CZATU ===
async function startPollingChat(io) {
  if (!chatId) {
    console.error("❌ Brak chatId. Nie można rozpocząć nasłuchu.");
    return;
  }

  isPolling = true;

  async function poll() {
    if (!isPolling) return;
    const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${chatId}&part=snippet,authorDetails${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
    try {
      const data = await safeAxiosGet(url);
      nextPageToken = data.nextPageToken;

      for (const item of data.items) {
        const author = item.authorDetails.displayName;
        const message = item.snippet.displayMessage;
        const timestamp = new Date(item.snippet.publishedAt).getTime();

        if (timestamp > latestMessageTimestamp) {
          latestMessageTimestamp = timestamp;

          io.emit("youtube-message", {
            author,
            message,
            timestamp
          });

          console.log(`[YT] ${author}: ${message}`);
        }
      }
    } catch (err) {
      console.error("🚨 Błąd podczas pobierania wiadomości czatu:", err.message);
    }
  }

  clearInterval(intervalId);
  intervalId = setInterval(poll, 3000);
}

// === START CZATU ===
async function startYouTubeChat(io, channelId = "UC4GcVWu_yAseBVZqlygv6Cw") {
  try {
    console.log("🚀 Rozpoczynam pobieranie czatu z kanału:", channelId);
    const videoId = await getLiveVideoId(channelId);
    if (!videoId) return false;

    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}`;
    const data = await safeAxiosGet(url);
    chatId = data.items[0].liveStreamingDetails.activeLiveChatId;
    console.log(`💬 chatId ustawiony: ${chatId}`);
    startPollingChat(io);
    return true;
  } catch (err) {
    console.error("❌ Nie udało się pobrać chatId:", err.message);
    return false;
  }
}

// === STOP CZATU ===
function stopYouTubeChat() {
  console.log("🛑 Zatrzymuję nasłuch YouTube Chat");
  isPolling = false;
  clearInterval(intervalId);
  chatId = null;
  nextPageToken = null;
  latestMessageTimestamp = 0;
}

// === EXPORT ===
module.exports = {
  startYouTubeChat,
  stopYouTubeChat
};
