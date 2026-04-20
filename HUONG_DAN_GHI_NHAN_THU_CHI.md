# Hướng Dẫn Ghi Nhận Thu Chi Trong Hệ Thống

## 📊 Tổng Quan

Hệ thống tự động ghi nhận TẤT CẢ các khoản thu chi để báo cáo tài chính chính xác.

---

## 💰 CÁC NGUỒN THU (DOANH THU)

### 1. Thanh Toán Đơn Hàng
- **Bảng**: `thanh_toan`
- **Điều kiện**: `trang_thai = 'success'`
- **Ghi nhận**: Tự động khi khách thanh toán thành công
- **Nguồn**:
  - Đơn hàng online
  - Bán tại quầy (POS)
  - Đặt bàn

### 2. Thanh Toán Đặt Bàn
- **Bảng**: `thanh_toan_dat_ban`
- **Điều kiện**: `trang_thai = 'success'`
- **Ghi nhận**: Tự động khi khách thanh toán đặt bàn

---

## 💸 CÁC NGUỒN CHI (CHI PHÍ)

### 1. Nhập Kho Nguyên Liệu
- **Bảng**: `phieu_nhap`
- **Điều kiện**: `trang_thai = 'hoan_tat'`
- **Ghi nhận**: Tự động khi hoàn tất phiếu nhập
- **Loại**: Chi phí nguyên liệu

### 2. Chi Phí Hàng Ngày
- **Bảng**: `chi_phi_hang_ngay`
- **Ghi nhận**: Thủ công qua trang "Chi phí hàng ngày"
- **Các loại chi phí**:
  - ✅ Nguyên liệu
  - ✅ Điện nước
  - ✅ Tiền thuê mặt bằng
  - ✅ **Lương nhân viên** (Tự động từ bảng lương)
  - ✅ Bảo trì sửa chữa
  - ✅ Marketing
  - ✅ Văn phòng phẩm
  - ✅ Vận chuyển
  - ✅ Bảo hiểm
  - ✅ Thuế phí
  - ✅ Đào tạo nhân viên
  - ✅ Khấu hao thiết bị
  - ✅ Chi phí pháp lý
  - ✅ Khác

### 3. Lương Nhân Viên (MỚI - TỰ ĐỘNG)
- **Bảng nguồn**: `bang_luong`
- **Bảng đích**: `chi_phi_hang_ngay`
- **Điều kiện**: Khi cập nhật `trang_thai = 'da_thanh_toan'`
- **Ghi nhận**: **TỰ ĐỘNG** khi thanh toán lương
- **Thông tin ghi nhận**:
  - Ngày chi: Ngày hiện tại
  - Loại chi phí: "Lương nhân viên"
  - Tên chi phí: "Lương tháng X/YYYY - Tên nhân viên"
  - Số tiền: Tổng lương (Lương cơ bản + Giờ làm + Thưởng - Phạt)
  - Mô tả: Chi tiết các khoản
  - Người nhận: Tên nhân viên (Mã NV)
  - Phương thức: Chuyển khoản

---

## 📈 BÁO CÁO TÀI CHÍNH

### API: `/api/stats/financial-summary`

**Công thức tính**:
```
THU = SUM(thanh_toan WHERE trang_thai = 'success')
CHI = SUM(phieu_nhap WHERE trang_thai = 'hoan_tat') 
    + SUM(chi_phi_hang_ngay)
LỢI NHUẬN = THU - CHI
```

**Bao gồm**:
- ✅ Tất cả doanh thu từ thanh toán
- ✅ Chi phí nhập kho
- ✅ Chi phí hàng ngày (bao gồm lương)
- ✅ Tính theo từng ngày trong tháng

---

## 🔄 LUỒNG THANH TOÁN LƯƠNG

### Bước 1: Tính Lương
1. Vào trang **Bảng lương** (`/admin/payroll.html`)
2. Chọn tháng/năm
3. Nhấn **"Tính lương tự động"**
4. Hệ thống tính dựa trên:
   - Lương cơ bản
   - Giờ làm từ chấm công
   - Thưởng/Phạt (nếu có)

