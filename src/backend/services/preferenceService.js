const db = require('../config/database');

const TAG_DEFINITIONS = [
    { key: 'hai_san', label: 'Hải sản', group: 'Nguyên liệu', affectsRecommendation: true, synonyms: ['hai san', 'tom', 'muc', 'lau cua', 'canh cua', 'cua dong', 'cua hoang de', 'mon cua', 'ngheu', 'so', 'oc', 'ca kho', 'ca chien', 'ca loc', 'ca'] },
    { key: 'thit_bo', label: 'Thịt bò', group: 'Nguyên liệu', affectsRecommendation: true, synonyms: ['bo', 'thit bo', 'beef'] },
    { key: 'thit_ga', label: 'Thịt gà', group: 'Nguyên liệu', affectsRecommendation: true, synonyms: ['ga', 'thit ga', 'chicken'] },
    { key: 'rau_nam', label: 'Rau nấm', group: 'Nguyên liệu', affectsRecommendation: true, synonyms: ['rau', 'nam', 'nam tuoi', 'rau xanh'] },
    { key: 'lau', label: 'Lẩu', group: 'Loại món', affectsRecommendation: true, synonyms: ['lau', 'hotpot', 'nuoc lau'] },
    { key: 'nuong', label: 'Nướng', group: 'Loại món', affectsRecommendation: true, synonyms: ['nuong', 'bbq', 'do nuong'] },
    { key: 'chien', label: 'Chiên giòn', group: 'Loại món', affectsRecommendation: true, synonyms: ['chien', 'gion', 'ran', 'do chien'] },
    { key: 'com_bun_mi', label: 'Cơm/Bún/Mì', group: 'Loại món', affectsRecommendation: true, synonyms: ['com', 'bun', 'mi', 'pho', 'hu tieu'] },
    { key: 'do_uong', label: 'Đồ uống', group: 'Loại món', affectsRecommendation: true, synonyms: ['do uong', 'tra', 'ca phe', 'sinh to', 'nuoc ep', 'nuoc ngot'] },
    { key: 'trang_mieng', label: 'Tráng miệng', group: 'Loại món', affectsRecommendation: true, synonyms: ['trang mieng', 'che', 'banh', 'kem'] },
    { key: 'cay', label: 'Cay', group: 'Khẩu vị', affectsRecommendation: true, synonyms: ['cay', 'ot', 'sa te', 'cay vua', 'cay nong'] },
    { key: 'ngot', label: 'Ngọt', group: 'Khẩu vị', affectsRecommendation: true, synonyms: ['ngot', 'ngot thanh', 'ngot vua'] },
    { key: 'man', label: 'Mặn', group: 'Khẩu vị', affectsRecommendation: true, synonyms: ['man', 'dam vi', 'vi man'] },
    { key: 'chua', label: 'Chua', group: 'Khẩu vị', affectsRecommendation: true, synonyms: ['chua', 'chua ngot', 'chua cay'] },
    { key: 'dam_da', label: 'Đậm đà', group: 'Khẩu vị', affectsRecommendation: true, synonyms: ['dam da', 'vua mieng', 'vua an', 'nuoc dung', 'thom ngon'] },
    { key: 'thanh_mat', label: 'Thanh mát/ít dầu', group: 'Khẩu vị', affectsRecommendation: true, synonyms: ['thanh', 'thanh mat', 'it dau', 'nhe bung', 'khong dau mo'] },
    { key: 'it_ngot', label: 'Ít ngọt', group: 'Ràng buộc', affectsRecommendation: true, synonyms: ['it ngot', 'khong ngot', 'giam ngot', 'khong duong', 'it duong'] },
    { key: 'khong_cay', label: 'Không cay', group: 'Ràng buộc', affectsRecommendation: true, synonyms: ['khong cay', 'it cay', 'giam cay'] },
    { key: 'an_chay', label: 'Ăn chay', group: 'Ràng buộc', affectsRecommendation: true, synonyms: ['chay', 'an chay', 'rau cu', 'khong thit'] },
    { key: 'tuoi', label: 'Tươi', group: 'Chất lượng món', affectsRecommendation: true, synonyms: ['tuoi', 'tuoi ngon', 'moi', 'khong tanh'] },
    { key: 'gia_tot', label: 'Giá tốt', group: 'Trải nghiệm', affectsRecommendation: false, synonyms: ['gia tot', 'gia hop ly', 're', 'dang tien', 'vua tien'] },
    { key: 'phuc_vu', label: 'Phục vụ', group: 'Trải nghiệm', affectsRecommendation: false, synonyms: ['phuc vu', 'nhan vien', 'thai do', 'tu van'] },
    { key: 'giao_hang', label: 'Giao hàng', group: 'Trải nghiệm', affectsRecommendation: false, synonyms: ['giao hang', 'ship', 'giao nhanh', 'dong goi'] }
];

