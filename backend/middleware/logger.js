/**
 * Logger/Debug Middleware
 * Log thông tin request và session
 */

const loggerMiddleware = (req, res, next) => {
    console.log('📍 Request:', req.method, req.path);
    console.log('🔑 Session ID:', req.sessionID);
    console.log('👤 Session User:', req.session?.user ? req.session.user.email : 'none');
    next();
};

module.exports = loggerMiddleware;
