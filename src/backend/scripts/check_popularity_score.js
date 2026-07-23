const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });
const fs = require('fs');
const path = require('path');

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'TVU@842004',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });

    // Đọc trọng số từ admin config
    let wOrder = 30, wClick = 20, wView = 15, wLike = 15, wRating = 20;
    const weightsPath = path.join('d:/KhoaLuanTotNghiep2026/src/backend/config/popularity-weights.json');
    if (fs.existsSync(weightsPath)) {
        const w = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
        wOrder = w.orders !== undefined ? w.orders : 30;
        wClick = w.clicks !== undefined ? w.clicks : 20;
        wView  = w.views  !== undefined ? w.views  : 15;
        wLike  = w.likes  !== undefined ? w.likes  : 15;
        wRating= w.rating !== undefined ? w.rating : 20;
    }
    console.log(`Trọng số đang dùng: Lượt mua=${wOrder}%, Click=${wClick}%, View=${wView}%, Like=${wLike}%, Rating=${wRating}%\n`);

    const [result] = await db.query(`
        SELECT m.ma_mon, m.ten_mon,
               (SELECT COUNT(*) FROM chi_tiet_don_hang ct JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang WHERE ct.ma_mon = m.ma_mon AND dh.trang_thai = 'delivered') as luot_mua,
               (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as luot_click,
               (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as luot_view,
               (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as luot_like,
               COALESCE((SELECT AVG(so_sao) FROM danh_gia_san_pham dg WHERE dg.ma_mon = m.ma_mon AND dg.trang_thai = 'approved'), 0) as avg_rating
        FROM mon_an m WHERE m.trang_thai = 1
    `);

    const scored = result.map(r => ({
        ...r,
        score: (r.luot_mua * wOrder) + (r.luot_click * wClick) + (r.luot_view * wView) + (r.luot_like * wLike) + (parseFloat(r.avg_rating) * 20 * (wRating / 100))
    })).sort((a, b) => b.score - a.score);

    console.log("=== TOP 10 BÁN CHẠY (Theo Popularity Score Admin) ===");
    scored.slice(0, 10).forEach((r, i) => {
        console.log(`${i+1}. ${r.ten_mon}`);
        console.log(`   Mua: ${r.luot_mua} | Click: ${r.luot_click} | View: ${r.luot_view} | Like: ${r.luot_like} | Sao: ${parseFloat(r.avg_rating).toFixed(1)}`);
        console.log(`   ⭐ Điểm phổ biến: ${r.score.toFixed(1)}`);
    });

    await db.end();
}

run().catch(console.error);
