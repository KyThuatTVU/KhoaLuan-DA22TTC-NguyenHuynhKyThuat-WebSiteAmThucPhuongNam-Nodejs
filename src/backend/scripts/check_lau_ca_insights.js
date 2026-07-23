const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    console.log("=== BẢN GHI LẨU CÁ TRONG CHATBOT INSIGHTS CỦA USER 3 ===");
    const [rows] = await db.query(`
        SELECT ma_insight, ten_mon, tag_key, sentiment, score_delta, evidence
        FROM chatbot_preference_insights
        WHERE ma_nguoi_dung = 3 AND ten_mon LIKE '%Lẩu cá%'
    `);

    rows.forEach(r => {
        console.log(`ID: ${r.ma_insight} | Món: ${r.ten_mon} | Tag: ${r.tag_key} | Sentiment: ${r.sentiment} | Score: ${r.score_delta} | Evidence: "${r.evidence}"`);
    });

    await db.end();
}

run().catch(console.error);
