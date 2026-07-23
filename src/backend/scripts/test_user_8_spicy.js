const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    console.log("=== KIỂM TRA TÀI KHOẢN HÂN TRẦN THỊ NGỌC (ID 8) ===\n");

    // 1. Kiểm tra thông tin User
    const [user] = await db.query(`SELECT ma_nguoi_dung, ten_nguoi_dung FROM nguoi_dung WHERE ma_nguoi_dung = 8`);
    console.log("User:", user[0] ? `${user[0].ten_nguoi_dung} (ID: ${user[0].ma_nguoi_dung})` : "Không tìm thấy user");

    // 2. Kiểm tra sở thích đã lưu trong bảng khảo sát (so_thich_khau_vi_nguoi_dung)
    const [surveyPrefs] = await db.query(`
        SELECT s.id_thuoc_tinh, t.ten_thuoc_tinh 
        FROM so_thich_khau_vi_nguoi_dung s
        JOIN thuoc_tinh_khau_vi t ON s.id_thuoc_tinh = t.id
        WHERE s.ma_nguoi_dung = 8
    `);
    console.log("\nSở thích khảo sát (Explicit):");
    if (surveyPrefs.length === 0) {
        console.log("  - Không có dữ liệu khảo sát");
    } else {
        surveyPrefs.forEach(p => console.log(`  - ID ${p.id_thuoc_tinh}: ${p.ten_thuoc_tinh}`));
    }

    // 3. Kiểm tra profile preference học ngầm (user_preference_profile)
    const [mlPrefs] = await db.query(`
        SELECT tag_key, score 
        FROM user_preference_profile 
        WHERE ma_nguoi_dung = 8
    `);
    console.log("\nHọc ngầm qua ML Profile:");
    if (mlPrefs.length === 0) {
        console.log("  - Không có dữ liệu ML Profile");
    } else {
        mlPrefs.forEach(p => console.log(`  - Tag: ${p.tag_key} | Score: ${p.score}`));
    }

    // 4. Kiểm tra hành vi tương tác thực tế (hanh_vi_nguoi_dung)
    const [behaviors] = await db.query(`
        SELECT h.hanh_vi, h.ma_mon, m.ten_mon, COUNT(*) as count
        FROM hanh_vi_nguoi_dung h
        JOIN mon_an m ON h.ma_mon = m.ma_mon
        WHERE h.ma_nguoi_dung = 8
        GROUP BY h.hanh_vi, h.ma_mon, m.ten_mon
    `);
    console.log("\nHành vi tương tác thực tế ghi nhận:");
    if (behaviors.length === 0) {
        console.log("  - Chưa có bất kỳ hành vi click/like/view nào được ghi nhận");
    } else {
        behaviors.forEach(b => console.log(`  - [${b.hanh_vi.toUpperCase()}] ${b.ten_mon} (ID ${b.ma_mon}): ${b.count} lần`));
    }

    // 5. Kiểm tra các món Cay trong hệ thống xem có gắn nhãn đúng không
    const [spicyDishes] = await db.query(`
        SELECT m.ma_mon, m.ten_mon, GROUP_CONCAT(t.ten_thuoc_tinh SEPARATOR ', ') as flavors
        FROM mon_an m
        JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
        JOIN thuoc_tinh_khau_vi t ON mk.id_thuoc_tinh = t.id
        WHERE t.ten_thuoc_tinh LIKE '%Cay%' OR t.id = 1
        GROUP BY m.ma_mon
    `);
    console.log("\nCác món được dán nhãn 'Cay' (ID 1) trong hệ thống:");
    if (spicyDishes.length === 0) {
        console.log("  - Không có món nào được dán nhãn Cay!");
    } else {
        spicyDishes.forEach(d => console.log(`  - ID ${d.ma_mon}: ${d.ten_mon} (${d.flavors})`));
    }

    await db.end();
}

run().catch(console.error);
