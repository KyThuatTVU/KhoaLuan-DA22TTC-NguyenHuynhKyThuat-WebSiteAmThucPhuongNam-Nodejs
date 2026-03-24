const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createAdminNotification } = require('./admin-notifications');

// Cấu hình multer cho upload hình ảnh
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../images/contacts');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'contact-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Chỉ chấp nhận file hình ảnh!'));
    }
});

// GET - Lấy tất cả liên hệ (Admin)
router.get('/', async (req, res) => {
    try {
        const { trang_thai, search, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM lien_he WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM lien_he WHERE 1=1';
        const params = [];
        
        if (trang_thai) {
            query += ' AND trang_thai = ?';
            countQuery += ' AND trang_thai = ?';
            params.push(trang_thai);
        }
        
        if (search) {
            query += ' AND (ho_ten LIKE ? OR email LIKE ? OR noi_dung LIKE ?)';
            countQuery += ' AND (ho_ten LIKE ? OR email LIKE ? OR noi_dung LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }
        
        // Count total
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;
        
        // Get data with pagination
        query += ' ORDER BY ngay_gui DESC LIMIT ? OFFSET ?';
        const [rows] = await db.query(query, [...params, parseInt(limit), parseInt(offset)]);
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách liên hệ:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// GET - Lấy chi tiết liên hệ
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM lien_he WHERE ma_lien_he = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// POST - Tạo liên hệ mới (từ frontend)
router.post('/', upload.array('hinh_anh', 5), async (req, res) => {
    try {
        const { ho_ten, email, so_dien_thoai, tieu_de, noi_dung } = req.body;
        
        if (!ho_ten || !email || !noi_dung) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
        }
        
        // Xử lý hình ảnh upload
        let hinh_anh = null;
        if (req.files && req.files.length > 0) {
            hinh_anh = req.files.map(f => '/images/contacts/' + f.filename).join(',');
        }
        
        const [result] = await db.query(
            `INSERT INTO lien_he (ho_ten, email, so_dien_thoai, tieu_de, noi_dung, hinh_anh, ngay_gui, trang_thai) 
             VALUES (?, ?, ?, ?, ?, ?, NOW(), 'new')`,
            [ho_ten, email, so_dien_thoai || null, tieu_de || 'Câu hỏi chung', noi_dung, hinh_anh]
        );
        
        // Tạo thông báo cho admin
        await createAdminNotification(
            'contact_message',
            `Tin nhắn liên hệ mới từ ${ho_ten}`,
            `${tieu_de || 'Câu hỏi chung'} - ${noi_dung.substring(0, 100)}${noi_dung.length > 100 ? '...' : ''}`,
            `quan-ly-lien-he.html?id=${result.insertId}`,
            result.insertId
        );
        
        res.status(201).json({
            success: true,
            message: 'Gửi liên hệ thành công! Chúng tôi sẽ phản hồi sớm nhất.',
            data: { ma_lien_he: result.insertId }
        });
    } catch (error) {
        console.error('Lỗi tạo liên hệ:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// PUT - Cập nhật trạng thái liên hệ (Admin)
router.put('/:id', async (req, res) => {
    try {
        const { trang_thai, ghi_chu_admin } = req.body;
        const [result] = await db.query(
            'UPDATE lien_he SET trang_thai = ?, ghi_chu_admin = ? WHERE ma_lien_he = ?',
            [trang_thai, ghi_chu_admin || null, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ' });
        }
        
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// DELETE - Xóa liên hệ (Admin)
router.delete('/:id', async (req, res) => {
    try {
        // Lấy thông tin hình ảnh trước khi xóa
        const [contact] = await db.query('SELECT hinh_anh FROM lien_he WHERE ma_lien_he = ?', [req.params.id]);
        
        if (contact.length > 0 && contact[0].hinh_anh) {
            // Xóa các file hình ảnh
            const images = contact[0].hinh_anh.split(',');
            images.forEach(img => {
                const imgPath = path.join(__dirname, '..', img);
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            });
        }
        
        const [result] = await db.query('DELETE FROM lien_he WHERE ma_lien_he = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ' });
        }
        
        res.json({ success: true, message: 'Xóa liên hệ thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// GET - Thống kê liên hệ
router.get('/stats/summary', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN trang_thai = 'new' THEN 1 ELSE 0 END) as new_count,
                SUM(CASE WHEN trang_thai = 'read' THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN trang_thai = 'replied' THEN 1 ELSE 0 END) as replied_count
            FROM lien_he
        `);
        res.json({ success: true, data: stats[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

module.exports = router;
