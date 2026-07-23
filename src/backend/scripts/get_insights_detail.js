const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    console.log("=== KIỂM TRA BẢN GHI INSIGHTS CỦA USER 3 ===\n");
    const [rows] = await db.query(`
        SELECT ma_insight, ma_mon, ten_mon, tag_key, sentiment, score_delta, evidence, ngay_tao
        FROM chatbot_preference_insights
        WHERE ma_nguoi_dung = 3 AND ten_mon = 'Lẩu cá '
        ORDER BY ngay_tao DESC
    `);

    rows.forEach(r => {
        console.log(`ID: ${r.ma_insight} | Món: ${r.ten_mon} | Tag: ${r.tag_key} | Sentiment: ${r.sentiment} | Score Delta: ${r.score_delta} | Evidence: "${r.evidence}" | Ngày: ${r.ngay_tao}`);
    });

    await db.end();
}

run();
