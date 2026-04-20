# ✅ KIỂM TRA TÍNH NĂNG CHI PHÍ HÀNG NGÀY

## 🎯 Vấn Đề Đã Giải Quyết

**Trước:** Bạn ghi chép chi phí nhưng không thấy doanh thu thuần (thu - chi)  
**Sau:** Hệ thống tự động tính doanh thu thuần và hiển thị chi tiết

---

## 🔧 Những Gì Đã Cập Nhật

### 1. Backend API (3 thay đổi)

✅ **Cập nhật `/api/stats/financial-summary`**
- Trước: Chỉ lấy chi phí từ `phieu_nhap` (nhập kho)
- Sau: Lấy chi phí từ cả `phieu_nhap` + `chi_phi_hang_ngay`

✅ **Thêm API `/api/stats/daily-detail`**
- Lấy chi tiết thu/chi theo ngày cụ thể
- Hiển thị từng khoản thu, từng khoản chi

✅ **Tích hợp với module chi phí**
- Menu "Chi phí hàng ngày" đã thêm vào sidebar
- Dữ liệu chi phí tự động tính vào báo cáo tài chính

### 2. Frontend (2 thay đổi)

✅ **Cập nhật trang báo cáo tài chính**
- Gọi API mới để lấy dữ liệu
- Hiển thị chi tiết chi phí hàng ngày trong modal

✅ **Thêm menu navigation**
- Menu "Chi phí hàng ngày" trong sidebar admin

---

## 🧪 Cách Kiểm Tra

### Bước 1: Thêm Chi Phí Hàng Ngày

1. **Truy cập:** `http://localhost:3000/admin/chi-phi-hang-ngay.html`
2. **Thêm chi phí hôm nay:**
   ```
   Ngày chi: Hôm nay
   Loại: Nguyên liệu
   Tên: Mua rau củ quả
   Số tiền: 500,000đ
   Người nhận: Chợ đầu mối
   ```
3. **Lưu**

### Bước 2: Xem Báo Cáo Tài Chính

1. **Truy cập:** `http://localhost:3000/admin/doanh-thu.html`
2. **Chọn tháng hiện tại**
3. **Nhấn nút Lọc**
4. **Kết quả mong đợi:**
   - Thẻ "Tổng Chi" sẽ bao gồm chi phí vừa thêm
   - Thẻ "Lợi Nhuận" = Tổng Thu - Tổng Chi (bao gồm chi phí hàng ngày)

### Bước 3: Xem Chi Tiết Theo Ngày

1. **Trong bảng chi tiết hàng ngày**
2. **Nhấn vào dòng ngày hôm nay**
3. **Modal sẽ hiển thị:**
   - **Khoản Thu:** Các đơn hàng, thanh toán
   - **Khoản Chi:** Nhập kho + Chi phí hàng ngày (có badge phân biệt)
   - **Tổng kết:** Thu, Chi, Lợi nhuận ròng

---

## 📊 Ví Dụ Thực Tế

### Ngày 20/04/2026

**Khoản Thu:**
- Đơn online #1234: 500,000đ
- Bán tại quầy #5678: 300,000đ
- **Tổng thu: 800,000đ**

**Khoản Chi:**
- Nhập kho từ NCC ABC: 200,000đ (badge: "Nhập kho")
- Mua rau củ quả: 150,000đ (badge: "Chi phí hàng ngày")
- Tiền điện: 100,000đ (badge: "Chi phí hàng ngày")
- **Tổng chi: 450,000đ**

**Lợi Nhuận Ròng: 350,000đ** ✅

---

## 🔍 Kiểm Tra API Trực Tiếp

### 1. Kiểm Tra API Chi Phí

```bash
curl "http://localhost:3000/api/expenses?ngay=2026-04-20"
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "data": [...],
  "tongChi": 250000
}
```

### 2. Kiểm Tra API Báo Cáo Tài Chính

```bash
curl "http://localhost:3000/api/stats/financial-summary?month=4&year=2026"
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-04-20",
      "thu": 800000,
      "chi": 450000,
      "net": 350000
    }
  ],
  "summary": {
    "totalRevenue": 800000,
    "totalExpenses": 450000,
    "netProfit": 350000
  }
}
```

### 3. Kiểm Tra API Chi Tiết Ngày

