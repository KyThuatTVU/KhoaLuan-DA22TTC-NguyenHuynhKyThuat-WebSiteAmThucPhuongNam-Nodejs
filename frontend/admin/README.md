# Admin Panel - Nhà hàng Phương Nam Vĩnh Long

## 📋 Tổng quan

Giao diện quản trị hiện đại cho hệ thống nhà hàng, được xây dựng với Tailwind CSS và tích hợp đầy đủ với backend API.

## 🚀 Các trang chính

### 1. Dashboard (`dashboard.html`)
- Tổng quan thống kê: doanh thu, đơn hàng, đặt bàn, khách hàng
- Biểu đồ doanh thu 7 ngày qua
- Biểu đồ phân bố đơn hàng theo trạng thái
- Danh sách đơn hàng gần đây
- Top món ăn bán chạy

### 2. Quản lý Món ăn (`products.html`)
- Hiển thị grid món ăn với ảnh
- Thêm/sửa/xóa món ăn
- Upload ảnh món ăn
- Lọc theo danh mục và trạng thái
- Tìm kiếm món ăn
- Quản lý giá và giá khuyến mãi

### 3. Quản lý Đơn hàng (`orders.html`)
- Thống kê đơn hàng theo trạng thái
- Danh sách đơn hàng với bộ lọc
- Cập nhật trạng thái đơn hàng
- Xem chi tiết đơn hàng
- Lọc theo ngày, trạng thái thanh toán

### 4. Quản lý Đặt bàn (`reservations.html`)
- Thống kê đặt bàn
- Danh sách đặt bàn
- Cập nhật trạng thái (chờ xác nhận, đã xác nhận, hoàn thành, hủy)
- Lọc theo ngày, giờ
- Xem thông tin chi tiết

### 5. Quản lý Khách hàng (`customers.html`)
- Thống kê khách hàng
- Danh sách khách hàng với avatar
- Xem chi tiết thông tin khách hàng
- Khóa/mở khóa tài khoản
- Lọc theo trạng thái, giới tính

### 6. Quản lý Tin tức (`news.html`)
- Danh sách bài viết
- Thêm/sửa/xóa bài viết
- Upload ảnh bài viết
- Quản lý trạng thái (đăng/nháp/ẩn)
- Lọc theo trạng thái và ngày

### 7. Quản lý Album ảnh (`albums.html`)
- Hiển thị grid ảnh
- Upload nhiều ảnh cùng lúc
- Phân loại ảnh (món ăn, không gian, sự kiện, khác)
- Xem preview ảnh full size
- Xóa ảnh
- Lọc theo loại ảnh

### 8. Cài đặt (`settings.html`)
- Thông tin nhà hàng
- Giờ hoạt động
- Cài đặt giao hàng (phí ship, miễn phí ship)
- Phương thức thanh toán (tiền mặt, chuyển khoản, MoMo)
- Cài đặt hệ thống (bảo trì, thông báo email)
- Sao lưu dữ liệu

## 🔐 Đăng nhập

### Trang đăng nhập (`dang-nhap-admin.html`)
- Đăng nhập bằng Google OAuth
- Chỉ tài khoản được cấp quyền mới truy cập được
- Tự động chuyển hướng sau khi đăng nhập thành công

### File xác thực (`check-auth.js`)
- Kiểm tra session admin
- Tự động redirect nếu chưa đăng nhập
- Lưu thông tin admin

## 🎨 Thiết kế

### Màu sắc chủ đạo
- Primary: Orange (#ea580c)
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Danger: Red (#ef4444)
- Info: Blue (#3b82f6)

### Components
- **Sidebar**: Cố định bên trái, responsive
- **Cards**: Hiển thị thống kê và nội dung
- **Modals**: Thêm/sửa dữ liệu
- **Tables**: Danh sách dữ liệu
- **Badges**: Hiển thị trạng thái
- **Buttons**: Các action buttons
- **Forms**: Input, select, textarea với validation

### Icons
- Font Awesome 6.5.1
- Sử dụng icons cho tất cả menu và actions

## 📱 Responsive Design

- **Desktop**: Full sidebar + content
- **Tablet**: Sidebar có thể toggle
- **Mobile**: Sidebar ẩn, hiện khi click menu

## 🔧 Tích hợp API

### Base URL
```javascript
const API_URL = 'http://localhost:3000/api';
```

### Endpoints sử dụng
- `/menu` - Món ăn
- `/categories` - Danh mục
- `/orders` - Đơn hàng
- `/news` - Tin tức
- `/albums` - Album ảnh
- `/admin-auth` - Xác thực admin

### Authentication
- Sử dụng `credentials: 'include'` cho tất cả requests
- Session-based authentication
- Auto logout khi session hết hạn

## 📦 Dependencies

### CDN
- Tailwind CSS: `https://cdn.tailwindcss.com`
- Font Awesome: `6.5.1`
- Chart.js: `https://cdn.jsdelivr.net/npm/chart.js`

### Không cần cài đặt
Tất cả dependencies được load từ CDN, không cần npm install.

## 🚀 Cách sử dụng

### 1. Khởi động Backend
```bash
cd backend
npm start
```

### 2. Truy cập Admin Panel
```
http://localhost:3000/admin/dang-nhap-admin.html
```

### 3. Đăng nhập
- Click "Đăng nhập với Google"
- Chọn tài khoản Google được cấp quyền
- Tự động chuyển đến Dashboard

## 🔒 Bảo mật

- Chỉ admin được cấp quyền mới truy cập được
- Session timeout tự động
- CSRF protection
- XSS prevention
- Input validation

## 📝 Ghi chú

### Dữ liệu mẫu
Một số trang sử dụng dữ liệu mẫu (mock data) khi API chưa sẵn sàng:
- Customers (một phần)
- Reservations (một phần)

### Cần hoàn thiện
- Tích hợp đầy đủ API cho tất cả endpoints
- Thêm phân trang cho danh sách dài
- Thêm export/import dữ liệu
- Thêm báo cáo chi tiết
- Thêm notification real-time

## 🐛 Xử lý lỗi

- Hiển thị loading state khi tải dữ liệu
- Alert thông báo khi có lỗi
- Console.log để debug
- Fallback UI khi không có dữ liệu

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Backend đã chạy chưa?
2. Database đã kết nối chưa?
3. Tài khoản admin đã được cấp quyền chưa?
4. Console có lỗi gì không?

## 🎯 Tính năng nổi bật

✅ Giao diện hiện đại, chuyên nghiệp
✅ Responsive trên mọi thiết bị
✅ Tích hợp đầy đủ với backend
✅ Upload file/ảnh
✅ Biểu đồ thống kê
✅ Lọc và tìm kiếm mạnh mẽ
✅ Cập nhật real-time
✅ UX/UI tối ưu

---

**Version**: 1.0.0  
**Last Updated**: November 2024  
**Framework**: Tailwind CSS + Vanilla JavaScript
