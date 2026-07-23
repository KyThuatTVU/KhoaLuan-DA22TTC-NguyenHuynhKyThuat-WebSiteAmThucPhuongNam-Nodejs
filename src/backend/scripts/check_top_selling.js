const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    console.log("=== TẤT CẢ ĐƠN HÀNG ĐÃ GIAO THÀNH CÔNG (delivered) ===");
    const [orders] = await db.query(`
        SELECT dh.ma_don_hang, dh.ma_nguoi_dung, dh.trang_thai, ct.ma_mon, m.ten_mon, ct.so_luong
        FROM don_hang dh
        JOIN chi_tiet_don_hang ct ON dh.ma_don_hang = ct.ma_don_hang
        JOIN mon_an m ON ct.ma_mon = m.ma_mon
        WHERE dh.trang_thai = 'delivered'
        ORDER BY ct.ma_mon
    `);
    if (orders.length === 0) {
        console.log("KHÔNG CÓ ĐƠN HÀNG DELIVERED NÀO!");
    } else {
        orders.forEach(o => console.log(`  Đơn #${o.ma_don_hang} - User ${o.ma_nguoi_dung} - Món: ${o.ten_mon} (ID ${o.ma_mon}) x${o.so_luong}`));
    }

    console.log("\n=== TẤT CẢ CÁC TRẠNG THÁI ĐƠN HÀNG ===");
    const [statuses] = await db.query(`
        SELECT trang_thai, COUNT(*) as count FROM don_hang GROUP BY trang_thai
    `);
    statuses.forEach(s => console.log(`  Trạng thái: '${s.trang_thai}' — ${s.count} đơn`));

    console.log("\n=== QUERY HIỆN TẠI CHO TOP BÁN CHẠY (dùng ALL đơn hàng, không lọc delivered) ===");
    const [topAll] = await db.query(`
        SELECT m.ten_mon, m.ma_mon,
               COUNT(ct.ma_ct_don) as so_lan_ban,
               SUM(ct.so_luong) as tong_so_luong
        FROM mon_an m
        JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
        JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
        GROUP BY m.ma_mon, m.ten_mon
        ORDER BY so_lan_ban DESC, tong_so_luong DESC
        LIMIT 10
    `);
    console.log("Kết quả (KHÔNG lọc trạng thái):");
    topAll.forEach((r, i) => console.log(`  ${i+1}. ${r.ten_mon} — ${r.so_lan_ban} đơn, ${r.tong_so_luong} xuất`));

    console.log("\n=== QUERY CHỈ LẤY ĐƠN 'delivered' ===");
    const [topDelivered] = await db.query(`
        SELECT m.ten_mon, m.ma_mon,
               COUNT(ct.ma_ct_don) as so_lan_ban,
               SUM(ct.so_luong) as tong_so_luong
        FROM mon_an m
        JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
        JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
        WHERE dh.trang_thai = 'delivered'
        GROUP BY m.ma_mon, m.ten_mon
        ORDER BY so_lan_ban DESC, tong_so_luong DESC
        LIMIT 10
    `);
    if (topDelivered.length === 0) {
        console.log("KHÔNG CÓ KẾT QUẢ NÀO với điều kiện delivered!");
    } else {
        topDelivered.forEach((r, i) => console.log(`  ${i+1}. ${r.ten_mon} — ${r.so_lan_ban} đơn delivered, ${r.tong_so_luong} xuất`));
    }

    await db.end();
}

run().catch(console.error);
