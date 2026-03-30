const db = require('./config/database');

async function createTable() {
    try {
        console.log('--- Đang khởi tạo bảng hao_hut_nguyen_lieu ---');
        await db.query(`
            CREATE TABLE IF NOT EXISTS hao_hut_nguyen_lieu (
                ma_hao_hut INT AUTO_INCREMENT PRIMARY KEY,
                ma_nguyen_lieu INT,
                so_luong_hao_hut DECIMAL(10,2),
                don_vi_tinh VARCHAR(50),
                ly_do TEXT,
                hinh_anh VARCHAR(255),
                thoi_gian DATETIME DEFAULT CURRENT_TIMESTAMP,
                ma_nhan_vien INT,
                FOREIGN KEY (ma_nguyen_lieu) REFERENCES nguyen_lieu(ma_nguyen_lieu)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Khởi tạo bảng thành công!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khởi tạo bảng:', error.message);
        process.exit(1);
    }
}

createTable();
