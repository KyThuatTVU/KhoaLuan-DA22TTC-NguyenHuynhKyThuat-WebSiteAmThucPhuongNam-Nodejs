const express = require('express');
const path = require('path');
const passport = require('./config/passport');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// GraphQL imports
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { typeDefs, resolvers } = require('./graphql');

// Import middleware
const {
    corsMiddleware,
    sessionMiddleware,
    loggerMiddleware,
    notFoundHandler,
    errorHandler
} = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================

// CORS middleware
app.use(corsMiddleware);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (phải đặt trước passport)
app.use(sessionMiddleware);

// Debug/Logger middleware
app.use(loggerMiddleware);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Static files middleware
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, '../frontend')));

// ==================== GRAPHQL SETUP ====================

async function startApolloServer() {
    const apolloServer = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true, // Cho phép introspection trong development
    });
    
    await apolloServer.start();
    
    app.use('/graphql', expressMiddleware(apolloServer, {
        context: async ({ req }) => ({
            req,
            token: req.headers.authorization || ''
        })
    }));
    
    console.log('🚀 GraphQL endpoint: /graphql');
}

startApolloServer().catch(err => {
    console.error('❌ Failed to start Apollo Server:', err.message);
});

// ==================== DATABASE INIT ====================

const db = require('./config/database');

// Tự động tạo bảng cai_dat nếu chưa tồn tại
async function initSettingsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS cai_dat (
                id int NOT NULL AUTO_INCREMENT,
                setting_key varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
                setting_value text COLLATE utf8mb4_unicode_ci,
                mo_ta varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                ngay_tao datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ngay_cap_nhat datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY setting_key (setting_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        const [existing] = await db.query('SELECT COUNT(*) as count FROM cai_dat');
        if (existing[0].count === 0) {
            const defaultSettings = [
                ['ten_nha_hang', 'Nhà hàng Ẩm thực Phương Nam', 'Tên nhà hàng'],
                ['dia_chi', '123 Đường ABC, Phường 1, TP. Vĩnh Long', 'Địa chỉ nhà hàng'],
                ['so_dien_thoai', '0123 456 789', 'Số điện thoại hotline'],
                ['email', 'info@phuongnam.vn', 'Email liên hệ'],
                ['website', 'phuongnam.vn', 'Website'],
                ['gio_mo_cua_t2_t6', '08:00-22:00', 'Giờ mở cửa thứ 2 đến thứ 6'],
                ['gio_mo_cua_t7_cn', '07:00-23:00', 'Giờ mở cửa thứ 7 và chủ nhật'],
                ['phi_giao_hang', '20000', 'Phí giao hàng (VNĐ)'],
                ['mien_phi_giao_hang_tu', '200000', 'Miễn phí giao hàng cho đơn từ (VNĐ)'],
                ['hieu_ung_tuyet', '0', 'Bật/tắt hiệu ứng tuyết rơi (1=bật, 0=tắt)'],
                ['hieu_ung_hoa_mai', '0', 'Bật/tắt hiệu ứng hoa mai (1=bật, 0=tắt)'],
                ['hieu_ung_intro_tet', '0', 'Bật/tắt intro chào mừng Tết (1=bật, 0=tắt)'],
                ['hieu_ung_intro_giang_sinh', '0', 'Bật/tắt intro Giáng sinh (1=bật, 0=tắt)']
            ];

            for (const [key, value, desc] of defaultSettings) {
                await db.query(
                    'INSERT IGNORE INTO cai_dat (setting_key, setting_value, mo_ta) VALUES (?, ?, ?)',
                    [key, value, desc]
                );
            }
            console.log('✅ Đã tạo bảng cai_dat và thêm dữ liệu mặc định');
        } else {
            console.log('✅ Bảng cai_dat đã tồn tại');
            
            // Thêm các settings mới nếu chưa có (cho database đã tồn tại)
            const newSettings = [
                ['hieu_ung_tuyet', '0', 'Bật/tắt hiệu ứng tuyết rơi (1=bật, 0=tắt)'],
                ['hieu_ung_hoa_mai', '0', 'Bật/tắt hiệu ứng hoa mai (1=bật, 0=tắt)'],
                ['hieu_ung_intro_tet', '0', 'Bật/tắt intro chào mừng Tết (1=bật, 0=tắt)'],
                ['hieu_ung_intro_giang_sinh', '0', 'Bật/tắt intro Giáng sinh (1=bật, 0=tắt)']
            ];
            
            for (const [key, value, desc] of newSettings) {
                await db.query(
                    'INSERT IGNORE INTO cai_dat (setting_key, setting_value, mo_ta) VALUES (?, ?, ?)',
                    [key, value, desc]
                );
            }
        }
    } catch (error) {
        console.error('❌ Lỗi khởi tạo bảng cai_dat:', error.message);
    }
}

