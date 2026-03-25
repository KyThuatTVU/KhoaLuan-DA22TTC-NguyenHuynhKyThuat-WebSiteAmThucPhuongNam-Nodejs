/**
 * Script để tạo bảng nhân viên và thêm tài khoản mặc định
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupStaffTable() {
    let connection;
    
    try {
        // Kết nối database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'quanlynhahang',
            multipleStatements: true
        });

        console.log('✓ Đã kết nối database');

        // Đọc file SQL
        const sqlFile = path.join(__dirname, 'create-staff-table.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Thực thi SQL
        await connection.query(sql);
        
        console.log('✓ Đã tạo bảng nhan_vien');
        console.log('✓ Đã thêm tài khoản mặc định:');
        console.log('  - Quản lý: admin / admin123');
        console.log('  - Nhân viên: nhanvien1 / 123456');
        console.log('\n✅ Hoàn tất! Bạn có thể đăng nhập hệ thống POS với các tài khoản trên.');

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupStaffTable();
