const mysql = require('mysql2');

// Tạo connection pool với thông tin từ .env
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'amthuc_phuongnam',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Chuyển sang promise-based API
const promisePool = pool.promise();

// Test connection khi khởi động
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Lỗi kết nối database:', err.message);
    console.error('Thông tin kết nối:');
    console.error(`   Host: ${process.env.DB_HOST}`);
    console.error(`   User: ${process.env.DB_USER}`);
    console.error(`   Database: ${process.env.DB_NAME}`);
    console.error(`   Port: ${process.env.DB_PORT}`);
  } else {
    console.log('✅ Kết nối database thành công!');
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    connection.release();
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed.');
  }
  if (err.code === 'ER_CON_COUNT_ERROR') {
    console.error('Database has too many connections.');
  }
  if (err.code === 'ECONNREFUSED') {
    console.error('Database connection was refused.');
  }
});

module.exports = promisePool;
