const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    const [rows] = await db.query("SELECT ma_mon, ten_mon FROM mon_an WHERE ten_mon LIKE '%Gỏi%' OR ten_mon LIKE '%gà%'");
    console.log("Gỏi or Gà dishes:", rows);

    await db.end();
}

run().catch(console.error);
