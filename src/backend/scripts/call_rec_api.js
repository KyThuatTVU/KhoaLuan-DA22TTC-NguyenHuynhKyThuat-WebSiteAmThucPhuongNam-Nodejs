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

// NodeJS functions simulated
async function getCollaborativeRecommendations(userId, limit, db) {
    try {
        let mlRecommendations = [];
        try {
            const pythonResponse = await axios.get(PYTHON_API_URL, {
                params: { user_id: userId, limit: limit, keyword: '' },
                timeout: 3000
            });

            if (pythonResponse.data && pythonResponse.data.success && pythonResponse.data.data.length > 0) {
                const recommendedItemIds = pythonResponse.data.data.map(i => i.item_id);
                const query = `
                    SELECT m.*, d.ten_danh_muc, COALESCE(AVG(dg.so_sao), 0) as avg_rating
                    FROM mon_an m
                    LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                    LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                    WHERE m.ma_mon IN (?) AND m.trang_thai = 1
                    GROUP BY m.ma_mon
                    HAVING avg_rating >= 3.0 OR avg_rating = 0
                    ORDER BY avg_rating DESC, m.ma_mon DESC
                `;
                const [rows] = await db.query(query, [recommendedItemIds]);
                mlRecommendations = rows.map(r => ({
                    ...r,
                    recommendation_type: 'collaborative',
                    reason: 'Được nhiều khách hàng có cùng khẩu vị chọn mua'
                }));
            }
        } catch (pyErr) {
            console.log("⚠️ Python ML error:", pyErr.message);
        }

        const sqlRecommendations = await getSQLCollaborativeRecommendations(userId, limit, db);

        const combined = [...mlRecommendations];
        sqlRecommendations.forEach(sqlItem => {
            if (!combined.some(item => item.ma_mon === sqlItem.ma_mon)) {
                combined.push(sqlItem);
            }
        });

        return combined.slice(0, limit);
    } catch (e) {
        console.error(e);
        return [];
    }
}

async function getSQLCollaborativeRecommendations(userId, limit, db) {
    // Simulated from recommendation.js
    const similarUsers = [7, 1, 4];
    const userDishes = [1, 25, 33, 29, 38];
    
    let query = `
        SELECT m.*, d.ten_danh_muc, COUNT(DISTINCT dh.ma_don_hang) as purchase_count,
               COALESCE(AVG(dg.so_sao), 0) as avg_rating
        FROM chi_tiet_don_hang ct
        JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
        JOIN mon_an m ON ct.ma_mon = m.ma_mon
        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
        LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
        WHERE dh.ma_nguoi_dung IN (?) AND m.trang_thai = 1 AND dh.trang_thai = 'delivered'
    `;
    const params = [similarUsers];
    if (userDishes.length > 0) {
        query += ` AND ct.ma_mon NOT IN (?)`;
        params.push(userDishes);
    }
    query += ` 
        GROUP BY m.ma_mon, m.ten_mon, d.ten_danh_muc, m.gia_tien, m.gia_khuyen_mai, m.don_vi_tinh, 
                 m.anh_mon, m.trang_thai, m.ma_danh_muc, m.so_luong_ton, m.mo_ta_chi_tiet, m.tu_khoa
        HAVING COUNT(DISTINCT dh.ma_nguoi_dung) >= 1 AND (avg_rating >= 3.0 OR avg_rating = 0)
        ORDER BY avg_rating DESC, purchase_count DESC, m.ma_mon DESC
        LIMIT ?
    `;
    params.push(limit);
    
    const [rows] = await db.query(query, params);
    return rows.map(r => ({
        ...r,
        recommendation_type: 'collaborative',
        reason: 'Món ăn phổ biến được khách hàng cùng khẩu vị đặt mua'
    }));
}

async function run() {
    const db = await dbConnect();
    const userId = 3;
    const limit = 100;
    
    const collabRecs = await getCollaborativeRecommendations(userId, Math.ceil(limit * 0.4), db);
    console.log("=== COLLABORATIVE RECOMMENDATIONS ===");
    collabRecs.forEach(r => {
        console.log(`Dish ID ${r.ma_mon} (${r.ten_mon}): Type = ${r.recommendation_type}, Reason = ${r.reason}`);
    });
    
    await db.end();
}

run().catch(console.error);
