const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.admin) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized - Admin only'
        });
    }
    next();
};

// ===== LẤY DANH SÁCH THÔNG BÁO ADMIN =====
router.get('/', requireAdmin, async (req, res) => {
    try {
        const { limit = 20, offset = 0, loai } = req.query;

        let query = 'SELECT * FROM thong_bao_admin';
        let params = [];

        if (loai && loai !== 'all') {
            query += ' WHERE loai = ?';
            params.push(loai);
        }

        query += ' ORDER BY ngay_tao DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [notifications] = await db.query(query, params);

        // Đếm số thông báo chưa đọc
        const [unreadCount] = await db.query(
            'SELECT COUNT(*) as count FROM thong_bao_admin WHERE da_doc = FALSE'
        );

        res.json({
            success: true,
            data: notifications,
            unreadCount: unreadCount[0].count
        });
    } catch (error) {
        console.error('Error fetching admin notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ===== ĐẾM SỐ THÔNG BÁO CHƯA ĐỌC =====
router.get('/unread-count', requireAdmin, async (req, res) => {
    try {
        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM thong_bao_admin WHERE da_doc = FALSE'
        );

        res.json({
            success: true,
            count: result[0].count
        });
    } catch (error) {
        console.error('Error counting unread notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ===== ĐÁNH DẤU ĐÃ ĐỌC =====
router.put('/:id/read', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'UPDATE thong_bao_admin SET da_doc = TRUE WHERE ma_thong_bao = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Đã đánh dấu đã đọc'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ===== ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC =====
router.put('/read-all', requireAdmin, async (req, res) => {
    try {
        await db.query('UPDATE thong_bao_admin SET da_doc = TRUE WHERE da_doc = FALSE');

        res.json({
            success: true,
            message: 'Đã đánh dấu tất cả đã đọc'
        });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ===== XÓA THÔNG BÁO =====
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM thong_bao_admin WHERE ma_thong_bao = ?', [id]);

        res.json({
            success: true,
            message: 'Đã xóa thông báo'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ===== THỐNG KÊ THÔNG BÁO =====
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN da_doc = FALSE THEN 1 ELSE 0 END) as unread,
                SUM(CASE WHEN loai = 'new_order' THEN 1 ELSE 0 END) as new_order,
                SUM(CASE WHEN loai = 'new_reservation' THEN 1 ELSE 0 END) as new_reservation,
                SUM(CASE WHEN loai = 'new_comment' THEN 1 ELSE 0 END) as new_comment,
                SUM(CASE WHEN loai = 'new_review' THEN 1 ELSE 0 END) as new_review,
                SUM(CASE WHEN loai = 'new_user' THEN 1 ELSE 0 END) as new_user,
                SUM(CASE WHEN loai = 'contact_message' THEN 1 ELSE 0 END) as contact_message
            FROM thong_bao_admin
        `);

        res.json({
            success: true,
            data: stats[0]
        });
    } catch (error) {
        console.error('Error fetching notification stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// ===== HÀM TẠO THÔNG BÁO CHO ADMIN (Helper function) =====
async function createAdminNotification(loai, tieu_de, noi_dung, duong_dan, ma_lien_quan) {
    try {
        await db.query(`
            INSERT INTO thong_bao_admin (loai, tieu_de, noi_dung, duong_dan, ma_lien_quan)
            VALUES (?, ?, ?, ?, ?)
        `, [loai, tieu_de, noi_dung, duong_dan, ma_lien_quan]);
        
        console.log(`📢 Admin notification created: ${tieu_de}`);
    } catch (error) {
        console.error('Error creating admin notification:', error);
    }
}

// Export router và helper function
module.exports = router;
module.exports.createAdminNotification = createAdminNotification;
