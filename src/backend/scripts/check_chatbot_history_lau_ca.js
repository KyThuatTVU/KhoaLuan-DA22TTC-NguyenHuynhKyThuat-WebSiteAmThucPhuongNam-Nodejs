const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    console.log("=== LỊCH SỬ CHAT VỀ LẨU CÁ CỦA USER 3 ===");
    const [rows] = await db.query(`
        SELECT ma_lich_su, nguoi_gui, noi_dung, thoi_diem_chat
        FROM lich_su_chatbot
        WHERE ma_nguoi_dung = 3 AND noi_dung LIKE '%lẩu cá%'
        ORDER BY thoi_diem_chat ASC
    `);

    rows.forEach(r => {
        console.log(`ID: ${r.ma_lich_su} | Người gửi: ${r.nguoi_gui} | Nội dung: "${r.noi_dung}" | Thời gian: ${r.thoi_diem_chat}`);
    });

    await db.end();
}

run().catch(console.error);
