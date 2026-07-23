const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || 'TVU@842004';
const DB_NAME = process.env.DB_NAME || 'amthuc_phuongnam';

async function run() {
    const db = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASS, database: DB_NAME });

    // Check popularity data for dishes shown in Thuật Thuật's recs: 45 (Tôm sốt thái) and 32 (Tôm nướng muối)
    const targetIds = [32, 45, 46, 47, 37, 35, 44, 2];

    console.log("=== KIỂM TRA DỮ LIỆU THỰC TẾ CÁC MÓN GỢI Ý ===\n");

    for (const id of targetIds) {
        const [orders] = await db.query(
            `SELECT COUNT(DISTINCT ct.ma_don_hang) as order_count 
             FROM chi_tiet_don_hang ct 
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang 
             WHERE ct.ma_mon = ? AND dh.trang_thai = 'delivered'`,
            [id]
        );
        const [clicks] = await db.query(
            `SELECT COUNT(*) as count FROM hanh_vi_nguoi_dung WHERE ma_mon = ? AND hanh_vi = 'click'`,
            [id]
        );
        const [views] = await db.query(
            `SELECT COUNT(*) as count FROM hanh_vi_nguoi_dung WHERE ma_mon = ? AND hanh_vi = 'view'`,
            [id]
        );
        const [likes] = await db.query(
            `SELECT COUNT(*) as count FROM hanh_vi_nguoi_dung WHERE ma_mon = ? AND hanh_vi = 'like'`,
            [id]
        );
        const [mon] = await db.query(`SELECT ten_mon FROM mon_an WHERE ma_mon = ?`, [id]);

        console.log(`Món ID ${id}: ${mon[0]?.ten_mon}`);
        console.log(`  Đơn giao thành công (delivered): ${orders[0].order_count}`);
        console.log(`  Lượt click: ${clicks[0].count}`);
        console.log(`  Lượt view: ${views[0].count}`);
        console.log(`  Lượt like: ${likes[0].count}`);
        console.log('');
    }

    await db.end();
}

run().catch(console.error);