initSettingsTable();

// Tự động tạo bảng thong_bao nếu chưa tồn tại
async function initNotificationsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS thong_bao (
                ma_thong_bao int NOT NULL AUTO_INCREMENT,
                ma_nguoi_dung int NOT NULL COMMENT 'Người nhận thông báo',
                loai enum('news','promo','comment_reply','comment_like','order_status','system') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system' COMMENT 'Loại thông báo',
                tieu_de varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tiêu đề thông báo',
                noi_dung text COLLATE utf8mb4_unicode_ci COMMENT 'Nội dung chi tiết',
                duong_dan varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Link liên quan',
                ma_lien_quan int DEFAULT NULL COMMENT 'ID của đối tượng liên quan',
                da_doc tinyint(1) NOT NULL DEFAULT '0' COMMENT '0: chưa đọc, 1: đã đọc',
                ngay_tao datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_thong_bao),
                KEY idx_nguoi_dung (ma_nguoi_dung),
                KEY idx_da_doc (da_doc),
                KEY idx_loai (loai),
                KEY idx_ngay_tao (ngay_tao),
                CONSTRAINT thong_bao_ibfk_1 FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung (ma_nguoi_dung) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng lưu thông báo cho người dùng'
        `);
        console.log('✅ Bảng thong_bao đã sẵn sàng');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo bảng thong_bao:', error.message);
    }
}

initNotificationsTable();

// Khởi tạo bảng thông báo admin
async function initAdminNotificationsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS thong_bao_admin (
                ma_thong_bao INT NOT NULL AUTO_INCREMENT,
                loai ENUM('new_order', 'new_reservation', 'new_comment', 'new_review', 'new_user', 'contact_message', 'comment_like', 'system') NOT NULL DEFAULT 'system',
                tieu_de VARCHAR(255) NOT NULL,
                noi_dung TEXT,
                duong_dan VARCHAR(500),
                ma_lien_quan INT,
                da_doc BOOLEAN DEFAULT FALSE,
                ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_thong_bao),
                INDEX idx_da_doc (da_doc),
                INDEX idx_ngay_tao (ngay_tao),
                INDEX idx_loai (loai)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Bảng thong_bao_admin đã sẵn sàng');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo bảng thong_bao_admin:', error.message);
    }
}

initAdminNotificationsTable();

// ==================== BASIC ROUTES ====================

app.get('/', (req, res) => {
    res.json({
        message: 'API Ẩm Thực Phương Nam',
        status: 'running',
        version: '1.0.0'
    });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({
            success: true,
            message: 'Kết nối database thành công!',
            data: rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi kết nối database',
            error: error.message
        });
    }
});


// ==================== API ROUTES ====================

// Import routes
const menuRoutes = require('./routes/menu');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/categories');
const albumRoutes = require('./routes/albums');
const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/admin-auth');
const cartRoutes = require('./routes/cart');
const newsRoutes = require('./routes/news');
const orderRoutes = require('./routes/orders');
const momoPaymentRoutes = require('./routes/momo-payment');
const customerRoutes = require('./routes/customers');
const statsRoutes = require('./routes/stats');
const reservationRoutes = require('./routes/reservations');
const reviewRoutes = require('./routes/reviews');
const contactRoutes = require('./routes/contact');
const chatbotRoutes = require('./routes/chatbot');
const settingsRoutes = require('./routes/settings');
const adminChatbotRoutes = require('./routes/admin-chatbot');
const recommendationRoutes = require('./routes/recommendation');
const notificationRoutes = require('./routes/notifications');
const promotionRoutes = require('./routes/promotions');
const reservationPaymentRoutes = require('./routes/reservation-payment');
const ttsRoutes = require('./routes/tts');
const posRoutes = require('./routes/pos');
const staffRoutes = require('./routes/staff');
const tableRoutes = require('./routes/tables');
const inventoryRoutes = require('./routes/inventory');
const recipeRoutes = require('./routes/recipe');

// Register routes
app.use('/api/tts', ttsRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin-auth', adminAuthRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', momoPaymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/reservation-payment', reservationPaymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin-chatbot', adminChatbotRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/recipe', recipeRoutes);

// Admin notifications routes
const adminNotificationRoutes = require('./routes/admin-notifications');
app.use('/api/admin/notifications', adminNotificationRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// Global error handler
app.use(errorHandler);

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📁 Môi trường: ${process.env.NODE_ENV || 'development'}`);
});
