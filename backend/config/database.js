const mysql = require('mysql2');
require('dotenv').config();

// Tạo connection pool để quản lý kết nối hiệu quả
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00', // Timezone Việt Nam
  dateStrings: true   // Trả về date dạng string để tránh convert timezone
});

// Sử dụng promise wrapper để dễ dàng làm việc với async/await
const promisePool = pool.promise();

// Kiểm tra kết nối
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Lỗi kết nối database:', err.message);
    return;
  }
  console.log('✅ Kết nối database thành công!');
  connection.release();
});

module.exports = promisePool;
