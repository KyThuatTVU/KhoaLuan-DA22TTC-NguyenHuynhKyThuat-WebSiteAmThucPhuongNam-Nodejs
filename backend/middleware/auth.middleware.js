const ADMIN_EMAILS = require('../config/admin-emails');

// Middleware kiểm tra xác thực
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    success: false,
    message: 'Vui lòng đăng nhập để tiếp tục'
  });
};

// Middleware kiểm tra quyền admin (kiểm tra email trong danh sách)
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && ADMIN_EMAILS.includes(req.user.email)) {
    return next();
  }
  res.status(403).json({
    success: false,
    message: 'Bạn không có quyền truy cập'
  });
};

module.exports = {
  isAuthenticated,
  isAdmin
};
