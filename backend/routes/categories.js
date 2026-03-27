const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Lấy tất cả danh mục
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM danh_muc ORDER BY ma_danh_muc');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Lấy danh mục theo ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM danh_muc WHERE ma_danh_muc = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Thêm danh mục mới
router.post('/', async (req, res) => {
    try {
        const { ten_danh_muc, mo_ta, trang_thai } = req.body;
        if (!ten_danh_muc) {
            return res.status(400).json({ success: false, message: 'Tên danh mục là bắt buộc' });
        }

        const [result] = await db.query(
            'INSERT INTO danh_muc (ten_danh_muc, mo_ta, trang_thai) VALUES (?, ?, ?)',
            [ten_danh_muc, mo_ta, trang_thai !== undefined ? trang_thai : 1]
        );

        res.json({
            success: true,
            message: 'Thêm danh mục thành công',
            data: { ma_danh_muc: result.insertId, ten_danh_muc, mo_ta, trang_thai }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Cập nhật danh mục
router.put('/:id', async (req, res) => {
    try {
        const { ten_danh_muc, mo_ta, trang_thai } = req.body;
        const { id } = req.params;

        const [result] = await db.query(
            'UPDATE danh_muc SET ten_danh_muc = ?, mo_ta = ?, trang_thai = ? WHERE ma_danh_muc = ?',
            [ten_danh_muc, mo_ta, trang_thai, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }

        res.json({ success: true, message: 'Cập nhật danh mục thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Xóa danh mục (Xóa cứng hoặc mềm tùy nhu cầu, ở đây tôi dùng xóa cứng nhưng khuyến cáo nên kiểm tra món ăn trước)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra xem có món ăn nào thuộc danh mục này không
        const [products] = await db.query('SELECT COUNT(*) as count FROM mon_an WHERE ma_danh_muc = ?', [id]);
        if (products[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa danh mục này vì vẫn còn món ăn thuộc danh mục. Hãy chuyển món ăn sang danh mục khác hoặc xóa món ăn trước.'
            });
        }

        const [result] = await db.query('DELETE FROM danh_muc WHERE ma_danh_muc = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }

        res.json({ success: true, message: 'Xóa danh mục thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
