const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    console.log("=== KIỂM TRA MÓN ĂN GỎI BÒ BÓP THẤU VÀ GỎI GÀ MĂNG CỤT ===");
    
    const [dishes] = await db.query(`
        SELECT ma_mon, ten_mon 
        FROM mon_an 
        WHERE ten_mon LIKE '%Gỏi bò bóp thấu%' OR ten_mon LIKE '%Gỏi gà măng cụt%'
    `);
    console.log("Dishes:", dishes);

    for (const d of dishes) {
        const [flavors] = await db.query(`
            SELECT mk.id_thuoc_tinh, tt.ten_thuoc_tinh
            FROM mon_an_khau_vi mk
            JOIN thuoc_tinh_khau_vi tt ON mk.id_thuoc_tinh = tt.id
            WHERE mk.ma_mon = ?
        `, [d.ma_mon]);
        console.log(`Món: ${d.ten_mon} (ma_mon: ${d.ma_mon}) có các thuộc tính:`, flavors);
    }

    await db.end();
}

run().catch(console.error);
