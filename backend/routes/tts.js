const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

/**
 * API Text-to-Speech — Giọng nữ Trà My (Google Translate TTS)
 * GET /api/tts?text=Xin chào
 * Trả về audio/mpeg stream
 */
router.get('/', async (req, res) => {
    try {
        const text = req.query.text;
        if (!text || text.trim() === '') {
            return res.status(400).json({ success: false, message: 'Thiếu tham số text' });
        }

        // Giới hạn độ dài text (Google TTS giới hạn ~200 ký tự/request)
        const cleanText = text.trim().substring(0, 500);

        // Chia thành các đoạn nhỏ (max 200 ký tự mỗi đoạn)
        const chunks = splitTextIntoChunks(cleanText, 200);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 1 ngày

        // Stream từng đoạn audio nối tiếp
        for (let i = 0; i < chunks.length; i++) {
            const chunk = encodeURIComponent(chunks[i]);
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${chunk}&idx=${i}&total=${chunks.length}`;

            await new Promise((resolve, reject) => {
                https.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://translate.google.com/',
                    }
                }, (audioRes) => {
                    if (audioRes.statusCode !== 200) {
                        reject(new Error(`Google TTS trả về status ${audioRes.statusCode}`));
                        return;
                    }
                    audioRes.pipe(res, { end: false });
                    audioRes.on('end', resolve);
                    audioRes.on('error', reject);
                }).on('error', reject);
            });
        }

        res.end();
    } catch (error) {
        console.error('TTS Error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Lỗi tạo giọng đọc' });
        }
    }
});

/**
 * Chia text thành các đoạn nhỏ, cắt tại dấu câu hoặc khoảng trắng
 */
function splitTextIntoChunks(text, maxLen) {
    if (text.length <= maxLen) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLen) {
            chunks.push(remaining);
            break;
        }

        // Tìm vị trí cắt tốt nhất: dấu câu → dấu phẩy → khoảng trắng
        let cutAt = -1;
        const searchRange = remaining.substring(0, maxLen);

        // Ưu tiên cắt tại dấu chấm, chấm hỏi, chấm than
        const sentenceEnd = Math.max(
            searchRange.lastIndexOf('. '),
            searchRange.lastIndexOf('! '),
            searchRange.lastIndexOf('? '),
            searchRange.lastIndexOf('.\n'),
        );
        if (sentenceEnd > maxLen * 0.3) {
            cutAt = sentenceEnd + 1;
        }

        // Fallback: cắt tại dấu phẩy
        if (cutAt === -1) {
            const commaAt = searchRange.lastIndexOf(', ');
            if (commaAt > maxLen * 0.3) cutAt = commaAt + 1;
        }

        // Fallback: cắt tại khoảng trắng
        if (cutAt === -1) {
            const spaceAt = searchRange.lastIndexOf(' ');
            if (spaceAt > maxLen * 0.3) cutAt = spaceAt;
        }

        // Fallback cuối: cắt cứng
        if (cutAt === -1) cutAt = maxLen;

        chunks.push(remaining.substring(0, cutAt).trim());
        remaining = remaining.substring(cutAt).trim();
    }

    return chunks.filter(c => c.length > 0);
}

module.exports = router;
