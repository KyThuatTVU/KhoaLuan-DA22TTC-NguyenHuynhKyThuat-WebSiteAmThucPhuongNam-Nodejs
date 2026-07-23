const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    const preferredFlavorIds = [6, 7];
    const finalExcluded = [2, 34, 35, 44, 46, 47, 37];
    const missing = 1;

    try {
        const query = `
            SELECT m.*, d.ten_danh_muc, COALESCE(AVG(dg.so_sao), 0) as avg_rating,
                   GROUP_CONCAT(DISTINCT f.ten_thuoc_tinh SEPARATOR ', ') as flavor_names
            FROM mon_an m
            LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
            JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
            LEFT JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
            LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
            WHERE m.trang_thai = 1 
              AND mk.id_thuoc_tinh IN (?)
              ${finalExcluded.length > 0 ? 'AND m.ma_mon NOT IN (?)' : ''}
            GROUP BY m.ma_mon
            ORDER BY avg_rating DESC, m.ma_mon DESC
            LIMIT ?
        `;
        const params = finalExcluded.length > 0 
            ? [preferredFlavorIds, finalExcluded, missing] 
            : [preferredFlavorIds, missing];

        console.log("Running query with params:", JSON.stringify(params));
        const [rows] = await db.query(query, params);
        console.log("Query success! Rows found:", rows.length);
    } catch (e) {
        console.error("Query failed with error:", e);
    } finally {
        await db.end();
    }
}

run();
