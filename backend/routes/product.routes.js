const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET: Lấy tất cả món ăn (có phân trang và lọc)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      search, 
      featured,
      sort = 'newest' 
    } = req.query;

    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        m.*,
        d.ten_danh_muc,
        COALESCE(m.gia_khuyen_mai, m.gia_tien) as gia_hien_tai
      FROM mon_an m
      LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
      WHERE m.trang_thai = 1
    `;
    
    const params = [];

    // Lọc theo danh mục
    if (category) {
      query += ' AND m.ma_danh_muc = ?';
      params.push(category);
    }

    // Lọc món nổi bật
    if (featured === 'true') {
      query += ' AND m.is_featured = 1';
    }

    // Tìm kiếm
    if (search) {
      query += ' AND (m.ten_mon LIKE ? OR m.mo_ta_chi_tiet LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sắp xếp
    switch (sort) {
      case 'price_asc':
        query += ' ORDER BY gia_hien_tai ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY gia_hien_tai DESC';
        break;
      case 'name_asc':
        query += ' ORDER BY m.ten_mon ASC';
        break;
      case 'name_desc':
        query += ' ORDER BY m.ten_mon DESC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY m.ngay_cap_nhat DESC';
        break;
    }

    // Đếm tổng số món
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Thêm phân trang
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [products] = await db.query(query, params);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy món ăn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy món ăn',
      error: error.message
    });
  }
});

// GET: Lấy món ăn theo ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [products] = await db.query(
      `SELECT 
        m.*,
        d.ten_danh_muc,
        COALESCE(m.gia_khuyen_mai, m.gia_tien) as gia_hien_tai
      FROM mon_an m
      LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
      WHERE m.ma_mon = ? AND m.trang_thai = 1`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy món ăn'
      });
    }

    res.json({
      success: true,
      data: products[0]
    });
  } catch (error) {
    console.error('Lỗi khi lấy món ăn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy món ăn',
      error: error.message
    });
  }
});

// GET: Lấy món ăn nổi bật
router.get('/featured/list', async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const [products] = await db.query(
      `SELECT 
        m.*,
        d.ten_danh_muc,
        COALESCE(m.gia_khuyen_mai, m.gia_tien) as gia_hien_tai
      FROM mon_an m
      LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
      WHERE m.trang_thai = 1 AND m.is_featured = 1
      ORDER BY m.ngay_cap_nhat DESC
      LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Lỗi khi lấy món nổi bật:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy món nổi bật',
      error: error.message
    });
  }
});

// GET: Lấy món ăn liên quan
router.get('/:id/related', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;

    // Lấy danh mục của món hiện tại
    const [currentProduct] = await db.query(
      'SELECT ma_danh_muc FROM mon_an WHERE ma_mon = ?',
      [id]
    );

    if (currentProduct.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy món ăn'
      });
    }

    // Lấy món cùng danh mục
    const [products] = await db.query(
      `SELECT 
        m.*,
        d.ten_danh_muc,
        COALESCE(m.gia_khuyen_mai, m.gia_tien) as gia_hien_tai
      FROM mon_an m
      LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
      WHERE m.ma_danh_muc = ? 
        AND m.ma_mon != ? 
        AND m.trang_thai = 1
      ORDER BY RAND()
      LIMIT ?`,
      [currentProduct[0].ma_danh_muc, id, parseInt(limit)]
    );

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Lỗi khi lấy món liên quan:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy món liên quan',
      error: error.message
    });
  }
});

module.exports = router;
