# Backend API - Ẩm Thực Phương Nam

## Cấu hình từ .env

### Database
- Host: `localhost`
- Port: `3306`
- Database: `amthuc_phuongnam`
- User: `root`

### Server
- Port: `3000`
- Environment: `development`

### Tích hợp
- ✅ MySQL Database
- ✅ JWT Authentication
- ✅ Email (Gmail)
- ✅ Google OAuth
- ✅ Groq AI API
- ✅ MoMo Payment Gateway
- ✅ File Upload

## Cài đặt

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Kiểm tra file .env
File `.env` đã được cấu hình sẵn với:
- Thông tin database MySQL
- JWT secret key
- Email configuration (Gmail)
- Google OAuth credentials
- Groq AI API key
- MoMo payment credentials

### 3. Tạo database
Import file SQL:
```bash
mysql -u root -p"TVU@842004" < ../Database/QuanLyNhaHangPhuongNam.sql
```

### 4. Chạy server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## Test Endpoints

### Health Check
```bash
GET http://localhost:3000/api/health
```

### Test Database Connection
```bash
GET http://localhost:3000/api/test-db
```

## Cấu trúc dự án

```
backend/
├── config/
│   └── database.js          # Cấu hình MySQL connection
├── images/                  # Thư mục lưu ảnh upload
├── .env                     # Biến môi trường (đã cấu hình)
├── .gitignore              # Git ignore
├── server.js               # Entry point
├── package.json            # Dependencies
└── README.md               # Tài liệu này
```

## Các API sẽ phát triển

- `/api/auth` - Authentication & Authorization
- `/api/products` - Quản lý món ăn
- `/api/categories` - Quản lý danh mục
- `/api/orders` - Quản lý đơn hàng
- `/api/cart` - Giỏ hàng
- `/api/reservations` - Đặt bàn
- `/api/news` - Tin tức
- `/api/reviews` - Đánh giá
- `/api/payment` - Thanh toán (MoMo)
- `/api/ai` - AI Chatbot & Recommendations (Groq)

## Lưu ý bảo mật

⚠️ File `.env` chứa thông tin nhạy cảm:
- Database password
- JWT secret
- Email password (App Password)
- API keys (Groq, Google OAuth)
- MoMo credentials

Đảm bảo file này không được commit lên Git!