const POSITIVE_TERMS = [
    'ngon', 'rat ngon', 'thich', 'hai long', 'tuyet', 'xuat sac', 'on', 'ok',
    'vua mieng', 'dam da', 'thom', 'tuoi', 'gion', 'nong hoi', 'sach',
    'hap dan', 'se ung ho', 'dang tien', 'hop ly', 'nhanh'
];

const NEGATIVE_TERMS = [
    'khong thich', 'khong an', 'khong uong', 'khong ngon', 'do', 'te', 'chan', 'that vong', 'kho an', 'nhat',
    'qua man', 'man qua', 'qua ngot', 'ngot qua', 'qua cay', 'cay qua',
    'dau mo', 'ngay', 'tanh', 'hoi', 'nguoi', 'kho', 'dat', 'mac', 'cham',
    'khong hai long'
];

const NEGATION_TERMS = ['khong', 'chua', 'chang', 'it', 'bot', 'giam'];
const TAG_MAP = new Map(TAG_DEFINITIONS.map(tag => [tag.key, tag]));

let tablesReadyPromise = null;

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function containsPhrase(text, phrase) {
    if (!text || !phrase) return false;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(text);
}

function findMatches(text, tag) {
    return tag.synonyms
        .map(normalizeText)
        .filter(Boolean)
        .filter(phrase => containsPhrase(text, phrase));
}

