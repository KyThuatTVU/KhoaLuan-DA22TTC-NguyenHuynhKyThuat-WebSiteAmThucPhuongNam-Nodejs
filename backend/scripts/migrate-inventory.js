require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'amthuc_phuongnam',
        multipleStatements: true,
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('🔗 Đã kết nối Database.');
        const sqlPath = path.join(__dirname, '../../Database/add_inventory_system.sql');
        const sqlQuery = fs.readFileSync(sqlPath, 'utf8');
        
        await connection.query(sqlQuery);
        console.log('✅ Chạy migration thành công!');
    } catch (error) {
        console.error('❌ Lỗi migration:', error.message);
    } finally {
        await connection.end();
    }
}

runMigration();
