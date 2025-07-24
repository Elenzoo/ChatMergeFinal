const fs = require("fs");
const path = require("path");
const axios = require("axios");
const puppeteer = require("puppeteer-core");

const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_ID = "UC4kNxGD9VWcYEMrYtdV7oFA"; // @alsotom

function getExecutablePath() {
  const base = "/opt/render/.cache/puppeteer/chrome";
  const linuxDir = fs.readdirSync(base).find(name => name.startsWith("linux-"));
  if (!linuxDir) throw new Error("❌ Nie znaleziono folderu linux-* w Puppeteer cache");

  return path.join(base, linuxDir, "chrome-linux64", "chrome");
}

async function tryGetLiveIdFromAPI(channelId) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${API_KEY}`;
    const res = await axios.get(url);
    const items = res.data.items;
    if (items && items.length > 0) {
      console.log("✅ Stream znaleziony przez API:", items[0].id.videoId);
      return items[0].id.videoId;
    }
  } catch (err) {
    console.warn("❌ Błąd API:", err.message);
  }
  return null;
}

async function tryGetLiveIdFromScraper(handle) {
  try {
    const html = await axios.get(`https://www.youtube.com/@${handle}/live`).then(r => r.data);
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
  const api = await tryGetLiveIdFromAPI(CHANNEL_ID);
  if (api) return api;

  const scraper = await tryGetLiveIdFromScraper("alsotom");
  if (scraper) return scraper;

  throw new Error("❌ Nie znaleziono transmisji");
}

async function startYouTubeChat(videoId, io) {
  try {
    const res = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${API_KEY}`);
    const liveChatId = res.data.items?.[0]?.liveStreamingDetails?.activeLiveChatId;

    if (liveChatId) {
      console.log("💬 liveChatId z API:", liveChatId);
      return startPollingChat(liveChatId, io);
    }

    const executablePath = getExecutablePath();

    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox'],
      executablePath
    });

    const page = await browser.newPage();
    await page.goto(`https://www.youtube.com/watch?v=${videoId}`, { waitUntil: 'domcontentloaded' });

    const liveChatIdFromPage = await page.evaluate(() => {
      try {
        const ytcfg = window.ytcfg?.data;
        return ytcfg?.LIVE_CHAT?.liveChatId || ytcfg?.live_chat?.liveChatId;
      } catch {
        return null;
      }
    });

    await browser.close();

    if (!liveChatIdFromPage) throw new Error("Brak liveChatId nawet po Puppeteerze.");

    console.log("🤖 liveChatId z Puppeteera:", liveChatIdFromPage);
    startPollingChat(liveChatIdFromPage, io);

  } catch (err) {
    console.error("❌ Nie udało się uruchomić czatu YouTube:", err.message);
  }
}

async function startPollingChat(liveChatId, io) {
  let nextPageToken = "";
  let pollingInterval = 5000;

  const poll = async () => {
    try {
      const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${API_KEY}&pageToken=${nextPageToken}`;
      const res = await axios.get(url);
      const messages = res.data.items || [];

      messages.forEach(msg => {
        const author = msg.authorDetails.displayName;
        const text = msg.snippet.displayMessage;
        io.emit("chatMessage", {
          source: "YouTube",
          text: `${author}: ${text}`,
          timestamp: Date.now()
        });
        console.log("▶️ YouTube:", author + ": " + text);
      });

      nextPageToken = res.data.nextPageToken;
      pollingInterval = res.data.pollingIntervalMillis || 5000;

    } catch (err) {
      console.warn("❌ Błąd pobierania wiadomości z czatu:", err.message);
    }

    setTimeout(poll, pollingInterval);
  };

  poll();
}

module.exports = {
  getLiveVideoId,
  startYouTubeChat
};
