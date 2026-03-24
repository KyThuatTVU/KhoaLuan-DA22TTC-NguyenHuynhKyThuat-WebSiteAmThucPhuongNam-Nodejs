#!/usr/bin/env node

/**
 * Script tạo bảng lich_su_trang_thai_don_hang
 */

const db = require('../config/database');

async function createTable() {
    let connection;
    
    try {
        connection = await db.getConnection();
        
        console.log('🚀 Đang tạo bảng lich_su_trang_thai_don_hang...\n');
        
        // 0. Drop bảng cũ nếu tồn tại
        console.log('📋 Bước 0: Xóa bảng cũ (nếu có)...');
        await connection.query('DROP TABLE IF EXISTS `lich_su_trang_thai_don_hang`');
        console.log('✅ Đã xóa bảng cũ!\n');
        
        // 1. Tạo bảng
        console.log('📋 Bước 1: Tạo bảng mới...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`lich_su_trang_thai_don_hang\` (
              \`ma_lich_su\` INT NOT NULL AUTO_INCREMENT,
              \`ma_don_hang\` INT NOT NULL,
              \`trang_thai_cu\` VARCHAR(50) NULL,
              \`trang_thai_moi\` VARCHAR(50) NOT NULL,
              \`nguoi_thay_doi\` INT NULL COMMENT 'ID của admin hoặc user thay đổi',
              \`loai_nguoi_thay_doi\` ENUM('admin', 'user', 'system') DEFAULT 'system',
              \`ghi_chu\` TEXT NULL,
              \`thoi_gian_thay_doi\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (\`ma_lich_su\`),
              INDEX \`idx_ma_don_hang\` (\`ma_don_hang\` ASC),
              INDEX \`idx_thoi_gian\` (\`thoi_gian_thay_doi\` DESC),
              CONSTRAINT \`fk_lich_su_don_hang\`
                FOREIGN KEY (\`ma_don_hang\`)
                REFERENCES \`don_hang\` (\`ma_don_hang\`)
                ON DELETE CASCADE
                ON UPDATE CASCADE
            ) ENGINE = InnoDB
            DEFAULT CHARACTER SET = utf8mb4
            COLLATE = utf8mb4_unicode_ci
            COMMENT = 'Lưu lịch sử thay đổi trạng thái đơn hàng'
        `);
        console.log('✅ Bảng đã được tạo!\n');
        
        // 2. Tạo trigger INSERT
        console.log('📋 Bước 2: Tạo trigger INSERT...');
        try {
            await connection.query('DROP TRIGGER IF EXISTS `after_don_hang_insert`');
            await connection.query(`
                CREATE TRIGGER \`after_don_hang_insert\`
                AFTER INSERT ON \`don_hang\`
                FOR EACH ROW
                BEGIN
                    INSERT INTO \`lich_su_trang_thai_don_hang\` 
                    (\`ma_don_hang\`, \`trang_thai_cu\`, \`trang_thai_moi\`, \`loai_nguoi_thay_doi\`, \`ghi_chu\`)
                    VALUES 
                    (NEW.ma_don_hang, NULL, NEW.trang_thai, 'system', 'Đơn hàng được tạo');
                END
            `);
            console.log('✅ Trigger INSERT đã được tạo!\n');
        } catch (error) {
            if (error.code === 'ER_TRG_ALREADY_EXISTS') {
                console.log('⚠️  Trigger INSERT đã tồn tại, bỏ qua...\n');
            } else {
                throw error;
            }
        }
        
        // 3. Tạo trigger UPDATE
        console.log('📋 Bước 3: Tạo trigger UPDATE...');
        try {
            await connection.query('DROP TRIGGER IF EXISTS `after_don_hang_update`');
            await connection.query(`
                CREATE TRIGGER \`after_don_hang_update\`
                AFTER UPDATE ON \`don_hang\`
                FOR EACH ROW
                BEGIN
                    IF OLD.trang_thai != NEW.trang_thai THEN
                        INSERT INTO \`lich_su_trang_thai_don_hang\` 
                        (\`ma_don_hang\`, \`trang_thai_cu\`, \`trang_thai_moi\`, \`loai_nguoi_thay_doi\`, \`ghi_chu\`)
                        VALUES 
                        (NEW.ma_don_hang, OLD.trang_thai, NEW.trang_thai, 'system', 'Trạng thái đơn hàng được cập nhật');
                    END IF;
                END
            `);
            console.log('✅ Trigger UPDATE đã được tạo!\n');
        } catch (error) {
            if (error.code === 'ER_TRG_ALREADY_EXISTS') {
                console.log('⚠️  Trigger UPDATE đã tồn tại, bỏ qua...\n');
            } else {
                throw error;
            }
        }
        
        // 4. Thêm dữ liệu cho đơn hàng hiện có
        console.log('📋 Bước 4: Thêm dữ liệu lịch sử cho đơn hàng hiện có...');
        const [result] = await connection.query(`
            INSERT INTO \`lich_su_trang_thai_don_hang\` 
            (\`ma_don_hang\`, \`trang_thai_cu\`, \`trang_thai_moi\`, \`loai_nguoi_thay_doi\`, \`ghi_chu\`, \`thoi_gian_thay_doi\`)
            SELECT 
                ma_don_hang,
                NULL,
                trang_thai,
                'system',
                'Dữ liệu khởi tạo từ đơn hàng hiện có',
                thoi_gian_tao
            FROM don_hang
            WHERE ma_don_hang NOT IN (SELECT DISTINCT ma_don_hang FROM lich_su_trang_thai_don_hang)
        `);
        console.log(`✅ Đã thêm ${result.affectedRows} bản ghi lịch sử!\n`);
        
        // 5. Kiểm tra kết quả
        console.log('📋 Bước 5: Kiểm tra kết quả...');
        const [count] = await connection.query('SELECT COUNT(*) as total FROM lich_su_trang_thai_don_hang');
        console.log(`✅ Tổng số bản ghi lịch sử: ${count[0].total}\n`);
        
        console.log('🎉 Hoàn tất! Bảng lich_su_trang_thai_don_hang đã sẵn sàng.\n');
        
    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
        if (error.sqlMessage) {
            console.error('SQL Error:', error.sqlMessage);
        }
        process.exit(1);
    } finally {
        if (connection) {
            connection.release();
        }
        process.exit(0);
    }
}

// Run
createTable();
