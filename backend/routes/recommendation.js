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
    'cua': 'hai_san', 'mực': 'hai_san',
    
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
        // Lấy các món user đã mua
        const [userOrders] = await db.query(
            `SELECT DISTINCT ct.ma_mon 
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             WHERE dh.ma_nguoi_dung = ?`,
            [userId]
        );
        
        if (userOrders.length === 0) return [];
        
        const userDishes = userOrders.map(o => o.ma_mon);
        
        // Tìm users khác đã mua các món tương tự
        const [similarUsers] = await db.query(
            `SELECT dh.ma_nguoi_dung, COUNT(DISTINCT ct.ma_mon) as common_dishes
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             WHERE ct.ma_mon IN (?) AND dh.ma_nguoi_dung != ? AND dh.ma_nguoi_dung IS NOT NULL
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
 */
async function getCollaborativeRecommendations(userId, limit = 5) {
    try {
        // [Cải tiến] Cố gắng gọi API qua mô hình Python SVD để tăng độ học sâu thay vì SQL đơn thuần
        try {
            const pythonResponse = await axios.get(PYTHON_API_URL, {
                params: { user_id: userId, limit: limit },
                timeout: 3000 // Tối đa 3 giây gọi API 
            });

            if (pythonResponse.data && pythonResponse.data.success && pythonResponse.data.data.length > 0) {
                // Parse IDs do Python trả về ([101, 204, ...])
                const recommendedItemIds = pythonResponse.data.data.map(i => i.item_id);
                console.log(`🤖 [Python ML] Hybrid Recommendation success cho User: ${userId}`, recommendedItemIds);
                
                // Fetch thông tin chi tiết các id này từ database MySQL 
                const query = `
                    SELECT m.*, d.ten_danh_muc, AVG(dg.so_sao) as avg_rating
                    FROM mon_an m
                    LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                    LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon
                    WHERE m.ma_mon IN (?) AND m.trang_thai = 1
                    GROUP BY m.ma_mon
                `;
                const [mlRecommendations] = await db.query(query, [recommendedItemIds]);
                
                // Format lại payload cho thẻ card HTML (index.html) như SQL logic truyền thống
                if (mlRecommendations.length > 0) {
                    return mlRecommendations.map(r => ({
                        ...r,
                        recommendation_type: 'collaborative',
                        reason: 'Gợi ý từ AI Dữ liệu lớn (Collaborative - SVD)'
                    }));
                }
            } 
        } catch (pyErr) {
            console.log("⚠️ [Node.js] Không kết nối được đến Python ML Service. Tự động dùng fallback SQL Database.");
        }

        // --- FALLBACK (Chế độ dự phòng SQL Truyền thống do bạn viết) ---
        return await getSQLCollaborativeRecommendations(userId, limit);

    } catch (error) {
        console.error('Error getting collaborative recommendations:', error.message);
        return [];
    }
}

/**
 * Gợi ý SQL gốc nếu Python tạch (Fall-back plan)
 */
async function getSQLCollaborativeRecommendations(userId, limit = 5) {
    try {
        const similarUsers = await findSimilarUsers(userId);
        if (similarUsers.length === 0) return [];
        
        const similarUserIds = similarUsers.map(u => u.ma_nguoi_dung);
        
        // Lấy các món user chưa mua nhưng users tương tự đã mua
        const [userOrders] = await db.query(
            `SELECT DISTINCT ct.ma_mon 
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             WHERE dh.ma_nguoi_dung = ?`,
            [userId]
        );
        const userDishes = userOrders.map(o => o.ma_mon);
        
        let query = `
            SELECT m.*, d.ten_danh_muc, COUNT(*) as purchase_count,
                   AVG(dg.so_sao) as avg_rating
            FROM chi_tiet_don_hang ct
            JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
            LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon
            WHERE dh.ma_nguoi_dung IN (?) AND m.trang_thai = 1
        `;
        const params = [similarUserIds];
        
        if (userDishes.length > 0) {
            query += ` AND ct.ma_mon NOT IN (?)`;
            params.push(userDishes);
        }
        
        query += ` GROUP BY m.ma_mon ORDER BY purchase_count DESC, avg_rating DESC LIMIT ?`;
        params.push(limit);
        
        const [recommendations] = await db.query(query, params);
        return recommendations.map(r => ({
            ...r,
            recommendation_type: 'collaborative',
            reason: '✨ Gợi ý phân tích bằng Lọc cộng tác (Collaborative)'
        }));
    } catch (error) {
        console.error('Error getting collaborative SQL recommendations:', error.message);
        return [];
    }
}


// ==================== CONTENT-BASED FILTERING ====================

/**
 * Gợi ý món dựa trên nội dung (danh mục, giá, đặc điểm)
 */
async function getContentBasedRecommendations(userId, limit = 5) {
    try {
        // Lấy các món user đã mua và thích (rating >= 4)
        const [userPreferences] = await db.query(
            `SELECT m.ma_danh_muc, AVG(m.gia_tien) as avg_price, 
                    COUNT(*) as purchase_count
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             JOIN mon_an m ON ct.ma_mon = m.ma_mon
             WHERE dh.ma_nguoi_dung = ?
             GROUP BY m.ma_danh_muc
             ORDER BY purchase_count DESC`,
            [userId]
        );
        
        if (userPreferences.length === 0) return [];
        
        // Lấy danh mục yêu thích nhất
        const favoriteCategories = userPreferences.slice(0, 3).map(p => p.ma_danh_muc);
        const avgPrice = userPreferences.reduce((sum, p) => sum + parseFloat(p.avg_price), 0) / userPreferences.length;
        
        // Lấy các món user chưa mua trong danh mục yêu thích
        const [userOrders] = await db.query(
            `SELECT DISTINCT ct.ma_mon 
             FROM chi_tiet_don_hang ct
             JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
             WHERE dh.ma_nguoi_dung = ?`,
            [userId]
        );
        const userDishes = userOrders.map(o => o.ma_mon);
        
        let query = `
            SELECT m.*, d.ten_danh_muc, AVG(dg.so_sao) as avg_rating,
                   COUNT(dg.ma_danh_gia) as review_count
            FROM mon_an m
            LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
            LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
            WHERE m.trang_thai = 1 AND m.ma_danh_muc IN (?)
        `;
        const params = [favoriteCategories];
        
        if (userDishes.length > 0) {
            query += ` AND m.ma_mon NOT IN (?)`;
            params.push(userDishes);
        }
        
        // Ưu tiên món có giá gần với mức giá trung bình user hay mua
        query += ` GROUP BY m.ma_mon 
                   ORDER BY ABS(m.gia_tien - ?) ASC, avg_rating DESC 
                   LIMIT ?`;
        params.push(avgPrice, limit);
        
        const [recommendations] = await db.query(query, params);
        return recommendations.map(r => ({
            ...r,
            recommendation_type: 'content_based',
            reason: `Phù hợp với sở thích của bạn (${r.ten_danh_muc})`
        }));
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
        
        query += conditions.join(' OR ') + `)
            GROUP BY m.ma_mon
            ORDER BY avg_rating DESC, review_count DESC
            LIMIT ?`;
        params.push(limit);
        
        const [recommendations] = await db.query(query, params);
        
        // Thêm lý do gợi ý
        const topKeyword = chatAnalysis.topKeywords[0]?.keyword || 'sở thích';
        return recommendations.map(r => ({
            ...r,
            recommendation_type: 'chat_based',
            reason: `💬 Dựa trên cuộc trò chuyện của bạn về "${topKeyword}"`
        }));
    } catch (error) {
        console.error('Error getting chat-based recommendations:', error.message);
        return [];
    }
}

// ==================== TRENDING & POPULAR ====================

/**
 * Lấy món ăn đang trending (bán chạy gần đây)
 */
async function getTrendingDishes(limit = 5) {
    try {
        const [trending] = await db.query(
            `SELECT m.*, d.ten_danh_muc, 
                    COUNT(ct.ma_ct_don) as order_count,
                    AVG(dg.so_sao) as avg_rating
             FROM mon_an m
             LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
             LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
             LEFT JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang 
                   AND dh.thoi_gian_tao >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
             WHERE m.trang_thai = 1
             GROUP BY m.ma_mon
             ORDER BY order_count DESC, avg_rating DESC
             LIMIT ?`,
            [limit]
        );
        
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
             ORDER BY avg_rating DESC, review_count DESC
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
 * API: Gợi ý tổng hợp cho user (trang chủ, thực đơn)
 * GET /api/recommendations
 */
router.get('/', async (req, res) => {
    try {
        const userId = getUserFromToken(req);
        const limit = parseInt(req.query.limit) || 8;
        
        let recommendations = [];
        
        if (userId) {
            // User đã đăng nhập - sử dụng ML recommendations
            const [chatBased, collaborative, contentBased] = await Promise.all([
                getChatBasedRecommendations(userId, 3),
                getCollaborativeRecommendations(userId, 3),
                getContentBasedRecommendations(userId, 2)
            ]);
            
            recommendations = [...chatBased, ...collaborative, ...contentBased];
            
            // Nếu không đủ, bổ sung trending
            if (recommendations.length < limit) {
                const trending = await getTrendingDishes(limit - recommendations.length);
                recommendations.push(...trending);
            }
        } else {
            // Guest - chỉ hiển thị trending và top rated
            const [trending, topRated] = await Promise.all([
                getTrendingDishes(Math.ceil(limit / 2)),
                getTopRatedDishes(Math.floor(limit / 2))
            ]);
            recommendations = [...trending, ...topRated];
        }
        
        // Loại bỏ trùng lặp
        const uniqueRecommendations = [];
        const seenIds = new Set();
        for (const rec of recommendations) {
            if (!seenIds.has(rec.ma_mon)) {
                seenIds.add(rec.ma_mon);
                uniqueRecommendations.push(rec);
            }
        }
        
        res.json({
            success: true,
            data: uniqueRecommendations.slice(0, limit),
            meta: {
                user_logged_in: !!userId,
                total: uniqueRecommendations.length
            }
        });
    } catch (error) {
        console.error('Error getting recommendations:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lấy gợi ý' });
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
                ORDER BY avg_rating DESC
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
        
        // Lưu vào bảng tracking (nếu có)
        // Hiện tại chỉ log để phân tích sau
        console.log(`📊 Recommendation tracking: user=${userId}, dish=${dish_id}, action=${action}`);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking:', error.message);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
