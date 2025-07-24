const axios = require("axios");

const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_ID = "UC4kNxGD9VWcYEMrYtdV7oFA"; // kanał @alsotom

// === 1. Pobieranie videoId (API + scraper fallback) ===
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

async function tryGetLiveIdFromScraper(channelHandle) {
  try {
    const html = await axios.get(`https://www.youtube.com/@${channelHandle}/live`).then(r => r.data);
    const match = html.match(/"videoId":"(.*?)"/);
    if (match) {
      console.log("✅ Stream znaleziony przez scraper:", match[1]);
      return match[1];
    }
  } catch (err) {
    console.warn("❌ Błąd scrapera:", err.message);
  }
  return null;
}

async function getLiveVideoId() {
  const apiResult = await tryGetLiveIdFromAPI(CHANNEL_ID);
  if (apiResult) return apiResult;

  const scraperResult = await tryGetLiveIdFromScraper("alsotom");
  if (scraperResult) return scraperResult;

  throw new Error("❌ Nie znaleziono transmisji na żywo (API + scraper zawiodły)");
}

// === 2. Oficjalny system czatu przez YouTube Data API ===
async function startYouTubeChatOfficial(videoId, io) {
  try {
    // Pobierz liveChatId
    const infoUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${API_KEY}`;
    const res = await axios.get(infoUrl);
    const liveChatId = res.data.items?.[0]?.liveStreamingDetails?.activeLiveChatId;

    if (!liveChatId) {
      throw new Error("Brak liveChatId – czat może być wyłączony lub ukryty.");
    }

    console.log("💬 liveChatId:", liveChatId);

    let nextPageToken = "";
    let pollingInterval = 5000;

    const poll = async () => {
      try {
        const chatUrl = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${API_KEY}&pageToken=${nextPageToken}`;
        const res = await axios.get(chatUrl);
        const messages = res.data.items || [];

        messages.forEach(msg => {
          const text = msg.snippet.displayMessage;
          const author = msg.authorDetails.displayName;

          const data = {
            source: "YouTube",
            text: `${author}: ${text}`,
            timestamp: Date.now()
          };

          console.log("▶️ YouTube:", data.text);
          io.emit("chatMessage", data);
        });

        nextPageToken = res.data.nextPageToken;
        pollingInterval = res.data.pollingIntervalMillis || 5000;

      } catch (err) {
        console.warn("❌ Błąd podczas pobierania wiadomości z czatu:", err.message);
      }

      setTimeout(poll, pollingInterval);
    };

    poll(); // uruchom pętlę

  } catch (err) {
    console.error("❌ Nie udało się rozpocząć oficjalnego czatu YouTube:", err.message);
  }
}

// === Eksport funkcji ===
module.exports = {
  getLiveVideoId,
  startYouTubeChatOfficial
};
