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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/wastage', express.static(path.join(__dirname, 'uploads/wastage')));
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

// Khởi tạo các bảng quản lý nhân sự
async function initStaffTables() {
    try {
        // 1. Cập nhật bảng nhan_vien (thêm các cột mới nếu chưa có)
        const [existingColumns] = await db.query('SHOW COLUMNS FROM nhan_vien');
        const columnNames = existingColumns.map(c => c.Field);

        const newColumns = [
            { name: 'ma_nv_code', type: 'VARCHAR(50) AFTER ma_nhan_vien' },
            { name: 'dia_chi', type: 'TEXT AFTER so_dien_thoai' },
            { name: 'ngay_sinh', type: 'DATE AFTER dia_chi' },
            { name: 'gioi_tinh', type: 'VARCHAR(20) AFTER ngay_sinh' },
            { name: 'cccd', type: 'VARCHAR(20) AFTER gioi_tinh' },
            { name: 'ngay_vao_lam', type: 'DATE AFTER cccd' },
            { name: 'anh_dai_dien', type: 'VARCHAR(255) AFTER ngay_vao_lam' },
            { name: 'luong_co_ban', type: 'DECIMAL(15,2) DEFAULT 0 AFTER luong_theo_gio' },
            { name: 'is_deleted', type: 'TINYINT(1) DEFAULT 0 AFTER trang_thai' }
        ];

        for (const col of newColumns) {
            if (!columnNames.includes(col.name)) {
                await db.query(`ALTER TABLE nhan_vien ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Đã thêm cột ${col.name} vào bảng nhan_vien`);
            }
        }

        if (!columnNames.includes('luong_theo_gio')) {
            await db.query('ALTER TABLE nhan_vien ADD COLUMN luong_theo_gio DECIMAL(15,2) DEFAULT 0 AFTER vai_tro');
            console.log('✅ Đã thêm cột luong_theo_gio vào bảng nhan_vien');
        }

        // 2. Bảng Vai trò (Roles)
        await db.query(`
            CREATE TABLE IF NOT EXISTS vai_tro_he_thong (
                ma_vai_tro INT NOT NULL AUTO_INCREMENT,
                ten_vai_tro VARCHAR(100) NOT NULL,
                mo_ta TEXT,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_vai_tro),
                UNIQUE KEY (ten_vai_tro)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 3. Bảng Quyền hạn (Permissions)
        await db.query(`
            CREATE TABLE IF NOT EXISTS quyen_han (
                ma_quyen INT NOT NULL AUTO_INCREMENT,
                ten_quyen VARCHAR(100) NOT NULL,
                mo_ta TEXT,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_quyen),
                UNIQUE KEY (ten_quyen)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 4. Bảng Quyền - Vai trò (Role Permissions)
        await db.query(`
            CREATE TABLE IF NOT EXISTS quyen_vai_tro (
                ma_vai_tro INT NOT NULL,
                ma_quyen INT NOT NULL,
                PRIMARY KEY (ma_vai_tro, ma_quyen),
                CONSTRAINT fk_qvt_vai_tro FOREIGN KEY (ma_vai_tro) REFERENCES vai_tro_he_thong (ma_vai_tro) ON DELETE CASCADE,
                CONSTRAINT fk_qvt_quyen FOREIGN KEY (ma_quyen) REFERENCES quyen_han (ma_quyen) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 5. Bảng ca làm việc
        await db.query(`
            CREATE TABLE IF NOT EXISTS ca_lam_viec (
                ma_ca INT NOT NULL AUTO_INCREMENT,
                ten_ca VARCHAR(100) NOT NULL,
                gio_bat_dau TIME NOT NULL,
                gio_ket_thuc TIME NOT NULL,
                he_so_luong FLOAT DEFAULT 1.0,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_ca)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 6. Bảng phân ca (Employee Shifts)
        await db.query(`
            CREATE TABLE IF NOT EXISTS phan_ca (
                ma_phan_ca INT NOT NULL AUTO_INCREMENT,
                ma_nhan_vien INT NOT NULL,
                ma_ca INT NOT NULL,
                ngay DATE NOT NULL,
                trang_thai ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_phan_ca),
                CONSTRAINT fk_phan_ca_nv FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien (ma_nhan_vien) ON DELETE CASCADE,
                CONSTRAINT fk_phan_ca_ca FOREIGN KEY (ma_ca) REFERENCES ca_lam_viec (ma_ca) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 7. Bảng chấm công (Attendance)
        await db.query(`
            CREATE TABLE IF NOT EXISTS cham_cong (
                ma_cham_cong INT NOT NULL AUTO_INCREMENT,
                ma_nhan_vien INT NOT NULL,
                ngay DATE NOT NULL,
                gio_vao TIME DEFAULT NULL,
                gio_ra TIME DEFAULT NULL,
                so_gio_lam FLOAT DEFAULT 0,
                trang_thai VARCHAR(50) DEFAULT 'Đúng giờ',
                ghi_chu TEXT,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_cham_cong),
                CONSTRAINT fk_cham_cong_nv FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien (ma_nhan_vien) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 8. Bảng lương (Salaries)
        await db.query(`
            CREATE TABLE IF NOT EXISTS bang_luong (
                ma_luong INT NOT NULL AUTO_INCREMENT,
                ma_nhan_vien INT NOT NULL,
                thang INT NOT NULL,
                nam INT NOT NULL,
                luong_co_ban DECIMAL(15,2) DEFAULT 0,
                tong_gio_lam FLOAT DEFAULT 0,
                luong_theo_gio DECIMAL(15,2) DEFAULT 0,
                thuong DECIMAL(15,2) DEFAULT 0,
                phat DECIMAL(15,2) DEFAULT 0,
                tong_luong DECIMAL(15,2) DEFAULT 0,
                trang_thai VARCHAR(50) DEFAULT 'Chưa thanh toán',
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_luong),
                CONSTRAINT fk_bang_luong_nv FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien (ma_nhan_vien) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Seed default roles and permissions if empty
        const [rolesCount] = await db.query('SELECT COUNT(*) as count FROM vai_tro_he_thong');
        if (rolesCount[0].count === 0) {
            const roles = [
                ['admin', 'Quản trị viên toàn hệ thống'],
                ['manager', 'Quản lý nhà hàng'],
                ['cashier', 'Thu ngân'],
                ['waiter', 'Nhân viên phục vụ'],
                ['chef', 'Đầu bếp']
            ];
            for (const r of roles) {
                await db.query('INSERT INTO vai_tro_he_thong (ten_vai_tro, mo_ta) VALUES (?, ?)', r);
            }

            const permissions = [
                ['manage_staff', 'Quản lý nhân viên'],
                ['manage_shifts', 'Quản lý ca làm'],
                ['manage_attendance', 'Quản lý chấm công'],
                ['manage_payroll', 'Quản lý lương'],
                ['view_reports', 'Xem báo cáo'],
                ['manage_orders', 'Quản lý đơn hàng'],
                ['manage_products', 'Quản lý món ăn']
            ];
            for (const p of permissions) {
                await db.query('INSERT INTO quyen_han (ten_quyen, mo_ta) VALUES (?, ?)', p);
            }

            // Assign all permissions to admin
            const [adminRole] = await db.query('SELECT ma_vai_tro FROM vai_tro_he_thong WHERE ten_vai_tro = "admin"');
            const [allPerms] = await db.query('SELECT ma_quyen FROM quyen_han');
            for (const p of allPerms) {
                await db.query('INSERT INTO quyen_vai_tro (ma_vai_tro, ma_quyen) VALUES (?, ?)', [adminRole[0].ma_vai_tro, p.ma_quyen]);
            }
            console.log('✅ Đã gán quyền mặc định cho Admin');
        }

        console.log('✅ Các bảng quản lý nhân sự đã sẵn sàng');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo các bảng nhân sự:', error.message);
    }
}

initStaffTables();

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
const shiftRoutes = require('./routes/shifts');
const attendanceRoutes = require('./routes/attendance');
const payrollRoutes = require('./routes/payroll');
const importRoutes = require('./routes/imports');
const auditRoutes = require('./routes/audits');
const supplierRoutes = require('./routes/suppliers');
const kitchenSlipRoutes = require('./routes/kitchenSlips');
const ingredientCategoryRoutes = require('./routes/ingredientCategories');
const wastageRoutes = require('./routes/wastage');


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
app.use('/api/shifts', shiftRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/kitchen-slips', kitchenSlipRoutes);
app.use('/api/ingredient-categories', ingredientCategoryRoutes);
app.use('/api/wastage', wastageRoutes);


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
