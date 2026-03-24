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

module.exports = router;
