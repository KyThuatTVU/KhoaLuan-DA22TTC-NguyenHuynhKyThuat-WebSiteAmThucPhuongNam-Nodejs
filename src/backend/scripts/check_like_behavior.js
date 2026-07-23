const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    // Kiểm tra hành vi của user 3 (Thuật Thuật)
    console.log("=== HÀNH VI NGƯỜI DÙNG — Thuật Thuật (ID 3) ===\n");

    const [behaviors] = await db.query(`
        SELECT h.hanh_vi, h.ma_mon, m.ten_mon, h.thoi_gian,
               GROUP_CONCAT(DISTINCT f.ten_thuoc_tinh SEPARATOR ', ') as flavor_names
        FROM hanh_vi_nguoi_dung h
        JOIN mon_an m ON h.ma_mon = m.ma_mon
        LEFT JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
        LEFT JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
        WHERE h.ma_nguoi_dung = 3
        GROUP BY h.id, h.hanh_vi, h.ma_mon, m.ten_mon, h.thoi_gian
        ORDER BY h.thoi_gian DESC
    `);

    if (behaviors.length === 0) {
        console.log("KHÔNG CÓ HÀNH VI NÀO GHI NHẬN!");
    } else {
        behaviors.forEach(b => {
            console.log(`  [${b.hanh_vi.toUpperCase()}] ${b.ten_mon} | Khẩu vị: ${b.flavor_names || 'N/A'} | Lúc: ${b.thoi_gian}`);
        });
    }

    console.log("\n=== TỔNG HỢP KHẨU VỊ THEO HÀNH VI ===\n");
    const [flavorCounts] = await db.query(`
        SELECT mk.id_thuoc_tinh, f.ten_thuoc_tinh, h.hanh_vi, COUNT(*) as count
        FROM hanh_vi_nguoi_dung h
        JOIN mon_an_khau_vi mk ON h.ma_mon = mk.ma_mon
        JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
        WHERE h.ma_nguoi_dung = 3
        GROUP BY mk.id_thuoc_tinh, f.ten_thuoc_tinh, h.hanh_vi
        ORDER BY count DESC
    `);
    flavorCounts.forEach(r => {
        console.log(`  ${r.ten_thuoc_tinh} (ID ${r.id_thuoc_tinh}) | ${r.hanh_vi}: ${r.count} lần`);
    });

    console.log("\n=== NGƯỠNG HIỆN TẠI: >= 5 lần mới học ===");
    const [implicitFlavors] = await db.query(`
        SELECT mk.id_thuoc_tinh, f.ten_thuoc_tinh, COUNT(h.id) as total
        FROM hanh_vi_nguoi_dung h
        JOIN mon_an_khau_vi mk ON h.ma_mon = mk.ma_mon
        JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
        WHERE h.ma_nguoi_dung = 3 AND h.hanh_vi IN ('click', 'view', 'like')
        GROUP BY mk.id_thuoc_tinh, f.ten_thuoc_tinh
        ORDER BY total DESC
    `);
    implicitFlavors.forEach(r => {
        const status = r.total >= 5 ? '✅ Đủ ngưỡng → Học được' : `❌ Chỉ ${r.total} lần → Chưa đủ ngưỡng`;
        console.log(`  ${r.ten_thuoc_tinh}: ${r.total} lần | ${status}`);
    });

    await db.end();
}

run().catch(console.error);
