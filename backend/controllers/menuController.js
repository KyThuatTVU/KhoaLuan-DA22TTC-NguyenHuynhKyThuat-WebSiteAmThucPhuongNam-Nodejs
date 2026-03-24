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
                   COUNT(DISTINCT dg.ma_danh_gia) as total_reviews
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
            SELECT m.*, d.ten_danh_muc 
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

// Lấy top món ăn bán chạy
const getTopSelling = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 4;

        const [topProducts] = await db.query(`
            SELECT m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet,
                   COALESCE(SUM(ct.so_luong), 0) as da_ban,
                   COALESCE(AVG(dg.so_sao), 0) as avg_rating,
                   COUNT(DISTINCT dg.ma_danh_gia) as total_reviews
            FROM mon_an m
            LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
            LEFT JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
            LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
            GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet
            ORDER BY da_ban DESC
            LIMIT ?
        `, [limit]);

        res.json({ success: true, data: topProducts });
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
                COALESCE(AVG(dg.so_sao), 0) as avg_rating
            FROM chi_tiet_don_hang ct1
            JOIN chi_tiet_don_hang ct2 ON ct1.ma_don_hang = ct2.ma_don_hang AND ct1.ma_mon != ct2.ma_mon
            JOIN mon_an m ON ct2.ma_mon = m.ma_mon
            LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
            WHERE ct1.ma_mon = ?
            GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet, m.so_luong_ton, m.trang_thai, m.ma_danh_muc
            ORDER BY frequency DESC
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
                    COALESCE(AVG(dg.so_sao), 0) as avg_rating
                FROM mon_an m
                LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
                LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                WHERE m.ma_danh_muc = ? AND m.ma_mon NOT IN (${placeholders})
                GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet, m.so_luong_ton, m.trang_thai, m.ma_danh_muc
                ORDER BY frequency DESC
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
                    COALESCE(AVG(dg.so_sao), 0) as avg_rating
                FROM mon_an m
                LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
                LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                WHERE m.ma_mon NOT IN (${placeholders})
                GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.mo_ta_chi_tiet, m.so_luong_ton, m.trang_thai, m.ma_danh_muc
                ORDER BY frequency DESC
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
        const { ten_mon, ma_danh_muc, gia_tien, so_luong_ton, mo_ta_chi_tiet, trang_thai } = req.body;
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

        const [result] = await db.query(
            `INSERT INTO mon_an (ten_mon, ma_danh_muc, gia_tien, so_luong_ton, mo_ta_chi_tiet, trang_thai, anh_mon) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [ten_mon, ma_danh_muc, gia_tien, stockQty, mo_ta_chi_tiet, finalStatus, anh_mon]
        );

        res.json({
            success: true,
            message: 'Thêm món ăn thành công!' + warningMessage,
            id: result.insertId,
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
        const { ten_mon, ma_danh_muc, gia_tien, so_luong_ton, mo_ta_chi_tiet, trang_thai } = req.body;
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

        const [result] = await db.query(
            `UPDATE mon_an 
             SET ten_mon = ?, ma_danh_muc = ?, gia_tien = ?, so_luong_ton = ?, 
                 mo_ta_chi_tiet = ?, trang_thai = ?, anh_mon = COALESCE(?, anh_mon)
             WHERE ma_mon = ?`,
            [ten_mon, ma_danh_muc, gia_tien, stockQty, mo_ta_chi_tiet, finalStatus, anh_mon, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
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
        const [result] = await db.query('DELETE FROM mon_an WHERE ma_mon = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
        }

        res.json({ success: true, message: 'Xóa món ăn thành công' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: error.message });
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
    deleteDish
};
