# Hướng Dẫn Lọc Nguyên Liệu Theo Loại

## 🎯 Tổng Quan

Tính năng lọc nguyên liệu giúp bạn dễ dàng tìm kiếm và quản lý nguyên liệu theo nhiều tiêu chí khác nhau.

## 📍 Vị Trí

Trang: `http://localhost:3000/admin/nguyen-lieu.html`

Phần lọc nằm ngay phía trên bảng danh sách nguyên liệu.

## 🔍 Các Bộ Lọc

### 1. **Tìm Kiếm Theo Tên** 
- Ô input đầu tiên
- Gõ tên nguyên liệu cần tìm
- Tự động lọc khi gõ (không cần nhấn nút)
- Ví dụ: Gõ "cá" → Hiển thị: Cá tim, Cá hồi, Cá chép...

### 2. **Lọc Theo Loại Nguyên Liệu** ⭐ MỚI
- Dropdown thứ 2: "Tất cả loại nguyên liệu"
- Chọn loại để xem nguyên liệu thuộc nhóm đó
- Các tùy chọn:
  - **Tất cả loại nguyên liệu** - Hiển thị tất cả
  - **Rau củ quả** - Chỉ hiển thị rau củ
  - **Hải sản** - Chỉ hiển thị hải sản
  - **Thịt gia súc** - Chỉ hiển thị thịt
  - **...** (các loại khác bạn đã tạo)
  - **Chưa phân loại** - Hiển thị nguyên liệu chưa được gán loại

### 3. **Lọc Theo Trạng Thái Tồn Kho**
- Dropdown thứ 3: "Tất cả trạng thái"
- Các tùy chọn:
  - **Tất cả trạng thái** - Hiển thị tất cả
  - **Còn hàng (> Cảnh báo)** - Tồn kho nhiều hơn mức cảnh báo
  - **Sắp hết (<= Cảnh báo)** - Tồn kho bằng hoặc dưới mức cảnh báo
  - **Hết hàng (0)** - Tồn kho = 0

### 4. **Nút Đặt Lại**
- Nút cuối cùng với icon ↻
- Click để xóa tất cả bộ lọc
- Quay về hiển thị toàn bộ nguyên liệu

## 💡 Cách Sử Dụng

### Ví Dụ 1: Xem tất cả hải sản
1. Click dropdown "Tất cả loại nguyên liệu"
2. Chọn "Hải sản"
3. Bảng sẽ chỉ hiển thị các nguyên liệu thuộc loại hải sản

### Ví Dụ 2: Tìm hải sản sắp hết
1. Dropdown "Loại": Chọn "Hải sản"
2. Dropdown "Trạng thái": Chọn "Sắp hết"
3. Bảng hiển thị các hải sản có tồn kho <= mức cảnh báo

### Ví Dụ 3: Tìm "tôm" trong hải sản
1. Gõ "tôm" vào ô tìm kiếm
2. Dropdown "Loại": Chọn "Hải sản"
3. Bảng hiển thị các loại tôm trong nhóm hải sản

### Ví Dụ 4: Xem nguyên liệu chưa phân loại
1. Dropdown "Loại": Chọn "Chưa phân loại"
2. Bảng hiển thị các nguyên liệu chưa được gán loại
3. Bạn có thể click "Sửa" để gán loại cho chúng

## 🎨 Giao Diện

```
┌─────────────────────────────────────────────────────────────────┐
│  [Tìm kiếm...]  [Loại NL ▼]  [Trạng thái ▼]  [↻ Đặt lại]      │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Kết Hợp Bộ Lọc

Bạn có thể kết hợp nhiều bộ lọc cùng lúc:

| Tìm kiếm | Loại | Trạng thái | Kết quả |
|----------|------|------------|---------|
| "cá" | Hải sản | Sắp hết | Các loại cá sắp hết hàng |
| "" | Rau củ | Hết hàng | Rau củ đã hết |
| "thịt" | Thịt gia súc | Còn hàng | Thịt còn nhiều |
| "" | Chưa phân loại | "" | Tất cả NL chưa có loại |

## 📊 Lợi Ích

✅ **Quản lý dễ dàng** - Nhanh chóng tìm nguyên liệu cần thiết

✅ **Kiểm soát tồn kho** - Xem nguyên liệu sắp hết theo từng loại

✅ **Lập kế hoạch mua hàng** - Biết loại nào cần nhập thêm

✅ **Phân loại rõ ràng** - Tìm nguyên liệu chưa được phân loại để gán loại

✅ **Tiết kiệm thời gian** - Không cần scroll tìm trong danh sách dài

## 🛠️ Kỹ Thuật

### Cách Hoạt Động:
1. **Load danh sách loại** từ API `/api/ingredient-categories`
2. **Populate dropdown** với các loại đã tạo
3. **Filter client-side** khi người dùng chọn
4. **Re-render bảng** với kết quả lọc

### Code Logic:
```javascript
// Lọc theo loại
if(categoryFilter === 'null') {
    // Lọc nguyên liệu chưa phân loại
    isMatchCategory = !i.ma_loai_nglieu;
} else {
    // Lọc theo loại cụ thể
    isMatchCategory = i.ma_loai_nglieu == categoryFilter;
}
```

## 🎯 Workflow Khuyến Nghị

### Bước 1: Tạo Phân Loại
1. Vào trang "Loại nguyên liệu"
2. Tạo các loại: Rau củ, Hải sản, Thịt, Gia vị...

### Bước 2: Gán Loại Cho Nguyên Liệu
1. Vào trang "Nguyên liệu"
2. Lọc "Chưa phân loại"
3. Sửa từng nguyên liệu và chọn loại phù hợp

### Bước 3: Sử Dụng Bộ Lọc
1. Lọc theo loại để kiểm tra tồn kho
2. Kết hợp với trạng thái để lập kế hoạch nhập hàng
3. Tìm kiếm nhanh khi cần

## 📱 Responsive

- **Desktop**: 4 cột (Tìm kiếm | Loại | Trạng thái | Đặt lại)
- **Tablet/Mobile**: 1 cột, xếp dọc

## 🐛 Xử Lý Lỗi

### Không thấy dropdown loại?
- Kiểm tra đã tạo loại nguyên liệu chưa
- Vào trang "Loại nguyên liệu" để tạo

### Lọc không hoạt động?
- Kiểm tra console log (F12)
- Refresh trang (Ctrl+R)
- Xóa cache trình duyệt

### Nguyên liệu không hiển thị đúng loại?
- Kiểm tra nguyên liệu đã được gán loại chưa
- Vào "Sửa" nguyên liệu để kiểm tra

## 🎓 Tips & Tricks

💡 **Tip 1**: Lọc "Chưa phân loại" để gán loại cho nguyên liệu mới

💡 **Tip 2**: Kết hợp "Loại" + "Sắp hết" để biết loại nào cần nhập gấp

💡 **Tip 3**: Dùng tìm kiếm + loại để tìm nhanh nguyên liệu cụ thể

💡 **Tip 4**: Click "Đặt lại" để quay về xem toàn bộ

💡 **Tip 5**: Đặt tên loại ngắn gọn để dễ nhìn trong dropdown

---

**Phiên bản:** 1.0  
**Cập nhật:** 2026-04-18  
**Tính năng:** Lọc nguyên liệu theo loại
