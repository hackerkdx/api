const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.set("json spaces", 2);
app.use(morgan("dev"));

app.use("/api/bluesky", require("./routes/bluesky"));
app.use("/api/capcut", require("./routes/capcut"));
app.use("/api/dailymotion", require("./routes/dailymotion"));
app.use("/api/douyin", require("./routes/douyin"));
app.use("/api/kuaishou", require("./routes/kuaishou"));
app.use("/api/linkedin", require("./routes/linkedin"));
app.use("/api/meta", require("./routes/facebookInsta"));
app.use("/api/pinterest", require("./routes/pinterest"));
app.use("/api/reddit", require("./routes/reddit"));
app.use("/api/spotify", require("./routes/spotify"));
app.use("/api/snapchat", require("./routes/snapchat"));
app.use("/api/soundcloud", require("./routes/soundcloud"));
app.use("/api/terabox", require("./routes/terabox"));
app.use("/api/threads", require("./routes/threads"));
app.use("/api/tiktok", require("./routes/tiktok"));
app.use("/api/tumblr", require("./routes/tumblr"));
app.use("/api/twitter", require("./routes/twitter"));
app.use("/api/youtube", require("./routes/youtube"));

const endpoints = [
  "/api/bluesky",
  "/api/capcut",
  "/api/dailymotion",
  "/api/douyin",
  "/api/kuaishou",
  "/api/linkedin",
  "/api/meta",
  "/api/pinterest",
  "/api/reddit",
  "/api/snapchat",
  "/api/spotify",
  "/api/soundcloud",
  "/api/terabox",
  "/api/threads",
  "/api/tiktok",
  "/api/tumblr",
  "/api/twitter",
  "/api/youtube",
];

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    author: "Kan Dinler",
    contact: "https://kandinlerx.rf.gd/",
    message: "Universal Downloader API is running",
    endpoints,
  });
});


// ── TELEGRAM BOT ─────────────────────────────
const BOT_TOKEN  = process.env.BOT_TOKEN;
const TG_API     = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DOWNLOADER = 'https://kandinlerx.rf.gd/downloader/indir.php';

async function tg(method, params = {}) {
    const r = await fetch(`${TG_API}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    return r.json();
}

const PLATFORMS = [
    { name: 'instagram', regex: /instagram\.com/ },
    { name: 'tiktok',    regex: /tiktok\.com|vm\.tiktok|vt\.tiktok/ },
    { name: 'douyin',    regex: /douyin\.com|iesdouyin\.com/ },
    { name: 'snapchat',  regex: /snapchat\.com/ },
    { name: 'pinterest', regex: /pinterest\.com|pin\.it/ },
    { name: 'twitter',   regex: /\bx\.com\b|twitter\.com/ },
    { name: 'facebook',  regex: /facebook\.com|fb\.watch/ },
];

function detectPlatform(url) {
    for (const p of PLATFORMS) if (p.regex.test(url)) return p.name;
    return null;
}

function getMediaUrl(item, source) {
    const direct = ['tiktok','douyin','facebook','pinterest','snapchat'];
    if (direct.includes(source)) return item.url;
    return `https://kandinlerx.rf.gd/downloader/proxy.php?url=${encodeURIComponent(item.url)}&type=${item.type}&source=${source}`;
}

async function handleBotMessage(message) {
    const chatId   = message.chat.id;
    const text     = (message.text || '').trim();
    const name     = message.from?.first_name || 'Kullanıcı';
    if (!text) return;

    if (text === '/start') {
        return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML',
            text: `👋 Merhaba <b>${name}</b>!\n\n🔽 <b>KDX Downloader Bot</b>\n\nLink gönder, indireyim:\n• Instagram · TikTok · Douyin\n• Snapchat · Pinterest\n• X (Twitter) · Facebook\n\n📎 /help | 🌐 <a href="https://kandinlerx.rf.gd/downloader/">Web</a>`,
            disable_web_page_preview: true });
    }
    if (text === '/help') {
        return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML',
            text: `ℹ️ <b>Nasıl Kullanılır?</b>\n\n1. İndirmek istediğin linki kopyala\n2. Bota gönder\n3. Birkaç saniye bekle\n\n⚠️ Yalnızca herkese açık içerikler desteklenir.`,
        });
    }

    let isUrl = false;
    try { new URL(text); isUrl = true; } catch {}
    const platform = detectPlatform(text);

    if (!isUrl || !platform) {
        return tg('sendMessage', { chat_id: chatId,
            text: '❌ Geçerli bir link gönder.\n\nDesteklenen: Instagram · TikTok · Douyin · Snapchat · Pinterest · X · Facebook' });
    }

    await tg('sendChatAction', { chat_id: chatId, action: 'upload_video' });
    await tg('sendMessage', { chat_id: chatId, text: '⏳ İndiriliyor...' });

    let data;
    try {
        const r = await fetch(DOWNLOADER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: text }),
            signal: AbortSignal.timeout(35000),
        });
        data = await r.json();
    } catch(e) {
        return tg('sendMessage', { chat_id: chatId, text: '❌ API bağlantı hatası: ' + e.message });
    }

    if (!data?.success) {
        return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML',
            text: `❌ <b>Hata:</b> ${data?.message || 'Bilinmeyen hata.'}\n\n🌐 <a href="https://kandinlerx.rf.gd/downloader/">Web'den dene</a>`,
            disable_web_page_preview: true });
    }

    const media   = data.media   || [];
    const caption = (data.caption || '').slice(0, 900);
    const source  = data.source  || platform;

    if (!media.length) return tg('sendMessage', { chat_id: chatId, text: '⚠️ İndirilebilir medya bulunamadı.' });

    let sent = 0;
    for (const item of media) {
        const url = getMediaUrl(item, source);
        const cap = sent === 0 ? caption : '';
        if (item.type === 'video') {
            const r = await tg('sendVideo', { chat_id: chatId, video: url, caption: cap, supports_streaming: true });
            if (!r.ok) await tg('sendDocument', { chat_id: chatId, document: url, caption: cap });
        } else if (item.type === 'image') {
            const r = await tg('sendPhoto', { chat_id: chatId, photo: url, caption: cap });
            if (!r.ok) await tg('sendDocument', { chat_id: chatId, document: url, caption: cap });
        } else if (item.type === 'audio') {
            await tg('sendAudio', { chat_id: chatId, audio: url });
        }
        sent++;
        if (sent % 5 === 0) await new Promise(r => setTimeout(r, 1000));
    }
}

// Bot webhook endpoint
app.post('/api/bot', async (req, res) => {
    res.status(200).json({ ok: true }); // Telegram'a hemen 200 dön
    try {
        const update  = req.body;
        const message = update?.message || update?.edited_message;
        if (message) await handleBotMessage(message);
    } catch(e) {
        console.error('Bot error:', e);
    }
});

app.get('/api/bot', (req, res) => {
    res.status(200).send('✅ KDX Bot aktif.');
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
