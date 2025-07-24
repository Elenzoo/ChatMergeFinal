const fs = require("fs");
const path = require("path");
const axios = require("axios");
const puppeteer = require("puppeteer-core");

const API_KEY = "AIzaSyCOR5QRFiHR-hZln9Zb2pHfOnyCANK0Yaw";
const CHANNEL_ID = "UC4kNxGD9VWcYEMrYtdV7oFA"; // alsotom

function getExecutablePath() {
  const base = "/opt/render/.cache/puppeteer/chrome";
  if (!fs.existsSync(base)) throw new Error("❌ Folder base nie istnieje");

  const linuxDir = fs.readdirSync(base).find(d => d.startsWith("linux-"));
  if (!linuxDir) throw new Error("❌ Nie znaleziono katalogu linux-*");

  const chromePath = path.join(base, linuxDir, "chrome-linux64", "chrome");
  if (!fs.existsSync(chromePath)) throw new Error("❌ Brak pliku chrome");

  return chromePath;
}

async function tryGetLiveIdFromAPI(channelId) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${API_KEY}`;
    const res = await axios.get(url);
    const items = res.data.items;
    if (items && items.length > 0) {
      console.log("✅ Stream z API:", items[0].id.videoId);
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
      console.log("✅ Stream z scrapera:", match[1]);
      return match[1];
    }
  } catch (err) {
    console.warn("❌ Błąd scrapera:", err.message);
  }
  return null;
}

async function getLiveVideoId() {
  return await tryGetLiveIdFromAPI(CHANNEL_ID) || await tryGetLiveIdFromScraper("alsotom");
}

async function startYouTubeChat(videoId, io) {
  try {
    const liveChatId = await fetchLiveChatId(videoId);
    if (!liveChatId) throw new Error("❌ Brak liveChatId");

    console.log("💬 liveChatId:", liveChatId);
    startPollingChat(liveChatId, io);
  } catch (err) {
    console.error("❌ startYouTubeChat:", err.message);
  }
}

async function fetchLiveChatId(videoId) {
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${API_KEY}`;
  try {
    const res = await axios.get(apiUrl);
    const id = res.data.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (id) return id;
  } catch (err) {
    console.warn("❌ API nie zwróciło liveChatId:", err.message);
  }

  const executablePath = getExecutablePath();
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
    executablePath
  });

  const page = await browser.newPage();
  await page.goto(`https://www.youtube.com/watch?v=${videoId}`, { waitUntil: "domcontentloaded" });

  const chatId = await page.evaluate(() => {
    const ytcfg = window.ytcfg?.data;
    return ytcfg?.LIVE_CHAT?.liveChatId || ytcfg?.live_chat?.liveChatId;
  });

  await browser.close();
  return chatId;
}

async function startPollingChat(liveChatId, io) {
  let nextPageToken = "";
  let interval = 5000;

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
        console.log("▶️ YT:", author + ": " + text);
      });

      nextPageToken = res.data.nextPageToken;
      interval = res.data.pollingIntervalMillis || 5000;
    } catch (err) {
      console.warn("❌ Chat polling error:", err.message);
    }

    setTimeout(poll, interval);
  };

  poll();
}

module.exports = {
  getLiveVideoId,
  startYouTubeChat
};
