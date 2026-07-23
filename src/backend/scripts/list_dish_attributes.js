const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    console.log("=== DANH SÁCH MÓN ĂN VÀ THUỘC TÍNH KHẨU VỊ CỦA CHÚNG ===");
    const [rows] = await db.query(`
        SELECT m.ma_mon, m.ten_mon, GROUP_CONCAT(tt.ten_thuoc_tinh SEPARATOR ', ') as attributes
        FROM mon_an m
        LEFT JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
        LEFT JOIN thuoc_tinh_khau_vi tt ON mk.id_thuoc_tinh = tt.id
        GROUP BY m.ma_mon, m.ten_mon
        ORDER BY m.ma_mon
    `);

    rows.forEach(r => {
        console.log(`ID: ${r.ma_mon} | Tên: ${r.ten_mon} | Thuộc tính: [${r.attributes || 'Không có'}]`);
    });

    await db.end();
}

run().catch(console.error);
