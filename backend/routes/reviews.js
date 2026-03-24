const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createAdminNotification } = require('./admin-notifications');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Cấu hình multer để upload ảnh đánh giá
const reviewImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../images/reviews');
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadReviewImages = multer({
  storage: reviewImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)!'));
    }
  }
}).array('images', 5); // Tối đa 5 ảnh

// Middleware xác thực JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

// Lấy đánh giá của món ăn (public) - có thêm thông tin user để hiển thị nút sửa/xóa
router.get('/product/:productId', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const currentUserId = req.user ? req.user.ma_nguoi_dung : null;
    
    // Lấy danh sách bình luận đã duyệt
    const [reviews] = await db.query(`
      SELECT dg.ma_danh_gia, dg.ma_nguoi_dung, dg.so_sao, dg.binh_luan, dg.ngay_danh_gia,
             dg.hinh_anh,
             nd.ten_nguoi_dung, nd.anh_dai_dien
      FROM danh_gia_san_pham dg
      JOIN nguoi_dung nd ON dg.ma_nguoi_dung = nd.ma_nguoi_dung
      WHERE dg.ma_mon = ? AND dg.trang_thai = 'approved'
      ORDER BY dg.ngay_danh_gia DESC
    `, [productId]);

    // Lấy replies của admin cho mỗi review
    const reviewIds = reviews.map(r => r.ma_danh_gia);
    let repliesMap = {};
    
    if (reviewIds.length > 0) {
      const [replies] = await db.query(`
        SELECT ma_tra_loi, ma_danh_gia, noi_dung, ten_admin, ngay_tra_loi
        FROM tra_loi_danh_gia
        WHERE ma_danh_gia IN (?)
        ORDER BY ngay_tra_loi ASC
      `, [reviewIds]);

      replies.forEach(reply => {
        if (!repliesMap[reply.ma_danh_gia]) {
          repliesMap[reply.ma_danh_gia] = [];
        }
        repliesMap[reply.ma_danh_gia].push(reply);
      });
    }
    
    // Đánh dấu đánh giá nào là của user hiện tại và parse ảnh, thêm replies
    const reviewsWithOwnership = reviews.map(r => ({
      ...r,
      is_owner: currentUserId && r.ma_nguoi_dung === currentUserId,
      images: r.hinh_anh ? JSON.parse(r.hinh_anh) : [],
      replies: repliesMap[r.ma_danh_gia] || []
    }));

    // Tính điểm trung bình và thống kê
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(so_sao) as average_rating,
        SUM(CASE WHEN so_sao = 5 THEN 1 ELSE 0 END) as star_5,
        SUM(CASE WHEN so_sao = 4 THEN 1 ELSE 0 END) as star_4,
        SUM(CASE WHEN so_sao = 3 THEN 1 ELSE 0 END) as star_3,
        SUM(CASE WHEN so_sao = 2 THEN 1 ELSE 0 END) as star_2,
        SUM(CASE WHEN so_sao = 1 THEN 1 ELSE 0 END) as star_1
      FROM danh_gia_san_pham
      WHERE ma_mon = ? AND trang_thai = 'approved'
    `, [productId]);

    res.json({
      success: true,
      data: {
        reviews: reviewsWithOwnership,
        stats: {
          totalReviews: stats[0].total_reviews || 0,
          averageRating: parseFloat(stats[0].average_rating) || 0,
          distribution: {
            5: stats[0].star_5 || 0,
            4: stats[0].star_4 || 0,
            3: stats[0].star_3 || 0,
            2: stats[0].star_2 || 0,
            1: stats[0].star_1 || 0
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Kiểm tra user có thể bình luận không (chỉ cho phép khi đã mua sản phẩm)
router.get('/check/:productId', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    
    // Debug log
    console.log('🔍 Check review - ProductId:', productId, '- User:', req.user ? req.user.ma_nguoi_dung : 'null');
    
    if (!req.user) {
      console.log('❌ User not logged in');
      return res.json({ success: true, canReview: false, reason: 'not_logged_in' });
    }

    const userId = req.user.ma_nguoi_dung;

    // Đếm số bình luận của user cho sản phẩm này
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total FROM danh_gia_san_pham 
      WHERE ma_mon = ? AND ma_nguoi_dung = ?
    `, [productId, userId]);

    // Kiểm tra đã mua món này chưa (BẮT BUỘC) - đơn hàng phải ở trạng thái 'delivered'
    const [purchased] = await db.query(`
      SELECT ct.ma_ct_don, dh.ma_don_hang, dh.trang_thai 
      FROM chi_tiet_don_hang ct
      JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
      WHERE ct.ma_mon = ? AND dh.ma_nguoi_dung = ? AND dh.trang_thai = 'delivered'
      LIMIT 1
    `, [productId, userId]);

    const hasPurchased = purchased.length > 0;
    
    // Debug log
    console.log('📦 Purchase check - UserId:', userId, '- ProductId:', productId, '- HasPurchased:', hasPurchased);
    if (purchased.length > 0) {
      console.log('✅ Found order:', purchased[0]);
    }

    // Chỉ cho phép bình luận nếu đã mua sản phẩm
    if (!hasPurchased) {
      console.log('⚠️ User has not purchased this product');
      return res.json({ 
        success: true, 
        canReview: false,
        reason: 'not_purchased',
        hasPurchased: false,
        reviewCount: countResult[0].total
      });
    }

    // Đã mua -> cho phép bình luận
    console.log('✅ User can review this product');
    res.json({ 
      success: true, 
      canReview: true,
      hasPurchased: true,
      reviewCount: countResult[0].total
    });
  } catch (error) {
    console.error('Error checking review status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Thêm bình luận mới với ảnh (yêu cầu đăng nhập VÀ đã mua sản phẩm)
router.post('/', authenticateToken, (req, res) => {
  uploadReviewImages(req, res, async function (err) {
    try {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: 'Lỗi upload: ' + err.message });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để bình luận' });
      }

      const { ma_mon, so_sao, binh_luan } = req.body;
      const userId = req.user.ma_nguoi_dung;

      // Validate
      if (!ma_mon || !so_sao || so_sao < 1 || so_sao > 5) {
        return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
      }

      // Kiểm tra đã mua sản phẩm chưa (BẮT BUỘC)
      const [purchased] = await db.query(`
        SELECT ct.ma_ct_don FROM chi_tiet_don_hang ct
        JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
        WHERE ct.ma_mon = ? AND dh.ma_nguoi_dung = ? AND dh.trang_thai = 'delivered'
        LIMIT 1
      `, [ma_mon, userId]);

      if (purchased.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bạn cần mua sản phẩm này trước khi đánh giá' 
        });
      }

      // Xử lý ảnh upload
      let imagesJson = null;
      if (req.files && req.files.length > 0) {
        const imagePaths = req.files.map(file => '/images/reviews/' + file.filename);
        imagesJson = JSON.stringify(imagePaths);
      }

      // Thêm bình luận (cho phép nhiều bình luận từ 1 user đã mua)
      const [result] = await db.query(`
        INSERT INTO danh_gia_san_pham (ma_mon, ma_nguoi_dung, so_sao, binh_luan, hinh_anh, trang_thai)
        VALUES (?, ?, ?, ?, ?, 'approved')
      `, [ma_mon, userId, so_sao, binh_luan || null, imagesJson]);

      // Tạo thông báo cho admin
      const [user] = await db.query('SELECT ten_nguoi_dung FROM nguoi_dung WHERE ma_nguoi_dung = ?', [userId]);
      const [dish] = await db.query('SELECT ten_mon FROM mon_an WHERE ma_mon = ?', [ma_mon]);
      const userName = user[0]?.ten_nguoi_dung || 'Khách hàng';
      const dishName = dish[0]?.ten_mon || 'món ăn';
      
      await createAdminNotification(
        'new_review',
        `Đánh giá mới ${so_sao}⭐`,
        `${userName} đã đánh giá "${dishName}"`,
        `../chitietmonan.html?id=${ma_mon}`,
        result.insertId
      );

      res.json({ 
        success: true, 
        message: 'Bình luận thành công!',
        data: { ma_danh_gia: result.insertId }
      });
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

// Cập nhật đánh giá với ảnh (chỉ chủ sở hữu)
router.put('/:reviewId', authenticateToken, (req, res) => {
  uploadReviewImages(req, res, async function (err) {
    try {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: 'Lỗi upload: ' + err.message });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
      }

      const reviewId = parseInt(req.params.reviewId);
      const userId = req.user.ma_nguoi_dung;
      const { so_sao, binh_luan, keep_images } = req.body;

      // Validate
      if (!so_sao || so_sao < 1 || so_sao > 5) {
        return res.status(400).json({ success: false, message: 'Số sao không hợp lệ' });
      }

      // Kiểm tra đánh giá có thuộc về user không
      const [existing] = await db.query(`
        SELECT ma_danh_gia, hinh_anh FROM danh_gia_san_pham 
        WHERE ma_danh_gia = ? AND ma_nguoi_dung = ?
      `, [reviewId, userId]);

      if (existing.length === 0) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa đánh giá này' });
      }

      // Xử lý ảnh
      let imagesJson = null;
      const keptImages = keep_images ? JSON.parse(keep_images) : [];
      const newImages = req.files ? req.files.map(file => '/images/reviews/' + file.filename) : [];
      const allImages = [...keptImages, ...newImages];
      
      if (allImages.length > 0) {
        imagesJson = JSON.stringify(allImages);
      }

      // Cập nhật đánh giá
      await db.query(`
        UPDATE danh_gia_san_pham 
        SET so_sao = ?, binh_luan = ?, hinh_anh = ?, ngay_danh_gia = NOW()
        WHERE ma_danh_gia = ?
      `, [so_sao, binh_luan || null, imagesJson, reviewId]);

      res.json({ success: true, message: 'Cập nhật đánh giá thành công!' });
    } catch (error) {
      console.error('Error updating review:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

// Xóa đánh giá (chỉ chủ sở hữu)
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const reviewId = parseInt(req.params.reviewId);
    const userId = req.user.ma_nguoi_dung;

    // Kiểm tra đánh giá có thuộc về user không
    const [existing] = await db.query(`
      SELECT ma_danh_gia FROM danh_gia_san_pham 
      WHERE ma_danh_gia = ? AND ma_nguoi_dung = ?
    `, [reviewId, userId]);

    if (existing.length === 0) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa đánh giá này' });
    }

    // Xóa đánh giá
    await db.query('DELETE FROM danh_gia_san_pham WHERE ma_danh_gia = ?', [reviewId]);

    res.json({ success: true, message: 'Xóa đánh giá thành công!' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lấy đánh giá của user cho món ăn cụ thể (để edit)
router.get('/my-review/:productId', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const productId = parseInt(req.params.productId);
    const userId = req.user.ma_nguoi_dung;

    const [reviews] = await db.query(`
      SELECT ma_danh_gia, so_sao, binh_luan, ngay_danh_gia
      FROM danh_gia_san_pham 
      WHERE ma_mon = ? AND ma_nguoi_dung = ?
    `, [productId, userId]);

    if (reviews.length === 0) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: reviews[0] });
  } catch (error) {
    console.error('Error fetching user review:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Lấy tất cả đánh giá (Admin) - bao gồm số lượng replies
router.get('/admin/all', async (req, res) => {
  try {
    const { status, search, product_id } = req.query;
    
    let query = `
      SELECT dg.ma_danh_gia, dg.ma_mon, dg.ma_nguoi_dung, dg.so_sao, dg.binh_luan, 
             dg.ngay_danh_gia, dg.trang_thai, dg.hinh_anh,
             nd.ten_nguoi_dung, nd.email, nd.anh_dai_dien,
             ma.ten_mon,
             (SELECT COUNT(*) FROM tra_loi_danh_gia WHERE ma_danh_gia = dg.ma_danh_gia) as reply_count
      FROM danh_gia_san_pham dg
      JOIN nguoi_dung nd ON dg.ma_nguoi_dung = nd.ma_nguoi_dung
      JOIN mon_an ma ON dg.ma_mon = ma.ma_mon
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND dg.trang_thai = ?';
      params.push(status);
    }

    if (product_id) {
      query += ' AND dg.ma_mon = ?';
      params.push(parseInt(product_id));
    }

    if (search) {
      query += ' AND (nd.ten_nguoi_dung LIKE ? OR dg.binh_luan LIKE ? OR ma.ten_mon LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY dg.ngay_danh_gia DESC';

    const [reviews] = await db.query(query, params);

    // Parse images
    const reviewsWithImages = reviews.map(r => ({
      ...r,
      images: r.hinh_anh ? JSON.parse(r.hinh_anh) : []
    }));

    // Thống kê trạng thái
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN trang_thai = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN trang_thai = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN trang_thai = 'rejected' THEN 1 ELSE 0 END) as rejected,
        AVG(so_sao) as average_rating,
        SUM(CASE WHEN so_sao = 5 THEN 1 ELSE 0 END) as star_5,
        SUM(CASE WHEN so_sao = 4 THEN 1 ELSE 0 END) as star_4,
        SUM(CASE WHEN so_sao = 3 THEN 1 ELSE 0 END) as star_3,
        SUM(CASE WHEN so_sao = 2 THEN 1 ELSE 0 END) as star_2,
        SUM(CASE WHEN so_sao = 1 THEN 1 ELSE 0 END) as star_1
      FROM danh_gia_san_pham
    `);

    // Thống kê theo ngày (30 ngày gần nhất)
    const [dailyStats] = await db.query(`
      SELECT DATE(ngay_danh_gia) as date, COUNT(*) as count
      FROM danh_gia_san_pham
      WHERE ngay_danh_gia >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(ngay_danh_gia)
      ORDER BY date ASC
    `);

    // Top sản phẩm được đánh giá nhiều nhất
    const [topProducts] = await db.query(`
      SELECT ma.ten_mon, COUNT(*) as review_count, AVG(dg.so_sao) as avg_rating
      FROM danh_gia_san_pham dg
      JOIN mon_an ma ON dg.ma_mon = ma.ma_mon
      GROUP BY dg.ma_mon, ma.ten_mon
      ORDER BY review_count DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: reviewsWithImages,
      stats: {
        ...stats[0],
        starDistribution: {
          5: stats[0].star_5 || 0,
          4: stats[0].star_4 || 0,
          3: stats[0].star_3 || 0,
          2: stats[0].star_2 || 0,
          1: stats[0].star_1 || 0
        }
      },
      dailyStats,
      topProducts
    });
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cập nhật trạng thái đánh giá (Admin - duyệt/khóa)
router.put('/admin/:reviewId/status', async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId);
    const { trang_thai } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(trang_thai)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    const [existing] = await db.query('SELECT ma_danh_gia FROM danh_gia_san_pham WHERE ma_danh_gia = ?', [reviewId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    }

    await db.query('UPDATE danh_gia_san_pham SET trang_thai = ? WHERE ma_danh_gia = ?', [trang_thai, reviewId]);

    const statusText = { pending: 'chờ duyệt', approved: 'đã duyệt', rejected: 'đã khóa' };
    res.json({ success: true, message: `Đánh giá đã được chuyển sang trạng thái ${statusText[trang_thai]}` });
  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Xóa đánh giá (Admin)
router.delete('/admin/:reviewId', async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId);

    // Lấy thông tin ảnh trước khi xóa
    const [existing] = await db.query('SELECT hinh_anh FROM danh_gia_san_pham WHERE ma_danh_gia = ?', [reviewId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    }

    // Xóa ảnh nếu có
    if (existing[0].hinh_anh) {
      const images = JSON.parse(existing[0].hinh_anh);
      images.forEach(imgPath => {
        const fullPath = path.join(__dirname, '..', imgPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    await db.query('DELETE FROM danh_gia_san_pham WHERE ma_danh_gia = ?', [reviewId]);

    res.json({ success: true, message: 'Đã xóa đánh giá thành công' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Xóa nhiều đánh giá (Admin)
router.post('/admin/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });
    }

    // Lấy thông tin ảnh trước khi xóa
    const [reviews] = await db.query('SELECT hinh_anh FROM danh_gia_san_pham WHERE ma_danh_gia IN (?)', [ids]);
    
    // Xóa ảnh
    reviews.forEach(review => {
      if (review.hinh_anh) {
        const images = JSON.parse(review.hinh_anh);
        images.forEach(imgPath => {
          const fullPath = path.join(__dirname, '..', imgPath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        });
      }
    });

    await db.query('DELETE FROM danh_gia_san_pham WHERE ma_danh_gia IN (?)', [ids]);

    res.json({ success: true, message: `Đã xóa ${ids.length} đánh giá` });
  } catch (error) {
    console.error('Error bulk deleting reviews:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cập nhật trạng thái nhiều đánh giá (Admin)
router.post('/admin/bulk-status', async (req, res) => {
  try {
    const { ids, trang_thai } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });
    }

    if (!['pending', 'approved', 'rejected'].includes(trang_thai)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    await db.query('UPDATE danh_gia_san_pham SET trang_thai = ? WHERE ma_danh_gia IN (?)', [trang_thai, ids]);

    const statusText = { pending: 'chờ duyệt', approved: 'đã duyệt', rejected: 'đã khóa' };
    res.json({ success: true, message: `Đã cập nhật ${ids.length} đánh giá sang trạng thái ${statusText[trang_thai]}` });
  } catch (error) {
    console.error('Error bulk updating review status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin trả lời đánh giá sản phẩm (Cho phép nhiều replies)
router.post('/:reviewId/reply', async (req, res) => {
    try {
        // Kiểm tra admin đăng nhập
        if (!req.session || !req.session.admin) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - Admin only'
            });
        }

        const { reviewId } = req.params;
        const { noi_dung } = req.body;
        const adminName = req.session.admin.ten_hien_thi || 'Admin';

        if (!noi_dung) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập nội dung trả lời'
            });
        }

        // Kiểm tra đánh giá có tồn tại không và lấy thông tin user
        const [review] = await db.query(
            'SELECT dg.ma_danh_gia, dg.ma_nguoi_dung, dg.ma_mon, ma.ten_mon FROM danh_gia_san_pham dg JOIN mon_an ma ON dg.ma_mon = ma.ma_mon WHERE dg.ma_danh_gia = ?',
            [reviewId]
        );

        if (review.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đánh giá'
            });
        }

        // Tạo reply mới (cho phép nhiều replies)
        const [result] = await db.query(
            `INSERT INTO tra_loi_danh_gia (ma_danh_gia, noi_dung, ten_admin) 
            VALUES (?, ?, ?)`,
            [reviewId, noi_dung, adminName]
        );

        // Gửi thông báo cho người viết đánh giá
        if (review[0].ma_nguoi_dung) {
            try {
                await db.query(`
                    INSERT INTO thong_bao (ma_nguoi_dung, loai, tieu_de, noi_dung, duong_dan, ma_lien_quan)
                    VALUES (?, 'comment_reply', ?, ?, ?, ?)
                `, [
                    review[0].ma_nguoi_dung,
                    `Admin đã trả lời đánh giá của bạn về "${review[0].ten_mon}"`,
                    noi_dung.substring(0, 100) + (noi_dung.length > 100 ? '...' : ''),
                    `chitietmonan.html?id=${review[0].ma_mon}`,
                    reviewId
                ]);
                console.log(`📢 Đã gửi thông báo trả lời đánh giá cho user ${review[0].ma_nguoi_dung}`);
            } catch (notifError) {
                console.error('Lỗi gửi thông báo:', notifError.message);
            }
        }

        res.json({
            success: true,
            message: 'Trả lời đánh giá thành công',
            data: {
                ma_tra_loi: result.insertId,
                noi_dung,
                ten_admin: adminName,
                ngay_tra_loi: new Date(),
                is_update: false
            }
        });
    } catch (error) {
        console.error('Error replying to review:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Lấy trả lời của admin cho một đánh giá
router.get('/:reviewId/replies', async (req, res) => {
    try {
        const { reviewId } = req.params;

        const [replies] = await db.query(
            `SELECT ma_tra_loi, noi_dung, ten_admin, ngay_tra_loi
            FROM tra_loi_danh_gia
            WHERE ma_danh_gia = ?
            ORDER BY ngay_tra_loi ASC`,
            [reviewId]
        );

        res.json({
            success: true,
            data: replies
        });
    } catch (error) {
        console.error('Error fetching review replies:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// Xóa trả lời của admin
router.delete('/replies/:replyId', async (req, res) => {
    try {
        // Kiểm tra admin đăng nhập
        if (!req.session || !req.session.admin) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - Admin only'
            });
        }

        const { replyId } = req.params;

        // Kiểm tra reply có tồn tại không
        const [reply] = await db.query(
            'SELECT ma_tra_loi FROM tra_loi_danh_gia WHERE ma_tra_loi = ?',
            [replyId]
        );

        if (reply.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy trả lời'
            });
        }

        // Xóa reply
        await db.query('DELETE FROM tra_loi_danh_gia WHERE ma_tra_loi = ?', [replyId]);

        res.json({
            success: true,
            message: 'Xóa trả lời thành công'
        });
    } catch (error) {
        console.error('Error deleting reply:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

module.exports = router;
