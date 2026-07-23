/**
 * Menu Controller
 * Xử lý logic nghiệp vụ cho món ăn
 */

const db = require('../config/database');

// Lấy tất cả món ăn với tìm kiếm và lọc
const getAllDishes = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, sortBy, showAll } = req.query;

        let query = `
            SELECT m.*, d.ten_danh_muc,
                   COALESCE(AVG(dg.so_sao), 0) as avg_rating,
                   COUNT(DISTINCT dg.ma_danh_gia) as total_reviews,
                   (
                       SELECT GROUP_CONCAT(id_thuoc_tinh)
                       FROM mon_an_khau_vi
                       WHERE ma_mon = m.ma_mon
                   ) as khau_vi
            FROM mon_an m 
            LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
            LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
            WHERE 1=1
        `;
        const params = [];

        if (showAll !== 'true') {
            query += ` AND m.trang_thai = 1`;
        }

        if (search) {
            query += ` AND (m.ten_mon LIKE ? OR m.mo_ta_chi_tiet LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (category) {
            query += ` AND m.ma_danh_muc = ?`;
            params.push(category);
        }

        if (minPrice) {
            query += ` AND m.gia_tien >= ?`;
            params.push(minPrice);
        }
        if (maxPrice) {
            query += ` AND m.gia_tien <= ?`;
            params.push(maxPrice);
        }

        query += ` GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet, 
                   m.so_luong_ton, m.don_vi_tinh, m.trang_thai, m.ma_danh_muc, d.ten_danh_muc`;

        switch (sortBy) {
            case 'newest':
                query += ` ORDER BY m.ma_mon DESC`;
                break;
            case 'price-asc':
                query += ` ORDER BY m.gia_tien ASC`;
                break;
            case 'price-desc':
                query += ` ORDER BY m.gia_tien DESC`;
                break;
            case 'popular':
                query += ` ORDER BY m.so_luong_ton ASC`;
                break;
            default:
                query += ` ORDER BY m.ma_mon DESC`;
        }

        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows, count: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy món ăn theo danh mục
const getDishesByCategory = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT m.*, d.ten_danh_muc,
                   COALESCE(AVG(dg.so_sao), 0) as avg_rating,
                   COUNT(DISTINCT dg.ma_danh_gia) as total_reviews
            FROM mon_an m
            LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
            LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
            WHERE m.ma_danh_muc = ?
            GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet, 
                     m.so_luong_ton, m.don_vi_tinh, m.trang_thai, m.ma_danh_muc, d.ten_danh_muc
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy chi tiết món ăn
const getDishById = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT m.*, d.ten_danh_muc,
                   (
                       SELECT GROUP_CONCAT(id_thuoc_tinh)
                       FROM mon_an_khau_vi
                       WHERE ma_mon = m.ma_mon
                   ) as khau_vi
            FROM mon_an m 
            LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
            WHERE m.ma_mon = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy top món ăn bán chạy (Đổi tiêu chí thành Lọc Phổ Biến theo yêu cầu của user)
const getTopSelling = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 4;

        const fs = require('fs');
        const path = require('path');
        let wOrder = 30, wClick = 20, wView = 15, wLike = 15, wRating = 20;
        try {
            const weightsPath = path.join(__dirname, '../config/popularity-weights.json');
            if (fs.existsSync(weightsPath)) {
                const w = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
                wOrder = w.orders !== undefined ? w.orders : 30;
                wClick = w.clicks !== undefined ? w.clicks : 20;
                wView = w.views !== undefined ? w.views : 15;
                wLike = w.likes !== undefined ? w.likes : 15;
                wRating = w.rating !== undefined ? w.rating : 20;
            }
        } catch (e) {
            console.error('Lỗi đọc weights trong getTopSelling:', e);
        }

        const [topProducts] = await db.query(`
            SELECT m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet,
                   (SELECT COUNT(*) FROM chi_tiet_don_hang ct JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang WHERE ct.ma_mon = m.ma_mon AND dh.trang_thai = 'delivered') as da_ban,
                   COALESCE((SELECT AVG(so_sao) FROM danh_gia_san_pham dg WHERE dg.ma_mon = m.ma_mon AND dg.trang_thai = 'approved'), 0) as avg_rating,
                   (SELECT COUNT(*) FROM danh_gia_san_pham dg WHERE dg.ma_mon = m.ma_mon AND dg.trang_thai = 'approved') as total_reviews,
                   GROUP_CONCAT(DISTINCT mk.id_thuoc_tinh) as flavor_ids,
                   (
                       ((SELECT COUNT(*) FROM chi_tiet_don_hang ct JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang WHERE ct.ma_mon = m.ma_mon AND dh.trang_thai = 'delivered') * ${wOrder}) +
                       ((SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') * ${wClick}) +
                       ((SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') * ${wView}) +
                       ((SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') * ${wLike}) +
                       (COALESCE((SELECT AVG(so_sao) FROM danh_gia_san_pham dg WHERE dg.ma_mon = m.ma_mon AND dg.trang_thai = 'approved'), 0) * 20 * (${wRating}/100))
                   ) as popularity_score
            FROM mon_an m
            LEFT JOIN mon_an_khau_vi mk ON m.ma_mon = mk.ma_mon
            WHERE m.trang_thai = 1
            GROUP BY m.ma_mon
            HAVING popularity_score > 0
            ORDER BY popularity_score DESC, m.ma_mon DESC
            LIMIT 100
        `);

        // Check if user is logged in
        let userId = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.ma_nguoi_dung;
            } catch (err) {
                // Token invalid or expired, proceed as guest
            }
        }

        // "Top Bán Chạy" là số liệu toàn nhà hàng — KHÔNG lọc theo sở thích cá nhân.
        // Mỗi người dùng đều thấy cùng bảng xếp hạng khách quan dựa trên dữ liệu thực tế.
        const filteredProducts = topProducts;

        res.json({ success: true, data: filteredProducts.slice(0, limit) });
    } catch (error) {
        console.error('Error fetching top selling products:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// Gợi ý món ăn liên quan (ML - Collaborative Filtering)
const getRelatedDishes = async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const limit = parseInt(req.query.limit) || 4;

        const [currentProduct] = await db.query(
            'SELECT ma_danh_muc FROM mon_an WHERE ma_mon = ?',
            [productId]
        );

        if (currentProduct.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
        }

        const categoryId = currentProduct[0].ma_danh_muc;

        // Collaborative Filtering: Tìm các món thường được mua cùng
        const [relatedByOrders] = await db.query(`
            SELECT 
                m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet,
                m.so_luong_ton, m.trang_thai, m.ma_danh_muc,
                COUNT(ct2.ma_mon) as frequency,
                'bought_together' as recommendation_type,
                COALESCE(AVG(dg.so_sao), 0) as avg_rating,
                (SELECT COUNT(*) FROM chi_tiet_don_hang ct WHERE ct.ma_mon = m.ma_mon) as order_count,
                (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as click_count,
                (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as view_count,
                (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as like_count
            FROM chi_tiet_don_hang ct1
            JOIN chi_tiet_don_hang ct2 ON ct1.ma_don_hang = ct2.ma_don_hang AND ct1.ma_mon != ct2.ma_mon
            JOIN mon_an m ON ct2.ma_mon = m.ma_mon
            LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
            WHERE ct1.ma_mon = ?
            GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet, m.so_luong_ton, m.trang_thai, m.ma_danh_muc
            ORDER BY frequency DESC, m.ma_mon DESC
            LIMIT ?
        `, [productId, limit]);

        let recommendations = relatedByOrders;

        // Bổ sung món cùng danh mục nếu không đủ
        if (recommendations.length < limit) {
            const existingIds = recommendations.map(r => r.ma_mon);
            existingIds.push(productId);

            const placeholders = existingIds.map(() => '?').join(',');
            const remaining = limit - recommendations.length;

            const [sameCategoryProducts] = await db.query(`
                SELECT 
                    m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet,
                    m.so_luong_ton, m.trang_thai, m.ma_danh_muc,
                    COALESCE(SUM(ct.so_luong), 0) as frequency,
                    'same_category' as recommendation_type,
                    COALESCE(AVG(dg.so_sao), 0) as avg_rating,
                    (SELECT COUNT(*) FROM chi_tiet_don_hang ct WHERE ct.ma_mon = m.ma_mon) as order_count,
                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as click_count,
                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as view_count,
                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as like_count
                FROM mon_an m
                LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
                LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                WHERE m.ma_danh_muc = ? AND m.ma_mon NOT IN (${placeholders})
                GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet, m.so_luong_ton, m.trang_thai, m.ma_danh_muc
                ORDER BY frequency DESC, m.ma_mon DESC
                LIMIT ?
            `, [categoryId, ...existingIds, remaining]);

            recommendations = [...recommendations, ...sameCategoryProducts];
        }

        // Bổ sung món bán chạy nếu vẫn không đủ
        if (recommendations.length < limit) {
            const existingIds = recommendations.map(r => r.ma_mon);
            existingIds.push(productId);

            const placeholders = existingIds.map(() => '?').join(',');
            const remaining = limit - recommendations.length;

            const [topSellingProducts] = await db.query(`
                SELECT 
                    m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet,
                    m.so_luong_ton, m.trang_thai, m.ma_danh_muc,
                    COALESCE(SUM(ct.so_luong), 0) as frequency,
                    'top_selling' as recommendation_type,
                    COALESCE(AVG(dg.so_sao), 0) as avg_rating,
                    (SELECT COUNT(*) FROM chi_tiet_don_hang ct WHERE ct.ma_mon = m.ma_mon) as order_count,
                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'click') as click_count,
                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'view') as view_count,
                    (SELECT COUNT(*) FROM hanh_vi_nguoi_dung h WHERE h.ma_mon = m.ma_mon AND h.hanh_vi = 'like') as like_count
                FROM mon_an m
                LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
                LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                WHERE m.ma_mon NOT IN (${placeholders})
                GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet, m.so_luong_ton, m.trang_thai, m.ma_danh_muc
                ORDER BY frequency DESC, m.ma_mon DESC
                LIMIT ?
            `, [...existingIds, remaining]);

            recommendations = [...recommendations, ...topSellingProducts];
        }

        res.json({
            success: true,
            data: recommendations,
            meta: {
                productId,
                totalRecommendations: recommendations.length,
                types: {
                    bought_together: recommendations.filter(r => r.recommendation_type === 'bought_together').length,
                    same_category: recommendations.filter(r => r.recommendation_type === 'same_category').length,
                    top_selling: recommendations.filter(r => r.recommendation_type === 'top_selling').length
                }
            }
        });
    } catch (error) {
        console.error('Error fetching related products:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle trạng thái món ăn (Admin)
const toggleStatus = async (req, res) => {
    try {
        const productId = req.params.id;

        const [current] = await db.query('SELECT trang_thai FROM mon_an WHERE ma_mon = ?', [productId]);

        if (current.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
        }

        const newStatus = current[0].trang_thai == 1 ? 0 : 1;

        await db.query('UPDATE mon_an SET trang_thai = ? WHERE ma_mon = ?', [newStatus, productId]);

        res.json({
            success: true,
            message: newStatus == 1 ? 'Đã bật hiển thị món ăn' : 'Đã tắt hiển thị món ăn',
            data: { trang_thai: newStatus }
        });
    } catch (error) {
        console.error('Error toggling product status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cập nhật số lượng tồn kho (Admin)
const updateStock = async (req, res) => {
    try {
        const productId = req.params.id;
        const { so_luong_ton } = req.body;

        if (so_luong_ton === undefined || so_luong_ton < 0) {
            return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ!' });
        }

        const [current] = await db.query('SELECT ten_mon, trang_thai FROM mon_an WHERE ma_mon = ?', [productId]);
        if (current.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
        }

        const tenMon = current[0].ten_mon;
        let message = 'Cập nhật số lượng thành công';
        let outOfStock = false;

        if (so_luong_ton === 0) {
            await db.query('UPDATE mon_an SET so_luong_ton = 0, trang_thai = 0 WHERE ma_mon = ?', [productId]);
            message = `⚠️ Món "${tenMon}" đã HẾT HÀNG và đã được tự động ẩn!`;
            outOfStock = true;
        } else {
            await db.query('UPDATE mon_an SET so_luong_ton = ? WHERE ma_mon = ?', [so_luong_ton, productId]);
            if (so_luong_ton <= 5) {
                message = `⚠️ Cập nhật thành công! Món "${tenMon}" sắp hết hàng (còn ${so_luong_ton})`;
            }
        }

        res.json({ success: true, message, data: { so_luong_ton, outOfStock } });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Thêm món ăn mới (Admin)
const createDish = async (req, res) => {
    try {
        const { ten_mon, ma_danh_muc, gia_tien, dinh_luong, so_luong_ton, mo_ta_chi_tiet, trang_thai } = req.body;
        const anh_mon = req.file ? '/images/' + req.file.filename : null;

        const stockQty = parseInt(so_luong_ton) || 0;
        if (stockQty < 0) {
            return res.status(400).json({ success: false, message: 'Số lượng tồn không được là số âm!' });
        }

        let finalStatus = trang_thai;
        let warningMessage = '';
        if (stockQty === 0) {
            finalStatus = 0;
            warningMessage = ' ⚠️ Món ăn đã được tự động ẩn vì số lượng tồn = 0.';
        }

        const connection = await db.getConnection();
        let monId = null;

        try {
            await connection.beginTransaction();

            // INSERT món mới với ngay_tao = NOW()
            const [result] = await connection.query(
                `INSERT INTO mon_an (ten_mon, ma_danh_muc, gia_tien, dinh_luong, so_luong_ton, mo_ta_chi_tiet, trang_thai, anh_mon, ngay_tao) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [ten_mon, ma_danh_muc, gia_tien, dinh_luong, stockQty, mo_ta_chi_tiet, finalStatus, anh_mon]
            );

            monId = result.insertId;

            // Xử lý khẩu vị món ăn
            if (req.body.khau_vi) {
                let khauViIds = [];
                const rawVal = req.body.khau_vi;
                if (typeof rawVal === 'string') {
                    try {
                        const parsed = JSON.parse(rawVal);
                        if (Array.isArray(parsed)) {
                            khauViIds = parsed.map(id => parseInt(id)).filter(id => !isNaN(id));
                        } else if (!isNaN(parseInt(parsed))) {
                            khauViIds = [parseInt(parsed)];
                        }
                    } catch (e) {
                        if (rawVal.includes(',')) {
                            khauViIds = rawVal.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                        } else if (!isNaN(parseInt(rawVal))) {
                            khauViIds = [parseInt(rawVal)];
                        }
                    }
                } else if (Array.isArray(rawVal)) {
                    khauViIds = rawVal.map(id => parseInt(id)).filter(id => !isNaN(id));
                } else if (!isNaN(parseInt(rawVal))) {
                    khauViIds = [parseInt(rawVal)];
                }
                
                if (Array.isArray(khauViIds) && khauViIds.length > 0) {
                    const values = khauViIds.map(id => [monId, id]);
                    await connection.query('INSERT IGNORE INTO mon_an_khau_vi (ma_mon, id_thuoc_tinh) VALUES ?', [values]);
                }
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        res.json({
            success: true,
            message: 'Thêm món ăn thành công!' + warningMessage,
            id: monId,
            outOfStock: stockQty === 0
        });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cập nhật món ăn (Admin)
const updateDish = async (req, res) => {
    try {
        const { ten_mon, ma_danh_muc, gia_tien, dinh_luong, so_luong_ton, mo_ta_chi_tiet, trang_thai } = req.body;
        const anh_mon = req.file ? '/images/' + req.file.filename : null;

        const stockQty = parseInt(so_luong_ton) || 0;
        if (stockQty < 0) {
            return res.status(400).json({ success: false, message: 'Số lượng tồn không được là số âm!' });
        }

        let finalStatus = trang_thai;
        let warningMessage = '';
        if (stockQty === 0) {
            finalStatus = 0;
            warningMessage = ' ⚠️ Món ăn đã được tự động ẩn vì số lượng tồn = 0.';
        } else if (stockQty <= 5) {
            warningMessage = ` ⚠️ Lưu ý: Món ăn sắp hết hàng (còn ${stockQty}).`;
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                `UPDATE mon_an 
                 SET ten_mon = ?, ma_danh_muc = ?, gia_tien = ?, dinh_luong = ?, so_luong_ton = ?, 
                     mo_ta_chi_tiet = ?, trang_thai = ?, anh_mon = COALESCE(?, anh_mon)
                 WHERE ma_mon = ?`,
                [ten_mon, ma_danh_muc, gia_tien, dinh_luong, stockQty, mo_ta_chi_tiet, finalStatus, anh_mon, req.params.id]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
            }

            // Xử lý khẩu vị món ăn
            if (req.body.khau_vi !== undefined) {
                let khauViIds = [];
                if (req.body.khau_vi) {
                    const rawVal = req.body.khau_vi;
                    if (typeof rawVal === 'string') {
                        try {
                            const parsed = JSON.parse(rawVal);
                            if (Array.isArray(parsed)) {
                                khauViIds = parsed.map(id => parseInt(id)).filter(id => !isNaN(id));
                            } else if (!isNaN(parseInt(parsed))) {
                                khauViIds = [parseInt(parsed)];
                            }
                        } catch (e) {
                            if (rawVal.includes(',')) {
                                khauViIds = rawVal.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                            } else if (!isNaN(parseInt(rawVal))) {
                                khauViIds = [parseInt(rawVal)];
                            }
                        }
                    } else if (Array.isArray(rawVal)) {
                        khauViIds = rawVal.map(id => parseInt(id)).filter(id => !isNaN(id));
                    } else if (!isNaN(parseInt(rawVal))) {
                        khauViIds = [parseInt(rawVal)];
                    }
                }
                
                await connection.query('DELETE FROM mon_an_khau_vi WHERE ma_mon = ?', [req.params.id]);
                if (Array.isArray(khauViIds) && khauViIds.length > 0) {
                    const values = khauViIds.map(id => [req.params.id, id]);
                    await connection.query('INSERT IGNORE INTO mon_an_khau_vi (ma_mon, id_thuoc_tinh) VALUES ?', [values]);
                }
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        res.json({
            success: true,
            message: 'Cập nhật món ăn thành công!' + warningMessage,
            outOfStock: stockQty === 0
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Xóa món ăn (Admin)
const deleteDish = async (req, res) => {
    try {
        // Kiểm tra xem món ăn có trong đơn hàng không
        const [orderItems] = await db.query(
            'SELECT COUNT(*) as count FROM chi_tiet_don_hang WHERE ma_mon = ?',
            [req.params.id]
        );

        // Nếu món ăn đã có trong đơn hàng, không cho phép xóa
        // Thay vào đó, chuyển trạng thái thành không hoạt động
        if (orderItems[0].count > 0) {
            const [updateResult] = await db.query(
                'UPDATE mon_an SET trang_thai = 0 WHERE ma_mon = ?',
                [req.params.id]
            );

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Không tìm thấy món ăn' 
                });
            }

            return res.json({ 
                success: true, 
                message: 'Món ăn đã có trong đơn hàng, đã chuyển sang trạng thái không hoạt động thay vì xóa',
                deactivated: true
            });
        }

        // Nếu món ăn chưa có trong đơn hàng, cho phép xóa
        const [result] = await db.query('DELETE FROM mon_an WHERE ma_mon = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
        }

        res.json({ success: true, message: 'Xóa món ăn thành công' });
    } catch (error) {
        console.error('Error deleting product:', error);
        
        // Xử lý lỗi foreign key constraint
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể xóa món ăn này vì đã có trong đơn hàng. Vui lòng thử lại sau hoặc chuyển sang trạng thái không hoạt động.' 
            });
        }
        
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy danh sách khẩu vị
const getFlavors = async (req, res) => {
    try {
        const [flavors] = await db.query('SELECT * FROM thuoc_tinh_khau_vi ORDER BY id');
        res.json({ success: true, data: flavors });
    } catch (error) {
        console.error('Error fetching flavors:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const createFlavor = async (req, res) => {
    try {
        const { ten_thuoc_tinh } = req.body;
        if (!ten_thuoc_tinh) {
            return res.status(400).json({ success: false, message: 'Tên khẩu vị là bắt buộc' });
        }
        const [result] = await db.query('INSERT INTO thuoc_tinh_khau_vi (ten_thuoc_tinh) VALUES (?)', [ten_thuoc_tinh]);
        res.json({ success: true, message: 'Thêm khẩu vị thành công', data: { id: result.insertId, ten_thuoc_tinh } });
    } catch (error) {
        console.error('Error creating flavor:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateFlavor = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_thuoc_tinh } = req.body;
        if (!ten_thuoc_tinh) {
            return res.status(400).json({ success: false, message: 'Tên khẩu vị là bắt buộc' });
        }
        await db.query('UPDATE thuoc_tinh_khau_vi SET ten_thuoc_tinh = ? WHERE id = ?', [ten_thuoc_tinh, id]);
        res.json({ success: true, message: 'Cập nhật khẩu vị thành công' });
    } catch (error) {
        console.error('Error updating flavor:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteFlavor = async (req, res) => {
    // Delete in a transaction or manually delete constraints
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        
        await connection.query('DELETE FROM mon_an_khau_vi WHERE id_thuoc_tinh = ?', [id]);
        await connection.query('DELETE FROM so_thich_khau_vi_nguoi_dung WHERE id_thuoc_tinh = ?', [id]);
        await connection.query('DELETE FROM thuoc_tinh_khau_vi WHERE id = ?', [id]);
        
        await connection.commit();
        res.json({ success: true, message: 'Xóa khẩu vị thành công' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting flavor:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    getAllDishes,
    getDishesByCategory,
    getDishById,
    getTopSelling,
    getRelatedDishes,
    toggleStatus,
    updateStock,
    createDish,
    updateDish,
    deleteDish,
    getFlavors,
    createFlavor,
    updateFlavor,
    deleteFlavor
};
