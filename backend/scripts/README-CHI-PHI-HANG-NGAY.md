# 💰 QUẢN LÝ CHI PHÍ HÀNG NGÀY

## 📋 Tổng Quan

Module quản lý chi phí hàng ngày giúp ghi chép và theo dõi tất cả các khoản chi tiêu của nhà hàng để tính toán doanh thu và lợi nhuận chính xác.

## 🎯 Mục Đích

- Ghi chép chi tiết các khoản chi phí phát sinh hàng ngày
- Phân loại chi phí theo từng danh mục
- Theo dõi người nhận và phương thức thanh toán
- Hỗ trợ tính toán doanh thu thuần và lợi nhuận
- Báo cáo chi phí theo ngày/tuần/tháng

## 📊 Cấu Trúc Bảng Database

### Bảng: `chi_phi_hang_ngay`

| Cột | Kiểu dữ liệu | Mô tả |
|-----|-------------|-------|
| ma_chi_phi | INT (PK, AUTO_INCREMENT) | Mã chi phí |
| ngay_chi | DATE | Ngày phát sinh chi phí |
| loai_chi_phi | VARCHAR(100) | Loại chi phí |
| ten_chi_phi | VARCHAR(255) | Tên khoản chi cụ thể |
| so_tien | DECIMAL(15,2) | Số tiền chi |
| mo_ta | TEXT | Mô tả chi tiết |
| nguoi_nhan | VARCHAR(255) | Người nhận/Đơn vị cung cấp |
| phuong_thuc_thanh_toan | VARCHAR(50) | Phương thức thanh toán |
| nguoi_tao | INT (FK) | Nhân viên tạo phiếu chi |
| ngay_tao | DATETIME | Ngày tạo bản ghi |
| ngay_cap_nhat | DATETIME | Ngày cập nhật |

## 📂 Các Loại Chi Phí

1. **Nguyên liệu** - Chi phí mua nguyên liệu thực phẩm
2. **Điện nước** - Hóa đơn điện, nước hàng tháng
3. **Tiền thuê mặt bằng** - Chi phí thuê nhà, mặt bằng
4. **Lương nhân viên** - Lương, thưởng nhân viên
5. **Bảo trì sửa chữa** - Sửa chữa thiết bị, cơ sở vật chất
6. **Marketing** - Quảng cáo, khuyến mãi
7. **Văn phòng phẩm** - Giấy tờ, dụng cụ văn phòng
8. **Vận chuyển** - Chi phí giao hàng, vận chuyển
9. **Khác** - Các chi phí khác

## 🔧 Cài Đặt

### 1. Tạo Bảng Database

```bash
# Chạy script SQL
mysql -u root -p amthuc_phuongnam < backend/scripts/create-expenses-table.sql
```

Hoặc chạy trực tiếp trong MySQL:

```sql
SOURCE backend/scripts/create-expenses-table.sql;
```

### 2. Khởi Động Server

Server sẽ tự động đăng ký route `/api/expenses` khi khởi động.

## 📡 API Endpoints

### 1. Lấy Danh Sách Loại Chi Phí
```
GET /api/expenses/categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    "Nguyên liệu",
    "Điện nước",
    "Tiền thuê mặt bằng",
    ...
  ]
}
```

### 2. Lấy Chi Phí Theo Ngày
```
GET /api/expenses?ngay=2024-01-15
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "tongChi": 5000000
}
```

### 3. Lấy Chi Phí Theo Khoảng Thời Gian
```
GET /api/expenses/range?tu_ngay=2024-01-01&den_ngay=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "tongChi": 50000000,
  "thongKeTheoLoai": [
    {
      "loai": "Nguyên liệu",
      "so_luong": 15,
      "tong_tien": 25000000
    },
    ...
  ]
}
```

### 4. Lấy Chi Tiết Một Chi Phí
```
GET /api/expenses/:id
```

### 5. Thêm Chi Phí Mới
```
POST /api/expenses
Content-Type: application/json

{
  "ngay_chi": "2024-01-15",
  "loai_chi_phi": "Nguyên liệu",
  "ten_chi_phi": "Mua rau củ quả tươi",
  "so_tien": 1500000,
  "mo_ta": "Mua tại chợ đầu mối",
  "nguoi_nhan": "Chợ đầu mối Vĩnh Long",
  "phuong_thuc_thanh_toan": "Tiền mặt",
  "nguoi_tao": 1
}
```

