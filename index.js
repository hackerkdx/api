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
const WEB_AD     = 'https://kandinlerx.rf.gd/downloader/';
const RAIDEN_BASE = 'https://api.raiden.ovh';
const MILAN_BASE  = 'https://api-opal-omega-76.vercel.app/api';

async function tg(method, params = {}) {
    const r = await fetch(`${TG_API}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    return r.json();
}

// ── DOSYA İNDİR + TELEGRAM'A YÜKLE ─────────
async function sendMediaAsBuffer(chatId, item, caption) {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.tiktok.com/',
            'Accept': '*/*',
        };
        const res = await fetch(item.url, { headers, signal: AbortSignal.timeout(40000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const contentType = res.headers.get('content-type') || '';
        const buffer = await res.arrayBuffer();
        const blob = new Blob([buffer], { type: contentType });

        // FormData ile Telegram'a gönder
        const form = new FormData();
        form.append('chat_id', String(chatId));
        if (caption) form.append('caption', caption.slice(0, 1024));

        let method;
        if (item.type === 'video' || contentType.includes('video')) {
            method = 'sendVideo';
            form.append('video', blob, 'video.mp4');
            form.append('supports_streaming', 'true');
        } else if (item.type === 'audio') {
            method = 'sendAudio';
            form.append('audio', blob, 'audio.mp3');
        } else {
            method = 'sendPhoto';
            form.append('photo', blob, 'photo.jpg');
        }

        const r = await fetch(`${TG_API}/${method}`, { method: 'POST', body: form });
        const result = await r.json();
        if (!result.ok) throw new Error(result.description);
        return true;
    } catch(e) {
        console.error('sendMediaAsBuffer error:', e.message);
        return false;
    }
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
    // Tüm URL'ler CDN'den direkt — proxy kullanmıyoruz
    return item.url;
}

async function callBotDownloader(url, platform) {
    const directSources = ['tiktok', 'douyin', 'facebook', 'pinterest', 'snapchat'];
    let apiUrl, source = platform;

    if (platform === 'instagram') {
        apiUrl = `${RAIDEN_BASE}/insta?url=${encodeURIComponent(url)}`;
    } else if (platform === 'tiktok') {
        apiUrl = `${RAIDEN_BASE}/tk?url=${encodeURIComponent(url)}`;
    } else if (platform === 'douyin') {
        apiUrl = `${MILAN_BASE}/douyin/download?url=${encodeURIComponent(url)}`;
    } else if (platform === 'twitter') {
        apiUrl = `${RAIDEN_BASE}/x?url=${encodeURIComponent(url)}`;
        source = 'twitter';
    } else if (platform === 'facebook') {
        // video: /share/r/, photo: /share/
        if (/\/share\/[vr]\//i.test(url) || /fb\.watch/i.test(url)) {
            apiUrl = `${MILAN_BASE}/meta/download?url=${encodeURIComponent(url)}`;
        } else {
            apiUrl = `${RAIDEN_BASE}/fb?url=${encodeURIComponent(url)}`;
        }
    } else if (platform === 'snapchat') {
        apiUrl = `${MILAN_BASE}/snapchat/download?url=${encodeURIComponent(url)}`;
    } else if (platform === 'pinterest') {
        apiUrl = `${MILAN_BASE}/pinterest/download?url=${encodeURIComponent(url)}`;
    } else {
        return { success: false, message: 'Desteklenmeyen platform.' };
    }

    const r = await fetch(apiUrl, {
        headers: { 'User-Agent': 'KDXBot/1.0' },
        signal: AbortSignal.timeout(30000),
    });
    const raw = await r.json();

    // Normalize response to { success, source, media[], caption }
    return normalizeBotResponse(raw, source, platform);
}

function normalizeBotResponse(raw, source, platform) {
    const media = [];
    let caption = null;

    if (platform === 'instagram') {
        caption = raw.title ?? raw.caption ?? null;
        (raw.media || []).forEach(item => {
            const url = item.download ?? item.url;
            if (url) media.push({ type: item.type === 'video' ? 'video' : 'image', url, thumbnail: item.thumbnail });
        });
    } else if (platform === 'tiktok') {
        caption = null;
        // Raiden TK: media[] with type ('video'/'mp3') and url
        const items = raw.media || [];
        const videoItems = items.filter(i => i.type !== 'mp3');
        const isSlideshow = videoItems.length > 1;
        items.forEach(item => {
            if (!item.type || !item.url) return;
            const type = item.type === 'mp3' ? 'audio' : (isSlideshow ? 'image' : 'video');
            media.push({ type, url: item.url, thumbnail: raw.thumbnail });
        });
    } else if (platform === 'douyin') {
        caption = raw.data?.title ?? null;
        (raw.data?.links || []).forEach(link => {
            const lbl = (link.label || '').toLowerCase();
            if (lbl.includes('mp4') && lbl.includes('hd') && link.url && link.url !== '#') {
                if (!media.find(m => m.type === 'video')) media.push({ type: 'video', url: link.url, thumbnail: raw.data?.thumbnail });
            }
        });
        if (!media.length) {
            (raw.data?.links || []).forEach(link => {
                if ((link.label||'').toLowerCase().includes('mp4') && link.url && link.url !== '#' && !media.length) {
                    media.push({ type: 'video', url: link.url, thumbnail: raw.data?.thumbnail });
                }
            });
        }
    } else if (platform === 'twitter') {
        caption = raw.caption ?? null;
        (raw.media || []).forEach(item => {
            const url = item.url ?? item.download;
            if (item.type && url) media.push({ type: item.type, url, thumbnail: item.thumbnail });
        });
    } else if (platform === 'facebook') {
        // Milan meta API: { success, data: { data: [{url, resolution, shouldRender, thumbnail}] } }
        if (raw.success && raw.data?.data) {
            caption = raw.data?.caption ?? null;
            raw.data.data.forEach(item => {
                if (!item.shouldRender && item.url && item.url.startsWith('http')) {
                    media.push({ type: 'video', url: item.url, thumbnail: item.thumbnail });
                }
            });
        }
        // Raiden fb API: { status: true, media: [{type:'photo', viewer_image_uri}], caption }
        if (!media.length && raw.media) {
            caption = raw.caption ?? null;
            raw.media.forEach(item => {
                if (item.type === 'photo' && item.viewer_image_uri) {
                    media.push({ type: 'image', url: item.viewer_image_uri });
                }
            });
        }
    } else if (platform === 'snapchat') {
        caption = raw.data?.title ?? null;
        (raw.data?.data?.snapList || []).forEach(snap => {
            const url = snap.snapUrls?.mediaUrl;
            if (url) media.push({ type: snap.snapMediaType === 1 ? 'video' : 'image', url, thumbnail: snap.snapUrls?.mediaPreviewUrl?.value });
        });
    } else if (platform === 'pinterest') {
        caption = raw.data?.title ?? null;
        let best = null, bestScore = -1;
        (raw.data?.downloads || []).forEach(dl => {
            if ((dl.format||'').toUpperCase() !== 'MP4' || !dl.url) return;
            const q = dl.quality || '';
            const score = q.includes('720') ? 100 : q.includes('360') ? 60 : q.includes('240') ? 40 : 10;
            if (score > bestScore) { bestScore = score; best = dl; }
        });
        if (best) media.push({ type: 'video', url: best.url, thumbnail: raw.data?.thumbnail });
        else if (raw.data?.thumbnail) media.push({ type: 'image', url: raw.data.thumbnail });
    }

    console.log(`[BOT] platform=${platform} raw_keys=${Object.keys(raw||{}).join(',')} media_count=${media.length}`);
    if (raw?.media) console.log(`[BOT] raw.media sample:`, JSON.stringify(raw.media[0]).slice(0,200));
    if (raw?.data) console.log(`[BOT] raw.data keys:`, Object.keys(raw.data||{}).join(','));
    if (!media.length) return { success: false, message: `İndirilebilir medya bulunamadı. (platform=${platform})` };
    return { success: true, source, media, caption };
}

// ── MESAJ SİLME ─────────────────────────────
async function deleteMessage(chatId, messageId) {
    await tg('deleteMessage', { chat_id: chatId, message_id: messageId });
}

// ── MEDYA GRUBU GÖNDERİMİ ───────────────────
async function sendMediaGroup(chatId, items) {
    // Telegram max 10 medya/grup
    const chunks = [];
    for (let i = 0; i < items.length; i += 10) chunks.push(items.slice(i, i + 10));
    for (const chunk of chunks) {
        const r = await tg('sendMediaGroup', { chat_id: chatId, media: chunk });
        if (!r.ok) console.error('sendMediaGroup failed:', r.description);
        if (chunks.length > 1) await new Promise(r => setTimeout(r, 800));
    }
}

// ── BOT MESAJ İŞLEYİCİ ──────────────────────
async function handleBotMessage(message) {
    const chatId = message.chat.id;
    const text   = (message.text || '').trim();
    const name   = message.from?.first_name || 'Kullanıcı';
    if (!text) return;

    const AD = `\n\n🌐 <a href="${WEB_AD}">KDX Downloader</a>`;

    if (text === '/start') {
        return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', disable_web_page_preview: true,
            text: `Merhaba <b>${name}</b>,\n\n<b>KDX Downloader</b>'a hoş geldiniz.\n\nDesteklenen platformlardan içerik bağlantısı gönderin, dosyayı ileteyim.\n\n<b>Platformlar:</b>\nInstagram · TikTok · Douyin · Snapchat · Pinterest · X (Twitter) · Facebook\n\n/help — Kullanım kılavuzu${AD}` });
    }

    if (text === '/help') {
        return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', disable_web_page_preview: true,
            text: `<b>Kullanım Kılavuzu</b>\n\n1. İndirmek istediğiniz içeriğin bağlantısını kopyalayın\n2. Bu bota gönderin\n3. Dosya birkaç saniye içinde iletilecektir\n\n<b>Notlar:</b>\n• Yalnızca herkese açık içerikler desteklenir\n• Dosya boyutu 50 MB ile sınırlıdır${AD}` });
    }

    let isUrl = false;
    try { new URL(text); isUrl = true; } catch {}
    const platform = detectPlatform(text);

    if (!isUrl || !platform) {
        return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', disable_web_page_preview: true,
            text: `Geçerli bir bağlantı gönderiniz.\n\n<b>Desteklenen platformlar:</b>\nInstagram · TikTok · Douyin · Snapchat · Pinterest · X · Facebook${AD}` });
    }

    // Kum saati gönder, ID'sini sakla
    const waitMsg = await tg('sendMessage', { chat_id: chatId, text: '⏳' });
    const waitMsgId = waitMsg?.result?.message_id;

    let data;
    try {
        data = await callBotDownloader(text, platform);
    } catch(e) {
        if (waitMsgId) await deleteMessage(chatId, waitMsgId);
        return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', disable_web_page_preview: true,
            text: `Bağlantı hatası oluştu. Lütfen tekrar deneyin.${AD}` });
    }

    // Kum saatini sil
    if (waitMsgId) await deleteMessage(chatId, waitMsgId);

    if (!data?.success) {
        return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', disable_web_page_preview: true,
            text: `İçerik alınamadı: ${data?.message || 'Bilinmeyen hata.'}${AD}` });
    }

    const media   = data.media   || [];
    const caption = data.caption || '';
    const source  = data.source  || platform;

    if (!media.length) {
        return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', disable_web_page_preview: true,
            text: `İndirilebilir medya bulunamadı.${AD}` });
    }

    const visualMedia = media.filter(m => m.type === 'image' || m.type === 'video');
    const audioMedia  = media.filter(m => m.type === 'audio');

    // Medya gönderimi — önce URL ile dene, başarısız olursa buffer ile
    for (let i = 0; i < visualMedia.length; i++) {
        const item = visualMedia[i];
        const cap  = i === 0 ? '' : ''; // caption ayrı mesajda

        // Önce direkt URL ile dene — caption yok, ayrı mesajda gönderilecek
        let r;
        if (item.type === 'video') {
            r = await tg('sendVideo', { chat_id: chatId, video: item.url, supports_streaming: true });
        } else {
            r = await tg('sendPhoto', { chat_id: chatId, photo: item.url });
        }

        // Başarısız → buffer ile indir+gönder
        if (!r.ok) {
            console.log(`[BOT] URL başarısız, buffer deneniyor [${i}]:`, r.description);
            const ok = await sendMediaAsBuffer(chatId, item, '');
            if (!ok) {
                console.error(`[BOT] Buffer da başarısız [${i}]`);
                // Son çare: belge olarak
                const rd = await tg('sendDocument', { chat_id: chatId, document: item.url });
                if (!rd.ok) console.error(`[BOT] sendDocument da başarısız:`, rd.description);
            }
        }

        if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(r, 1000));
    }

    // Ses
    for (const item of audioMedia) {
        await tg('sendAudio', { chat_id: chatId, audio: item.url });
    }

    // Caption kopyalanabilir ayrı mesaj olarak
    if (caption && caption.trim()) {
        await tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', disable_web_page_preview: true,
            text: `<code>${caption.slice(0, 3000).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code>${AD}` });
    } else {
        // Caption yoksa sadece reklam
        await tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', disable_web_page_preview: true,
            text: AD.trim() });
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
