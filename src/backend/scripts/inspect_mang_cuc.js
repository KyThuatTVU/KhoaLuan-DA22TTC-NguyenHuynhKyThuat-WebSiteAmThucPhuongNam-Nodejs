const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    const [rows] = await db.query(`
        SELECT mk.id_thuoc_tinh, tt.ten_thuoc_tinh
        FROM mon_an_khau_vi mk
        JOIN thuoc_tinh_khau_vi tt ON mk.id_thuoc_tinh = tt.id
        WHERE mk.ma_mon = 37
    `);
    console.log("Gỏi gà măng cục (ma_mon: 37) attributes:", rows);

    await db.end();
}

run().catch(console.error);
