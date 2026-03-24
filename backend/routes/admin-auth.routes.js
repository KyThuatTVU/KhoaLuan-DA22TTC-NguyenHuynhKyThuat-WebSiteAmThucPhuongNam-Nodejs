const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const ADMIN_EMAILS = require('../config/admin-emails');

// Route để bắt đầu quá trình đăng nhập Google
router.get('/google', 
  passport.authenticate('google-admin', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' // Luôn hiển thị màn hình chọn tài khoản
  })
);

// Callback route sau khi Google xác thực
router.get('/google/callback',
  passport.authenticate('google-admin', { 
    failureRedirect: '/frontend/admin/dang-nhap-admin.html?error=google_auth_failed',
    session: true
  }),
  (req, res) => {
    // Kiểm tra nếu user không phải admin
    if (!req.user) {
      console.log('❌ Callback: No user found');
      return res.redirect('/frontend/admin/dang-nhap-admin.html?error=not_admin');
    }

    // Log để debug
    console.log('✅ Callback: User authenticated:', req.user.email);
    console.log('✅ Session ID:', req.sessionID);
    console.log('✅ Session passport:', req.session.passport);
    
    // Lưu session trước khi redirect - QUAN TRỌNG!
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error saving session:', err);
        return res.redirect('/frontend/admin/dang-nhap-admin.html?error=session_error');
      }
      
      console.log('✅ Session saved successfully');
      console.log('✅ Redirecting to dashboard...');
      
      // Đăng nhập thành công - REDIRECT TRỰC TIẾP ĐẾN DASHBOARD
      // Thêm delay nhỏ để đảm bảo cookie được set
      setTimeout(() => {
        res.redirect('/frontend/admin/dashboard.html');
      }, 100);
    });
  }
);

// Route kiểm tra trạng thái đăng nhập
router.get('/check', (req, res) => {
  console.log('🔍 Check auth - Session ID:', req.sessionID);
  console.log('🔍 Check auth - isAuthenticated:', req.isAuthenticated());
  console.log('🔍 Check auth - User:', req.user);
  
  if (req.isAuthenticated()) {
    // Kiểm tra xem email có trong danh sách admin không
    const isAdmin = ADMIN_EMAILS.includes(req.user.email);
    
    if (!isAdmin) {
      console.log('❌ User not in admin list:', req.user.email);
      return res.json({
        success: false,
        isAuthenticated: false,
        message: 'Bạn không có quyền truy cập admin'
      });
    }
    
    console.log('✅ Admin authenticated:', req.user.email);
    res.json({
      success: true,
      isAuthenticated: true,
      user: {
        id: req.user.ma_admin,
        name: req.user.ten_hien_thi,
        email: req.user.email,
        avatar: req.user.anh_dai_dien,
        role: req.user.quyen,
        username: req.user.tai_khoan
      }
    });
  } else {
    console.log('❌ Not authenticated');
    res.json({
      success: false,
      isAuthenticated: false
    });
  }
});

// Route kiểm tra session (alias cho check, dùng bởi admin-layout.js)
router.get('/check-session', (req, res) => {
  console.log('🔍 Check session - Session ID:', req.sessionID);
  console.log('🔍 Check session - isAuthenticated:', req.isAuthenticated());
  
  if (req.isAuthenticated()) {
    const isAdmin = ADMIN_EMAILS.includes(req.user.email);
    
    if (!isAdmin) {
      return res.json({
        success: false,
        isAuthenticated: false,
        message: 'Bạn không có quyền truy cập admin'
      });
    }
    
    res.json({
      success: true,
      isAuthenticated: true,
      data: req.user // Trả về data thay vì user để tương thích với admin-layout.js
    });
  } else {
    res.json({
      success: false,
      isAuthenticated: false
    });
  }
});

// Route đăng xuất
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi đăng xuất'
      });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Lỗi khi xóa session'
        });
      }
      res.json({
        success: true,
        message: 'Đăng xuất thành công'
      });
    });
  });
});

module.exports = router;
