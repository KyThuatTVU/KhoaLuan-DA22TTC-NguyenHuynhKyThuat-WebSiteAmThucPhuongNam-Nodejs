const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    console.log("=== DỌN DẸP DỮ LIỆU CHATBOT INSIGHTS CŨ BỊ SAI ===\n");

    // 1. Cập nhật các bản ghi "tôi không thích món lẩu cá" cũ bị phân tích sai thành positive
    const [result] = await db.query(`
        UPDATE chatbot_preference_insights
        SET sentiment = 'negative', score_delta = -1.50
        WHERE evidence = 'tôi không thích món lẩu cá' AND sentiment = 'positive'
    `);
    
    console.log(`Đã sửa đổi thành công ${result.affectedRows} bản ghi cũ bị phân tích sai.`);

    // 2. Chạy rebuild lại toàn bộ profile sở thích người dùng từ các insights mới chính xác
    try {
        const preferenceService = require('d:/KhoaLuanTotNghiep2026/src/backend/services/preferenceService.js');
        console.log("\nĐang rebuild lại toàn bộ profile sở thích (user_preference_profile)...");
        await preferenceService.rebuildAllChatbotPreferences();
        console.log("Rebuild hoàn tất!");
    } catch (err) {
        console.error("Lỗi khi rebuild profile:", err.message);
    }

    await db.end();
}

run().catch(console.error);
