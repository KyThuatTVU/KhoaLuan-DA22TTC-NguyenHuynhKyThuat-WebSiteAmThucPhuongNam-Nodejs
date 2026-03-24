const db = require('../config/database');

async function addReservationPaymentTable() {
    try {
        console.log('🔧 Bắt đầu thêm bảng thanh toán đặt bàn...');

        // Thêm cột trang_thai_thanh_toan vào bảng dat_ban
        const [columns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'dat_ban' 
            AND COLUMN_NAME = 'trang_thai_thanh_toan'
        `);
        
        if (columns.length === 0) {
            console.log('📦 Thêm cột trang_thai_thanh_toan vào bảng dat_ban...');
            await db.query(`
                ALTER TABLE dat_ban 
                ADD COLUMN trang_thai_thanh_toan ENUM('unpaid', 'pending', 'paid', 'failed') 
                DEFAULT 'unpaid' AFTER trang_thai
            `);
            console.log('✅ Đã thêm cột trang_thai_thanh_toan');
        }

        // Tạo bảng thanh_toan_dat_ban
        await db.query(`
            CREATE TABLE IF NOT EXISTS thanh_toan_dat_ban (
                ma_thanh_toan INT NOT NULL AUTO_INCREMENT,
                ma_dat_ban INT NOT NULL,
                ma_giao_dich VARCHAR(50) NOT NULL,
                so_tien DECIMAL(14,2) NOT NULL,
                noi_dung_chuyen_khoan VARCHAR(255) NOT NULL,
                trang_thai ENUM('pending', 'paid', 'failed', 'cancelled') DEFAULT 'pending',
                thoi_gian_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                thoi_gian_thanh_toan DATETIME NULL,
                thoi_gian_het_han DATETIME NOT NULL,
                ghi_chu TEXT NULL,
                PRIMARY KEY (ma_thanh_toan),
                UNIQUE KEY unique_transaction (ma_giao_dich),
                KEY idx_ma_dat_ban (ma_dat_ban),
                KEY idx_trang_thai (trang_thai),
                CONSTRAINT fk_thanh_toan_dat_ban 
                    FOREIGN KEY (ma_dat_ban) 
                    REFERENCES dat_ban(ma_dat_ban) 
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Đã tạo bảng thanh_toan_dat_ban');

        console.log('🎉 Hoàn tất thêm bảng thanh toán đặt bàn!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
}

addReservationPaymentTable();