### Bước 2: Thanh Toán Lương
1. Xem chi tiết bảng lương
2. Điều chỉnh Thưởng/Phạt nếu cần
3. Chuyển trạng thái: **"Chưa thanh toán" → "Đã thanh toán"**
4. **HỆ THỐNG TỰ ĐỘNG**:
   - ✅ Tạo bản ghi trong `chi_phi_hang_ngay`
   - ✅ Loại chi phí: "Lương nhân viên"
   - ✅ Ghi nhận vào ngày hiện tại
   - ✅ Hiển thị trong báo cáo tài chính

### Bước 3: Kiểm Tra
1. Vào **Báo cáo Tài chính** (`/admin/doanh-thu.html`)
2. Chọn tháng đã thanh toán lương
3. Nhấn vào ngày thanh toán
4. Xem chi tiết khoản chi "Lương nhân viên"

---

## 🎯 LƯU Ý QUAN TRỌNG

### ⚠️ Tránh Trùng Lặp
- **KHÔNG** tự tạo chi phí lương trong "Chi phí hàng ngày"
- Hệ thống tự động tạo khi thanh toán lương
- Nếu đã tạo thủ công, xóa đi để tránh tính 2 lần

### ✅ Kiểm Tra Định Kỳ
1. **Hàng ngày**: Kiểm tra chi phí phát sinh
2. **Cuối tháng**: 
   - Tính lương nhân viên
   - Thanh toán lương
   - Xem báo cáo tài chính tổng hợp
3. **So sánh**: Thu - Chi = Lợi nhuận thực tế

### 📊 Các Loại Chi Phí Cần Ghi Nhận Thủ Công
- Điện nước (hóa đơn hàng tháng)
- Tiền thuê mặt bằng
- Bảo trì sửa chữa
- Marketing/Quảng cáo
- Văn phòng phẩm
- Vận chuyển
- Bảo hiểm
- Thuế phí
- Các chi phí khác

---

## 🔧 QUẢN LÝ LOẠI CHI PHÍ

### Trang: `/admin/loai-chi-phi.html`

**Chức năng**:
- ✅ Thêm loại chi phí mới
- ✅ Sửa tên, màu sắc, icon
- ✅ Xóa/Ẩn loại không dùng
- ✅ Sắp xếp thứ tự hiển thị
- ✅ Xem thống kê sử dụng

**Ví dụ thêm loại mới**:
1. Nhấn **"Thêm Loại Chi Phí"**
2. Nhập tên: "Bảo hiểm xã hội"
3. Chọn màu: #6366f1
4. Chọn icon: fas fa-shield-alt
5. Lưu

---

## 📱 TRUY CẬP NHANH

- **Chi phí hàng ngày**: `/admin/chi-phi-hang-ngay.html`
- **Loại chi phí**: `/admin/loai-chi-phi.html`
- **Bảng lương**: `/admin/payroll.html`
- **Báo cáo tài chính**: `/admin/doanh-thu.html`
- **Nhập hàng**: `/admin/nhap-hang.html`

---

## 🆘 XỬ LÝ SỰ CỐ

### Lương bị tính 2 lần
1. Vào "Chi phí hàng ngày"
2. Tìm bản ghi lương trùng
3. Xóa bản ghi thủ công (giữ lại bản tự động)

### Thiếu chi phí lương
1. Kiểm tra trạng thái bảng lương
2. Nếu "Đã thanh toán" nhưng không có trong chi phí:
   - Chuyển về "Chưa thanh toán"
   - Lưu lại
   - Chuyển lại thành "Đã thanh toán"
   - Hệ thống sẽ tự động tạo lại

### Sai số tiền lương
1. Vào "Bảng lương"
2. Sửa Thưởng/Phạt
3. Lưu lại
4. Hệ thống tự động cập nhật chi phí

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, kiểm tra:
1. ✅ Bảng `chi_phi_hang_ngay` có bản ghi không?
2. ✅ Trạng thái lương đã chuyển sang "Đã thanh toán"?
3. ✅ Báo cáo tài chính đã chọn đúng tháng?
4. ✅ Server có lỗi trong console không?

---

**Cập nhật**: 20/04/2026
**Phiên bản**: 2.0 - Tích hợp tự động lương nhân viên
