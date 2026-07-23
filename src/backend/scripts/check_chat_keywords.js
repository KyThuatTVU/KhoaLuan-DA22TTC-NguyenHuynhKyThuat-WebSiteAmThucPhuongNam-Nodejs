const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || 'TVU@842004';
const DB_NAME = process.env.DB_NAME || 'amthuc_phuongnam';

const KEYWORD_CATEGORY_MAP = {
    'lẩu': 'lau', 'lau': 'lau', 'hotpot': 'lau',
    'lẩu mắm': 'lau_mam', 'lẩu thái': 'lau_thai', 'lẩu hải sản': 'lau',
    'cơm': 'com', 'com': 'com', 'rice': 'com',
    'bún': 'bun', 'bun': 'bun', 'noodle': 'bun',
    'phở': 'pho', 'pho': 'pho',
    'mì': 'mi', 'mi': 'mi',
    'tôm': 'tom', 'tom': 'tom', 'shrimp': 'tom',
    'cá': 'ca', 'ca': 'ca', 'fish': 'ca',
    'hải sản': 'hai_san', 'seafood': 'hai_san',
    'lẩu cua': 'hai_san', 'canh cua': 'hai_san', 'cua đồng': 'hai_san', 'cua hoàng đế': 'hai_san', 'món cua': 'hai_san', 'mực': 'hai_san',
    'nướng': 'nuong', 'nuong': 'nuong', 'grill': 'nuong', 'bbq': 'bbq',
    'chè': 'trang_mieng', 'bánh': 'trang_mieng', 'kem': 'trang_mieng',
    'tráng miệng': 'trang_mieng', 'dessert': 'trang_mieng',
    'nước': 'nuoc_uong', 'uống': 'nuoc_uong', 'drink': 'nuoc_uong',
    'trà': 'tra', 'cà phê': 'ca_phe', 'coffee': 'ca_phe',
    'bia': 'bia', 'beer': 'bia', 'nước ngọt': 'nuoc_ngot'
};

const categoryMapping = {
    'lau': '%Lẩu%',
    'lau_mam': '%Lẩu%',
    'lau_thai': '%Lẩu%',
    'com': '%Cơm%',
    'bun': '%Bún%',
    'pho': '%Phở%',
    'mi': '%Mì%',
    'tom': '%Hải sản%',
    'ca': '%Cá%|%Hải sản%',
    'hai_san': '%Hải sản%',
    'nuong': '%Nướng%',
    'trang_mieng': '%Tráng miệng%',
    'nuoc_uong': '%Đồ uống%',
    'tra': '%Đồ uống%',
    'ca_phe': '%Đồ uống%',
    'bia': '%Đồ uống%',
    'nuoc_ngot': '%Đồ uống%'
};

function analyzeMessage(message) {
    const lowerMsg = message.toLowerCase();
    const keywords = [];
    const categories = new Set();
    
    for (const [keyword, category] of Object.entries(KEYWORD_CATEGORY_MAP)) {
        if (lowerMsg.includes(keyword)) {
            keywords.push(keyword);
            categories.add(category);
        }
    }
    
    return { keywords, categories: Array.from(categories) };
}

async function run() {
    const db = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASS,
        database: DB_NAME
    });

    const userId = 3;
    const [messages] = await db.query(
        `SELECT noi_dung FROM lich_su_chatbot 
         WHERE ma_nguoi_dung = ? AND nguoi_gui = 'user'
         ORDER BY thoi_diem_chat DESC LIMIT 50`,
        [userId]
    );

    const allKeywords = [];
    const allCategories = new Set();
    for (const msg of messages) {
        const analysis = analyzeMessage(msg.noi_dung);
        allKeywords.push(...analysis.keywords);
        analysis.categories.forEach(c => allCategories.add(c));
    }

    const keywordFrequency = {};
    for (const kw of allKeywords) {
        keywordFrequency[kw] = (keywordFrequency[kw] || 0) + 1;
    }

    const topKeywords = Object.entries(keywordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([kw, count]) => ({ keyword: kw, count }));

    console.log("Top Keywords:", topKeywords);
    console.log("Categories found:", Array.from(allCategories));

    const searchPatterns = Array.from(allCategories)
        .map(c => categoryMapping[c])
        .filter(Boolean);

    console.log("Search patterns:", searchPatterns);

    // Let's print matched dishes for each category pattern and keyword pattern
    for (const pattern of searchPatterns) {
        const [rows] = await db.query(
            "SELECT ma_mon, ten_mon FROM mon_an m LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc WHERE d.ten_danh_muc LIKE ?",
            [pattern]
        );
        console.log(`Matched by Category ${pattern}:`, rows.map(r => r.ten_mon));
    }

    for (const kw of topKeywords) {
        const [rows] = await db.query(
            "SELECT ma_mon, ten_mon FROM mon_an WHERE ten_mon LIKE ?",
            [`%${kw.keyword}%`]
        );
        console.log(`Matched by Name Keyword ${kw.keyword}:`, rows.map(r => r.ten_mon));
    }

    await db.end();
}

run().catch(console.error);
