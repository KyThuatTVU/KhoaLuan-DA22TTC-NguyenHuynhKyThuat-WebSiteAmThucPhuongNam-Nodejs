const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    const [desc1] = await db.query('DESCRIBE mon_an_khau_vi');
    console.log("mon_an_khau_vi:", desc1);

    const [desc2] = await db.query('DESCRIBE thuoc_tinh_khau_vi');
    console.log("thuoc_tinh_khau_vi:", desc2);

    await db.end();
}

run().catch(console.error);
