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

// Mock of NodeJS functions
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

        // SQL Collaborative
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
        const [sqlRecs] = await db.query(query, params);
        const sqlRecommendations = sqlRecs.map(r => ({
            ...r,
            recommendation_type: 'collaborative',
            reason: 'Món ăn phổ biến được khách hàng cùng khẩu vị đặt mua'
        }));

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

async function getContentBasedRecommendations(userId, limit, preferredFlavorIds, db) {
    // Lấy các món user chưa mua
    const userDishes = [1, 25, 33, 29, 38];
    const avgPrice = 150000;
    
    let query = `
        SELECT m.*, d.ten_danh_muc, AVG(dg.so_sao) as avg_rating,
               GROUP_CONCAT(DISTINCT f.ten_thuoc_tinh SEPARATOR ', ') as flavor_names
        FROM mon_an m
        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
        JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
        LEFT JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
        LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
        WHERE m.trang_thai = 1 AND mk.id_thuoc_tinh IN (?)
    `;
    const params = [preferredFlavorIds];
    if (userDishes.length > 0) {
        query += ` AND m.ma_mon NOT IN (?)`;
        params.push(userDishes);
    }
    
    query += ` GROUP BY m.ma_mon 
               HAVING avg_rating IS NULL OR avg_rating >= 3.0
               ORDER BY 
                   (CASE WHEN DATEDIFF(NOW(), m.ngay_tao) <= 30 THEN 1 ELSE 0 END) DESC,
                   m.ma_mon DESC,
                   COALESCE(avg_rating, 0) DESC, 
                   ABS(m.gia_tien - ?) ASC
               LIMIT ?`;
    params.push(avgPrice, limit * 2);
    
    const [res] = await db.query(query, params);
    return res.map(r => ({
        ...r,
        recommendation_type: 'content_based',
        reason: `Hợp khẩu vị của bạn (${r.flavor_names})`
    }));
}

async function run() {
    const db = await dbConnect();
    const userId = 3;
    const limit = 8;
    const preferredFlavorIds = [2, 10, 6, 7];

    const contentBased = await getContentBasedRecommendations(userId, Math.ceil(limit * 0.4), preferredFlavorIds, db);
    const collaborative = await getCollaborativeRecommendations(userId, Math.ceil(limit * 0.4), db);

    // Merge logic
    contentBased.forEach((item, index) => { item.score = 100 - index; });
    collaborative.forEach((item, index) => { item.score = 99 - index; });

    let recommendations = [...contentBased, ...collaborative];
    
    // De-duplicate
    const seen = new Set();
    recommendations = recommendations.filter(r => {
        if (seen.has(r.ma_mon)) return false;
        seen.add(r.ma_mon);
        return true;
    });

    console.log("=== FINAL MERGED RECOMMENDATIONS (TOP 8) ===");
    recommendations.slice(0, 8).forEach((r, idx) => {
        console.log(`${idx + 1}. Dish ID ${r.ma_mon} (${r.ten_mon})`);
        console.log(`   Type: ${r.recommendation_type}`);
        console.log(`   Reason: ${r.reason}`);
        console.log(`   Score: ${r.score}`);
    });

    await db.end();
}

run().catch(console.error);