function inferSentimentAroundTag(text, matches) {
    if (!matches || matches.length === 0) return 'neutral';

    const words = text.split(/\s+/);
    let isNegative = false;
    let isPositive = false;

    for (const match of matches) {
        const normMatch = normalizeText(match);
        const matchWords = normMatch.split(/\s+/);

        // Tìm vị trí của từ khớp (match) trong mảng từ (words)
        let wordIndex = -1;
        for (let i = 0; i <= words.length - matchWords.length; i++) {
            let found = true;
            for (let j = 0; j < matchWords.length; j++) {
                if (words[i + j] !== matchWords[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                wordIndex = i;
                break;
            }
        }

        if (wordIndex === -1) continue;

        // Trích xuất ngữ cảnh cục bộ (5 từ trước và 4 từ sau từ khớp)
        const localWords = words.slice(
            Math.max(0, wordIndex - 5),
            Math.min(words.length, wordIndex + matchWords.length + 4)
        );
        const localContext = localWords.join(' ');

        // 1. Kiểm tra từ tiêu cực cục bộ
        const hasLocalNegative = NEGATIVE_TERMS.some(term => {
            const normTerm = normalizeText(term);
            return containsPhrase(localContext, normTerm);
        });

        // 2. Kiểm tra từ phủ định trực tiếp cục bộ đứng trước (regex)
        const hasLocalNegation = NEGATION_TERMS.some(negation => {
            const normNegation = normalizeText(negation);
            const pattern = new RegExp(`(^|\\s)${normNegation}(\\s+\\w+){0,3}\\s+${normMatch}(\\s|$)`);
            const matched = pattern.test(localContext);
            if (matched) {
                console.log(`🎯 [Sentiment Debug] Detected negation locally: "${normNegation} ... ${normMatch}" in context "${localContext}"`);
            }
            return matched;
        });

        if (hasLocalNegative || hasLocalNegation) {
            isNegative = true;
            break; // Ưu tiên hàng đầu cho tiêu cực cục bộ
        }

        // 3. Kiểm tra từ tích cực cục bộ
        const hasLocalPositive = POSITIVE_TERMS.some(term => {
            const normTerm = normalizeText(term);
            return containsPhrase(localContext, normTerm);
        });

        if (hasLocalPositive) {
            isPositive = true;
        }
    }

    if (isNegative) return 'negative';
    if (isPositive) return 'positive';
    return 'neutral';
}

function ratingToScore(rating) {
    const stars = Number(rating);
    if (stars >= 5) return 3;
    if (stars === 4) return 1.5;
    if (stars === 3) return 0.25;
    if (stars === 2) return -1.5;
    return -3;
}

function sentimentToSign(sentiment, fallbackScore) {
    if (sentiment === 'positive') return 1;
    if (sentiment === 'negative') return -1;
    return fallbackScore >= 0 ? 1 : -1;
}

async function ensurePreferenceTables() {
    if (tablesReadyPromise) return tablesReadyPromise;

    tablesReadyPromise = (async () => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS preference_tags (
                tag_key VARCHAR(80) NOT NULL,
                ten_tag VARCHAR(150) NOT NULL,
                nhom_tag VARCHAR(80) NOT NULL,
                synonyms TEXT NULL,
                affects_recommendation TINYINT(1) NOT NULL DEFAULT 1,
                trang_thai TINYINT(1) NOT NULL DEFAULT 1,
                ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (tag_key),
                KEY idx_nhom_tag (nhom_tag),
                KEY idx_trang_thai (trang_thai)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS review_preference_insights (
                ma_insight INT NOT NULL AUTO_INCREMENT,
                ma_danh_gia INT NOT NULL,
                ma_nguoi_dung INT NOT NULL,
                ma_mon INT NOT NULL,
                tag_key VARCHAR(80) NOT NULL,
                sentiment ENUM('positive','negative','neutral') NOT NULL DEFAULT 'neutral',
                score_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
                confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
                evidence VARCHAR(255) NULL,
                source VARCHAR(50) NOT NULL DEFAULT 'review',
                ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_insight),
                KEY idx_review (ma_danh_gia),
                KEY idx_user_tag (ma_nguoi_dung, tag_key),
                KEY idx_tag (tag_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS user_preference_profile (
                ma_nguoi_dung INT NOT NULL,
                tag_key VARCHAR(80) NOT NULL,
                score DECIMAL(10,2) NOT NULL DEFAULT 0,
                positive_count INT NOT NULL DEFAULT 0,
                negative_count INT NOT NULL DEFAULT 0,
                mention_count INT NOT NULL DEFAULT 0,
                confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
                source_summary TEXT NULL,
                ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_nguoi_dung, tag_key),
                KEY idx_tag_score (tag_key, score),
                KEY idx_user_score (ma_nguoi_dung, score)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS chatbot_preference_insights (
                ma_insight INT NOT NULL AUTO_INCREMENT,
                ma_nguoi_dung INT NOT NULL,
                ma_mon INT NULL,
                ten_mon VARCHAR(255) NULL,
                tag_key VARCHAR(80) NOT NULL,
                sentiment ENUM('positive','negative','neutral') NOT NULL DEFAULT 'positive',
                score_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
                confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
                evidence VARCHAR(255) NULL,
                ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_insight),
                KEY idx_user (ma_nguoi_dung),
                KEY idx_user_tag (ma_nguoi_dung, tag_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        for (const tag of TAG_DEFINITIONS) {
            await db.query(
                `INSERT INTO preference_tags
                    (tag_key, ten_tag, nhom_tag, synonyms, affects_recommendation, trang_thai)
                 VALUES (?, ?, ?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE
                    ten_tag = VALUES(ten_tag),
                    nhom_tag = VALUES(nhom_tag),
                    synonyms = VALUES(synonyms),
                    affects_recommendation = VALUES(affects_recommendation),
                    trang_thai = 1`,
                [
                    tag.key,
                    tag.label,
                    tag.group,
                    JSON.stringify(tag.synonyms),
                    tag.affectsRecommendation ? 1 : 0
                ]
            );
        }
    })();

    return tablesReadyPromise;
}

function analyzeReviewPreference(review) {
    const ratingScore = ratingToScore(review.so_sao);
    const commentText = normalizeText(review.binh_luan || '');
    const dishText = normalizeText([
        review.ten_mon,
        review.ten_danh_muc,
        review.tu_khoa,
        review.mo_ta_chi_tiet
    ].filter(Boolean).join(' '));

    const insights = [];

    for (const tag of TAG_DEFINITIONS) {
        const commentMatches = findMatches(commentText, tag);
        const dishMatches = findMatches(dishText, tag);

        if (commentMatches.length > 0) {
            const sentiment = inferSentimentAroundTag(commentText, commentMatches);
            const sign = sentimentToSign(sentiment, ratingScore);
            const explicitBoost = sentiment === 'neutral' ? 1 : 1.2;
            const scoreDelta = Math.max(0.5, Math.abs(ratingScore)) * sign * explicitBoost;

            insights.push({
                tag_key: tag.key,
                sentiment: sign >= 0 ? 'positive' : 'negative',
                score_delta: Number(scoreDelta.toFixed(2)),
                confidence: sentiment === 'neutral' ? 0.65 : 0.85,
                evidence: commentMatches.slice(0, 3).join(', ')
            });
        } else if (dishMatches.length > 0 && Number(review.so_sao) !== 3) {
            const sign = ratingScore >= 0 ? 1 : -1;
            insights.push({
                tag_key: tag.key,
                sentiment: sign >= 0 ? 'positive' : 'negative',
                score_delta: Number((Math.abs(ratingScore) * sign * 0.55).toFixed(2)),
                confidence: 0.45,
                evidence: dishMatches.slice(0, 3).join(', ')
            });
        }
    }

    const byTag = new Map();
    for (const insight of insights) {
        const current = byTag.get(insight.tag_key);
        if (!current || Math.abs(insight.score_delta) > Math.abs(current.score_delta)) {
            byTag.set(insight.tag_key, insight);
        }
    }

    return Array.from(byTag.values()).filter(item => Math.abs(item.score_delta) >= 0.25);
}

async function rebuildUserPreferenceProfile(userId) {
    await ensurePreferenceTables();
    await db.query('DELETE FROM user_preference_profile WHERE ma_nguoi_dung = ?', [userId]);

    const [rows] = await db.query(`
        SELECT
            ma_nguoi_dung,
            tag_key,
            SUM(score_delta) as score,
            SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
            SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
            COUNT(*) as mention_count,
            AVG(confidence) as avg_confidence
        FROM (
            SELECT ma_nguoi_dung, tag_key, score_delta, sentiment, confidence FROM review_preference_insights WHERE ma_nguoi_dung = ?
            UNION ALL
            SELECT ma_nguoi_dung, tag_key, score_delta, sentiment, confidence FROM chatbot_preference_insights WHERE ma_nguoi_dung = ?
        ) combined
        GROUP BY ma_nguoi_dung, tag_key
        HAVING ABS(score) >= 0.25
    `, [userId, userId]);

    for (const row of rows) {
        const mentionCount = Number(row.mention_count || 0);
        const avgConfidence = Number(row.avg_confidence || 0);
        const confidence = Math.min(1, avgConfidence * 0.65 + Math.min(mentionCount / 5, 1) * 0.35);
        const sourceSummary = JSON.stringify({
            mentions: mentionCount,
            positive_count: Number(row.positive_count || 0),
            negative_count: Number(row.negative_count || 0)
        });

        await db.query(`
            INSERT INTO user_preference_profile
                (ma_nguoi_dung, tag_key, score, positive_count, negative_count, mention_count, confidence, source_summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            row.ma_nguoi_dung,
            row.tag_key,
            Number(row.score || 0).toFixed(2),
            row.positive_count || 0,
            row.negative_count || 0,
            mentionCount,
            confidence.toFixed(2),
            sourceSummary
        ]);
    }

    return rows.length;
}

async function processReviewPreference(reviewId) {
    await ensurePreferenceTables();

    const [reviews] = await db.query(`
        SELECT
            dg.ma_danh_gia,
            dg.ma_nguoi_dung,
            dg.ma_mon,
            dg.so_sao,
            dg.binh_luan,
            dg.trang_thai,
            m.ten_mon,
            m.mo_ta_chi_tiet,
            m.tu_khoa,
            d.ten_danh_muc
        FROM danh_gia_san_pham dg
        JOIN mon_an m ON dg.ma_mon = m.ma_mon
        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
        WHERE dg.ma_danh_gia = ?
        LIMIT 1
    `, [reviewId]);

    if (reviews.length === 0) return { processed: 0, reason: 'review_not_found' };

    const review = reviews[0];
    await db.query('DELETE FROM review_preference_insights WHERE ma_danh_gia = ?', [reviewId]);

    if (review.trang_thai !== 'approved') {
        await rebuildUserPreferenceProfile(review.ma_nguoi_dung);
        return { processed: 0, reason: 'review_not_approved' };
    }

    const insights = analyzeReviewPreference(review);
    for (const insight of insights) {
        await db.query(`
            INSERT INTO review_preference_insights
                (ma_danh_gia, ma_nguoi_dung, ma_mon, tag_key, sentiment, score_delta, confidence, evidence, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'review')
        `, [
            review.ma_danh_gia,
            review.ma_nguoi_dung,
            review.ma_mon,
            insight.tag_key,
            insight.sentiment,
            insight.score_delta,
            insight.confidence,
            insight.evidence
        ]);
    }

    await rebuildUserPreferenceProfile(review.ma_nguoi_dung);
    return { processed: insights.length, reason: 'ok' };
}

async function removeReviewPreference(reviewId, fallbackUserId = null) {
    await ensurePreferenceTables();
    const [rows] = await db.query(
        'SELECT DISTINCT ma_nguoi_dung FROM review_preference_insights WHERE ma_danh_gia = ?',
        [reviewId]
    );
    const affectedUsers = new Set(rows.map(row => row.ma_nguoi_dung));
    if (fallbackUserId) affectedUsers.add(fallbackUserId);

    await db.query('DELETE FROM review_preference_insights WHERE ma_danh_gia = ?', [reviewId]);

    for (const userId of affectedUsers) {
        await rebuildUserPreferenceProfile(userId);
    }

    return affectedUsers.size;
}

async function rebuildAllReviewPreferences() {
    await ensurePreferenceTables();
    await db.query('DELETE FROM review_preference_insights');
    await db.query('DELETE FROM user_preference_profile');

    const [reviews] = await db.query(`
        SELECT ma_danh_gia
        FROM danh_gia_san_pham
        WHERE trang_thai = 'approved'
        ORDER BY ma_danh_gia ASC
    `);

    let insightCount = 0;
    for (const review of reviews) {
        const result = await processReviewPreference(review.ma_danh_gia);
        insightCount += result.processed || 0;
    }

    return {
        review_count: reviews.length,
        insight_count: insightCount
    };
}

async function getUserPreferenceSignals(userId, limit = 10) {
    await ensurePreferenceTables();

    const [positive] = await db.query(`
        SELECT p.*, t.ten_tag, t.nhom_tag, t.affects_recommendation
        FROM user_preference_profile p
        JOIN preference_tags t ON p.tag_key = t.tag_key
        WHERE p.ma_nguoi_dung = ? AND p.score > 0 AND t.affects_recommendation = 1 AND t.trang_thai = 1
        ORDER BY p.score DESC, p.confidence DESC
        LIMIT ?
    `, [userId, limit]);

    const [negative] = await db.query(`
        SELECT p.*, t.ten_tag, t.nhom_tag, t.affects_recommendation
        FROM user_preference_profile p
        JOIN preference_tags t ON p.tag_key = t.tag_key
        WHERE p.ma_nguoi_dung = ? AND p.score < 0 AND t.affects_recommendation = 1 AND t.trang_thai = 1
        ORDER BY p.score ASC, p.confidence DESC
        LIMIT ?
    `, [userId, limit]);

    return { positive, negative };
}

async function getAdminPreferenceStats(limit = 20) {
    await ensurePreferenceTables();

    const [positiveTags] = await db.query(`
        SELECT
            p.tag_key,
            t.ten_tag,
            t.nhom_tag,
            COUNT(DISTINCT p.ma_nguoi_dung) as total_users,
            ROUND(AVG(p.score), 2) as avg_score,
            SUM(p.positive_count) as positive_count,
            SUM(p.negative_count) as negative_count
        FROM user_preference_profile p
        JOIN preference_tags t ON p.tag_key = t.tag_key
        WHERE p.score > 0
        GROUP BY p.tag_key, t.ten_tag, t.nhom_tag
        ORDER BY avg_score DESC, total_users DESC
        LIMIT ?
    `, [limit]);

    const [negativeTags] = await db.query(`
        SELECT
            p.tag_key,
            t.ten_tag,
            t.nhom_tag,
            COUNT(DISTINCT p.ma_nguoi_dung) as total_users,
            ROUND(AVG(p.score), 2) as avg_score,
            SUM(p.positive_count) as positive_count,
            SUM(p.negative_count) as negative_count
        FROM user_preference_profile p
        JOIN preference_tags t ON p.tag_key = t.tag_key
        WHERE p.score < 0
        GROUP BY p.tag_key, t.ten_tag, t.nhom_tag
        ORDER BY avg_score ASC, total_users DESC
        LIMIT ?
    `, [limit]);

    return { positiveTags, negativeTags };
}

async function getProfilesForUsers(userIds) {
    await ensurePreferenceTables();
    if (!Array.isArray(userIds) || userIds.length === 0) return {};

    const [rows] = await db.query(`
        SELECT
            p.ma_nguoi_dung,
            p.tag_key,
            p.score,
            p.confidence,
            p.mention_count,
            t.ten_tag,
            t.nhom_tag
        FROM user_preference_profile p
        JOIN preference_tags t ON p.tag_key = t.tag_key
        WHERE p.ma_nguoi_dung IN (?)
        ORDER BY p.ma_nguoi_dung, p.score DESC
    `, [userIds]);

    return rows.reduce((acc, row) => {
        if (!acc[row.ma_nguoi_dung]) acc[row.ma_nguoi_dung] = [];
        acc[row.ma_nguoi_dung].push(row);
        return acc;
    }, {});
}

const FLAVOR_TO_TAG_KEY = {
    1: ['cay'],
    2: ['chua'],
    3: ['man'],
    4: ['ngot'],
    5: ['an_chay'],
    6: ['thanh_mat'],
    7: ['thit_bo', 'thit_ga'],
    8: ['hai_san'],
    9: ['chien']
};

// Hàm phụ để kiểm tra xem một cụm từ có xuất hiện trong đoạn văn hay không
function containsPhrase(text, phrase) {
    if (!text || !phrase) return false;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(text);
}

async function processChatbotMessagePreference(userId, text, rebuildProfileAfter = true) {
    try {
        await ensurePreferenceTables();
        const commentText = normalizeText(text || '');
        if (!commentText || !userId) return 0;

        // 1. Lấy tất cả món ăn đang hoạt động để so khớp
        const [dishes] = await db.query(`
            SELECT m.ma_mon, m.ten_mon, m.mo_ta_chi_tiet, m.tu_khoa,
                   GROUP_CONCAT(DISTINCT mk.id_thuoc_tinh) as flavor_ids
            FROM mon_an m
            JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
            WHERE m.trang_thai = 1
            GROUP BY m.ma_mon, m.ten_mon, m.mo_ta_chi_tiet, m.tu_khoa
        `);

        let insertedCount = 0;

        // So khớp trực tiếp món ăn
        for (const dish of dishes) {
            const dishNameNormalized = normalizeText(dish.ten_mon);
            if (containsPhrase(commentText, dishNameNormalized)) {
                const sentiment = inferSentimentAroundTag(commentText, [dishNameNormalized]);
                const isPositive = sentiment !== 'negative';
                const scoreDelta = isPositive ? 1.5 : -1.5;
                const confidence = 0.8;

                const dishText = normalizeText([
                    dish.ten_mon,
                    dish.tu_khoa,
                    dish.mo_ta_chi_tiet
                ].filter(Boolean).join(' '));

                const flavorIds = dish.flavor_ids ? dish.flavor_ids.split(',').map(Number) : [];
                for (const fId of flavorIds) {
                    const tagKeys = FLAVOR_TO_TAG_KEY[fId] || [];
                    for (const tagKey of tagKeys) {
                        // Xác thực xem món ăn có thực sự chứa nguyên liệu này không để tránh gán nhãn sai (chỉ áp dụng cho các tag bị trùng lặp như thit_bo và thit_ga)
                        if (tagKey === 'thit_bo' || tagKey === 'thit_ga') {
                            const tagDef = TAG_MAP.get(tagKey);
                            if (tagDef) {
                                const dishMatches = findMatches(dishText, tagDef);
                                if (dishMatches.length === 0) {
                                    // Món ăn không thực sự chứa nguyên liệu này, bỏ qua tagKey này
                                    continue;
                                }
                            }
                        }

                        await db.query(`
                            INSERT INTO chatbot_preference_insights
                                (ma_nguoi_dung, ma_mon, ten_mon, tag_key, sentiment, score_delta, confidence, evidence)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            userId,
                            dish.ma_mon,
                            dish.ten_mon,
                            tagKey,
                            isPositive ? 'positive' : 'negative',
                            scoreDelta,
                            confidence,
                            text.substring(0, 255)
                        ]);
                        insertedCount++;
                    }
                }
            }
        }

        // 2. So khớp trực tiếp từ khóa khẩu vị (synonyms)
        for (const tag of TAG_DEFINITIONS) {
            const matches = findMatches(commentText, tag);
            if (matches.length > 0) {
                const sentiment = inferSentimentAroundTag(commentText, matches);
                const isPositive = sentiment !== 'negative';
                const scoreDelta = isPositive ? 1.5 : -1.5;
                const confidence = 0.85;

                await db.query(`
                    INSERT INTO chatbot_preference_insights
                        (ma_nguoi_dung, ma_mon, ten_mon, tag_key, sentiment, score_delta, confidence, evidence)
                    VALUES (?, NULL, NULL, ?, ?, ?, ?, ?)
                `, [
                    userId,
                    tag.key,
                    isPositive ? 'positive' : 'negative',
                    scoreDelta,
                    confidence,
                    matches.slice(0, 3).join(', ')
                ]);
                insertedCount++;
            }
        }

        if (insertedCount > 0 && rebuildProfileAfter) {
            await rebuildUserPreferenceProfile(userId);
        }

        return insertedCount;
    } catch (err) {
        console.error('Error processing chatbot message preference:', err.message);
        return 0;
    }
}

