/**
 * Session Middleware Configuration
 * Cấu hình Express Session
 */

const session = require('express-session');

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
    resave: false, // Không lưu lại session nếu không thay đổi
    saveUninitialized: false, // Không lưu session rỗng
    name: 'admin.sid', // Tên cookie session
    cookie: {
        secure: false, // false cho localhost (không dùng HTTPS)
        httpOnly: true,
        sameSite: 'lax', // Quan trọng: cho phép cookie cross-site
        maxAge: 24 * 60 * 60 * 1000, // 24 giờ
        path: '/' // Đảm bảo cookie được gửi cho tất cả paths
    },
    rolling: true // Gia hạn session mỗi request
});

module.exports = sessionMiddleware;
