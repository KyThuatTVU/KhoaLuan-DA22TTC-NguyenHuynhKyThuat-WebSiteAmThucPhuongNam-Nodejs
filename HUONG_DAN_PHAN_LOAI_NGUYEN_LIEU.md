# Hướng Dẫn Sử Dụng Tính Năng Phân Loại Nguyên Liệu

## 🎯 Tổng Quan

Hệ thống phân loại nguyên liệu giúp bạn tổ chức và quản lý nguyên liệu theo các nhóm như:
- 🥬 Rau củ quả
- 🦐 Hải sản
- 🥩 Thịt gia súc
- 🍚 Gạo, ngũ cốc
- 🥤 Thức uống
- 🧂 Gia vị
- ...và nhiều loại khác

## 📍 Truy Cập

1. Đăng nhập vào trang Admin: `http://localhost:3000/admin/dang-nhap-admin.html`
2. Vào menu bên trái, chọn **"Loại nguyên liệu"**
3. Hoặc truy cập trực tiếp: `http://localhost:3000/admin/loai-nguyen-lieu.html`

## ✨ Các Tính Năng

### 1. Xem Danh Sách Phân Loại
- Hiển thị tất cả các loại nguyên liệu đã tạo
- Mỗi loại có mã định danh và tên riêng
- Giao diện bảng rõ ràng, dễ theo dõi

### 2. Thêm Loại Nguyên Liệu Mới

**Các bước:**
1. Click nút **"Thêm loại hàng mới"** (góc trên bên phải)
2. Nhập tên loại nguyên liệu (ví dụ: "Hải sản tươi sống")
3. Click **"Lưu thay đổi"**

**Lưu ý:**
- Tên loại nguyên liệu là bắt buộc
- Nên đặt tên rõ ràng, dễ hiểu
- Ví dụ tốt: "Rau củ tươi", "Thịt đông lạnh", "Gia vị khô"

### 3. Sửa Loại Nguyên Liệu

**Các bước:**
1. Tìm loại nguyên liệu cần sửa trong bảng
2. Click nút **"Sửa"** (biểu tượng bút)
3. Cập nhật tên mới
4. Click **"Lưu thay đổi"**

### 4. Xóa Loại Nguyên Liệu

**Các bước:**
1. Tìm loại nguyên liệu cần xóa
2. Click nút **"Xóa"** (biểu tượng thùng rác)
3. Xác nhận xóa

**⚠️ Lưu ý quan trọng:**
- Không thể xóa loại nguyên liệu nếu đang có nguyên liệu thuộc nhóm này
- Cần chuyển các nguyên liệu sang nhóm khác trước khi xóa
- Hệ thống sẽ thông báo nếu không thể xóa

## 🔗 Liên Kết Với Nguyên Liệu

Sau khi tạo phân loại, bạn có thể:
1. Vào trang **"Nguyên liệu"** (`nguyen-lieu.html`)
2. Khi thêm/sửa nguyên liệu, chọn loại phù hợp từ dropdown
3. Mỗi nguyên liệu sẽ được gắn với một loại cụ thể

## 📊 Cấu Trúc Database

### Bảng: `loai_nguyen_lieu`
```sql
- ma_loai_nglieu (INT, PRIMARY KEY, AUTO_INCREMENT)
- ten_loai_nglieu (VARCHAR)
```

### Bảng: `nguyen_lieu`
```sql
- ma_nguyen_lieu (INT, PRIMARY KEY)
- ten_nguyen_lieu (VARCHAR)
- ma_loai_nglieu (INT, FOREIGN KEY)
- ...
```

## 🔌 API Endpoints

### 1. Lấy danh sách tất cả loại nguyên liệu
```
GET /api/ingredient-categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ma_loai_nglieu": 1,
      "ten_loai_nglieu": "Rau củ quả"
    }
  ]
}
```

### 2. Thêm loại nguyên liệu mới
```
POST /api/ingredient-categories
Content-Type: application/json

{
  "ten_loai_nglieu": "Hải sản"
}
```

### 3. Cập nhật loại nguyên liệu
```
PUT /api/ingredient-categories/:id
Content-Type: application/json

{
  "ten_loai_nglieu": "Hải sản tươi sống"
}
```

### 4. Xóa loại nguyên liệu
```
DELETE /api/ingredient-categories/:id
```

## 🛡️ Bảo Mật

- Tất cả các API yêu cầu quyền Admin (`isAdmin` middleware)
- Chỉ Admin mới có thể thêm/sửa/xóa phân loại
- Session-based authentication

## 💡 Gợi Ý Phân Loại

### Nhà hàng Việt Nam:
1. **Rau củ tươi** - Rau muống, cải, cà chua...
2. **Hải sản** - Tôm, cá, mực...
3. **Thịt gia súc** - Thịt heo, bò, gà...
4. **Gia vị** - Muối, đường, nước mắm...
5. **Ngũ cốc** - Gạo, bún, phở...
6. **Đồ uống** - Nước ngọt, bia, rượu...
7. **Đồ khô** - Nấm khô, hải sản khô...
8. **Đồ đông lạnh** - Thực phẩm bảo quản lạnh

### Lợi ích của việc phân loại tốt:
- ✅ Dễ tìm kiếm nguyên liệu
- ✅ Quản lý tồn kho hiệu quả
- ✅ Báo cáo chi tiết theo từng nhóm
- ✅ Lập kế hoạch mua hàng tốt hơn
- ✅ Kiểm soát chi phí theo danh mục

## 🐛 Xử Lý Lỗi

### Lỗi: "Không thể xóa loại này vì đang có nguyên liệu thuộc nhóm này"
**Giải pháp:**
1. Vào trang Nguyên liệu
2. Tìm các nguyên liệu thuộc loại cần xóa
3. Chuyển chúng sang loại khác
4. Quay lại xóa loại cũ

### Lỗi: "Tên loại nguyên liệu là bắt buộc"
**Giải pháp:**
- Đảm bảo đã nhập tên trước khi lưu
- Tên không được để trống

## 📞 Hỗ Trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra console log (F12)
2. Xem file log backend
3. Liên hệ team phát triển

---

**Phiên bản:** 1.0  
**Cập nhật:** 2026-04-18
