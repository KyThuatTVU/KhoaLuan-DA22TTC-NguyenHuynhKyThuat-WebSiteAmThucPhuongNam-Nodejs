const db = require('../config/database');

async function createVerificationTable() {
    try {
        console.log('🔄 Đang tạo bảng xac_thuc_email...');

        // Tạo bảng xác thực email
        await db.query(`
            CREATE TABLE IF NOT EXISTS xac_thuc_email (
                ma_xac_thuc INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                ma_code VARCHAR(6) NOT NULL,
                ten_nguoi_dung VARCHAR(150) NOT NULL,
                so_dien_thoai VARCHAR(20),
                mat_khau_hash VARCHAR(255) NOT NULL,
                dia_chi VARCHAR(300),
                gioi_tinh ENUM('khac','nam','nu') DEFAULT 'khac',
                anh_dai_dien VARCHAR(500),
                ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ngay_het_han DATETIME NOT NULL,
                trang_thai ENUM('pending', 'verified', 'expired') DEFAULT 'pending',
                INDEX (email),
                INDEX (ma_code),
                INDEX (ngay_het_han)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ Tạo bảng xac_thuc_email thành công!');

        // Kiểm tra cấu trúc bảng
        const [structure] = await db.query('DESCRIBE xac_thuc_email');
        console.log('\n📊 Cấu trúc bảng xac_thuc_email:');
        console.table(structure);

        // Tạo event tự động xóa mã hết hạn (chạy mỗi giờ)
        try {
            await db.query(`
                CREATE EVENT IF NOT EXISTS clean_expired_verification_codes
                ON SCHEDULE EVERY 1 HOUR
                DO
                DELETE FROM xac_thuc_email 
                WHERE ngay_het_han < NOW() OR trang_thai = 'expired'
            `);
            console.log('✅ Tạo event tự động xóa mã hết hạn thành công!');
        } catch (eventError) {
            console.log('⚠️ Không thể tạo event (có thể do quyền hạn):', eventError.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

createVerificationTable();
