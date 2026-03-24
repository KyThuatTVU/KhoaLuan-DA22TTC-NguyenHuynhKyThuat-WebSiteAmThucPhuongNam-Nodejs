require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (images)
app.use('/images', express.static(path.join(__dirname, 'images')));

// Test database connection
const db = require('./config/database');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server đang chạy',
    timestamp: new Date().toISOString()
  });
});

// Test database endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ 
      success: true, 
      message: 'Kết nối database thành công',
      result: rows[0].result 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi kết nối database',
      error: error.message 
    });
  }
});

// Routes sẽ được thêm vào đây
// app.use('/api/auth', require('./routes/auth.routes'));
// app.use('/api/products', require('./routes/product.routes'));
// ...

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint không tồn tại' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   🍜 Server Ẩm Thực Phương Nam đang chạy              ║
║   📍 URL: http://localhost:${PORT}                       ║
║   🌍 Environment: ${process.env.NODE_ENV}                      ║
║   💾 Database: ${process.env.DB_NAME}              ║
╚════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