```bash
curl "http://localhost:3000/api/stats/daily-detail?date=2026-04-20"
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "data": {
    "date": "2026-04-20",
    "revenue": [...],
    "expenses": [
      {
        "so_tien": 200000,
        "mo_ta": "Nhập kho từ NCC ABC",
        "nguon": "Nhập kho"
      },
      {
        "so_tien": 150000,
        "mo_ta": "Mua rau củ quả",
        "loai_chi_phi": "Nguyên liệu",
        "nguon": "Chi phí hàng ngày"
      }
    ],
    "summary": {
      "totalRevenue": 800000,
      "totalExpenses": 450000,
      "netProfit": 350000
    }
  }
}
```

---

## 🎨 Giao Diện Mới

### Trong Modal Chi Tiết Ngày

**Khoản Chi sẽ hiển thị:**
```
┌─────────────────────────────────────────────────────────┐
│ Mua rau củ quả                                 150,000đ │
│ 14:30 • Chi phí hàng ngày • Chợ đầu mối               │
│ [Nguyên liệu]                                          │
├─────────────────────────────────────────────────────────┤
│ Nhập kho từ NCC ABC                            200,000đ │
│ 09:15 • Nhập kho • Công ty ABC                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Đặc điểm:**
- Badge màu cam: "Chi phí hàng ngày"
- Badge màu xám: "Nhập kho"
- Hiển thị loại chi phí (Nguyên liệu, Điện nước, v.v.)
- Hiển thị người nhận/đơn vị cung cấp

---

## 🐛 Troubleshooting

### Lỗi: Không thấy chi phí trong báo cáo

**Nguyên nhân:** Chi phí và báo cáo khác tháng

**Giải pháp:**
1. Kiểm tra ngày chi phí: `http://localhost:3000/admin/chi-phi-hang-ngay.html`
2. Kiểm tra tháng báo cáo: `http://localhost:3000/admin/doanh-thu.html`
3. Đảm bảo cùng tháng/năm

### Lỗi: Modal không hiển thị chi tiết

**Nguyên nhân:** API lỗi hoặc không có dữ liệu

**Giải pháp:**
1. Mở Developer Tools (F12)
2. Xem tab Console có lỗi không
3. Xem tab Network, kiểm tra API response

### Lỗi: Tổng chi không đúng

**Nguyên nhân:** Có thể có chi phí trùng lặp

**Giải pháp:**
1. Kiểm tra database:
   ```sql
   SELECT DATE(ngay_chi) as ngay, SUM(so_tien) as tong
   FROM chi_phi_hang_ngay 
   WHERE DATE(ngay_chi) = '2026-04-20'
   GROUP BY DATE(ngay_chi);
   ```
2. So sánh với giao diện

---

## ✅ Checklist Kiểm Tra

- [ ] Menu "Chi phí hàng ngày" xuất hiện trong sidebar
- [ ] Có thể thêm chi phí hàng ngày
- [ ] Chi phí hiển thị trong danh sách
- [ ] Báo cáo tài chính bao gồm chi phí hàng ngày
- [ ] Modal chi tiết hiển thị đúng 2 loại chi phí
- [ ] Tổng thu, chi, lợi nhuận tính đúng
- [ ] Badge phân biệt nguồn chi phí
- [ ] Responsive trên mobile

---

## 🎉 Kết Quả Mong Đợi

Sau khi hoàn thành, bạn sẽ có:

✅ **Hệ thống quản lý chi phí hoàn chỉnh:**
- Ghi chép chi phí hàng ngày
- Xem báo cáo tài chính tổng hợp
- Phân tích chi tiết thu/chi theo ngày

✅ **Tính toán doanh thu chính xác:**
```
Doanh Thu Thuần = Tổng Thu - (Nhập Kho + Chi Phí Hàng Ngày)
```

✅ **Báo cáo trực quan:**
- Biểu đồ thu/chi theo ngày
- Bảng chi tiết có thể click
- Modal hiển thị từng khoản thu/chi

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
- **Kiểm tra console:** F12 → Console
- **Kiểm tra network:** F12 → Network
- **Kiểm tra database:** MySQL Workbench

---

**Phiên bản:** 1.1.0  
**Ngày cập nhật:** 20/04/2026  
**Tác giả:** Nhóm phát triển Ẩm Thực Phương Nam

---

**🎯 Mục tiêu đạt được: Bạn có thể xem doanh thu thuần chính xác sau khi ghi chép chi phí!** ✅