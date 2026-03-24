/**
 * Middleware Index
 * Export tất cả middleware từ một file
 */

const corsMiddleware = require('./cors');
const sessionMiddleware = require('./session');
const loggerMiddleware = require('./logger');
const { notFoundHandler, errorHandler } = require('./errorHandler');

module.exports = {
    corsMiddleware,
    sessionMiddleware,
    loggerMiddleware,
    notFoundHandler,
    errorHandler
};
