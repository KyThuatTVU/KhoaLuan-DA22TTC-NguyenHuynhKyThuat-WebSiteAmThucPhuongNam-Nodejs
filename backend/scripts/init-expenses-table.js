const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/database');
const fs = require('fs');

async function initExpensesTable() {
    try {
        console.log('🔄 Đang khởi tạo bảng chi_phi_hang_ngay...');
        
        // Đọc file SQL
        const sqlFile = path.join(__dirname, 'create-expenses-table.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Tách các câu lệnh SQL
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        // Thực thi từng câu lệnh
        for (const statement of statements) {
            if (statement.trim()) {
                await db.query(statement);
            }
        }
        
        console.log('✅ Đã tạo bảng chi_phi_hang_ngay thành công!');
        
        // Kiểm tra dữ liệu mẫu
        const [rows] = await db.query('SELECT COUNT(*) as count FROM chi_phi_hang_ngay');
        console.log(`📊 Số lượng bản ghi mẫu: ${rows[0].count}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khởi tạo bảng:', error.message);
        process.exit(1);
    }
}

initExpensesTable();
