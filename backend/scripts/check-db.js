const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function checkDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    console.log('=== KIỂM TRA ĐẶT BÀN VÀ THỜI GIAN HỦY ===\n');

    const [reservations] = await connection.query(`
        SELECT ma_dat_ban, ten_nguoi_dat, trang_thai, thoi_gian_tao,
               TIMESTAMPDIFF(MINUTE, thoi_gian_tao, NOW()) as phut_da_qua,
               CASE 
                   WHEN trang_thai NOT IN ('pending', 'confirmed') THEN 'KHÔNG THỂ HỦY (trạng thái)'
                   WHEN TIMESTAMPDIFF(MINUTE, thoi_gian_tao, NOW()) <= 60 THEN 'CÓ THỂ HỦY'
                   ELSE 'HẾT HẠN HỦY (quá 1 tiếng)'
               END as trang_thai_huy
        FROM dat_ban 
        ORDER BY thoi_gian_tao DESC
        LIMIT 10
    `);
    
    console.log('Danh sách đặt bàn gần đây:');
    console.table(reservations);

    // Cập nhật đặt bàn #7 về pending để test
    console.log('\n=== CẬP NHẬT ĐẶT BÀN #7 VỀ PENDING ĐỂ TEST ===');
    await connection.query(`UPDATE dat_ban SET trang_thai = 'pending' WHERE ma_dat_ban = 7`);
    console.log('✅ Đã cập nhật đặt bàn #7 về trạng thái pending');

    await connection.end();
}

checkDatabase().catch(console.error);
