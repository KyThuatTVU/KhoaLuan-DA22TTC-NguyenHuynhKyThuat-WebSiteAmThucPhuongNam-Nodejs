const db = require('../config/database');
const ADMIN_EMAILS = require('../config/admin-emails');

// Middleware kiểm tra xác thực
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated() || (req.session && req.session.admin)) {
    return next();
  }
  res.status(401).json({
    success: false,
    message: 'Vui lòng đăng nhập để tiếp tục'
  });
};

// Middleware kiểm tra quyền admin (kiểm tra email hoặc role)
const isAdmin = (req, res, next) => {
  const user = req.user || (req.session ? req.session.admin : null);
  if (user && (ADMIN_EMAILS.includes(user.email) || user.role === 'admin')) {
    return next();
  }
  res.status(403).json({
    success: false,
    message: 'Bạn không có quyền truy cập'
  });
};

/**
 * Middleware kiểm tra quyền hạn chi tiết (RBAC)
 * @param {string} permissionên của quyền cần kiểm tra (ví dụ: 'manage_staff')
 */
const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const user = req.user || (req.session ? req.session.admin : null);
      
      if (!user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
      }

      // Admin mặc định có tất cả quyền
      if (user.role === 'admin' || ADMIN_EMAILS.includes(user.email)) {
        return next();
      }

      // Lấy role từ user (xem xét cả req.user và req.session.admin)
      const roleName = user.role;

      if (!roleName) {
        return res.status(403).json({ success: false, message: 'Không xác định được vai trò người dùng' });
      }

      // Truy vấn kiểm tra quyền trong database
      const [rows] = await db.query(`
        SELECT p.ten_quyen 
        FROM vai_tro_he_thong r
        JOIN quyen_vai_tro rp ON r.ma_vai_tro = rp.ma_vai_tro
        JOIN quyen_han p ON rp.ma_quyen = p.ma_quyen
        WHERE r.ten_vai_tro = ? AND p.ten_quyen = ?
      `, [roleName, permissionName]);

      if (rows.length > 0) {
        return next();
      }

      res.status(403).json({
        success: false,
        message: `Bạn không có quyền: ${permissionName}`
      });
    } catch (error) {
      console.error('RBAC Error:', error);
      res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền hạn' });
    }
  };
};

module.exports = {
  isAuthenticated,
  isAdmin,
  checkPermission
};