### 6. Cập Nhật Chi Phí
```
PUT /api/expenses/:id
Content-Type: application/json

{
  "ngay_chi": "2024-01-15",
  "loai_chi_phi": "Nguyên liệu",
  "ten_chi_phi": "Mua rau củ quả tươi",
  "so_tien": 1800000,
  ...
}
```

### 7. Xóa Chi Phí
```
DELETE /api/expenses/:id
```

### 8. Thống Kê Chi Phí Theo Tháng
```
GET /api/expenses/stats/monthly?thang=1&nam=2024
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "loai_chi_phi": "Nguyên liệu",
      "so_luong": 20,
      "tong_tien": 30000000
    },
    ...
  ],
  "tongChiThang": 50000000
}
```

## 🖥️ Giao Diện Admin

### Truy Cập
```
http://localhost:3000/admin/chi-phi-hang-ngay.html
```

### Tính Năng

1. **Dashboard Thống Kê**
   - Tổng chi hôm nay
   - Tổng chi tuần này
   - Tổng chi tháng này
   - Tổng số khoản chi

2. **Bộ Lọc**
   - Lọc theo khoảng thời gian
   - Lọc theo loại chi phí
   - Tìm kiếm theo tên

3. **Quản Lý Chi Phí**
   - Thêm chi phí mới
   - Sửa chi phí
   - Xóa chi phí
   - Xem chi tiết

4. **Báo Cáo**
   - Tổng chi theo bộ lọc
   - Số lượng khoản chi
   - Phân loại theo danh mục

## 💡 Ví Dụ Sử Dụng

### Ghi Chép Chi Phí Hàng Ngày

**Buổi sáng:**
- Mua rau củ quả: 1,500,000đ
- Mua thịt cá: 2,000,000đ
- Tiền điện tháng trước: 2,500,000đ

**Buổi chiều:**
- Sửa máy lạnh: 1,200,000đ
- Mua văn phòng phẩm: 350,000đ

**Tổng chi trong ngày: 7,550,000đ**

### Tính Doanh Thu Thuần

```
Doanh thu = Tổng thu - Tổng chi
          = 15,000,000đ - 7,550,000đ
          = 7,450,000đ (Lợi nhuận)
```

## 📈 Báo Cáo & Phân Tích

### Báo Cáo Theo Tháng

```javascript
// Lấy thống kê tháng 1/2024
GET /api/expenses/stats/monthly?thang=1&nam=2024

// Kết quả:
{
  "Nguyên liệu": 30,000,000đ (60%)
  "Điện nước": 5,000,000đ (10%)
  "Tiền thuê": 15,000,000đ (30%)
  ...
}
```

### Top Chi Phí Cao Nhất

Hệ thống tự động sắp xếp theo số tiền giảm dần để dễ dàng xác định các khoản chi lớn.

## 🔐 Bảo Mật

- Chỉ admin và quản lý mới có quyền truy cập
- Ghi log mọi thao tác thêm/sửa/xóa
- Lưu thông tin người tạo phiếu chi

## 🚀 Tích Hợp

Module này tích hợp với:
- **Quản lý kho** - Chi phí nhập nguyên liệu
- **Quản lý nhân sự** - Chi phí lương
- **Báo cáo tài chính** - Tính doanh thu thuần

## 📝 Lưu Ý

1. **Ghi chép đầy đủ**: Nên ghi chép mọi khoản chi, dù nhỏ
2. **Phân loại chính xác**: Chọn đúng loại chi phí để báo cáo chính xác
3. **Lưu chứng từ**: Nên lưu hóa đơn, biên lai kèm theo
4. **Kiểm tra định kỳ**: Đối chiếu chi phí với sổ sách hàng tháng

## 🛠️ Troubleshooting

### Lỗi: Không tạo được chi phí

**Nguyên nhân:** Thiếu thông tin bắt buộc

**Giải pháp:** Kiểm tra các trường:
- Ngày chi
- Loại chi phí
- Tên chi phí
- Số tiền (> 0)

### Lỗi: Không load được dữ liệu

**Nguyên nhân:** Chưa tạo bảng database

**Giải pháp:**
```bash
mysql -u root -p amthuc_phuongnam < backend/scripts/create-expenses-table.sql
```

## 📞 Hỗ Trợ

Nếu gặp vấn đề, vui lòng liên hệ:
- Email: support@phuongnam.vn
- Hotline: 0123 456 789

---

**Phiên bản:** 1.0.0  
**Ngày cập nhật:** 20/04/2026  
**Tác giả:** Nhóm phát triển Ẩm Thực Phương Nam
