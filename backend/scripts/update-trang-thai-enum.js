const db = require('../config/database');

async function updateTrangThaiEnum() {
    try {
        console.log('🔄 Đang cập nhật cột trang_thai...');
        
        await db.query(`
            ALTER TABLE xac_thuc_email 
            MODIFY COLUMN trang_thai 
            ENUM('pending','verified','expired','reset_password') 
            DEFAULT 'pending'
        `);
        
        console.log('✅ Đã cập nhật cột trang_thai thành công!');
        console.log('📝 Các giá trị hợp lệ: pending, verified, expired, reset_password');
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        process.exit();
    }
}

updateTrangThaiEnum();
