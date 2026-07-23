const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const PYTHON_API_URL = process.env.PYTHON_ML_URL || 'http://localhost:5000/api/ml/recommend/collaborative';
const PYTHON_APRIORI_URL = process.env.PYTHON_APRIORI_URL || 'http://localhost:5000/api/ml/recommend/apriori';

// ==================== ML RECOMMENDATION ENGINE ====================

/**
 * Hệ thống gợi ý món ăn sử dụng Machine Learning
 * - Content-based filtering: Dựa trên đặc điểm món ăn
 * - Collaborative filtering: Dựa trên hành vi người dùng tương tự
 * - Association rules: Quy tắc kết hợp món ăn (lẩu → nước)
 * - NLP analysis: Phân tích từ khóa từ chatbot
 */

// Cache cho recommendations
let recommendationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 phút

// ==================== HELPER FUNCTIONS ====================

// Lấy user từ token
function getUserFromToken(req) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            return decoded.ma_nguoi_dung;
        }
    } catch (error) {}
    return null;
}

// Tính cosine similarity giữa 2 vectors
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==================== QUY TẮC KẾT HỢP MÓN ĂN (Association Rules) ====================

const FOOD_PAIRING_RULES = {
    // Lẩu → Nước giải khát
    'lau': ['nuoc_uong', 'do_uong', 'trang_mieng'],
    'lau_mam': ['nuoc_uong', 'rau_song', 'bun'],
    'lau_thai': ['nuoc_uong', 'hai_san', 'mi'],
    
    // Món chính → Khai vị + Nước
    'mon_chinh': ['khai_vi', 'nuoc_uong', 'trang_mieng'],
    'com': ['canh', 'rau', 'nuoc_uong'],
    'bun': ['nem', 'cha_gio', 'nuoc_uong'],
    'pho': ['quay', 'nuoc_uong'],
    
    // Hải sản → Nước chấm + Rau
    'hai_san': ['nuoc_cham', 'rau_song', 'nuoc_uong'],
    'tom': ['nuoc_cham', 'rau', 'nuoc_uong'],
    'ca': ['canh_chua', 'rau', 'com'],
    
    // Đồ nướng → Nước + Rau
    'nuong': ['nuoc_uong', 'rau_song', 'banh_mi'],
    'bbq': ['bia', 'nuoc_ngot', 'salad'],
    
    // Tráng miệng → Đồ uống
    'trang_mieng': ['tra', 'ca_phe', 'nuoc_ep']
};

// Từ khóa mapping cho các loại món
const KEYWORD_CATEGORY_MAP = {
    // Lẩu
    'lẩu': 'lau', 'lau': 'lau', 'hotpot': 'lau', 'nồi lẩu': 'lau',
    'lẩu mắm': 'lau_mam', 'lẩu thái': 'lau_thai', 'lẩu hải sản': 'lau',
    
    // Món chính
    'cơm': 'com', 'com': 'com', 'rice': 'com',
    'bún': 'bun', 'bun': 'bun', 'noodle': 'bun',
    'phở': 'pho', 'pho': 'pho',
    'mì': 'mi', 'mi': 'mi',
    
    // Hải sản
    'tôm': 'tom', 'tom': 'tom', 'shrimp': 'tom',
    'cá': 'ca', 'ca': 'ca', 'fish': 'ca',
    'hải sản': 'hai_san', 'seafood': 'hai_san',
    'lẩu cua': 'hai_san', 'canh cua': 'hai_san', 'cua đồng': 'hai_san', 'cua hoàng đế': 'hai_san', 'món cua': 'hai_san', 'mực': 'hai_san',
    
    // Nướng
    'nướng': 'nuong', 'nuong': 'nuong', 'grill': 'nuong', 'bbq': 'bbq',
    
    // Tráng miệng
    'chè': 'trang_mieng', 'bánh': 'trang_mieng', 'kem': 'trang_mieng',
    'tráng miệng': 'trang_mieng', 'dessert': 'trang_mieng',
    
    // Đồ uống
    'nước': 'nuoc_uong', 'uống': 'nuoc_uong', 'drink': 'nuoc_uong',
    'trà': 'tra', 'cà phê': 'ca_phe', 'coffee': 'ca_phe',
    'bia': 'bia', 'beer': 'bia', 'nước ngọt': 'nuoc_ngot'
};


// ==================== PHÂN TÍCH CHAT (NLP) ====================

/**
 * Phân tích tin nhắn chat để trích xuất từ khóa và chủ đề
 */
function analyzeMessage(message) {
    const lowerMsg = message.toLowerCase();
    const keywords = [];
    const categories = new Set();
    
    // Tìm từ khóa trong tin nhắn
    for (const [keyword, category] of Object.entries(KEYWORD_CATEGORY_MAP)) {
        if (lowerMsg.includes(keyword)) {
            keywords.push(keyword);
            categories.add(category);
        }
    }
    
    // Phân tích intent
    const intents = {
        asking_menu: /thực đơn|menu|có gì|món gì|ăn gì/.test(lowerMsg),
        asking_price: /giá|bao nhiêu|tiền/.test(lowerMsg),
        asking_recommendation: /gợi ý|đề xuất|nên ăn|recommend/.test(lowerMsg),
        ordering: /đặt|order|mua|thêm vào/.test(lowerMsg),
        asking_combo: /combo|set|bộ|kèm/.test(lowerMsg)
    };
    
    return { keywords, categories: Array.from(categories), intents };
}

/**
 * Lấy lịch sử chat của user và phân tích
 */
async function getUserChatAnalysis(userId) {
    try {
        // Lấy 50 tin nhắn gần nhất của user
        const [messages] = await db.query(
            `SELECT noi_dung FROM lich_su_chatbot 
             WHERE ma_nguoi_dung = ? AND nguoi_gui = 'user'
             ORDER BY thoi_diem_chat DESC LIMIT 50`,
            [userId]
        );
        
        const allKeywords = [];
        const allCategories = new Set();
        const intentCounts = {
            asking_menu: 0,
            asking_price: 0,
            asking_recommendation: 0,
            ordering: 0,
            asking_combo: 0
        };
        
        for (const msg of messages) {
            const analysis = analyzeMessage(msg.noi_dung);
            allKeywords.push(...analysis.keywords);
            analysis.categories.forEach(c => allCategories.add(c));
            
            for (const [intent, value] of Object.entries(analysis.intents)) {
                if (value) intentCounts[intent]++;
            }
        }
        
        // Đếm tần suất từ khóa
        const keywordFrequency = {};
        for (const kw of allKeywords) {
            keywordFrequency[kw] = (keywordFrequency[kw] || 0) + 1;
        }
        
        // Sắp xếp theo tần suất
        const topKeywords = Object.entries(keywordFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([kw, count]) => ({ keyword: kw, count }));
        
        return {
            topKeywords,
            categories: Array.from(allCategories),
            intents: intentCounts,
            totalMessages: messages.length
        };
    } catch (error) {
        console.error('Error analyzing user chat:', error.message);
        return null;
    }
}

// ==================== COLLABORATIVE FILTERING ====================

/**
 * Tìm người dùng tương tự dựa trên lịch sử mua hàng
 */
async function findSimilarUsers(userId, limit = 5) {
    try {
        // Lấy các món user đã mua (giao hàng thành công)
        const [userOrders] = await db.query(
            `SELECT DISTINCT ct.ma_mon 
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             WHERE dh.ma_nguoi_dung = ? AND dh.trang_thai = 'delivered'`,
            [userId]
        );
        
        if (userOrders.length === 0) return [];
        
        const userDishes = userOrders.map(o => o.ma_mon);
        
        // Tìm users khác đã mua các món tương tự (giao hàng thành công)
        const [similarUsers] = await db.query(
            `SELECT dh.ma_nguoi_dung, COUNT(DISTINCT ct.ma_mon) as common_dishes
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             WHERE ct.ma_mon IN (?) AND dh.ma_nguoi_dung != ? AND dh.ma_nguoi_dung IS NOT NULL AND dh.trang_thai = 'delivered'
             GROUP BY dh.ma_nguoi_dung
             ORDER BY common_dishes DESC
             LIMIT ?`,
            [userDishes, userId, limit]
        );
        
        return similarUsers;
    } catch (error) {
        console.error('Error finding similar users:', error.message);
        return [];
    }
}

/**
 * Gợi ý món từ người dùng tương tự (Collaborative Filtering - HYBRID WITH PYTHON)
 * CẢI TIẾN: Đưa số sao vào vector sở thích để tăng độ chính xác
 */
