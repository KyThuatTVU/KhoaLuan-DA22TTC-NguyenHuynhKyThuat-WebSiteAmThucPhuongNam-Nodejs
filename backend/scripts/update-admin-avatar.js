const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

(async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔌 Đã kết nối database');

        // Kiểm tra xem cột đã tồn tại chưa
        const [columns] = await connection.query(
            "SHOW COLUMNS FROM admin LIKE 'anh_dai_dien'"
        );

        if (columns.length === 0) {
            // Thêm cột mới
            await connection.query(
                "ALTER TABLE `admin` ADD COLUMN `anh_dai_dien` VARCHAR(500) NULL AFTER `email`"
            );
            console.log('✅ Đã thêm cột anh_dai_dien vào bảng admin');
        } else {
            console.log('ℹ️ Cột anh_dai_dien đã tồn tại');
        }

        await connection.end();
        console.log('✅ Hoàn thành!');
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
})();