async function rebuildAllChatbotPreferences() {
    try {
        await ensurePreferenceTables();
        await db.query('DELETE FROM chatbot_preference_insights');

        const [messages] = await db.query(`
            SELECT ma_nguoi_dung, noi_dung
            FROM lich_su_chatbot
            WHERE nguoi_gui = 'user' AND ma_nguoi_dung IS NOT NULL
            ORDER BY thoi_diem_chat ASC
        `);

        console.log(`🤖 Rebuilding chatbot preferences for ${messages.length} messages...`);

        let count = 0;
        for (const msg of messages) {
            const res = await processChatbotMessagePreference(msg.ma_nguoi_dung, msg.noi_dung, false);
            count += res;
        }

        console.log(`🤖 Chatbot preference rebuild complete. Generated ${count} insights.`);
        return count;
    } catch (err) {
        console.error('Error rebuilding all chatbot preferences:', err.message);
        return 0;
    }
}

async function rebuildAllProfiles() {
    try {
        await ensurePreferenceTables();
        await db.query('DELETE FROM user_preference_profile');

        const [users] = await db.query(`
            SELECT DISTINCT ma_nguoi_dung FROM review_preference_insights
            UNION
            SELECT DISTINCT ma_nguoi_dung FROM chatbot_preference_insights
        `);

        console.log(`🤖 Rebuilding user preference profiles for ${users.length} users...`);

        for (const u of users) {
            await rebuildUserPreferenceProfile(u.ma_nguoi_dung);
        }

        console.log('🤖 Rebuilding user preference profiles complete.');
        return users.length;
    } catch (err) {
        console.error('Error rebuilding all profiles:', err.message);
        return 0;
    }
}

module.exports = {
    ensurePreferenceTables,
    analyzeReviewPreference,
    processReviewPreference,
    removeReviewPreference,
    rebuildAllReviewPreferences,
    rebuildUserPreferenceProfile,
    getUserPreferenceSignals,
    getAdminPreferenceStats,
    getProfilesForUsers,
    normalizeText,
    TAG_DEFINITIONS,
    TAG_MAP,
    processChatbotMessagePreference,
    rebuildAllChatbotPreferences,
    rebuildAllProfiles
};