async function getCollaborativeRecommendations(userId, limit = 5, searchKeyword = '') {
    try {
        let mlRecommendations = [];
        
        // 1. Gọi Python ML Service (SVD)
        try {
            const pythonResponse = await axios.get(PYTHON_API_URL, {
                params: { user_id: userId, limit: limit, keyword: searchKeyword },
                timeout: 3000 // Tối đa 3 giây gọi API 
            });

            if (pythonResponse.data && pythonResponse.data.success && pythonResponse.data.data.length > 0) {
                // Parse IDs do Python trả về ([101, 204, ...])
                const recommendedItemIds = pythonResponse.data.data.map(i => i.item_id);
                console.log(`🤖 [Python ML] Hybrid Recommendation success cho User: ${userId}`, recommendedItemIds);
                
                // Fetch thông tin chi tiết các id này từ database MySQL 
                const query = `
                    SELECT m.*, d.ten_danh_muc, COALESCE(AVG(dg.so_sao), 0) as avg_rating,
                           (SELECT COUNT(*) FROM chi_tiet_don_hang ct WHERE ct.ma_mon = m.ma_mon) as order_count,
                           (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as click_count,
                           (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as view_count,
                           (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as like_count
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
            console.log("⚠️ [Node.js] Không kết nối được đến Python ML Service. Sử dụng SQL.");
        }

        // 2. Gọi SQL Collaborative (dựa trên độ tương đồng khẩu vị)
        const sqlRecommendations = await getSQLCollaborativeRecommendations(userId, limit);

        // 3. Trộn hai kết quả (ưu tiên các món của Python trước, sau đó bổ sung từ SQL nếu thiếu)
        const combined = [...mlRecommendations];
        sqlRecommendations.forEach(sqlItem => {
            if (!combined.some(item => item.ma_mon === sqlItem.ma_mon)) {
                combined.push(sqlItem);
            }
        });

        return combined.slice(0, limit);

    } catch (error) {
        console.error('Error getting collaborative recommendations:', error.message);
        return [];
    }
}

/**
 * Gợi ý SQL gốc nếu Python tạch (Fall-back plan)
 * CẢI TIẾN: 
 * - Tích hợp đánh giá số sao vào vector sở thích
 * - Lọc món có số sao >= 3.0 hoặc chưa đánh giá
 */
async function getSQLCollaborativeRecommendations(userId, limit = 5) {
    try {
        // 1. Tìm người dùng tương tự dựa trên hành vi mua hàng VÀ đánh giá
        const similarUsers = await findSimilarUsersWithRatings(userId);
        
        console.log(`🤝 [Collaborative] User ${userId}: Found ${similarUsers.length} similar users`);
        if (similarUsers.length > 0) {
            console.log(`   Top similar users:`, similarUsers.slice(0, 3).map(u => 
                `User ${u.ma_nguoi_dung} (similarity: ${(u.similarity * 100).toFixed(1)}%, common: ${u.common_dishes})`
            ).join(', '));
        }
        
        if (similarUsers.length === 0) {
            console.log(`   ⚠️ No similar users found, returning empty recommendations`);
            return [];
        }
        
        const similarUserIds = similarUsers.map(u => u.ma_nguoi_dung);
        
        // 2. Lấy các món user chưa mua nhưng users tương tự đã mua (chỉ xét đơn đã giao thành công)
        const [userOrders] = await db.query(
            `SELECT DISTINCT ct.ma_mon 
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             WHERE dh.ma_nguoi_dung = ? AND dh.trang_thai = 'delivered'`,
            [userId]
        );
        const userDishes = userOrders.map(o => o.ma_mon);
        console.log(`   User already purchased ${userDishes.length} dishes: [${userDishes.slice(0, 5).join(', ')}...]`);
        
        let query = `
            SELECT m.*, d.ten_danh_muc, COUNT(DISTINCT dh.ma_don_hang) as purchase_count,
                   COALESCE(AVG(dg.so_sao), 0) as avg_rating,
                   COUNT(dg.ma_danh_gia) as review_count,
                   (SELECT COUNT(*) FROM chi_tiet_don_hang ct WHERE ct.ma_mon = m.ma_mon) as order_count,
                   (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as click_count,
                   (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as view_count,
                   (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as like_count
            FROM chi_tiet_don_hang ct
            JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
            LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
            WHERE dh.ma_nguoi_dung IN (?) AND m.trang_thai = 1 AND dh.trang_thai = 'delivered'
        `;
        const params = [similarUserIds];
        
        if (userDishes.length > 0) {
            query += ` AND ct.ma_mon NOT IN (?)`;
            params.push(userDishes);
        }
        
        // CẢI TIẾN: Lọc món có đánh giá >= 3.0 hoặc chưa đánh giá (NULL)
        // COALESCE đã xử lý NULL thành 0, nên cần filter >= 3.0 hoặc = 0
        query += ` 
            GROUP BY m.ma_mon, m.ten_mon, d.ten_danh_muc, m.gia_tien, m.gia_khuyen_mai, m.don_vi_tinh, 
                     m.anh_mon, m.trang_thai, m.ma_danh_muc, m.so_luong_ton, m.mo_ta_chi_tiet, m.tu_khoa
            HAVING COUNT(DISTINCT dh.ma_nguoi_dung) >= 1 AND (avg_rating >= 3.0 OR avg_rating = 0)
            ORDER BY avg_rating DESC, purchase_count DESC, m.ma_mon DESC
            LIMIT ?
        `;
        params.push(limit);
        
        const [recommendations] = await db.query(query, params);
        
        console.log(`   ✅ Found ${recommendations.length} collaborative recommendations (filtered by rating >= 3.0)`);
        if (recommendations.length > 0) {
            console.log(`   Top dishes:`, recommendations.slice(0, 3).map(r => 
                `"${r.ten_mon}" (⭐${parseFloat(r.avg_rating).toFixed(1)}, ${r.purchase_count} orders)`
            ).join(', '));
        }
        
        return recommendations.map(r => ({
            ...r,
            recommendation_type: 'collaborative',
            reason: 'Món ăn phổ biến được khách hàng cùng khẩu vị đặt mua'
        }));
    } catch (error) {
        console.error('Error getting collaborative SQL recommendations:', error.message);
        return [];
    }
}

/**
 * Tìm người dùng tương tự dựa trên lịch sử mua hàng VÀ đánh giá số sao
 * CẢI TIẾN: Đưa số sao vào vector sở thích
 */
async function findSimilarUsersWithRatings(userId, limit = 5) {
    try {
        const [allUsersList] = await db.query('SELECT ma_nguoi_dung, ten_nguoi_dung FROM nguoi_dung');
        const [allFlavorsList] = await db.query('SELECT id FROM thuoc_tinh_khau_vi');
        const [allExplicitPrefs] = await db.query('SELECT ma_nguoi_dung, id_thuoc_tinh FROM so_thich_khau_vi_nguoi_dung');
        const [allImplicitPrefs] = await db.query(`
            SELECT h.ma_nguoi_dung, mk.id_thuoc_tinh, COUNT(h.id) as click_count
            FROM hanh_vi_nguoi_dung h
            JOIN mon_an_khau_vi mk ON h.ma_mon = mk.ma_mon
            WHERE h.hanh_vi IN ('click', 'view', 'like')
            GROUP BY h.ma_nguoi_dung, mk.id_thuoc_tinh
        `);
        const [allReviews] = await db.query(`
            SELECT dg.ma_nguoi_dung, mk.id_thuoc_tinh, dg.so_sao
            FROM danh_gia_san_pham dg
            JOIN mon_an_khau_vi mk ON dg.ma_mon = mk.ma_mon
            WHERE dg.trang_thai = 'approved' AND dg.ma_nguoi_dung IS NOT NULL
        `);

        const vectors = {};
        allUsersList.forEach(u => {
            vectors[u.ma_nguoi_dung] = {};
            allFlavorsList.forEach(f => {
                vectors[u.ma_nguoi_dung][f.id] = 0;
            });
        });

        allExplicitPrefs.forEach(row => {
            if (vectors[row.ma_nguoi_dung]) {
                vectors[row.ma_nguoi_dung][row.id_thuoc_tinh] += 3.0;
            }
        });

        allImplicitPrefs.forEach(row => {
            if (vectors[row.ma_nguoi_dung]) {
                vectors[row.ma_nguoi_dung][row.id_thuoc_tinh] += Math.min(2.0, row.click_count * 0.2);
            }
        });

        allReviews.forEach(row => {
            if (vectors[row.ma_nguoi_dung]) {
                const ratingWeight = row.so_sao >= 4 ? 2.5 : (row.so_sao <= 2 ? -2.5 : 0);
                vectors[row.ma_nguoi_dung][row.id_thuoc_tinh] += ratingWeight;
            }
        });

        const targetVec = vectors[userId];
        if (!targetVec) return [];

        let normTarget = 0;
        allFlavorsList.forEach(f => {
            const val = targetVec[f.id] || 0;
            normTarget += val * val;
        });
        normTarget = Math.sqrt(normTarget);
        if (normTarget === 0) return [];

        const results = [];
        allUsersList.forEach(u => {
            if (u.ma_nguoi_dung === userId) return;
            const otherVec = vectors[u.ma_nguoi_dung];
            if (!otherVec) return;

            let dotProduct = 0;
            let normOther = 0;
            allFlavorsList.forEach(f => {
                const valA = targetVec[f.id] || 0;
                const valB = otherVec[f.id] || 0;
                dotProduct += valA * valB;
                normOther += valB * valB;
            });
            normOther = Math.sqrt(normOther);
            const similarity = normOther === 0 ? 0 : dotProduct / (normTarget * normOther);
            
            if (similarity > 0.1) {
                results.push({
                    ma_nguoi_dung: u.ma_nguoi_dung,
                    similarity: similarity,
                    common_dishes: 1
                });
            }
        });

        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, limit);
    } catch (error) {
        console.error('Error finding similar users with ratings:', error.message);
        return [];
    }
}


// ==================== CONTENT-BASED FILTERING ====================

/**
 * Gợi ý món dựa trên nội dung (danh mục, giá, đặc điểm)
 * CẢI TIẾN: 
 * - Ưu tiên sở thích khẩu vị từ bảng so_thich_khau_vi_nguoi_dung
 * - Sắp xếp ưu tiên món có đánh giá cao (>=3.0 sao)
 * - Ưu tiên món có giá gần với giá trung bình user thường mua
 */
async function getContentBasedRecommendations(userId, limit = 5, preferredFlavorIds = null) {
    try {
        let favoriteFlavors = preferredFlavorIds ? [...preferredFlavorIds] : [];
        const excludedFlavorIds = [];
        
        // 1. Tích hợp sở thích từ user_preference_profile (Học máy từ Đánh giá & Chatbot)
        try {
            const [profilePrefs] = await db.query(
                `SELECT tag_key, score FROM user_preference_profile WHERE ma_nguoi_dung = ?`,
                [userId]
            );
            
            const tagKeyToFlavorId = {
                'cay': 1,
                'chua': 2,
                'man': 3,
                'ngot': 4,
                'an_chay': 5,
                'thanh_mat': 6,
                'thit_bo': 7,
                'thit_ga': 7,
                'hai_san': 8,
                'chien': 9
            };
            
            profilePrefs.forEach(p => {
                const fId = tagKeyToFlavorId[p.tag_key];
                if (fId) {
                    if (Number(p.score) >= 0.5) {
                        if (!favoriteFlavors.includes(fId)) {
                            favoriteFlavors.push(fId);
                        }
                    } else if (Number(p.score) <= -0.5) {
                        if (!excludedFlavorIds.includes(fId)) {
                            excludedFlavorIds.push(fId);
                        }
                    }
                }
            });
        } catch (profileErr) {
            console.error('Error fetching user preference profile for content-based rec:', profileErr.message);
        }

        if (favoriteFlavors.length === 0) {
            // 2. Lấy sở thích khẩu vị từ bảng so_thich_khau_vi_nguoi_dung (ưu tiên cao nhất tiếp theo)
            const [explicitPrefs] = await db.query(
                `SELECT id_thuoc_tinh FROM so_thich_khau_vi_nguoi_dung WHERE ma_nguoi_dung = ?`,
                [userId]
            );
            favoriteFlavors = explicitPrefs.map(p => p.id_thuoc_tinh);
        }
        
        // 3. Nếu không có sở thích rõ ràng, phân tích từ lịch sử hành vi (mua hàng, thích, xem > 50s)
        if (favoriteFlavors.length === 0) {
            // Lấy các khẩu vị từ món đã mua, đã thích, và đã xem trên 50s (view)
            const [userPreferences] = await db.query(
                `SELECT mk.id_thuoc_tinh, COUNT(*) as action_count
                 FROM (
                     SELECT ct.ma_mon 
                     FROM chi_tiet_don_hang ct
                     JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
                     WHERE dh.ma_nguoi_dung = ? AND dh.trang_thai = 'delivered'
                     
                     UNION ALL
                     
                     SELECT ma_mon 
                     FROM hanh_vi_nguoi_dung 
                     WHERE ma_nguoi_dung = ? AND hanh_vi = 'like'
                     
                     UNION ALL
                     
                     SELECT ma_mon 
                     FROM hanh_vi_nguoi_dung 
                     WHERE ma_nguoi_dung = ? AND hanh_vi = 'view'
                 ) user_actions
                 JOIN mon_an_khau_vi mk ON user_actions.ma_mon = mk.ma_mon
                 GROUP BY mk.id_thuoc_tinh
                 ORDER BY action_count DESC`,
                [userId, userId, userId]
            );
            favoriteFlavors = userPreferences.slice(0, 3).map(p => p.id_thuoc_tinh);
        }
        
        // 4. Lấy giá trung bình người dùng hay mua (chỉ tính đơn hàng đã giao thành công)
        const [priceStats] = await db.query(
            `SELECT AVG(m.gia_tien) as avg_price
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             JOIN mon_an m ON ct.ma_mon = m.ma_mon
             WHERE dh.ma_nguoi_dung = ? AND dh.trang_thai = 'delivered'`,
            [userId]
        );
        const avgPrice = priceStats[0]?.avg_price || 150000; // Default 150k
        
        // 5. Lấy các món user chưa mua (chỉ tính đơn hàng đã giao thành công)
        const [userOrders] = await db.query(
            `SELECT DISTINCT ct.ma_mon 
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             WHERE dh.ma_nguoi_dung = ? AND dh.trang_thai = 'delivered'`,
            [userId]
        );
        const userDishes = userOrders.map(o => o.ma_mon);
        
        let recommendations = [];
        if (favoriteFlavors.length > 0) {
            let query = `
                SELECT m.*, d.ten_danh_muc, AVG(dg.so_sao) as avg_rating,
                       COUNT(dg.ma_danh_gia) as review_count,
                       GROUP_CONCAT(DISTINCT f.ten_thuoc_tinh SEPARATOR ', ') as flavor_names,
                       (SELECT COUNT(*) FROM chi_tiet_don_hang ct WHERE ct.ma_mon = m.ma_mon) as order_count,
                       (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as click_count,
                       (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as view_count,
                       (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as like_count
                FROM mon_an m
                LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
                LEFT JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
                LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                WHERE m.trang_thai = 1 AND mk.id_thuoc_tinh IN (?)
            `;
            const params = [favoriteFlavors];
            
            if (userDishes.length > 0) {
                query += ` AND m.ma_mon NOT IN (?)`;
                params.push(userDishes);
            }
            
            // Loại bỏ các khẩu vị không thích (negative preference)
            if (excludedFlavorIds.length > 0) {
                query += ` AND m.ma_mon NOT IN (SELECT DISTINCT ma_mon FROM mon_an_khau_vi WHERE id_thuoc_tinh IN (?))`;
                params.push(excludedFlavorIds);
            }
            
            // Sắp xếp ưu tiên: Món mới (≤30 ngày) → Đánh giá cao → Giá phù hợp
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
            recommendations = res;
        }
        
        // Nếu không đủ món, lấy thêm món chung
        if (recommendations.length < limit) {
            const excludedIds = [...userDishes, ...recommendations.map(r => r.ma_mon)];
            let query = `
                SELECT m.*, d.ten_danh_muc, AVG(dg.so_sao) as avg_rating,
                       (SELECT COUNT(*) FROM chi_tiet_don_hang ct WHERE ct.ma_mon = m.ma_mon) as order_count,
                       (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as click_count,
                       (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as view_count,
                       (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as like_count
                FROM mon_an m
                LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                WHERE m.trang_thai = 1
            `;
            const params = [];
            if (excludedIds.length > 0) {
                query += ` AND m.ma_mon NOT IN (?)`;
                params.push(excludedIds);
            }
            
            // Loại bỏ các khẩu vị không thích (negative preference)
            if (excludedFlavorIds.length > 0) {
                query += ` AND m.ma_mon NOT IN (SELECT DISTINCT ma_mon FROM mon_an_khau_vi WHERE id_thuoc_tinh IN (?))`;
                params.push(excludedFlavorIds);
            }
            
            // Lọc món có đánh giá >= 3.0 hoặc chưa đánh giá, ưu tiên món mới
            query += ` GROUP BY m.ma_mon 
                       HAVING avg_rating IS NULL OR avg_rating >= 3.0
                       ORDER BY 
                           (CASE WHEN DATEDIFF(NOW(), m.ngay_tao) <= 30 THEN 1 ELSE 0 END) DESC,
                           m.ma_mon DESC,
                           COALESCE(avg_rating, 0) DESC 
                       LIMIT ?`;
            params.push(limit - recommendations.length);
            
            const [extra] = await db.query(query, params);
            recommendations.push(...extra);
        }
        
        return recommendations.slice(0, limit).map(r => {
            const reason = r.flavor_names 
                ? `Hợp khẩu vị của bạn (${r.flavor_names})` 
                : (r.ten_danh_muc ? `Món ngon từ danh mục ${r.ten_danh_muc}` : 'Đề xuất cho bạn');
            return {
                ...r,
                recommendation_type: 'content_based',
                reason: reason
            };
        });
    } catch (error) {
        console.error('Error getting content-based recommendations:', error.message);
        return [];
    }
}

// ==================== ASSOCIATION RULES (Kết hợp món) ====================

/**
 * Gợi ý món kèm theo dựa trên quy tắc kết hợp (Apriori AI Service + Fallback rules)
 */
async function getPairingRecommendations(dishIds, limit = 4) {
    try {
        if (!dishIds || dishIds.length === 0) return [];
        
        let aiRecommendedIds = [];
        
        // Gọi Apriori API từ Python
        try {
            const response = await axios.get(PYTHON_APRIORI_URL, {
                params: {
                    cart: dishIds.join(','),
                    limit: limit
                },
                timeout: 3000
            });
            
            if (response.data && response.data.success && response.data.data.length > 0) {
                // response.data.data looks like: [{ item_id: 101, score: 0.8 }, ...]
                aiRecommendedIds = response.data.data.map(item => item.item_id);
            }
        } catch (apiError) {
            console.error('Python Apriori API Error - Fallback to hardcoded rules:', apiError.message);
        }

        let recommendations = [];

        // Nếu có kết quả từ AI, fetch thông tin các món đó
        if (aiRecommendedIds.length > 0) {
            const [aiFoods] = await db.query(
                `SELECT m.*, d.ten_danh_muc 
                 FROM mon_an m 
                 LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                 WHERE m.ma_mon IN (?) AND m.trang_thai = 1`,
                [aiRecommendedIds]
            );
            
            recommendations.push(...aiFoods.map(d => ({
                ...d,
                recommendation_type: 'apriori_pairing',
                reason: '💡 Món kèm thường được đặt chung!'
            })));
        }

        // Nếu số lượng AI gợi ý chưa đủ limit, bù thêm từ hardcoded Rules
        if (recommendations.length < limit) {
        
            // Lấy thông tin các món trong giỏ hàng
            const [cartDishes] = await db.query(
                `SELECT m.*, d.ten_danh_muc 
                 FROM mon_an m 
                 LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                 WHERE m.ma_mon IN (?)`,
                [dishIds]
            );
        
        // Phân tích các món trong giỏ để tìm category
        const cartCategories = new Set();
        for (const dish of cartDishes) {
            const dishName = dish.ten_mon.toLowerCase();
            for (const [keyword, category] of Object.entries(KEYWORD_CATEGORY_MAP)) {
                if (dishName.includes(keyword)) {
                    cartCategories.add(category);
                }
            }
            // Thêm category từ danh mục
            if (dish.ten_danh_muc) {
                const catName = dish.ten_danh_muc.toLowerCase();
                if (catName.includes('lẩu')) cartCategories.add('lau');
                if (catName.includes('uống') || catName.includes('nước')) cartCategories.add('nuoc_uong');
                if (catName.includes('tráng miệng')) cartCategories.add('trang_mieng');
                if (catName.includes('khai vị')) cartCategories.add('khai_vi');
            }
        }
        
        // Tìm các category nên kết hợp
        const suggestedCategories = new Set();
        for (const cat of cartCategories) {
            const pairings = FOOD_PAIRING_RULES[cat] || [];
            pairings.forEach(p => suggestedCategories.add(p));
        }
        
        // Nếu có lẩu, ưu tiên gợi ý nước uống
        const hasLau = Array.from(cartCategories).some(c => c.includes('lau'));
        
        // Lấy món từ các category được gợi ý
        let remainingLimit = limit - recommendations.length;
        
        // Ưu tiên đồ uống nếu có lẩu
        if (remainingLimit > 0 && (hasLau || suggestedCategories.has('nuoc_uong'))) {
            const [drinks] = await db.query(
                `SELECT m.*, d.ten_danh_muc, 'Kết hợp hoàn hảo với món lẩu' as reason
                 FROM mon_an m
                 LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                 WHERE m.trang_thai = 1 
                 AND (d.ten_danh_muc LIKE '%uống%' OR d.ten_danh_muc LIKE '%nước%' 
                      OR m.ten_mon LIKE '%nước%' OR m.ten_mon LIKE '%trà%' 
                      OR m.ten_mon LIKE '%cà phê%' OR m.ten_mon LIKE '%sinh tố%')
                 AND m.ma_mon NOT IN (?)
                 ORDER BY RAND() LIMIT ?`,
                [dishIds, Math.min(2, remainingLimit)]
            );
            recommendations.push(...drinks.map(d => ({
                ...d,
                recommendation_type: 'pairing',
                reason: hasLau ? '🍲 Kết hợp hoàn hảo với món lẩu!' : '🥤 Thêm đồ uống cho bữa ăn'
            })));
            remainingLimit -= drinks.length;
        }
        
        // Gợi ý món tráng miệng
        if (remainingLimit > 0 && suggestedCategories.has('trang_mieng')) {
            const [desserts] = await db.query(
                `SELECT m.*, d.ten_danh_muc
                 FROM mon_an m
                 LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                 WHERE m.trang_thai = 1 
                 AND (d.ten_danh_muc LIKE '%tráng miệng%' OR m.ten_mon LIKE '%chè%' 
                      OR m.ten_mon LIKE '%bánh%' OR m.ten_mon LIKE '%kem%')
                 AND m.ma_mon NOT IN (?)
                 ORDER BY RAND() LIMIT ?`,
                [dishIds, Math.min(2, remainingLimit)]
            );
            recommendations.push(...desserts.map(d => ({
                ...d,
                recommendation_type: 'pairing',
                reason: '🍮 Tráng miệng hoàn hảo sau bữa ăn'
            })));
            remainingLimit -= desserts.length;
        }
        
        // Gợi ý khai vị nếu chưa có
        if (remainingLimit > 0 && suggestedCategories.has('khai_vi')) {
            const [appetizers] = await db.query(
                `SELECT m.*, d.ten_danh_muc
                 FROM mon_an m
                 LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                 WHERE m.trang_thai = 1 
                 AND (d.ten_danh_muc LIKE '%khai vị%' OR m.ten_mon LIKE '%gỏi%' 
                      OR m.ten_mon LIKE '%cuốn%' OR m.ten_mon LIKE '%nem%')
                 AND m.ma_mon NOT IN (?)
                 ORDER BY RAND() LIMIT ?`,
                [dishIds, Math.min(2, remainingLimit)]
            );
            recommendations.push(...appetizers.map(d => ({
                ...d,
                recommendation_type: 'pairing',
                reason: '🥗 Khai vị ngon miệng'
            })));
        }
        
        } // Hết khối Fallback

        return recommendations.slice(0, limit);
    } catch (error) {
        console.error('Error getting pairing recommendations:', error.message);
        return [];
    }
}


// ==================== CHAT-BASED RECOMMENDATIONS ====================

/**
 * Gợi ý món dựa trên phân tích chat của user
 */
async function getChatBasedRecommendations(userId, limit = 5) {
    try {
        const chatAnalysis = await getUserChatAnalysis(userId);
        if (!chatAnalysis || chatAnalysis.topKeywords.length === 0) return [];
        
        // Lấy categories từ chat analysis
        const categories = chatAnalysis.categories;
        if (categories.length === 0) return [];
        
        // Map categories sang danh mục trong DB
        const categoryMapping = {
            'lau': '%lẩu%',
            'lau_mam': '%lẩu%',
            'lau_thai': '%lẩu%',
            'com': '%chính%',
            'bun': '%chính%',
            'pho': '%chính%',
            'mi': '%chính%',
            'tom': '%hải sản%',
            'ca': '%hải sản%',
            'hai_san': '%hải sản%',
            'nuong': '%nướng%',
            'trang_mieng': '%tráng miệng%',
            'nuoc_uong': '%uống%',
            'tra': '%uống%',
            'ca_phe': '%uống%'
        };
        
        // Tạo điều kiện tìm kiếm
        const searchPatterns = categories
            .map(c => categoryMapping[c])
            .filter(Boolean);
        
        if (searchPatterns.length === 0) return [];
        
        // Tìm món phù hợp với từ khóa chat
        const keywordPatterns = chatAnalysis.topKeywords
            .slice(0, 5)
            .map(k => `%${k.keyword}%`);
        
        let query = `
            SELECT DISTINCT m.*, d.ten_danh_muc, 
                   AVG(dg.so_sao) as avg_rating,
                   COUNT(dg.ma_danh_gia) as review_count
            FROM mon_an m
            LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
            LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
            WHERE m.trang_thai = 1 AND (
        `;
        
        const conditions = [];
        const params = [];
        
        // Tìm theo danh mục
        for (const pattern of searchPatterns) {
            conditions.push(`d.ten_danh_muc LIKE ?`);
            params.push(pattern);
        }
        
        // Tìm theo tên món
        for (const pattern of keywordPatterns) {
            conditions.push(`m.ten_mon LIKE ?`);
            params.push(pattern);
        }
        
        // Lấy các món user đã mua để loại trừ (chỉ tính đơn đã giao thành công)
        const [userOrders] = await db.query(
            `SELECT DISTINCT ct.ma_mon 
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             WHERE dh.ma_nguoi_dung = ? AND dh.trang_thai = 'delivered'`,
            [userId]
        );
        const userDishes = userOrders.map(o => o.ma_mon);

        query += conditions.join(' OR ') + `)`;
        
        if (userDishes.length > 0) {
            query += ` AND m.ma_mon NOT IN (?)`;
            params.push(userDishes);
        }
        
        query += `
            GROUP BY m.ma_mon
            ORDER BY avg_rating DESC, review_count DESC, m.ma_mon DESC
            LIMIT ?`;
        params.push(limit);
        
        const [recommendations] = await db.query(query, params);
        
        // Thêm lý do gợi ý khớp với từng món ăn cụ thể
        return recommendations.map(r => {
            const tenMonLower = r.ten_mon.toLowerCase();
            const matchedKw = chatAnalysis.topKeywords.find(k => {
                return tenMonLower.includes(k.keyword.toLowerCase());
            });
            
            const keywordToShow = matchedKw ? matchedKw.keyword : (chatAnalysis.topKeywords[0]?.keyword || 'sở thích');
            return {
                ...r,
                recommendation_type: 'chat_based',
                reason: `💬 Dựa trên cuộc trò chuyện của bạn về "${keywordToShow}"`
            };
        });
    } catch (error) {
        console.error('Error getting chat-based recommendations:', error.message);
        return [];
    }
}

// ==================== TRENDING & POPULAR ====================

const fs = require('fs');
const path = require('path');

function getPopularityWeights() {
    try {
        const weightsPath = path.join(__dirname, '../config/popularity-weights.json');
        if (fs.existsSync(weightsPath)) {
            return JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
        }
    } catch (e) {
        console.error('Lỗi đọc weights:', e);
    }
    // Default weights
    return { orders: 30, clicks: 20, views: 15, rating: 20, likes: 15 };
}

/**
 * Lấy món ăn đang trending (bán chạy gần đây)
 */
async function getTrendingDishes(limit = 5) {
    try {
        const [rawDishes] = await db.query(
            `SELECT m.*, d.ten_danh_muc, 
                    (SELECT COUNT(*) FROM chi_tiet_don_hang ct WHERE ct.ma_mon = m.ma_mon) as order_count,
                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as click_count,
                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as view_count,
                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as like_count,
                    (SELECT AVG(dg.so_sao) FROM danh_gia_san_pham dg WHERE dg.ma_mon = m.ma_mon AND dg.trang_thai = 'approved') as avg_rating
             FROM mon_an m
             LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
             WHERE m.trang_thai = 1`
        );
        
        const weights = getPopularityWeights();
        const wOrder = weights.orders || 30;
        const wClick = weights.clicks || 20;
        const wView = weights.views || 15;
        const wLike = weights.likes || 15;
        const wRating = weights.rating || 20;

        // Tính điểm phổ biến
        rawDishes.forEach(t => {
            const avgRating = parseFloat(t.avg_rating || 0);
            const orders = parseInt(t.order_count || 0);
            const clicks = parseInt(t.click_count || 0);
            const views = parseInt(t.view_count || 0);
            const likes = parseInt(t.like_count || 0);

            // Công thức điểm bao gồm click và view (stay > 50s)
            t.popularity_score = (orders * wOrder) + (clicks * wClick) + (views * wView) + (likes * wLike) + (avgRating * 20 * (wRating / 100));
        });

        // Sắp xếp giảm dần theo điểm và lấy top limit
        rawDishes.sort((a, b) => b.popularity_score - a.popularity_score || b.ma_mon - a.ma_mon);
        const trending = rawDishes.slice(0, limit);
        
        return trending.map(t => ({
            ...t,
            recommendation_type: 'trending',
            reason: '🔥 Đang được nhiều người đặt trong tuần này'
        }));
    } catch (error) {
        console.error('Error getting trending dishes:', error.message);
        return [];
    }
}

/**
 * Lấy món được đánh giá cao nhất
 */
async function getTopRatedDishes(limit = 5) {
    try {
        const [topRated] = await db.query(
            `SELECT m.*, d.ten_danh_muc,
                    AVG(dg.so_sao) as avg_rating,
                    COUNT(dg.ma_danh_gia) as review_count
             FROM mon_an m
             LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
             LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
             WHERE m.trang_thai = 1
             GROUP BY m.ma_mon
             HAVING review_count >= 1
             ORDER BY avg_rating DESC, review_count DESC, m.ma_mon DESC
             LIMIT ?`,
            [limit]
        );
        
        return topRated.map(t => ({
            ...t,
            recommendation_type: 'top_rated',
            reason: `⭐ Được đánh giá ${parseFloat(t.avg_rating || 0).toFixed(1)}/5 sao`
        }));
    } catch (error) {
        console.error('Error getting top rated dishes:', error.message);
        return [];
    }
}


// ==================== API ENDPOINTS ====================

/**
 * API: Gợi ý món mới ra mắt (≤ 30 ngày) phù hợp khẩu vị
 * GET /api/recommendations/new-dishes
 */
router.get('/new-dishes', async (req, res) => {
    try {
        const userId = getUserFromToken(req);
        const limit = parseInt(req.query.limit) || 5;
        
        const conn = await db.getConnection();
        
        try {
            // Lấy khẩu vị yêu thích của user từ NHIỀU NGUỒN
            let userFlavors = [];
            
            if (userId) {
                // NGUỒN 1: Sở thích khẩu vị được chọn trực tiếp (ưu tiên cao nhất)
                const [explicitPrefs] = await conn.query(
                    `SELECT DISTINCT kv.id, kv.ten_thuoc_tinh
                     FROM so_thich_khau_vi_nguoi_dung st
                     JOIN thuoc_tinh_khau_vi kv ON st.id_thuoc_tinh = kv.id
                     WHERE st.ma_nguoi_dung = ?`,
                    [userId]
                );
                
                if (explicitPrefs.length > 0) {
                    userFlavors = explicitPrefs;
                } else {
                    // NGUỒN 2: Lấy từ lịch sử đánh giá cao (≥4 sao)
                    const [ratingPrefs] = await conn.query(
                        `SELECT DISTINCT kv.id, kv.ten_thuoc_tinh
                         FROM danh_gia_san_pham dg
                         JOIN mon_an_khau_vi makv ON dg.ma_mon = makv.ma_mon
                         JOIN thuoc_tinh_khau_vi kv ON makv.id_thuoc_tinh = kv.id
                         WHERE dg.ma_nguoi_dung = ? AND dg.so_sao >= 4
                         LIMIT 5`,
                        [userId]
                    );
                    userFlavors = ratingPrefs;
                }
                
                if (userFlavors.length === 0) {
                    // NGUỒN 3: Lấy từ user_preference_profile (học máy)
                    const [mlPrefs] = await conn.query(
                        `SELECT tag_key, score FROM user_preference_profile 
                         WHERE ma_nguoi_dung = ? AND score >= 0.5`,
                        [userId]
                    );
                    
                    // Map tag_key sang id khẩu vị
                    const tagKeyToFlavorId = {
                        'cay': 1, 'chua': 2, 'man': 3, 'ngot': 4,
                        'an_chay': 5, 'thanh_mat': 6, 'thit_bo': 7,
                        'thit_ga': 7, 'hai_san': 8, 'chien': 9
                    };
                    
                    const flavorIds = mlPrefs
                        .map(p => tagKeyToFlavorId[p.tag_key])
                        .filter(id => id !== undefined);
                    
                    if (flavorIds.length > 0) {
                        const [mlFlavors] = await conn.query(
                            `SELECT DISTINCT id, ten_thuoc_tinh 
                             FROM thuoc_tinh_khau_vi WHERE id IN (?)`,
                            [flavorIds]
                        );
                        userFlavors = mlFlavors;
                    }
                }
            }
            
            let recommendations = [];
            
            if (userFlavors.length > 0) {
                // Có sở thích khẩu vị - lấy món mới phù hợp
                const flavorIds = userFlavors.map(f => f.id);
                
                const [newDishes] = await conn.query(
                    `SELECT DISTINCT
                        m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.ngay_tao,
                        d.ten_danh_muc,
                        DATEDIFF(NOW(), m.ngay_tao) as days_old,
                        GROUP_CONCAT(DISTINCT kv.ten_thuoc_tinh SEPARATOR ', ') as matched_flavors,
                        AVG(dg.so_sao) as avg_rating
                     FROM mon_an m
                     LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                     JOIN mon_an_khau_vi makv ON m.ma_mon = makv.ma_mon
                     JOIN thuoc_tinh_khau_vi kv ON makv.id_thuoc_tinh = kv.id
                     LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                     WHERE m.trang_thai = 1
                     AND DATEDIFF(NOW(), m.ngay_tao) <= 30
                     AND kv.id IN (?)
                     GROUP BY m.ma_mon
                     ORDER BY m.ngay_tao DESC, m.ma_mon DESC
                     LIMIT ?`,
                    [flavorIds, limit]
                );
                
                recommendations = newDishes.map(dish => ({
                    ...dish,
                    score: 0.85,
                    reason: `🆕 Món mới ra mắt, hợp khẩu vị của bạn (${dish.matched_flavors})`
                }));
            }
            
            // Nếu không đủ món hoặc không có lịch sử, lấy thêm món mới bất kỳ
            if (recommendations.length < limit) {
                const excludedIds = recommendations.map(r => r.ma_mon);
                const remainingLimit = limit - recommendations.length;
                
                let query = `
                    SELECT 
                        m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.ngay_tao,
                        d.ten_danh_muc,
                        DATEDIFF(NOW(), m.ngay_tao) as days_old,
                        AVG(dg.so_sao) as avg_rating
                    FROM mon_an m
                    LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                    LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                    WHERE m.trang_thai = 1
                    AND DATEDIFF(NOW(), m.ngay_tao) <= 30
                `;
                const params = [];
                
                if (excludedIds.length > 0) {
                    query += ` AND m.ma_mon NOT IN (?)`;
                    params.push(excludedIds);
                }
                
                query += ` GROUP BY m.ma_mon ORDER BY m.ngay_tao DESC, m.ma_mon DESC LIMIT ?`;
                params.push(remainingLimit);
                
                const [extraDishes] = await conn.query(query, params);
                
                extraDishes.forEach(dish => {
                    recommendations.push({
                        ...dish,
                        score: 0.85,
                        reason: `🆕 Món mới ra mắt (${dish.days_old} ngày trước)`
                    });
                });
            }
            
            conn.release();
            
            res.json({
                success: true,
                data: recommendations
            });
            
        } catch (error) {
            conn.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error getting new dish recommendations:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy gợi ý món mới' 
        });
    }
});

/**
 * API: Gợi ý tổng hợp cho user (trang chủ, thực đơn)
 * GET /api/recommendations
 */
router.get('/', async (req, res) => {
    try {
        const userId = getUserFromToken(req);
        const limit = parseInt(req.query.limit) || 50; // Tăng limit để có đủ món cho trang thực đơn
        // mode='homepage': chỉ trả content-based + collaborative (trang chủ đã có Top Bán Chạy riêng)
        // mode='menu' hoặc không truyền: trả đầy đủ 3 phương pháp (kể cả popularity fallback)
        const mode = req.query.mode || 'menu';
        
        let recommendations = [];
        let preferredFlavorIds = [];
        
        if (userId) {
            // 1. Lấy sở thích khẩu vị rõ ràng của người dùng (từ khảo sát/cold start)
            const [explicitPrefs] = await db.query(
                `SELECT id_thuoc_tinh FROM so_thich_khau_vi_nguoi_dung WHERE ma_nguoi_dung = ?`,
                [userId]
            );
            const explicitFlavorIds = explicitPrefs.map(p => p.id_thuoc_tinh);

            // 2. Thống kê hành vi click chuột từ DB (học ngầm sở thích dài hạn - Shopee style)
            let implicitFlavorIds = [];
            try {
                // Tính điểm hành vi có trọng số: like=5 (học ngay từ 1 lần thích), view=2, click=1
                // → 1 lần LIKE = học ngay khẩu vị của món đó
                // → 5 lần CLICK = học được
                const [implicitPrefs] = await db.query(`
                    SELECT mk.id_thuoc_tinh,
                           SUM(
                               CASE h.hanh_vi
                                   WHEN 'like'  THEN 5
                                   WHEN 'view'  THEN 2
                                   WHEN 'click' THEN 1
                                   ELSE 0
                               END
                           ) as weighted_score
                    FROM hanh_vi_nguoi_dung h
                    JOIN mon_an_khau_vi mk ON h.ma_mon = mk.ma_mon
                    WHERE h.ma_nguoi_dung = ? AND h.hanh_vi IN ('click', 'view', 'like')
                    GROUP BY mk.id_thuoc_tinh
                    HAVING weighted_score >= 5
                `, [userId]);
                implicitFlavorIds = implicitPrefs.map(p => p.id_thuoc_tinh);
            } catch (dbErr) {
                console.error('Error learning implicit flavor preferences:', dbErr.message);
            }

            // Gộp cả 2 nguồn sở thích (Khao sát + Học ngầm từ click DB)
            preferredFlavorIds = [...new Set([...explicitFlavorIds, ...implicitFlavorIds])];
            console.log(`🎯 [ML Preference Profile] User ${userId}: Explicit=[${explicitFlavorIds.join(',')}], Implicit Clicks=[${implicitFlavorIds.join(',')}]`);

            // User đã đăng nhập - sử dụng ML recommendations
            const [contentBased, chatBased, collaborative] = await Promise.all([
                getContentBasedRecommendations(userId, Math.ceil(limit * 0.4), preferredFlavorIds), // 40% từ sở thích (giảm từ 50%)
                getChatBasedRecommendations(userId, Math.ceil(limit * 0.2)),    // 20% từ chat
                getCollaborativeRecommendations(userId, Math.ceil(limit * 0.4)) // 40% từ collaborative (tăng từ 30%)
            ]);
            
            // Gán điểm ưu tiên (score) cho từng loại gợi ý
            contentBased.forEach((item, index) => {
                item.score = 100 - index;
            });
            
            chatBased.forEach((item, index) => {
                item.score = 89 - index;
            });
            
            // CẢI TIẾN: Tăng score của collaborative để cạnh tranh với content-based
            collaborative.forEach((item, index) => {
                item.score = 99 - index;  // Tăng từ 95 -> 99 để có thể xen kẽ với content-based
            });

            // ================================================================
            // XỬ LÝ BOOST KHẨU VỊ THEO PHIÊN TRUY CẬP (SESSION CLICK DETECT >= 5)
            // ================================================================
            let sessionBoostFlavors = [];
            if (req.query.session_boost_flavors) {
                sessionBoostFlavors = req.query.session_boost_flavors.split(',')
                    .map(id => parseInt(id.trim()))
                    .filter(id => !isNaN(id));
            }

            let directBoostedDishes = [];
            if (sessionBoostFlavors.length > 0) {
                try {
                    // 1. Lấy tất cả món ăn tương ứng với các khẩu vị được xem nhiều
                    const [boostedDishes] = await db.query(
                        `SELECT DISTINCT ma_mon FROM mon_an_khau_vi WHERE id_thuoc_tinh IN (?)`,
                        [sessionBoostFlavors]
                    );
                    const boostedDishSet = new Set(boostedDishes.map(d => d.ma_mon));
                    
                    contentBased.forEach(item => {
                        if (boostedDishSet.has(item.ma_mon)) {
                            item.score = (item.score || 0) + 200;
                            item.reason = `🔥 Phù hợp với món ăn bạn đang quan tâm lúc này`;
                        }
                    });
                    chatBased.forEach(item => {
                        if (boostedDishSet.has(item.ma_mon)) {
                            item.score = (item.score || 0) + 200;
                            item.reason = `🔥 Phù hợp với món ăn bạn đang quan tâm lúc này`;
                        }
                    });
                    collaborative.forEach(item => {
                        if (boostedDishSet.has(item.ma_mon)) {
                            item.score = (item.score || 0) + 200;
                            item.reason = `🔥 Phù hợp với món ăn bạn đang quan tâm lúc này`;
                        }
                    });

                    // 2. Truy vấn trực tiếp các món tiêu biểu của nhóm khẩu vị này để đưa trực tiếp vào
                    const [directDishes] = await db.query(`
                        SELECT m.*, d.ten_danh_muc, COALESCE(AVG(dg.so_sao), 0) as avg_rating,
                               GROUP_CONCAT(DISTINCT f.ten_thuoc_tinh SEPARATOR ', ') as flavor_names
                        FROM mon_an m
                        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                        JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
                        LEFT JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
                        LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                        WHERE m.trang_thai = 1 AND mk.id_thuoc_tinh IN (?)
                        GROUP BY m.ma_mon
                        ORDER BY avg_rating DESC, m.ma_mon DESC
                        LIMIT 10
                    `, [sessionBoostFlavors]);

                    directDishes.forEach((item, index) => {
                        item.score = 300 - index; // Điểm tuyệt đối cao nhất
                        item.recommendation_type = 'content_based';
                        item.reason = `🔥 Phù hợp với món ăn bạn đang quan tâm lúc này`;
                    });
                    directBoostedDishes = directDishes;
                } catch (boostErr) {
                    console.error('Error applying session flavor boost:', boostErr.message);
                }
            }
            
            // Lọc các đề xuất theo khẩu vị (kết hợp Khảo sát + Session Boost)
            const allowedFilterFlavors = [...new Set([...preferredFlavorIds, ...sessionBoostFlavors])];
            if (allowedFilterFlavors.length > 0) {
                // Lấy các món ăn có chứa khẩu vị được chọn
                const [flavorDishes] = await db.query(
                    `SELECT DISTINCT ma_mon FROM mon_an_khau_vi WHERE id_thuoc_tinh IN (?)`,
                    [allowedFilterFlavors]
                );
                const matchingDishIds = new Set(flavorDishes.map(fd => fd.ma_mon));
                
                const filteredContent = contentBased.filter(r => matchingDishIds.has(r.ma_mon));
                const filteredChat = chatBased.filter(r => matchingDishIds.has(r.ma_mon));
                
                const filteredCount = filteredContent.length + filteredChat.length + collaborative.length;
                console.log(`🎯 [Filter Debug] User ${userId}: filteredContent=${filteredContent.length}, filteredChat=${filteredChat.length}, collaborative=${collaborative.length}, total=${filteredCount}`);
                
                if (filteredCount < 15) {
                    if (mode === 'homepage') {
                        // Trang chủ: KHÔNG bổ sung popularity — đã có mục "Top Bán Chạy" riêng bên dưới
                        console.log(`ℹ️ [Recommendation] mode=homepage → chỉ trả content-based + collaborative, bỏ qua popularity fallback`);
                        recommendations = [
                            ...directBoostedDishes,
                            ...filteredContent,
                            ...filteredChat,
                            ...collaborative
                        ];
                    } else {
                        // Trang menu: bổ sung popularity-based để đủ số lượng hiển thị
                        console.log(`⚠️ [Recommendation] Chỉ có ${filteredCount} món sau khi lọc khẩu vị. Bổ sung bằng Popularity-based (mode=menu)...`);
                        const existingIds = new Set([
                            ...directBoostedDishes.map(r => r.ma_mon),
                            ...filteredContent.map(r => r.ma_mon),
                            ...filteredChat.map(r => r.ma_mon),
                            ...collaborative.map(r => r.ma_mon)
                        ]);
                        const [userPurchased] = await db.query(
                            `SELECT DISTINCT ct.ma_mon FROM chi_tiet_don_hang ct
                             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
                             WHERE dh.ma_nguoi_dung = ? AND dh.trang_thai = 'delivered'`,
                            [userId]
                        );
                        const purchasedIds = new Set(userPurchased.map(r => r.ma_mon));
                        const [allDishes] = await db.query(
                            `SELECT m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.trang_thai,
                                    d.ten_danh_muc,
                                    (SELECT COUNT(*) FROM chi_tiet_don_hang ct 
                                     JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
                                     WHERE ct.ma_mon = m.ma_mon AND dh.trang_thai = 'delivered') as order_count,
                                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as click_count,
                                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as view_count,
                                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as like_count,
                                    (SELECT AVG(so_sao) FROM danh_gia_san_pham dg WHERE dg.ma_mon = m.ma_mon AND dg.trang_thai = 'approved') as avg_rating
                             FROM mon_an m
                             LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                             WHERE m.trang_thai = 1`
                        );
                        const wts = getPopularityWeights();
                        const popularDishes = allDishes
                            .filter(d => !existingIds.has(d.ma_mon) && !purchasedIds.has(d.ma_mon))
                            .map(d => ({
                                ...d,
                                popularity_score: (parseInt(d.order_count || 0) * (wts.orders || 30))
                                    + (parseInt(d.click_count || 0) * (wts.clicks || 20))
                                    + (parseInt(d.view_count || 0) * (wts.views || 15))
                                    + (parseInt(d.like_count || 0) * (wts.likes || 15))
                                    + (parseFloat(d.avg_rating || 0) * 20 * ((wts.rating || 20) / 100))
                            }))
                            .filter(d => d.popularity_score > 0)
                            .sort((a, b) => b.popularity_score - a.popularity_score)
                            .slice(0, 15 - filteredCount)
                            .map(d => ({
                                ...d,
                                score: d.popularity_score * 0.5,
                                recommendation_type: 'popular',
                                reason: `🔥 Được nhiều người yêu thích (${d.order_count} đơn)`
                            }));
                        recommendations = [
                            ...directBoostedDishes,
                            ...filteredContent,
                            ...filteredChat,
                            ...collaborative,
                            ...popularDishes
                        ];
                    }
                } else {
                    recommendations = [...directBoostedDishes, ...filteredContent, ...filteredChat, ...collaborative];
                }
            } else {
                recommendations = [...directBoostedDishes, ...contentBased, ...chatBased, ...collaborative];
            }
            
            // 3.5 Lấy thêm món mới ra mắt (≤ 30 ngày)
            let newDishes = [];
            try {
                if (preferredFlavorIds.length > 0) {
                    const [res] = await db.query(`
                        SELECT DISTINCT
                            m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.ngay_tao,
                            d.ten_danh_muc,
                            DATEDIFF(NOW(), m.ngay_tao) as days_old,
                            GROUP_CONCAT(DISTINCT kv.ten_thuoc_tinh SEPARATOR ', ') as matched_flavors,
                            COALESCE((SELECT AVG(so_sao) FROM danh_gia_san_pham dg WHERE dg.ma_mon = m.ma_mon AND dg.trang_thai = 'approved'), 0) as avg_rating
                        FROM mon_an m
                        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                        JOIN mon_an_khau_vi makv ON m.ma_mon = makv.ma_mon
                        JOIN thuoc_tinh_khau_vi kv ON makv.id_thuoc_tinh = kv.id
                        WHERE m.trang_thai = 1
                        AND DATEDIFF(NOW(), m.ngay_tao) <= 30
                        AND kv.id IN (?)
                        GROUP BY m.ma_mon
                        ORDER BY m.ngay_tao DESC, m.ma_mon DESC
                        LIMIT 5
                    `, [preferredFlavorIds]);
                    newDishes = res.map(dish => ({
                        ...dish,
                        score: 90, // Hạ từ 98 xuống 90 để không đẩy mất món gợi ý cá nhân hóa
                        recommendation_type: 'content_based',
                        reason: `🆕 Món mới ra mắt, hợp khẩu vị của bạn (${dish.matched_flavors})`
                    }));
                }
                
                // Nếu chưa đủ, lấy thêm món mới chung nhưng PHẢI khớp khẩu vị người dùng (nếu đã đăng nhập)
                if (newDishes.length < 5) {
                    const excludedIds = newDishes.map(r => r.ma_mon);
                    const remainingNewLimit = 5 - newDishes.length;
                    
                    let query = `
                        SELECT 
                            m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.ngay_tao,
                            d.ten_danh_muc,
                            DATEDIFF(NOW(), m.ngay_tao) as days_old,
                            COALESCE((SELECT AVG(so_sao) FROM danh_gia_san_pham dg WHERE dg.ma_mon = m.ma_mon AND dg.trang_thai = 'approved'), 0) as avg_rating,
                            GROUP_CONCAT(DISTINCT kv.ten_thuoc_tinh SEPARATOR ', ') as matched_flavors
                        FROM mon_an m
                        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                        JOIN mon_an_khau_vi makv ON m.ma_mon = makv.ma_mon
                        JOIN thuoc_tinh_khau_vi kv ON makv.id_thuoc_tinh = kv.id
                        WHERE m.trang_thai = 1
                        AND DATEDIFF(NOW(), m.ngay_tao) <= 30
                    `;
                    const params = [];
                    if (preferredFlavorIds.length > 0) {
                        query += ` AND kv.id IN (?)`;
                        params.push(preferredFlavorIds);
                    }
                    if (excludedIds.length > 0) {
                        query += ` AND m.ma_mon NOT IN (?)`;
                        params.push(excludedIds);
                    }
                    query += ` GROUP BY m.ma_mon ORDER BY m.ngay_tao DESC, m.ma_mon DESC LIMIT ?`;
                    params.push(remainingNewLimit);
                    
                    const [generalNewDishes] = await db.query(query, params);
                    generalNewDishes.forEach(dish => {
                        newDishes.push({
                            ...dish,
                            score: 89, 
                            recommendation_type: 'content_based',
                            reason: `🆕 Món mới ra mắt, hợp khẩu vị của bạn (${dish.matched_flavors || 'Khẩu vị yêu thích'})`
                        });
                    });
                }
            } catch (newDishesErr) {
                console.error('Error fetching new dishes in recommendations:', newDishesErr.message);
            }
            
            recommendations.push(...newDishes);
            
            // Loại trùng lặp (giữ item có score cao nhất)
            const seen = new Set();
            recommendations = recommendations.filter(r => {
                if (seen.has(r.ma_mon)) return false;
                seen.add(r.ma_mon);
                return true;
            });
            
            console.log(`✨ [Recommendation] User ${userId}: ${contentBased.length} content-based, ${chatBased.length} chat-based, ${collaborative.length} collaborative. Total (deduped): ${recommendations.length} recommendations.`);
            
            // Nếu không đủ, bổ sung các món khác phù hợp khẩu vị của người dùng
            if (recommendations.length < limit && preferredFlavorIds.length > 0) {
                const excludedIds = recommendations.map(r => r.ma_mon);
                const query = `
                    SELECT m.*, d.ten_danh_muc, AVG(dg.so_sao) as avg_rating,
                           GROUP_CONCAT(DISTINCT f.ten_thuoc_tinh SEPARATOR ', ') as flavor_names
                    FROM mon_an m
                    LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                    JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
                    LEFT JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
                    LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                    WHERE m.trang_thai = 1 AND mk.id_thuoc_tinh IN (?) ${excludedIds.length > 0 ? 'AND m.ma_mon NOT IN (?)' : ''}
                    GROUP BY m.ma_mon
                    ORDER BY 
                        (CASE WHEN DATEDIFF(NOW(), m.ngay_tao) <= 30 THEN 1 ELSE 0 END) DESC,
                        m.ma_mon DESC,
                        COALESCE(avg_rating, 0) DESC
                    LIMIT ?
                `;
                const params = excludedIds.length > 0 
                    ? [preferredFlavorIds, excludedIds, limit - recommendations.length]
                    : [preferredFlavorIds, limit - recommendations.length];
                
                const [extraDishes] = await db.query(query, params);
                if (extraDishes.length > 0) {
                    extraDishes.forEach((item, index) => {
                        item.score = 85 - index; // Tăng từ 69 lên 85 để vượt qua bộ lọc >= 70 của frontend
                        item.recommendation_type = 'content_based';
                        item.reason = `Phù hợp với khẩu vị của bạn (${item.flavor_names || 'Khẩu vị yêu thích'})`;
                    });
                    recommendations.push(...extraDishes);
                }
            }

            // Nếu vẫn không đủ (hoặc không có sở thích rõ ràng), bổ sung trending
            if (recommendations.length < limit) {
                const excludedIds = recommendations.map(r => r.ma_mon);
                const trendingLimit = limit - recommendations.length;
                
                let trending = [];
                if (preferredFlavorIds.length > 0) {
                    const query = `
                        SELECT m.*, d.ten_danh_muc, COUNT(ct.ma_ct_don) as order_count, AVG(dg.so_sao) as avg_rating,
                               GROUP_CONCAT(DISTINCT f.ten_thuoc_tinh SEPARATOR ', ') as flavor_names
                        FROM mon_an m
                        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                        JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
                        LEFT JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
                        LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
                        LEFT JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang AND dh.thoi_gian_tao >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND dh.trang_thai = 'delivered'
                        LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                        WHERE m.trang_thai = 1 AND mk.id_thuoc_tinh IN (?) ${excludedIds.length > 0 ? 'AND m.ma_mon NOT IN (?)' : ''}
                        GROUP BY m.ma_mon
                        ORDER BY order_count DESC, avg_rating DESC, m.ma_mon DESC
                        LIMIT ?
                    `;
                    const params = excludedIds.length > 0 ? [preferredFlavorIds, excludedIds, trendingLimit] : [preferredFlavorIds, trendingLimit];
                    const [res] = await db.query(query, params);
                    trending = res.map(t => ({
                        ...t,
                        reason: `Phù hợp với khẩu vị của bạn (${t.flavor_names || 'Khẩu vị yêu thích'})`
                    }));
                }
                
                // Nếu vẫn thiếu, lấy thêm trending nhưng PHẢI khớp khẩu vị người dùng
                if (trending.length < trendingLimit) {
                    const finalTrendingLimit = trendingLimit - trending.length;
                    const finalExcludedIds = [...excludedIds, ...trending.map(t => t.ma_mon)];
                    let query = `
                        SELECT m.*, d.ten_danh_muc, COUNT(ct.ma_ct_don) as order_count, AVG(dg.so_sao) as avg_rating,
                               GROUP_CONCAT(DISTINCT f.ten_thuoc_tinh SEPARATOR ', ') as flavor_names
                        FROM mon_an m
                        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                        JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
                        LEFT JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
                        LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
                        LEFT JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang AND dh.thoi_gian_tao >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND dh.trang_thai = 'delivered'
                        LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                        WHERE m.trang_thai = 1
                    `;
                    const params = [];
                    if (preferredFlavorIds.length > 0) {
                        query += ` AND mk.id_thuoc_tinh IN (?)`;
                        params.push(preferredFlavorIds);
                    }
                    if (finalExcludedIds.length > 0) {
                        query += ` AND m.ma_mon NOT IN (?)`;
                        params.push(finalExcludedIds);
                    }
                    query += ` GROUP BY m.ma_mon ORDER BY order_count DESC, avg_rating DESC, m.ma_mon DESC LIMIT ?`;
                    params.push(finalTrendingLimit);

                    const [res] = await db.query(query, params);
                    const matchedTrending = res.map(t => ({
                        ...t,
                        recommendation_type: 'content_based',
                        reason: `Phù hợp với khẩu vị của bạn (${t.flavor_names || 'Khẩu vị yêu thích'})`
                    }));
                    trending.push(...matchedTrending);
                }

                trending.forEach((item, index) => {
                    if (item.reason && item.reason.includes('khẩu vị')) {
                        item.score = 80 - index; // Boost flavor matching trending dishes above 70
                    } else {
                        item.score = 59 - index;
                    }
                    if (!item.recommendation_type) {
                        item.recommendation_type = 'trending';
                        item.reason = '🔥 Đang được nhiều người đặt trong tuần này';
                    }
                });
                recommendations.push(...trending);
            }
        } else {
            // Guest - hiển thị trending, top rated và món mới ra mắt chung
            const [trending, topRated] = await Promise.all([
                getTrendingDishes(Math.ceil(limit / 2)),
                getTopRatedDishes(Math.floor(limit / 2))
            ]);
            
            // Lấy thêm món mới chung cho guest
            let generalNewDishesForGuest = [];
            try {
                const [res] = await db.query(`
                    SELECT 
                        m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.ngay_tao,
                        d.ten_danh_muc,
                        DATEDIFF(NOW(), m.ngay_tao) as days_old,
                        COALESCE((SELECT AVG(so_sao) FROM danh_gia_san_pham dg WHERE dg.ma_mon = m.ma_mon AND dg.trang_thai = 'approved'), 0) as avg_rating
                    FROM mon_an m
                    LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                    WHERE m.trang_thai = 1
                    AND DATEDIFF(NOW(), m.ngay_tao) <= 30
                    GROUP BY m.ma_mon
                    ORDER BY m.ngay_tao DESC, m.ma_mon DESC
                    LIMIT 5
                `);
                generalNewDishesForGuest = res.map(dish => ({
                    ...dish,
                    score: 45, // Điểm cao hơn top rated (30) và gần bằng trending (50)
                    recommendation_type: 'trending',
                    reason: `🆕 Món mới ra mắt (${dish.days_old} ngày trước)`
                }));
            } catch (newDishesGuestErr) {
                console.error('Error fetching new dishes for guest:', newDishesGuestErr.message);
            }

            trending.forEach((item, index) => {
                item.score = 50 - index;
            });
            
            topRated.forEach((item, index) => {
                item.score = 30 - index;
            });
            
            recommendations = [...trending, ...generalNewDishesForGuest, ...topRated];
        }
        
        // Loại bỏ trùng lặp (giữ món có score cao hơn)
        const uniqueRecommendationsMap = new Map();
        for (const rec of recommendations) {
            const existing = uniqueRecommendationsMap.get(rec.ma_mon);
            if (!existing || rec.score > existing.score) {
                uniqueRecommendationsMap.set(rec.ma_mon, rec);
            }
        }
        
        let uniqueRecommendations = Array.from(uniqueRecommendationsMap.values());
        
        // --- BỘ LỌC TOÀN CỤC: LOẠI BỎ CÁC MÓN KHÁCH ĐÃ MUA ---
        if (userId) {
            try {
                const [userOrders] = await db.query(
                    `SELECT DISTINCT ct.ma_mon 
                     FROM chi_tiet_don_hang ct
                     JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
                     WHERE dh.ma_nguoi_dung = ?`,
                    [userId]
                );
                const userDishesSet = new Set(userOrders.map(o => String(o.ma_mon)));
                console.log(`[GlobalFilter] User ${userId} dishes:`, Array.from(userDishesSet));
                console.log(`[GlobalFilter] Recommendations before filter:`, uniqueRecommendations.map(r => r.ma_mon));
                
                // Lọc bỏ tất cả những món nằm trong danh sách đã mua (cast to string để tránh lỗi type mismatch)
                uniqueRecommendations = uniqueRecommendations.filter(rec => !userDishesSet.has(String(rec.ma_mon)));
                console.log(`[GlobalFilter] Recommendations after filter:`, uniqueRecommendations.map(r => r.ma_mon));
            } catch (filterErr) {
                console.error('Lỗi khi lọc món đã mua toàn cục:', filterErr.message);
            }
        }
        
        // --- CƠ CHẾ PHÂN BỔ HẠN NGẠCH (QUOTA) & LẤY LUÂN PHIÊN ---
        // Chia nhóm các món ăn
        const groups = {
            collaborative: [],
            content_based: [], // Món mới hợp khẩu vị
            chat_based: [],
            trending: [],      // Bao gồm cả trending và top_rated
        };

        uniqueRecommendations.forEach(rec => {
            const type = rec.recommendation_type;
            if (groups[type]) {
                groups[type].push(rec);
            } else if (type === 'top_rated') {
                groups.trending.push(rec);
            } else {
                groups.trending.push(rec); // Fallback
            }
        });

        // Sắp xếp từng nhóm theo điểm giảm dần
        for (const key in groups) {
            groups[key].sort((a, b) => (b.score || 0) - (a.score || 0));
        }

        // Bốc theo hạn ngạch: 3/8 Collaborative, 3/8 Content-based, 2/8 Chat-based. 
        // Thay vì fix cứng 3-3-2, chúng ta nhân tỷ lệ với tham số limit để khi UI (như trang Thực Đơn) yêu cầu hiển thị đầy đủ (limit=100) thì hệ thống vẫn trả về đủ.
        const quotas = {
            collaborative: Math.ceil((3 / 8) * limit),
            content_based: Math.ceil((3 / 8) * limit),
            chat_based: Math.ceil((2 / 8) * limit)
        };

        let finalRecommendations = [];
        
        // 1. Lấy đủ hạn ngạch cho các nhóm chính
        for (const type of ['collaborative', 'content_based', 'chat_based']) {
            const takeCount = Math.min(quotas[type], groups[type].length);
            finalRecommendations.push(...groups[type].slice(0, takeCount));
        }

        // 2. Nếu vẫn chưa đủ limit (ví dụ 8), điền đầy bằng các nhóm phụ
        let missing = limit - finalRecommendations.length;
        
        // Ưu tiên bù bằng các món còn dư ở các nhóm chính (nếu có dư)
        if (missing > 0) {
            const remainingPool = [
                ...groups.collaborative.slice(quotas.collaborative),
                ...groups.content_based.slice(quotas.content_based),
                ...groups.chat_based.slice(quotas.chat_based)
            ].sort((a, b) => b.score - a.score);

            const takeRemaining = Math.min(missing, remainingPool.length);
            finalRecommendations.push(...remainingPool.slice(0, takeRemaining));
            missing -= takeRemaining;
        }

        // 3. Nếu vẫn thiếu (đặc biệt khi user đã mua nhiều), lấy thêm món khớp khẩu vị của user từ DB
        if (missing > 0 && userId && preferredFlavorIds.length > 0) {
            try {
                const excludedIds = finalRecommendations.map(r => r.ma_mon);
                // Lấy danh sách món đã mua để loại trừ tiếp
                const [userOrders] = await db.query(
                    `SELECT DISTINCT ct.ma_mon 
                     FROM chi_tiet_don_hang ct
                     JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
                     WHERE dh.ma_nguoi_dung = ?`,
                    [userId]
                );
                const purchasedIds = userOrders.map(o => o.ma_mon);
                const finalExcluded = [...new Set([...excludedIds, ...purchasedIds])];

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

                const [extraFlavorDishes] = await db.query(query, params);
                if (extraFlavorDishes.length > 0) {
                    extraFlavorDishes.forEach((item, index) => {
                        item.score = 70 - index;
                        item.recommendation_type = 'content_based';
                        item.reason = `Hợp khẩu vị của bạn (${item.flavor_names || 'Khẩu vị yêu thích'})`;
                        finalRecommendations.push(item);
                    });
                    missing -= extraFlavorDishes.length;
                }
            } catch (dbErr) {
                console.error('Error filling missing quota with database query:', dbErr.message);
            }
        }

        // 4. Bù tiếp bằng Trending (nếu vẫn thiếu và không lọc trùng được)
        if (missing > 0) {
            let allowedTrending = groups.trending;
            if (userId) {
                // Nếu đã đăng nhập, chỉ cho phép bù bằng những món khớp khẩu vị (đã được dán nhãn content_based hoặc khớp preferred flavor)
                allowedTrending = groups.trending.filter(t => {
                    const isContentBased = t.recommendation_type === 'content_based';
                    const hasReasonFlavor = t.reason && t.reason.includes('khẩu vị');
                    return isContentBased || hasReasonFlavor;
                });
            }
            const takeTrending = Math.min(missing, allowedTrending.length);
            finalRecommendations.push(...allowedTrending.slice(0, takeTrending));
            missing -= takeTrending;
        }

        // 4. Trộn ngẫu nhiên (Shuffle) kết quả để hiển thị đa dạng, không bị cứng nhắc theo điểm
        // (Khách sẽ thấy các loại xen kẽ với nhau)
        for (let i = finalRecommendations.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [finalRecommendations[i], finalRecommendations[j]] = [finalRecommendations[j], finalRecommendations[i]];
        }
        
        // Cập nhật lại limit
        const finalLimitedRecommendations = finalRecommendations.slice(0, limit);
        
        res.json({
            success: true,
            data: finalLimitedRecommendations,
            meta: {
                user_logged_in: !!userId,
                total: finalLimitedRecommendations.length,
                breakdown: {
                    content_based: recommendations.filter(r => r.recommendation_type === 'content_based').length,
                    chat_based: recommendations.filter(r => r.recommendation_type === 'chat_based').length,
                    collaborative: recommendations.filter(r => r.recommendation_type === 'collaborative').length,
                    trending: recommendations.filter(r => r.recommendation_type === 'trending').length
                }
            }
        });
    } catch (error) {
        console.error('Error getting recommendations:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lấy gợi ý' });
    }
});

/**
 * API: Lưu sở thích người dùng (Cold Start)
 * POST /api/recommendations/preferences
 */
// API: Lưu cấu hình sở thích (sau khi sửa popup -> Lưu Khẩu Vị)
router.post('/preferences', async (req, res) => {
    try {
        const userId = getUserFromToken(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { flavorIds } = req.body; 
        
        // 1. Lưu khẩu vị
        if (flavorIds && Array.isArray(flavorIds) && flavorIds.length > 0) {
            await db.query('DELETE FROM so_thich_khau_vi_nguoi_dung WHERE ma_nguoi_dung = ?', [userId]);
            const values = flavorIds.map(fid => [userId, fid]);
            await db.query('INSERT IGNORE INTO so_thich_khau_vi_nguoi_dung (ma_nguoi_dung, id_thuoc_tinh) VALUES ?', [values]);
        }

        res.json({ success: true, message: 'Lưu cấu hình cá nhân hóa thành công' });
    } catch (error) {
        console.error('Error saving preferences:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

/**
 * API: Kiểm tra xem người dùng đã thiết lập sở thích chưa
 * GET /api/recommendations/check-preferences
 */
router.get('/check-preferences', async (req, res) => {
    try {
        const userId = getUserFromToken(req);
        if (!userId) return res.json({ success: true, hasPreferences: false }); // Guest

        // BẮT BUỘC TẤT CẢ USER LÀM LẠI KHẢO SÁT THEO KHẨU VỊ (Check bảng mới)
        const [flavorRows] = await db.query(
            'SELECT COUNT(*) as count FROM so_thich_khau_vi_nguoi_dung WHERE ma_nguoi_dung = ?',
            [userId]
        );
        
        const hasPrefs = flavorRows[0].count > 0;
        res.json({ success: true, hasPreferences: hasPrefs });
    } catch (error) {
        console.error('Error checking preferences:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

/**
 * API: Gợi ý món kèm theo (cho giỏ hàng, thanh toán)
 * POST /api/recommendations/pairing
 * Body: { dish_ids: [1, 2, 3] }
 */
router.post('/pairing', async (req, res) => {
    try {
        const { dish_ids } = req.body;
        
        if (!dish_ids || !Array.isArray(dish_ids) || dish_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp danh sách món ăn'
            });
        }
        
        const recommendations = await getPairingRecommendations(dish_ids, 4);
        
        res.json({
            success: true,
            data: recommendations,
            meta: {
                cart_items: dish_ids.length,
                suggestions: recommendations.length
            }
        });
    } catch (error) {
        console.error('Error getting pairing recommendations:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lấy gợi ý kết hợp' });
    }
});

/**
 * API: Gợi ý cho chatbot (dựa trên tin nhắn hiện tại)
 * POST /api/recommendations/chat
 * Body: { message: "tôi muốn ăn lẩu" }
 */
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const userId = getUserFromToken(req);
        
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp tin nhắn'
            });
        }
        
        // Phân tích tin nhắn
        const analysis = analyzeMessage(message);
        
        // Nếu không có từ khóa liên quan đến món ăn
        if (analysis.categories.length === 0 && !analysis.intents.asking_menu && !analysis.intents.asking_recommendation) {
            return res.json({
                success: true,
                data: [],
                meta: { has_food_intent: false }
            });
        }
        
        // Tìm món phù hợp với từ khóa
        let recommendations = [];
        
        if (analysis.keywords.length > 0) {
            const keywordPatterns = analysis.keywords.map(k => `%${k}%`);
            
            let query = `
                SELECT m.*, d.ten_danh_muc, AVG(dg.so_sao) as avg_rating
                FROM mon_an m
                LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon
                WHERE m.trang_thai = 1 AND (
            `;
            
            const conditions = keywordPatterns.map(() => `m.ten_mon LIKE ? OR d.ten_danh_muc LIKE ?`);
            query += conditions.join(' OR ') + `)
                GROUP BY m.ma_mon
                ORDER BY avg_rating DESC, m.ma_mon DESC
                LIMIT 5`;
            
            const params = keywordPatterns.flatMap(p => [p, p]);
            const [dishes] = await db.query(query, params);
            
            recommendations = dishes.map(d => ({
                ...d,
                recommendation_type: 'chat_instant',
                reason: `Phù hợp với "${analysis.keywords[0]}"`
            }));
        }
        
        // Nếu không tìm thấy, gợi ý trending
        if (recommendations.length === 0) {
            recommendations = await getTrendingDishes(3);
        }
        
        res.json({
            success: true,
            data: recommendations,
            meta: {
                keywords: analysis.keywords,
                categories: analysis.categories,
                intents: analysis.intents,
                has_food_intent: true
            }
        });
    } catch (error) {
        console.error('Error getting chat recommendations:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lấy gợi ý' });
    }
});

/**
 * API: Phân tích sở thích user từ chat history
 * GET /api/recommendations/user-profile
 */
router.get('/user-profile', async (req, res) => {
    try {
        const userId = getUserFromToken(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập'
            });
        }
        
        const chatAnalysis = await getUserChatAnalysis(userId);
        
        // Lấy thêm thông tin mua hàng
        const [purchaseStats] = await db.query(
            `SELECT d.ten_danh_muc, COUNT(*) as count, SUM(ct.so_luong) as total_qty
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             JOIN mon_an m ON ct.ma_mon = m.ma_mon
             LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
             WHERE dh.ma_nguoi_dung = ?
             GROUP BY d.ma_danh_muc
             ORDER BY count DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            data: {
                chat_analysis: chatAnalysis,
                purchase_preferences: purchaseStats,
                profile_summary: {
                    favorite_keywords: chatAnalysis?.topKeywords?.slice(0, 5) || [],
                    favorite_categories: purchaseStats.slice(0, 3).map(p => p.ten_danh_muc),
                    total_chat_messages: chatAnalysis?.totalMessages || 0
                }
            }
        });
    } catch (error) {
        console.error('Error getting user profile:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lấy thông tin' });
    }
});

/**
 * API: Lấy trending dishes
 * GET /api/recommendations/trending
 */
router.get('/trending', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const trending = await getTrendingDishes(limit);
        
        res.json({
            success: true,
            data: trending
        });
    } catch (error) {
        console.error('Error getting trending:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lấy món trending' });
    }
});

/**
 * API: Lấy top rated dishes
 * GET /api/recommendations/top-rated
 */
router.get('/top-rated', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const topRated = await getTopRatedDishes(limit);
        
        res.json({
            success: true,
            data: topRated
        });
    } catch (error) {
        console.error('Error getting top rated:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lấy món đánh giá cao' });
    }
});

/**
 * API: Lưu interaction để cải thiện ML model
 * POST /api/recommendations/track
 * Body: { dish_id, action: 'view'|'add_cart'|'purchase'|'like' }
 */
router.post('/track', async (req, res) => {
    try {
        const userId = getUserFromToken(req);
        const { dish_id, action } = req.body;
        
        if (!dish_id || !action) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin'
            });
        }
        
        let isLiked = false;
        
        // Lưu vào bảng hanh_vi_nguoi_dung để phân tích
        try {
            let dbAction = 'view';
            if (action === 'click') {
                dbAction = 'click';
            } else if (action === 'like') {
                dbAction = 'like';
            } else if (action === 'add_cart' || action === 'add_to_cart') {
                dbAction = 'add_to_cart';
            } else if (action === 'purchase') {
                dbAction = 'purchase';
            }

            // Nếu là hành vi 'like' và người dùng đã đăng nhập, thực hiện Toggle Like
            if (dbAction === 'like' && userId) {
                const [existing] = await db.query(
                    `SELECT id FROM hanh_vi_nguoi_dung WHERE ma_nguoi_dung = ? AND ma_mon = ? AND hanh_vi = 'like'`,
                    [userId, dish_id]
                );
                
                if (existing.length > 0) {
                    await db.query(
                        `DELETE FROM hanh_vi_nguoi_dung WHERE ma_nguoi_dung = ? AND ma_mon = ? AND hanh_vi = 'like'`,
                        [userId, dish_id]
                    );
                    console.log(`📊 [DB Track] Removed like (unlike): user=${userId}, dish=${dish_id}`);
                    isLiked = false;
                } else {
                    await db.query(
                        `INSERT INTO hanh_vi_nguoi_dung (ma_nguoi_dung, ma_mon, hanh_vi, thoi_gian) VALUES (?, ?, 'like', NOW())`,
                        [userId, dish_id]
                    );
                    console.log(`📊 [DB Track] Recorded like: user=${userId}, dish=${dish_id}`);
                    isLiked = true;
                }
            } else {
                await db.query(
                    `INSERT INTO hanh_vi_nguoi_dung (ma_nguoi_dung, ma_mon, hanh_vi, thoi_gian) VALUES (?, ?, ?, NOW())`,
                    [userId || null, dish_id, dbAction]
                );
                console.log(`📊 [DB Track] Recorded interaction: user=${userId}, dish=${dish_id}, action=${dbAction}`);
                if (dbAction === 'like') isLiked = true;
            }
        } catch (dbErr) {
            console.error('Error inserting click tracking to DB:', dbErr.message);
        }
        
        res.json({ success: true, isLiked });
    } catch (error) {
        console.error('Error tracking:', error.message);
        res.status(500).json({ success: false });
    }
});

