const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    console.log("=== THÊM THUỘC TÍNH NHIỀU ĐẠM (7) CHO GỎI GÀ MĂNG CỤC ===");
    
    // Kiểm tra xem đã có chưa
    const [existing] = await db.query(
        'SELECT * FROM mon_an_khau_vi WHERE ma_mon = 37 AND id_thuoc_tinh = 7'
    );

    if (existing.length === 0) {
        await db.query(
            'INSERT INTO mon_an_khau_vi (ma_mon, id_thuoc_tinh) VALUES (37, 7)'
        );
        console.log("Đã thêm thuộc tính Nhiều đạm (7) cho Gỏi gà măng cục thành công.");
    } else {
        console.log("Gỏi gà măng cục đã có thuộc tính Nhiều đạm (7).");
    }

    await db.end();
}

run().catch(console.error);
