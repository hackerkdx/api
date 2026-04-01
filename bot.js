// KDX Downloader — Telegram Bot
// Vercel Serverless Function (Node.js)

const BOT_TOKEN  = process.env.BOT_TOKEN;
const API_URL    = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DOWNLOADER = 'https://kandinlerx.rf.gd/downloader/indir.php';

// ── TELEGRAM API ─────────────────────────────
async function tg(method, params = {}) {
    const res = await fetch(`${API_URL}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    return res.json();
}

const sendMessage = (chatId, text, extra = {}) =>
    tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });

const sendTyping = (chatId) =>
    tg('sendChatAction', { chat_id: chatId, action: 'upload_video' });

async function sendMedia(chatId, url, type, caption = '') {
    const cap = caption ? caption.slice(0, 900) + (caption.length > 900 ? '…' : '') : '';
    if (type === 'video') {
        const r = await tg('sendVideo', { chat_id: chatId, video: url, caption: cap, supports_streaming: true });
        if (!r.ok) await tg('sendDocument', { chat_id: chatId, document: url, caption: cap });
    } else if (type === 'image') {
        const r = await tg('sendPhoto', { chat_id: chatId, photo: url, caption: cap });
        if (!r.ok) await tg('sendDocument', { chat_id: chatId, document: url, caption: cap });
    } else if (type === 'audio') {
        await tg('sendAudio', { chat_id: chatId, audio: url });
    } else {
        await tg('sendDocument', { chat_id: chatId, document: url, caption: cap });
    }
}

// ── DOWNLOADER API ───────────────────────────
async function callDownloader(url) {
    try {
        const res = await fetch(DOWNLOADER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
            signal: AbortSignal.timeout(35000),
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: 'API bağlantı hatası: ' + e.message };
    }
}

// ── PROXY URL ────────────────────────────────
function getMediaUrl(item, source) {
    const directSources = ['tiktok', 'douyin', 'facebook', 'pinterest', 'snapchat'];
    if (directSources.includes(source)) return item.url;
    return `https://kandinlerx.rf.gd/downloader/proxy.php?url=${encodeURIComponent(item.url)}&type=${item.type}&source=${source}`;
}

// ── PLATFORM DETECTION ───────────────────────
const PLATFORMS = [
    { name: 'instagram', regex: /instagram\.com/ },
    { name: 'tiktok',    regex: /tiktok\.com|vm\.tiktok|vt\.tiktok/ },
    { name: 'douyin',    regex: /douyin\.com|iesdouyin\.com/ },
    { name: 'snapchat',  regex: /snapchat\.com|story\.snapchat\.com/ },
    { name: 'pinterest', regex: /pinterest\.com|pin\.it/ },
    { name: 'twitter',   regex: /\bx\.com\b|twitter\.com/ },
    { name: 'facebook',  regex: /facebook\.com|fb\.watch|fb\.com/ },
];

function detectPlatform(url) {
    try {
        for (const p of PLATFORMS) {
            if (p.regex.test(url)) return p.name;
        }
    } catch {}
    return null;
}

// ── MESSAGE HANDLER ──────────────────────────
async function handleMessage(message) {
    const chatId   = message.chat.id;
    const text     = (message.text || '').trim();
    const userName = message.from?.first_name || 'Kullanıcı';

    if (!text) return;

    // Komutlar
    if (text === '/start') {
        return sendMessage(chatId,
            `👋 Merhaba <b>${userName}</b>!\n\n` +
            `🔽 <b>KDX Downloader Bot</b>'a hoş geldin.\n\n` +
            `Desteklenen platformlardan bir link gönder:\n\n` +
            `• Instagram · TikTok · Douyin\n` +
            `• Snapchat · Pinterest\n` +
            `• X (Twitter) · Facebook\n\n` +
            `📎 /help — Yardım\n` +
            `🌐 <a href="https://kandinlerx.rf.gd/downloader/">Web Sitesi</a>`,
            { disable_web_page_preview: true }
        );
    }

    if (text === '/help') {
        return sendMessage(chatId,
            `ℹ️ <b>Nasıl Kullanılır?</b>\n\n` +
            `1. İndirmek istediğin içeriğin linkini kopyala\n` +
            `2. Bu bota gönder\n` +
            `3. Birkaç saniye bekle, dosya gelecek\n\n` +
            `<b>⚠️ Notlar:</b>\n` +
            `• Yalnızca herkese açık içerikler\n` +
            `• 50MB üzeri dosyalar gönderilemeyebilir\n` +
            `• YouTube şu an devre dışı\n\n` +
            `🌐 <a href="https://kandinlerx.rf.gd/downloader/">Web Sitesi</a>`,
            { disable_web_page_preview: true }
        );
    }

    // URL kontrolü
    const platform = detectPlatform(text);
    let isUrl = false;
    try { new URL(text); isUrl = true; } catch {}

    if (!isUrl || !platform) {
        return sendMessage(chatId,
            `❌ Geçerli bir link gönder.\n\n` +
            `Desteklenen: Instagram · TikTok · Douyin · Snapchat · Pinterest · X · Facebook`
        );
    }

    // İndirme
    await sendTyping(chatId);
    await sendMessage(chatId, '⏳ İndiriliyor...');

    const data = await callDownloader(text);

    if (!data?.success) {
        return sendMessage(chatId,
            `❌ <b>Hata:</b> ${data?.message || 'Bilinmeyen hata.'}\n\n` +
            `🌐 <a href="https://kandinlerx.rf.gd/downloader/">Web'den dene</a>`,
            { disable_web_page_preview: true }
        );
    }

    const media   = data.media   || [];
    const caption = data.caption || '';
    const source  = data.source  || platform;

    if (media.length === 0) {
        return sendMessage(chatId, '⚠️ İndirilebilir medya bulunamadı.');
    }

    let sent = 0;
    for (const item of media) {
        const url = getMediaUrl(item, source);
        await sendMedia(chatId, url, item.type, sent === 0 ? caption : '');
        sent++;
        if (sent % 5 === 0) await new Promise(r => setTimeout(r, 1000));
    }
}

// ── VERCEL HANDLER ───────────────────────────
export default async function handler(req, res) {
    if (req.method === 'GET') {
        return res.status(200).send('✅ KDX Bot aktif.');
    }
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const update  = req.body;
        const message = update?.message || update?.edited_message;
        if (message) await handleMessage(message);
    } catch (e) {
        console.error('Bot error:', e);
    }

    res.status(200).json({ ok: true });
                }
