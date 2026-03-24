const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware xác thực JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
        }
        req.user = user;
        next();
    });
}

// Lấy danh sách thông báo của user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_nguoi_dung;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const [notifications] = await db.query(`
            SELECT * FROM thong_bao 
            WHERE ma_nguoi_dung = ? 
            ORDER BY ngay_tao DESC 
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);

        // Đếm số thông báo chưa đọc
        const [unreadCount] = await db.query(`
            SELECT COUNT(*) as count FROM thong_bao 
            WHERE ma_nguoi_dung = ? AND da_doc = 0
        `, [userId]);

        res.json({
            success: true,
            data: notifications,
            unreadCount: unreadCount[0].count
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Đếm số thông báo chưa đọc
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_nguoi_dung;

        const [result] = await db.query(`
            SELECT COUNT(*) as count FROM thong_bao 
            WHERE ma_nguoi_dung = ? AND da_doc = 0
        `, [userId]);

        res.json({
            success: true,
            count: result[0].count
        });
    } catch (error) {
        console.error('Error counting unread notifications:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Đánh dấu thông báo đã đọc
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_nguoi_dung;
        const notificationId = req.params.id;

        await db.query(`
            UPDATE thong_bao SET da_doc = 1 
            WHERE ma_thong_bao = ? AND ma_nguoi_dung = ?
        `, [notificationId, userId]);

        res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Đánh dấu tất cả thông báo đã đọc
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_nguoi_dung;

        await db.query(`
            UPDATE thong_bao SET da_doc = 1 
            WHERE ma_nguoi_dung = ? AND da_doc = 0
        `, [userId]);

        res.json({ success: true, message: 'Đã đánh dấu tất cả đã đọc' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Xóa thông báo
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_nguoi_dung;
        const notificationId = req.params.id;

        await db.query(`
            DELETE FROM thong_bao 
            WHERE ma_thong_bao = ? AND ma_nguoi_dung = ?
        `, [notificationId, userId]);

        res.json({ success: true, message: 'Đã xóa thông báo' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Xóa tất cả thông báo
router.delete('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.ma_nguoi_dung;

        await db.query(`DELETE FROM thong_bao WHERE ma_nguoi_dung = ?`, [userId]);

        res.json({ success: true, message: 'Đã xóa tất cả thông báo' });
    } catch (error) {
        console.error('Error deleting all notifications:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== HELPER FUNCTIONS ====================

// Hàm tạo thông báo (dùng nội bộ)
async function createNotification(userId, type, title, content, link = null, relatedId = null) {
    try {
        await db.query(`
            INSERT INTO thong_bao (ma_nguoi_dung, loai, tieu_de, noi_dung, duong_dan, ma_lien_quan)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, type, title, content, link, relatedId]);
        return true;
    } catch (error) {
        console.error('Error creating notification:', error);
        return false;
    }
}

// Gửi thông báo cho tất cả users (tin tức mới, khuyến mãi)
async function notifyAllUsers(type, title, content, link = null, relatedId = null) {
    try {
        const [users] = await db.query('SELECT ma_nguoi_dung FROM nguoi_dung WHERE trang_thai = 1');
        
        for (const user of users) {
            await createNotification(user.ma_nguoi_dung, type, title, content, link, relatedId);
        }
        return true;
    } catch (error) {
        console.error('Error notifying all users:', error);
        return false;
    }
}

// Export helper functions
router.createNotification = createNotification;
router.notifyAllUsers = notifyAllUsers;

// ==================== ADMIN ROUTES ====================

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized - Admin only' });
    }
};

// Admin gửi thông báo cho tất cả users
router.post('/admin/broadcast', requireAdmin, async (req, res) => {
    try {
        const { loai, tieu_de, noi_dung, duong_dan } = req.body;

        if (!tieu_de) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề thông báo' });
        }

        const validTypes = ['news', 'promo', 'system'];
        const type = validTypes.includes(loai) ? loai : 'system';

        const [users] = await db.query('SELECT ma_nguoi_dung FROM nguoi_dung WHERE trang_thai = 1');
        
        let count = 0;
        for (const user of users) {
            await db.query(`
                INSERT INTO thong_bao (ma_nguoi_dung, loai, tieu_de, noi_dung, duong_dan)
                VALUES (?, ?, ?, ?, ?)
            `, [user.ma_nguoi_dung, type, tieu_de, noi_dung || '', duong_dan || null]);
            count++;
        }

        console.log(`📢 Admin đã gửi thông báo "${tieu_de}" cho ${count} users`);

        res.json({
            success: true,
            message: `Đã gửi thông báo cho ${count} người dùng`,
            count
        });
    } catch (error) {
        console.error('Error broadcasting notification:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin lấy danh sách tất cả thông báo
router.get('/admin/all', requireAdmin, async (req, res) => {
    try {
        const [notifications] = await db.query(`
            SELECT tb.*, nd.ten_nguoi_dung, nd.email
            FROM thong_bao tb
            JOIN nguoi_dung nd ON tb.ma_nguoi_dung = nd.ma_nguoi_dung
            ORDER BY tb.ngay_tao DESC
            LIMIT 500
        `);

        // Thống kê
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN da_doc = 0 THEN 1 ELSE 0 END) as unread,
                SUM(CASE WHEN loai = 'news' THEN 1 ELSE 0 END) as news,
                SUM(CASE WHEN loai = 'promo' THEN 1 ELSE 0 END) as promo,
                SUM(CASE WHEN loai = 'comment_reply' THEN 1 ELSE 0 END) as comment_reply,
                SUM(CASE WHEN loai = 'comment_like' THEN 1 ELSE 0 END) as comment_like
            FROM thong_bao
        `);

        res.json({
            success: true,
            data: notifications,
            stats: stats[0]
        });
    } catch (error) {
        console.error('Error fetching admin notifications:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin xóa thông báo
router.delete('/admin/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM thong_bao WHERE ma_thong_bao = ?', [id]);
        res.json({ success: true, message: 'Đã xóa thông báo' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
