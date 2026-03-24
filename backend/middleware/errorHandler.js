/**
 * Error Handling Middleware
 * Xử lý lỗi toàn cục cho ứng dụng
 */

// 404 handler for API routes
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint không tồn tại'
    });
};

// Global error handler
const errorHandler = (err, req, res, _next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

module.exports = {
    notFoundHandler,
    errorHandler
};
