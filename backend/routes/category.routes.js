const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET: Lấy tất cả danh mục (chỉ danh mục đang hoạt động)
router.get('/', async (req, res) => {
  try {
    const [categories] = await db.query(
      'SELECT * FROM danh_muc WHERE trang_thai = 1 ORDER BY ten_danh_muc ASC'
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh mục',
      error: error.message
    });
  }
});

// GET: Lấy danh mục theo ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [categories] = await db.query(
      'SELECT * FROM danh_muc WHERE ma_danh_muc = ? AND trang_thai = 1',
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
    }

    res.json({
      success: true,
      data: categories[0]
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh mục:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh mục',
      error: error.message
    });
  }
});

module.exports = router;
