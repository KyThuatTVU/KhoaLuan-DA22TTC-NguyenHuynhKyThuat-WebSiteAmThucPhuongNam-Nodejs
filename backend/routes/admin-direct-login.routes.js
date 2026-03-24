const express = require('express');
const router = express.Router();
const db = require('../config/database');
const ADMIN_EMAILS = require('../config/admin-emails');

// Đăng nhập trực tiếp cho admin (tạm thời - để test)
router.post('/direct-login', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Kiểm tra email có trong whitelist không
    if (!ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({
        success: false,
        message: 'Email không có quyền admin'
      });
    }
    
    // Tìm admin trong database
    const [admins] = await db.query(
      'SELECT * FROM `admin` WHERE `email` = ?',
      [email]
    );
    
    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản admin'
      });
    }
    
    const admin = admins[0];
    
    // Tạo session thủ công
    req.login(admin, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Lỗi tạo session'
        });
      }
      
      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        user: {
          id: admin.ma_admin,
          name: admin.ten_hien_thi,
          email: admin.email,
          avatar: admin.anh_dai_dien,
          role: admin.quyen
        }
      });
    });
    
  } catch (error) {
    console.error('Direct login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
});

module.exports = router;