/**
 * API: Kiểm tra trạng thái thích món ăn của người dùng
 * GET /api/recommendations/like-status/:dishId
 */
router.get('/like-status/:dishId', async (req, res) => {
    try {
        const userId = getUserFromToken(req);
        const { dishId } = req.params;
        
        if (!userId) {
            return res.json({ success: true, isLiked: false });
        }
        
        const [rows] = await db.query(
            `SELECT COUNT(*) as count FROM hanh_vi_nguoi_dung WHERE ma_nguoi_dung = ? AND ma_mon = ? AND hanh_vi = 'like'`,
            [userId, dishId]
        );
        
        res.json({ success: true, isLiked: rows[0].count > 0 });
    } catch (error) {
        console.error('Error checking like status:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi kiểm tra trạng thái thích' });
    }
});

/**
 * API: Lấy thống kê sở thích người dùng (Admin)
 * GET /api/recommendations/admin/stats
 */
router.get('/admin/stats', async (req, res) => {
    try {
        // Kiểm tra quyền truy cập (Admin hoặc Staff)
        if ((!req.session || !req.session.admin) && (!req.session || !req.session.staff)) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - Admin or Staff only'
            });
        }

        const preferenceService = require('../services/preferenceService');

        // 1. Thống kê Khẩu vị được yêu thích (Explicit)
        const [categories] = await db.query(`
            SELECT f.id as ma_danh_muc, f.ten_thuoc_tinh as ten_danh_muc, COUNT(s.ma_nguoi_dung) as total_users
            FROM thuoc_tinh_khau_vi f
            LEFT JOIN so_thich_khau_vi_nguoi_dung s ON f.id = s.id_thuoc_tinh
            GROUP BY f.id, f.ten_thuoc_tinh
            ORDER BY total_users DESC
        `);

        // 2. Thống kê Từ khóa / Khẩu vị phổ biến từ món đã đặt (Implicit)
        const [dishKeywords] = await db.query(`
            SELECT m.ten_mon, COUNT(ct.ma_ct_don) as total_orders
            FROM chi_tiet_don_hang ct
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            GROUP BY m.ma_mon, m.ten_mon
        `);

        const keywordStats = {};
        for (const row of dishKeywords) {
            for (const tag of preferenceService.TAG_DEFINITIONS) {
                const text = preferenceService.normalizeText(row.ten_mon);
                const synonyms = tag.synonyms.map(preferenceService.normalizeText).filter(Boolean);
                const isMatched = synonyms.some(phrase => {
                    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(text);
                });
                if (isMatched) {
                    keywordStats[tag.label] = (keywordStats[tag.label] || 0) + Number(row.total_orders || 0);
                }
            }
        }

        const keywordsList = Object.entries(keywordStats)
            .map(([keyword, total_orders]) => ({ keyword, total_orders }))
            .sort((a, b) => b.total_orders - a.total_orders)
            .slice(0, 10);

        // 3. Sở thích từ đánh giá (Positive & Negative Preference Tags)
        const { positiveTags, negativeTags } = await preferenceService.getAdminPreferenceStats(20);

        // 4. Danh sách hồ sơ Khẩu vị khách hàng
        const [users] = await db.query(`
            SELECT 
                n.ma_nguoi_dung, 
                n.ten_nguoi_dung as ho_ten, 
                n.so_dien_thoai,
                GROUP_CONCAT(DISTINCT f.ten_thuoc_tinh SEPARATOR ', ') as ten_danh_muc_thich,
                COUNT(DISTINCT dh.ma_don_hang) as total_orders,
                COALESCE(SUM(dh.tong_tien), 0) as total_spent
            FROM nguoi_dung n
            LEFT JOIN so_thich_khau_vi_nguoi_dung s ON n.ma_nguoi_dung = s.ma_nguoi_dung
            LEFT JOIN thuoc_tinh_khau_vi f ON s.id_thuoc_tinh = f.id
            LEFT JOIN don_hang dh ON n.ma_nguoi_dung = dh.ma_nguoi_dung AND dh.trang_thai = 'delivered'
            GROUP BY n.ma_nguoi_dung, n.ten_nguoi_dung, n.so_dien_thoai
            ORDER BY total_orders DESC, total_spent DESC
            LIMIT 50
        `);

        if (users.length > 0) {
            const userIds = users.map(u => u.ma_nguoi_dung);
            const profiles = await preferenceService.getProfilesForUsers(userIds);
            
            // Lấy món ăn được click nhiều nhất cho từng user
            let userTopDishes = {};
            let userTopFlavors = {};
            
            try {
                const [topDishClicksRows] = await db.query(`
                    SELECT h.ma_nguoi_dung, m.ten_mon, COUNT(h.id) as click_count
                    FROM hanh_vi_nguoi_dung h
                    JOIN mon_an m ON h.ma_mon = m.ma_mon
                    WHERE h.ma_nguoi_dung IN (?) AND h.hanh_vi IN ('click', 'view', 'like')
                    GROUP BY h.ma_nguoi_dung, m.ma_mon, m.ten_mon
                `, [userIds]);

                // Lấy khẩu vị được click nhiều nhất cho từng user
                const [topFlavorClicksRows] = await db.query(`
                    SELECT h.ma_nguoi_dung, f.ten_thuoc_tinh, COUNT(h.id) as click_count
                    FROM hanh_vi_nguoi_dung h
                    JOIN mon_an_khau_vi mk ON h.ma_mon = mk.ma_mon
                    JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
                    WHERE h.ma_nguoi_dung IN (?) AND h.hanh_vi IN ('click', 'view', 'like')
                    GROUP BY h.ma_nguoi_dung, f.id, f.ten_thuoc_tinh
                `, [userIds]);

                // Nhóm dữ liệu theo ma_nguoi_dung
                topDishClicksRows.forEach(row => {
                    if (!userTopDishes[row.ma_nguoi_dung] || row.click_count > userTopDishes[row.ma_nguoi_dung].click_count) {
                        userTopDishes[row.ma_nguoi_dung] = { ten_mon: row.ten_mon, click_count: row.click_count };
                    }
                });

                topFlavorClicksRows.forEach(row => {
                    if (!userTopFlavors[row.ma_nguoi_dung]) {
                        userTopFlavors[row.ma_nguoi_dung] = [];
                    }
                    userTopFlavors[row.ma_nguoi_dung].push(row);
                });

                // Sắp xếp giảm dần và lấy tối đa top 3 khẩu vị click nhiều nhất
                Object.keys(userTopFlavors).forEach(uId => {
                    userTopFlavors[uId] = userTopFlavors[uId]
                        .sort((a, b) => b.click_count - a.click_count)
                        .slice(0, 3);
                });
            } catch (dbErr) {
                console.error('Error fetching user-specific click analytics:', dbErr.message);
            }

            users.forEach(u => {
                u.preference_tags = profiles[u.ma_nguoi_dung] || [];
                u.top_dish_click = userTopDishes[u.ma_nguoi_dung] || null;
                u.top_flavors_click = userTopFlavors[u.ma_nguoi_dung] || [];
                
                // CẢI TIẾN: Lấy món ăn và khẩu vị học được từ chatbot
                u.chatbot_dishes = [];
            });
            
            // CẢI TIẾN: Lấy dữ liệu chatbot_preference_insights cho các user
            try {
                const [chatbotInsights] = await db.query(`
                    SELECT 
                        ci.ma_nguoi_dung,
                        ci.ten_mon,
                        ci.ma_mon,
                        GROUP_CONCAT(DISTINCT pt.ten_tag SEPARATOR ', ') as tags,
                        SUM(ci.score_delta) as total_score
                    FROM chatbot_preference_insights ci
                    LEFT JOIN preference_tags pt ON ci.tag_key = pt.tag_key
                    WHERE ci.ma_nguoi_dung IN (?)
                    GROUP BY ci.ma_nguoi_dung, ci.ten_mon, ci.ma_mon
                    HAVING total_score > 0
                    ORDER BY ci.ma_nguoi_dung, total_score DESC
                `, [userIds]);
                
                // Nhóm theo user
                const chatbotByUser = {};
                chatbotInsights.forEach(row => {
                    if (!chatbotByUser[row.ma_nguoi_dung]) {
                        chatbotByUser[row.ma_nguoi_dung] = [];
                    }
                    chatbotByUser[row.ma_nguoi_dung].push({
                        ten_mon: row.ten_mon || 'Từ khóa khẩu vị',
                        ma_mon: row.ma_mon,
                        tags: row.tags,
                        score: parseFloat(row.total_score || 0).toFixed(1)
                    });
                });
                
                users.forEach(u => {
                    u.chatbot_dishes = (chatbotByUser[u.ma_nguoi_dung] || []).slice(0, 5);
                });
            } catch (chatbotErr) {
                console.error('Error fetching chatbot preferences:', chatbotErr.message);
            }
        }

        // 5. Thống kê số lượt click chuột / xem món ăn (Dish Click/View/Like Counts)
        const [dishClicks] = await db.query(`
            SELECT m.ma_mon, m.ten_mon, COUNT(h.id) as total_clicks
            FROM hanh_vi_nguoi_dung h
            JOIN mon_an m ON h.ma_mon = m.ma_mon
            WHERE h.hanh_vi IN ('click', 'view', 'like')
            GROUP BY m.ma_mon, m.ten_mon
            ORDER BY total_clicks DESC
            LIMIT 10
        `);

        // 6. Thống kê số lượt click chuột theo nhóm khẩu vị (Flavor Click/View/Like Counts)
        const [flavorClicks] = await db.query(`
            SELECT f.id as id_thuoc_tinh, f.ten_thuoc_tinh as ten_khau_vi, COUNT(h.id) as total_clicks
            FROM hanh_vi_nguoi_dung h
            JOIN mon_an_khau_vi mk ON h.ma_mon = mk.ma_mon
            JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
            WHERE h.hanh_vi IN ('click', 'view', 'like')
            GROUP BY f.id, f.ten_thuoc_tinh
            ORDER BY total_clicks DESC
            LIMIT 10
        `);

        // 7. Tính độ đồng điệu giữa các khách hàng (Collaborative Filtering Similarity Groups)
        let similarityGroups = [];
        try {
            const [allUsersList] = await db.query('SELECT ma_nguoi_dung, ten_nguoi_dung, so_dien_thoai FROM nguoi_dung');
            const [allFlavorsList] = await db.query('SELECT id, ten_thuoc_tinh FROM thuoc_tinh_khau_vi');
            const [allExplicitPrefs] = await db.query('SELECT ma_nguoi_dung, id_thuoc_tinh FROM so_thich_khau_vi_nguoi_dung');
            const [allImplicitPrefs] = await db.query(`
                SELECT h.ma_nguoi_dung, mk.id_thuoc_tinh, COUNT(h.id) as click_count
                FROM hanh_vi_nguoi_dung h
                JOIN mon_an_khau_vi mk ON h.ma_mon = mk.ma_mon
                WHERE h.hanh_vi IN ('click', 'view', 'like')
                GROUP BY h.ma_nguoi_dung, mk.id_thuoc_tinh
            `);

            const [allReviews] = await db.query(`
                SELECT dg.ma_nguoi_dung, mk.id_thuoc_tinh, dg.so_sao
                FROM danh_gia_san_pham dg
                JOIN mon_an_khau_vi mk ON dg.ma_mon = mk.ma_mon
                WHERE dg.trang_thai = 'approved' AND dg.ma_nguoi_dung IS NOT NULL
            `);
            
            // Lịch sử mua hàng để tìm món đề xuất chéo (Collaborative Filtering)
            // - Lấy mọi đơn chưa hủy
            // - Nếu đơn không có ma_nguoi_dung (đơn POS / khách vãng lai), MAP NGƯỢC:
            //     + ưu tiên match theo số điện thoại
            //     + fallback theo tên khách (case-insensitive, trim)
            const [allOrders] = await db.query(`
                SELECT
                    COALESCE(dh.ma_nguoi_dung, nd_phone.ma_nguoi_dung, nd_name.ma_nguoi_dung) AS ma_nguoi_dung,
                    m.ma_mon,
                    m.ten_mon,
                    MAX(dh.thoi_gian_tao) AS latest_purchase
                FROM don_hang dh
                JOIN chi_tiet_don_hang ct ON dh.ma_don_hang = ct.ma_don_hang
                JOIN mon_an m ON ct.ma_mon = m.ma_mon
                LEFT JOIN nguoi_dung nd_phone
                       ON dh.ma_nguoi_dung IS NULL
                      AND dh.so_dt_khach IS NOT NULL
                      AND dh.so_dt_khach <> ''
                      AND nd_phone.so_dien_thoai = dh.so_dt_khach
                LEFT JOIN nguoi_dung nd_name
                       ON dh.ma_nguoi_dung IS NULL
                      AND nd_phone.ma_nguoi_dung IS NULL
                      AND dh.ten_khach_vang_lai IS NOT NULL
                      AND dh.ten_khach_vang_lai <> ''
                      AND LOWER(TRIM(nd_name.ten_nguoi_dung)) = LOWER(TRIM(dh.ten_khach_vang_lai))
                WHERE dh.trang_thai = 'delivered'
                  AND COALESCE(dh.ma_nguoi_dung, nd_phone.ma_nguoi_dung, nd_name.ma_nguoi_dung) IS NOT NULL
                GROUP BY COALESCE(dh.ma_nguoi_dung, nd_phone.ma_nguoi_dung, nd_name.ma_nguoi_dung), m.ma_mon, m.ten_mon
                ORDER BY latest_purchase DESC
            `);

            console.log(`🔍 [CF Debug] Tổng số bản ghi (user, mon) lấy được: ${allOrders.length}`);
            
            const userPurchases = {};
            allOrders.forEach(row => {
                if (!userPurchases[row.ma_nguoi_dung]) userPurchases[row.ma_nguoi_dung] = [];
                userPurchases[row.ma_nguoi_dung].push({ id: row.ma_mon, name: row.ten_mon });
            });

            // Log số món mỗi user đã mua (giúp debug khi không có gợi ý chéo)
            const purchaseSummary = allUsersList.map(u => ({
                ma: u.ma_nguoi_dung,
                ten: u.ten_nguoi_dung,
                so_dien_thoai: u.so_dien_thoai,
                so_mon_da_mua: (userPurchases[u.ma_nguoi_dung] || []).length,
                cac_mon: (userPurchases[u.ma_nguoi_dung] || []).map(x => x.name)
            }));
            console.log('🔍 [CF Debug] Lịch sử mua của từng user:', JSON.stringify(purchaseSummary, null, 2));

            const vectors = {};
            allUsersList.forEach(u => {
                vectors[u.ma_nguoi_dung] = {};
                allFlavorsList.forEach(f => {
                    vectors[u.ma_nguoi_dung][f.id] = 0;
                });
            });

            allExplicitPrefs.forEach(row => {
                if (vectors[row.ma_nguoi_dung]) {
                    vectors[row.ma_nguoi_dung][row.id_thuoc_tinh] += 3.0;
                }
            });

            allImplicitPrefs.forEach(row => {
                if (vectors[row.ma_nguoi_dung]) {
                    vectors[row.ma_nguoi_dung][row.id_thuoc_tinh] += Math.min(2.0, row.click_count * 0.2);
                }
            });

            allReviews.forEach(row => {
                if (vectors[row.ma_nguoi_dung]) {
                    const ratingWeight = row.so_sao >= 4 ? 2.5 : (row.so_sao <= 2 ? -2.5 : 0);
                    vectors[row.ma_nguoi_dung][row.id_thuoc_tinh] += ratingWeight;
                }
            });

            for (let i = 0; i < allUsersList.length; i++) {
                for (let j = i + 1; j < allUsersList.length; j++) {
                    const uA = allUsersList[i];
                    const uB = allUsersList[j];
                    
                    const vecA = vectors[uA.ma_nguoi_dung];
                    const vecB = vectors[uB.ma_nguoi_dung];
                    
                    let dotProduct = 0;
                    let normA = 0;
                    let normB = 0;
                    
                    allFlavorsList.forEach(f => {
                        const valA = vecA[f.id] || 0;
                        const valB = vecB[f.id] || 0;
                        dotProduct += valA * valB;
                        normA += valA * valA;
                        normB += valB * valB;
                    });
                    
                    const similarity = normA === 0 || normB === 0 ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
                    
                    if (similarity > 0.1) {
                        const sharedFlavors = allFlavorsList
                            .filter(f => (vecA[f.id] > 0) && (vecB[f.id] > 0))
                            .map(f => f.ten_thuoc_tinh);
                        
                        const purchasesA = userPurchases[uA.ma_nguoi_dung] || [];
                        const purchasesB = userPurchases[uB.ma_nguoi_dung] || [];
                        
                        // Tìm món Khách B đã mua nhưng Khách A chưa mua
                        const recForA = purchasesB.filter(pb => !purchasesA.some(pa => pa.id === pb.id)).slice(0, 2);
                        // Tìm món Khách A đã mua nhưng Khách B chưa mua
                        const recForB = purchasesA.filter(pa => !purchasesB.some(pb => pb.id === pa.id)).slice(0, 2);
                            
                        similarityGroups.push({
                            userA: { id: uA.ma_nguoi_dung, name: uA.ten_nguoi_dung, phone: uA.so_dien_thoai },
                            userB: { id: uB.ma_nguoi_dung, name: uB.ten_nguoi_dung, phone: uB.so_dien_thoai },
                            similarity: Math.round(similarity * 100),
                            sharedFlavors,
                            recForA,
                            recForB,
                            purchasesACount: purchasesA.length,
                            purchasesBCount: purchasesB.length
                        });
                    }
                }
            }
            similarityGroups.sort((a, b) => b.similarity - a.similarity);
            // Giới hạn hiển thị Top 10 cặp giống nhau nhất cho đỡ nặng giao diện
            similarityGroups = similarityGroups.slice(0, 10);
        } catch (simErr) {
            console.error('Error calculating collaborative similarity groups:', simErr.message);
        }

        res.json({
            success: true,
            data: {
                categories,
                keywords: keywordsList,
                preferenceTags: positiveTags,
                negativePreferenceTags: negativeTags,
                users,
                dishClicks,
                flavorClicks,
                similarityGroups
            }
        });
    } catch (error) {
        console.error('Error fetching admin preference stats:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

/**
 * API: Huấn luyện lại / Cập nhật hồ sơ sở thích khách hàng từ đánh giá VÀ chatbot
 * POST /api/recommendations/admin/rebuild-preferences
 * CẢI TIẾN: Chạy cả rebuildAllChatbotPreferences() và rebuildAllReviewPreferences()
 */
router.post('/admin/rebuild-preferences', async (req, res) => {
    try {
        // Kiểm tra quyền truy cập (Admin hoặc Staff)
        if ((!req.session || !req.session.admin) && (!req.session || !req.session.staff)) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - Admin or Staff only'
            });
        }

        const preferenceService = require('../services/preferenceService');
        
        console.log('🤖 Bắt đầu huấn luyện lại sở thích AI...');
        
        // 1. Huấn luyện từ chatbot
        console.log('📱 Phân tích lịch sử chatbot...');
        const chatbotCount = await preferenceService.rebuildAllChatbotPreferences();
        
        // 2. Huấn luyện từ review
        console.log('⭐ Phân tích đánh giá sản phẩm...');
        const reviewResult = await preferenceService.rebuildAllReviewPreferences();
        
        // 3. Tính toán lại toàn bộ profile (gộp cả 2 nguồn)
        console.log('🧮 Tính toán lại hồ sơ sở thích...');
        const profileCount = await preferenceService.rebuildAllProfiles();
        
        console.log('✅ Huấn luyện hoàn tất!');
        
        res.json({
            success: true,
            message: 'Đã huấn luyện lại sở thích từ chatbot và đánh giá thành công',
            data: {
                chatbot_insights: chatbotCount,
                review_insights: reviewResult.insight_count || 0,
                reviews_processed: reviewResult.review_count || 0,
                profiles_updated: profileCount
            }
        });
    } catch (error) {
        console.error('Error rebuilding preferences:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

/**
 * API: Lấy lịch sử click của người dùng
 * GET /api/recommendations/admin/user-click-history/:userId
 */
router.get('/admin/user-click-history/:userId', async (req, res) => {
    try {
        if ((!req.session || !req.session.admin) && (!req.session || !req.session.staff)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const userId = req.params.userId;
        const [history] = await db.query(`
            SELECT m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien,
                   SUM(CASE WHEN h.hanh_vi = 'click' THEN 1 ELSE 0 END) as click_count,
                   SUM(CASE WHEN h.hanh_vi = 'view' THEN 1 ELSE 0 END) as view_count,
                   SUM(CASE WHEN h.hanh_vi = 'like' THEN 1 ELSE 0 END) as like_count,
                   MAX(h.thoi_gian) as last_clicked
            FROM hanh_vi_nguoi_dung h
            JOIN mon_an m ON h.ma_mon = m.ma_mon
            WHERE h.ma_nguoi_dung = ? AND h.hanh_vi IN ('click', 'view', 'like')
            GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien
            ORDER BY (SUM(CASE WHEN h.hanh_vi = 'click' THEN 1 ELSE 0 END) + SUM(CASE WHEN h.hanh_vi = 'view' THEN 1 ELSE 0 END) + SUM(CASE WHEN h.hanh_vi = 'like' THEN 1 ELSE 0 END)) DESC, last_clicked DESC
            LIMIT 50
        `, [userId]);
        res.json({ success: true, data: history });
    } catch (err) {
        console.error('Error fetching user click history:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

/**
 * API: Lấy chi tiết từ khóa và món ăn từ chatbot của người dùng
 * GET /api/recommendations/admin/chatbot-keywords/:userId
 */
router.get('/admin/chatbot-keywords/:userId', async (req, res) => {
    try {
        if ((!req.session || !req.session.admin) && (!req.session || !req.session.staff)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        const userId = req.params.userId;
        
        // 1. Lấy các món ăn được nhắc đến (có ma_mon)
        const [dishes] = await db.query(`
            SELECT 
                ci.ma_mon,
                ci.ten_mon,
                GROUP_CONCAT(DISTINCT pt.ten_tag ORDER BY pt.ten_tag SEPARATOR ', ') as tags,
                ci.sentiment,
                SUM(ci.score_delta) as score,
                MAX(ci.evidence) as evidence,
                MAX(ci.ngay_tao) as last_mentioned
            FROM chatbot_preference_insights ci
            LEFT JOIN preference_tags pt ON ci.tag_key = pt.tag_key
            WHERE ci.ma_nguoi_dung = ? AND ci.ma_mon IS NOT NULL
            GROUP BY ci.ma_mon, ci.ten_mon, ci.sentiment
            ORDER BY last_mentioned DESC, score DESC
        `, [userId]);
        
        // 2. Lấy các từ khóa khẩu vị (không có ma_mon)
        const [keywords] = await db.query(`
            SELECT 
                ci.tag_key,
                pt.ten_tag as tag_name,
                pt.nhom_tag,
                ci.sentiment,
                SUM(ci.score_delta) as score,
                MAX(ci.evidence) as evidence,
                MAX(ci.ngay_tao) as last_mentioned,
                COUNT(*) as mention_count
            FROM chatbot_preference_insights ci
            LEFT JOIN preference_tags pt ON ci.tag_key = pt.tag_key
            WHERE ci.ma_nguoi_dung = ? AND ci.ma_mon IS NULL
            GROUP BY ci.tag_key, pt.ten_tag, pt.nhom_tag, ci.sentiment
            ORDER BY last_mentioned DESC, score DESC
        `, [userId]);
        
        // 3. Lấy lịch sử tin nhắn gốc (chỉ lấy 50 tin nhắn gần nhất)
        const [messages] = await db.query(`
            SELECT 
                lc.thoi_diem_chat,
                lc.nguoi_gui,
                lc.noi_dung,
                (SELECT COUNT(*) 
                 FROM chatbot_preference_insights ci 
                 WHERE ci.ma_nguoi_dung = lc.ma_nguoi_dung 
                 AND DATE(ci.ngay_tao) = DATE(lc.thoi_diem_chat)
                 AND TIME(ci.ngay_tao) BETWEEN TIME(lc.thoi_diem_chat) AND ADDTIME(TIME(lc.thoi_diem_chat), '00:00:05')
                ) as insights_count
            FROM lich_su_chatbot lc
            WHERE lc.ma_nguoi_dung = ?
            ORDER BY lc.thoi_diem_chat DESC
            LIMIT 50
        `, [userId]);
        
        // 4. Tính thống kê tổng quan
        const stats = {
            total_keywords: keywords.length,
            total_dishes: dishes.length,
            total_score: [...dishes, ...keywords].reduce((sum, item) => sum + parseFloat(item.score || 0), 0)
        };
        
        res.json({
            success: true,
            data: {
                dishes,
                keywords,
                messages,
                stats
            }
        });
    } catch (err) {
        console.error('Error fetching chatbot keywords:', err);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
    }
});

// === DEBUG: kiểm tra dữ liệu CF cho 1 user (mở ngoài để soi nhanh) ===
// GET /api/recommendation/debug-cf?ten=Thuat
router.get('/debug-cf', async (req, res) => {
    try {
        const ten = req.query.ten || '';

        // 1. User trong nguoi_dung khớp tên
        const [usersByName] = await db.query(
            `SELECT ma_nguoi_dung, ten_nguoi_dung, so_dien_thoai
             FROM nguoi_dung
             WHERE LOWER(ten_nguoi_dung) LIKE LOWER(?)`,
            [`%${ten}%`]
        );

        // 2. Đơn hàng có ten_khach_vang_lai khớp tên
        const [ordersByName] = await db.query(
            `SELECT ma_don_hang, ma_nguoi_dung, ten_khach_vang_lai, so_dt_khach, trang_thai, thoi_gian_tao
             FROM don_hang
             WHERE LOWER(IFNULL(ten_khach_vang_lai,'')) LIKE LOWER(?)
                OR ma_nguoi_dung IN (SELECT ma_nguoi_dung FROM nguoi_dung WHERE LOWER(ten_nguoi_dung) LIKE LOWER(?))
             ORDER BY thoi_gian_tao DESC
             LIMIT 30`,
            [`%${ten}%`, `%${ten}%`]
        );

        // 3. Các món trong những đơn đó
        const orderIds = ordersByName.map(o => o.ma_don_hang);
        let items = [];
        if (orderIds.length > 0) {
            const [rows] = await db.query(
                `SELECT ct.ma_don_hang, ct.ma_mon, m.ten_mon, ct.so_luong
                 FROM chi_tiet_don_hang ct
                 JOIN mon_an m ON ct.ma_mon = m.ma_mon
                 WHERE ct.ma_don_hang IN (?)`,
                [orderIds]
            );
            items = rows;
        }

        // 4. Đơn nào KHÔNG link được về user (trống ma_nguoi_dung + không match phone/tên)
        const [orphanOrders] = await db.query(`
            SELECT dh.ma_don_hang, dh.ten_khach_vang_lai, dh.so_dt_khach, dh.trang_thai
            FROM don_hang dh
            LEFT JOIN nguoi_dung nd_phone
                   ON dh.so_dt_khach = nd_phone.so_dien_thoai
                  AND dh.so_dt_khach IS NOT NULL AND dh.so_dt_khach <> ''
            LEFT JOIN nguoi_dung nd_name
                   ON LOWER(TRIM(nd_name.ten_nguoi_dung)) = LOWER(TRIM(dh.ten_khach_vang_lai))
                  AND dh.ten_khach_vang_lai IS NOT NULL AND dh.ten_khach_vang_lai <> ''
            WHERE dh.ma_nguoi_dung IS NULL
              AND nd_phone.ma_nguoi_dung IS NULL
              AND nd_name.ma_nguoi_dung IS NULL
              AND dh.trang_thai <> 'cancelled'
            ORDER BY dh.thoi_gian_tao DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            search: ten,
            users_match: usersByName,
            orders_match: ordersByName,
            items_in_those_orders: items,
            orphan_orders_cannot_link: orphanOrders
        });
    } catch (err) {
        console.error('debug-cf error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * API: Quản lý trọng số Phổ biến
 * GET/PUT /api/recommendations/admin/popularity-weights
 */
router.get('/admin/popularity-weights', (req, res) => {
    try {
        if ((!req.session || !req.session.admin) && (!req.session || !req.session.staff)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        res.json({ success: true, data: getPopularityWeights() });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

router.put('/admin/popularity-weights', express.json(), (req, res) => {
    try {
        if ((!req.session || !req.session.admin) && (!req.session || !req.session.staff)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const newWeights = {
            orders: Number(req.body.orders) >= 0 ? Number(req.body.orders) : 30,
            clicks: Number(req.body.clicks) >= 0 ? Number(req.body.clicks) : 20,
            views: Number(req.body.views) >= 0 ? Number(req.body.views) : 15,
            rating: Number(req.body.rating) >= 0 ? Number(req.body.rating) : 20,
            likes: Number(req.body.likes) >= 0 ? Number(req.body.likes) : 15
        };
        const weightsPath = path.join(__dirname, '../config/popularity-weights.json');
        
        // Đảm bảo thư mục config tồn tại
        if (!fs.existsSync(path.dirname(weightsPath))) {
            fs.mkdirSync(path.dirname(weightsPath), { recursive: true });
        }
        
        fs.writeFileSync(weightsPath, JSON.stringify(newWeights, null, 4));
        res.json({ success: true, message: 'Cập nhật trọng số thành công', data: newWeights });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

/**
 * API: Lấy dữ liệu minh họa cho thuật toán (Admin)
 * GET /api/recommendations/admin/algorithm-metrics
 */
router.get('/admin/algorithm-metrics', async (req, res) => {
    try {
        if ((!req.session || !req.session.admin) && (!req.session || !req.session.staff)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const preferenceService = require('../services/preferenceService');

        // 1. POPULARITY (Độ Phổ Biến)
        // Lấy danh sách món ăn hoạt động và thông tin lượt mua/xem/tim/sao
        const [rawPopularDishes] = await db.query(`
            SELECT m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, d.ten_danh_muc,
                   (SELECT COUNT(*) FROM chi_tiet_don_hang ct WHERE ct.ma_mon = m.ma_mon) as order_count,
                   (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as click_count,
                   (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as view_count,
                   (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as like_count,
                   (SELECT AVG(dg.so_sao) FROM danh_gia_san_pham dg WHERE dg.ma_mon = m.ma_mon AND dg.trang_thai = 'approved') as avg_rating
            FROM mon_an m
            LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
            WHERE m.trang_thai = 1
        `);

        const weights = getPopularityWeights();
        const wOrder = weights.orders || 30;
        const wClick = weights.clicks || 20;
        const wView = weights.views || 15;
        const wLike = weights.likes || 15;
        const wRating = weights.rating || 20;

        rawPopularDishes.forEach(t => {
            const avgRating = parseFloat(t.avg_rating || 0);
            const orders = parseInt(t.order_count || 0);
            const clicks = parseInt(t.click_count || 0);
            const views = parseInt(t.view_count || 0);
            const likes = parseInt(t.like_count || 0);
            t.popularity_score = (orders * wOrder) + (clicks * wClick) + (views * wView) + (likes * wLike) + (avgRating * 20 * (wRating / 100));
        });

        // Sắp xếp giảm dần và lấy top 15 món
        rawPopularDishes.sort((a, b) => b.popularity_score - a.popularity_score || b.ma_mon - a.ma_mon);
        const popularDishes = rawPopularDishes.slice(0, 15);

        // Lấy user tương tác cho mỗi món
        for (let dish of popularDishes) {
            const [users] = await db.query(`
                SELECT n.ma_nguoi_dung, n.ten_nguoi_dung, n.anh_dai_dien, h.hanh_vi, MAX(h.thoi_gian) as last_time
                FROM hanh_vi_nguoi_dung h
                JOIN nguoi_dung n ON h.ma_nguoi_dung = n.ma_nguoi_dung
                WHERE h.ma_mon = ?
                GROUP BY n.ma_nguoi_dung, n.ten_nguoi_dung, n.anh_dai_dien, h.hanh_vi
                ORDER BY last_time DESC
                LIMIT 5
            `, [dish.ma_mon]);
            dish.interacting_users = users;
        }

        // Lấy 10 User tiêu biểu để demo Content-based và Hybrid
        const [sampleUsers] = await db.query(`
            SELECT n.ma_nguoi_dung, n.ten_nguoi_dung, n.anh_dai_dien
            FROM nguoi_dung n
            JOIN hanh_vi_nguoi_dung h ON n.ma_nguoi_dung = h.ma_nguoi_dung
            GROUP BY n.ma_nguoi_dung, n.ten_nguoi_dung, n.anh_dai_dien
            ORDER BY COUNT(h.id) DESC
            LIMIT 10
        `);

        const userIds = sampleUsers.map(u => u.ma_nguoi_dung);
        let contentBasedStats = [];
        let hybridStats = [];

        if (userIds.length > 0) {
            const profiles = await preferenceService.getProfilesForUsers(userIds);

            // Xử lý Content-based và Hybrid
            for (let user of sampleUsers) {
                // 1. Explicit & Implicit Flavour Ids
                const [explicitPrefs] = await db.query('SELECT id_thuoc_tinh FROM so_thich_khau_vi_nguoi_dung WHERE ma_nguoi_dung = ?', [user.ma_nguoi_dung]);
                const explicitFlavorIds = explicitPrefs.map(p => p.id_thuoc_tinh);
                
                 const [implicitPrefs] = await db.query(`
                     SELECT mk.id_thuoc_tinh,
                            SUM(
                                CASE h.hanh_vi
                                    WHEN 'like'  THEN 5
                                    WHEN 'view'  THEN 2
                                    WHEN 'click' THEN 1
                                    ELSE 0
                                END
                            ) as weighted_score
                     FROM hanh_vi_nguoi_dung h
                     JOIN mon_an_khau_vi mk ON h.ma_mon = mk.ma_mon
                     WHERE h.ma_nguoi_dung = ? AND h.hanh_vi IN ('click', 'view', 'like')
                     GROUP BY mk.id_thuoc_tinh
                     HAVING weighted_score >= 5
                 `, [user.ma_nguoi_dung]);
                 const implicitFlavorIds = implicitPrefs.map(p => p.id_thuoc_tinh);
                
                const preferredFlavorIds = [...new Set([...explicitFlavorIds, ...implicitFlavorIds])];
                
                // Content-based Dishes
                const userProfile = profiles[user.ma_nguoi_dung] || [];
                const excludedFlavorIds = [];
                const tagKeyToFlavorId = {
                    'cay': 1,
                    'chua': 2,
                    'man': 3,
                    'ngot': 4,
                    'an_chay': 5,
                    'thanh_mat': 6,
                    'thit_bo': 7,
                    'thit_ga': 7,
                    'hai_san': 8,
                    'chien': 9
                };
                userProfile.forEach(p => {
                    const fId = tagKeyToFlavorId[p.tag_key];
                    if (fId && Number(p.score) <= -0.5) {
                        if (!excludedFlavorIds.includes(fId)) {
                            excludedFlavorIds.push(fId);
                        }
                    }
                });

                let matchedDishes = [];
                if (preferredFlavorIds.length > 0) {
                    let query = `
                        SELECT m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, GROUP_CONCAT(DISTINCT f.ten_thuoc_tinh SEPARATOR ', ') as matched_tags
                        FROM mon_an m
                        JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
                        JOIN thuoc_tinh_khau_vi f ON mk.id_thuoc_tinh = f.id
                        WHERE mk.id_thuoc_tinh IN (?) AND m.trang_thai = 1
                    `;
                    const params = [preferredFlavorIds];
                    
                    if (excludedFlavorIds.length > 0) {
                        query += ` AND m.ma_mon NOT IN (SELECT DISTINCT ma_mon FROM mon_an_khau_vi WHERE id_thuoc_tinh IN (?))`;
                        params.push(excludedFlavorIds);
                    }
                    
                    query += ` GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien LIMIT 5`;
                    
                    const [resMatched] = await db.query(query, params);
                    matchedDishes = resMatched;
                }

                contentBasedStats.push({
                    user: user,
                    preferences: userProfile,
                    matched_dishes: matchedDishes
                });

                // Hybrid Stats
                const contentBased = await getContentBasedRecommendations(user.ma_nguoi_dung, 5, preferredFlavorIds);
                const collaborative = await getCollaborativeRecommendations(user.ma_nguoi_dung, 5);
                const trending = await getTrendingDishes(3);

                contentBased.forEach((item, idx) => { item.score = 100 - idx; item.recommendation_type = 'content_based'; });
                collaborative.forEach((item, idx) => { item.score = 95 - idx; item.recommendation_type = 'collaborative'; });
                trending.forEach((item, idx) => { item.score = 60 - idx; item.recommendation_type = 'trending'; });

                let combined = [...contentBased, ...collaborative, ...trending];
                
                // Deduplicate
                const seen = new Set();
                combined = combined.filter(r => {
                    if (seen.has(r.ma_mon)) return false;
                    seen.add(r.ma_mon);
                    return true;
                }).sort((a,b) => b.score - a.score).slice(0, 10);

                hybridStats.push({
                    user: user,
                    recommendations: combined
                });
            }
        }

        res.json({
            success: true,
            data: {
                popularity: popularDishes,
                contentBased: contentBasedStats,
                hybrid: hybridStats
            }
        });
    } catch (error) {
        console.error('Error fetching algorithm metrics:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

module.exports = router;
