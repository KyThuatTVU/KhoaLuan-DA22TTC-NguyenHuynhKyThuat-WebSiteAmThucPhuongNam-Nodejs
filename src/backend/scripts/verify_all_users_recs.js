const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });
const axios = require('axios');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || 'TVU@842004';
const DB_NAME = process.env.DB_NAME || 'amthuc_phuongnam';

const PYTHON_API_URL = 'http://localhost:5000/api/ml/recommend/collaborative';

async function dbConnect() {
    return await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASS,
        database: DB_NAME
    });
}

// NodeJS functions simulated for deep checking
async function checkUserRecs(userId, userName, db) {
    console.log(`\n================================================================`);
    console.log(`👤 KHÁCH HÀNG: ${userName} (ID: ${userId})`);
    console.log(`================================================================`);

    // 1. Hồ sơ sở thích khẩu vị
    const [explicit] = await db.query(
        `SELECT f.ten_thuoc_tinh FROM so_thich_khau_vi_nguoi_dung st
         JOIN thuoc_tinh_khau_vi f ON st.id_thuoc_tinh = f.id
         WHERE st.ma_nguoi_dung = ?`, [userId]
    );
    const [implicit] = await db.query(
        `SELECT tag_key, score FROM user_preference_profile WHERE ma_nguoi_dung = ?`, [userId]
    );
    console.log(`📌 Sở thích khai báo (Explicit):`, explicit.map(e => e.ten_thuoc_tinh));
    console.log(`📌 Hồ sơ học máy (ML Profile):`, implicit.map(i => `${i.tag_key} (${i.score})`));

    // 2. Lịch sử mua hàng đã hoàn thành (delivered)
    const [purchases] = await db.query(`
        SELECT DISTINCT m.ma_mon, m.ten_mon FROM chi_tiet_don_hang ct
        JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
        JOIN mon_an m ON ct.ma_mon = m.ma_mon
        WHERE dh.ma_nguoi_dung = ? AND dh.trang_thai = 'delivered'
    `, [userId]);
    console.log(`🛒 Đã mua thành công (delivered):`, purchases.map(p => `${p.ten_mon} (ID ${p.ma_mon})`));

    // 3. Đơn hàng đang chờ xử lý (pending) - Cần đảm bảo KHÔNG được dùng để gợi ý
    const [pendingOrders] = await db.query(`
        SELECT DISTINCT m.ma_mon, m.ten_mon FROM chi_tiet_don_hang ct
        JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
        JOIN mon_an m ON ct.ma_mon = m.ma_mon
        WHERE dh.ma_nguoi_dung = ? AND dh.trang_thai = 'pending'
    `, [userId]);
    console.log(`⏳ Đang chờ xử lý (pending - loại trừ):`, pendingOrders.map(p => `${p.ten_mon} (ID ${p.ma_mon})`));

    // 4. Lấy danh sách gợi ý Lọc cộng tác từ Python ML
    let mlCollab = [];
    try {
        const pyRes = await axios.get(PYTHON_API_URL, {
            params: { user_id: userId, limit: 10 },
            timeout: 3000
        });
        if (pyRes.data && pyRes.data.success) {
            mlCollab = pyRes.data.data;
        }
    } catch (e) {
        console.log("⚠️ Lỗi gọi Python ML:", e.message);
    }
    console.log(`🤖 Đề xuất SVD từ Python (ID món):`, mlCollab.map(m => m.item_id));

    // 5. Kết quả gợi ý thực tế trả về từ API NodeJS (Simulated)
    // Lấy chi tiết món gợi ý cộng tác
    const collabItems = [];
    if (mlCollab.length > 0) {
        const itemIds = mlCollab.map(m => m.item_id);
        const [rows] = await db.query(
            `SELECT ma_mon, ten_mon FROM mon_an WHERE ma_mon IN (?) AND trang_thai = 1`,
            [itemIds]
        );
        collabItems.push(...rows);
    }
    console.log(`👉 GỢI Ý CỘNG TÁC (Collaborative):`, collabItems.map(c => c.ten_mon));

    // Kiểm tra xem có món nào chưa mua nhưng bị gán nhãn sai hay không
    const invalidCollab = [];
    for (const item of collabItems) {
        // Kiểm tra xem món này có thực sự nằm trong đơn hàng delivered của người dùng khác hay không
        const [check] = await db.query(`
            SELECT COUNT(*) as count FROM chi_tiet_don_hang ct
            JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
            WHERE ct.ma_mon = ? AND dh.ma_nguoi_dung != ? AND dh.trang_thai = 'delivered'
        `, [item.ma_mon, userId]);
        
        if (check[0].count === 0) {
            invalidCollab.push(item.ten_mon);
        }
    }
    
    if (invalidCollab.length > 0) {
        console.log(`❌ LỖI NGHIÊM TRỌNG: Món [${invalidCollab.join(', ')}] được gán nhãn Lọc cộng tác nhưng không có người dùng tương đồng nào mua thành công!`);
    } else {
        console.log(`✅ CHÍNH XÁC: Tất cả món Lọc cộng tác đều là đơn hàng 'delivered' thực tế của người dùng khác!`);
    }
}

async function run() {
    const db = await dbConnect();
    const users = [
        { id: 1, name: "Nguyễn Văn A" },
        { id: 3, name: "Thuật Thuật" },
        { id: 4, name: "Thiên Vũ Đỗ" },
        { id: 7, name: "Đỗ Thiên Vũ" }
    ];

    for (const u of users) {
        await checkUserRecs(u.id, u.name, db);
    }

    await db.end();
}

run().catch(console.error);
