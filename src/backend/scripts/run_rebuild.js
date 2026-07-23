const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    const preferenceService = require('d:/KhoaLuanTotNghiep2026/src/backend/services/preferenceService.js');

    console.log("=== CHẠY REBUILD LẠI TOÀN BỘ CHATBOT PREFERENCES VÀ PROFILES ===");
    
    // 1. Chạy rebuild chatbot insights
    await preferenceService.rebuildAllChatbotPreferences();
    
    // 2. Chạy rebuild user profiles từ cả reviews và chatbot insights
    console.log("Đang rebuild user profiles...");
    const [users] = await db.query('SELECT DISTINCT ma_nguoi_dung FROM (SELECT ma_nguoi_dung FROM review_preference_insights UNION SELECT ma_nguoi_dung FROM chatbot_preference_insights) combined');
    
    for (const u of users) {
        await preferenceService.rebuildUserPreferenceProfile(u.ma_nguoi_dung);
    }
    console.log(`Đã rebuild user profiles cho ${users.length} người dùng.`);

    // 3. Kiểm tra lại bản ghi Gỏi bò bóp thấu trong DB của user 3
    console.log("\n=== KIỂM TRA BẢN GHI INSIGHTS CỦA USER 3 ĐỐI VỚI GỎI BÒ BÓP THẤU VÀ GỎI GÀ MĂNG CỤT ===");
    const [insights] = await db.query(`
        SELECT ma_insight, ten_mon, tag_key, sentiment, score_delta, evidence
        FROM chatbot_preference_insights
        WHERE ma_nguoi_dung = 3 AND (ten_mon LIKE '%Gỏi bò bóp thấu%' OR ten_mon LIKE '%Gỏi gà măng cục%')
        ORDER BY ma_insight DESC
    `);
    
    insights.forEach(r => {
        console.log(`Món: ${r.ten_mon} | Tag: ${r.tag_key} | Sentiment: ${r.sentiment} | Score: ${r.score_delta} | Evidence: "${r.evidence}"`);
    });

    await db.end();
}

run().catch(console.error);
