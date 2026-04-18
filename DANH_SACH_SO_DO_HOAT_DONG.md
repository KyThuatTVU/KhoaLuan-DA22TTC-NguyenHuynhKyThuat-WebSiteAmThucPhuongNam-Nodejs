# 📊 DANH SÁCH SƠ ĐỒ HOẠT ĐỘNG - HỆ THỐNG QUẢN LÝ NHÀ HÀNG PHƯƠNG NAM

## 🎯 Tổng Quan

Hệ thống bao gồm **12 sơ đồ hoạt động (Activity Diagrams)** mô tả đầy đủ các quy trình nghiệp vụ của nhà hàng, từ quản lý khách hàng, đặt hàng online, thanh toán, đến quản lý nội bộ (nhân sự, kho, chấm công, lương).

## 📋 Danh Sách Các Sơ Đồ

### 1. 👤 Đăng Ký Tài Khoản Khách Hàng
**Mô tả:** Quy trình đăng ký tài khoản mới với xác thực email 2 bước
- **Actor:** Khách hàng
- **Luồng chính:**
  1. Khách hàng nhập thông tin (Tên, Email, SĐT, Mật khẩu)
  2. Hệ thống validate và kiểm tra email trùng
  3. Tạo mã xác thực 6 số
  4. Gửi email chứa mã xác thực (hiệu lực 10 phút)
  5. Khách hàng nhập mã xác thực
  6. Tạo tài khoản và đăng nhập tự động
  7. Gửi email chào mừng
- **Công nghệ:** JWT, Bcrypt, Nodemailer

---

### 2. 🔐 Đăng Nhập Hệ Thống
**Mô tả:** Quy trình đăng nhập hỗ trợ cả Email/Password và Google OAuth
- **Actor:** Khách hàng
- **Phương thức:**
  - Đăng nhập thường: Email + Password
  - Đăng nhập Google OAuth 2.0
- **Luồng chính:**
  1. Chọn phương thức đăng nhập
  2. Xác thực thông tin
  3. Tạo JWT token (hiệu lực 7 ngày)
  4. Lưu session
  5. Trả về thông tin user
- **Công nghệ:** Passport.js, Google OAuth, JWT

---

### 3. 🛒 Đặt Hàng Online
**Mô tả:** Quy trình đặt hàng từ giỏ hàng với kiểm tra kho nguyên liệu
- **Actor:** Khách hàng đã đăng nhập
- **Luồng chính:**
  1. Thêm món vào giỏ hàng
  2. Nhập thông tin giao hàng
  3. Chọn phương thức thanh toán (COD/MoMo)
  4. Áp dụng mã khuyến mãi (nếu có)
  5. Kiểm tra công thức món ăn
  6. Tính tổng nguyên liệu cần thiết
  7. Kiểm tra đủ nguyên liệu trong kho
  8. Tạo đơn hàng và chi tiết
  9. Trừ kho nguyên liệu tập trung
  10. Cập nhật sức chứa món ăn
  11. Tạo hóa đơn và thanh toán
  12. Gửi email xác nhận
  13. Thông báo cho Admin
- **Đặc biệt:** Hệ thống quản lý kho tập trung, tự động tính sức chứa món ăn

---

### 4. 🍽️ Đặt Bàn Trước
**Mô tả:** Quy trình đặt bàn với yêu cầu đặt món trước ít nhất 3 tiếng
- **Actor:** Khách hàng đã đăng nhập
- **Ràng buộc:**
  - Phải đặt trước ít nhất 3 tiếng
  - Phải chọn ít nhất 1 món ăn
  - Giờ mở cửa: 7:00 - 23:00
- **Luồng chính:**
  1. Nhập thông tin đặt bàn (Tên, SĐT, Ngày, Giờ, Số người)
  2. Chọn khu vực (Trong nhà/Sân vườn/VIP)
  3. Chọn món ăn đặt trước
  4. Validate thời gian và giờ mở cửa
  5. Kiểm tra món ăn còn phục vụ
  6. Tính tổng tiền dự kiến
  7. Tạo đặt bàn và chi tiết món
  8. Gửi email xác nhận
  9. Thông báo cho Admin

---

### 5. 💳 Thanh Toán MoMo
**Mô tả:** Quy trình thanh toán online qua cổng MoMo Payment Gateway
- **Actor:** Khách hàng
- **Tích hợp:** MoMo API
- **Luồng chính:**
  1. Khách hàng chọn thanh toán MoMo
  2. Tạo yêu cầu thanh toán
  3. Tạo chữ ký HMAC SHA256
  4. Gửi request đến MoMo API
  5. Nhận payUrl và chuyển hướng
  6. Khách hàng thanh toán trên MoMo
  7. MoMo gọi IPN callback
  8. Xác thực chữ ký
  9. Cập nhật trạng thái thanh toán
  10. Cập nhật trạng thái đơn hàng
  11. Xóa giỏ hàng
  12. Gửi thông báo
- **Hỗ trợ:** Ví MoMo, Thẻ ATM

---

### 6. 📦 Quản Lý Đơn Hàng (Admin)
**Mô tả:** Quy trình quản lý và cập nhật trạng thái đơn hàng
- **Actor:** Admin
- **Trạng thái:** pending → confirmed → preparing → delivered / cancelled
- **Luồng chính:**
  1. Admin đăng nhập
  2. Xem danh sách đơn hàng
  3. Lọc theo trạng thái/ngày
  4. Chọn đơn hàng
  5. Xem chi tiết
  6. Cập nhật trạng thái:
     - Xác nhận đơn (confirmed)
     - Đang chuẩn bị (preparing)
     - Hoàn thành (delivered)
     - Hủy đơn (cancelled) → Hoàn kho
  7. Gửi thông báo cho khách hàng
  8. Lưu lịch sử thay đổi
- **Tính năng:** Thống kê doanh thu theo ngày/tháng/năm

---

### 7. 🖥️ Bán Hàng Tại Quầy (POS)
**Mô tả:** Quy trình bán hàng trực tiếp tại nhà hàng
- **Actor:** Nhân viên phục vụ
- **Luồng chính:**
  1. Nhân viên đăng nhập POS
  2. Xem danh sách bàn
  3. Chọn bàn phục vụ
  4. Tạo order mới hoặc thêm vào order cũ
  5. Thêm món ăn và số lượng
  6. Gửi order đến bếp
  7. In phiếu bếp (Kitchen Slip)
  8. Cập nhật trạng thái bàn: "Đang phục vụ"
  9. Khách dùng bữa
  10. Khách yêu cầu thanh toán
  11. Xem chi tiết order và tính tiền
  12. Chọn phương thức: Tiền mặt / Chuyển khoản
  13. Cập nhật trạng thái: "Đã thanh toán"
  14. Trừ kho nguyên liệu
  15. In hóa đơn
  16. Cập nhật bàn: "Trống"
- **Đặc biệt:** Có thể thêm món trong khi khách đang dùng bữa

---

### 8. 🤖 Chatbot AI Hỗ Trợ Khách Hàng
**Mô tả:** Quy trình xử lý câu hỏi qua Chatbot AI
- **Actor:** Khách hàng
- **AI Model:** Groq LLaMA 3.1 70B
- **Luồng chính:**
  1. Khách hàng mở Chatbot
  2. Tạo hoặc lấy session_id
  3. Nhập câu hỏi
  4. Lưu tin nhắn vào lịch sử
  5. Lấy lịch sử chat gần đây (10 tin)
  6. Tìm kiếm tri thức liên quan trong DB
  7. Xây dựng context cho AI
  8. Gửi request đến Groq API
  9. Nhận phản hồi từ AI
  10. Nếu hỏi về món ăn → Truy vấn DB bổ sung
  11. Lưu phản hồi
  12. Hiển thị cho khách hàng
- **Khả năng:** Trả lời về thực đơn, giá cả, khuyến mãi, đặt bàn

---

### 9. 🎯 Gợi Ý Món Ăn Thông Minh
**Mô tả:** Hệ thống gợi ý món ăn dựa trên Machine Learning
- **Actor:** Khách hàng đã đăng nhập
- **Thuật toán:** Hybrid Recommendation System
- **Luồng chính:**
  1. Thu thập hành vi người dùng (view, click, add_to_cart, purchase)
  2. Lưu vào bảng hanh_vi_nguoi_dung
  3. Chạy song song 3 thuật toán:
     - **Collaborative Filtering:** Tìm người dùng tương tự
     - **Content-based:** Phân tích món đã xem, tìm món tương tự
     - **Association Rules:** Phân tích món thường mua cùng
  4. Kết hợp kết quả từ 3 thuật toán
  5. Tính điểm tổng hợp
  6. Sắp xếp theo điểm giảm dần
  7. Lọc món còn phục vụ
  8. Lưu vào bảng goi_y_san_pham
  9. Hiển thị top 10 món gợi ý
- **Đặc biệt:** Độ chính xác tăng theo thời gian sử dụng

---

### 10. 📦 Quản Lý Kho Nguyên Liệu
**Mô tả:** Quy trình quản lý kho nguyên liệu tập trung
- **Actor:** Quản lý kho
- **Tính năng:** Cảnh báo tồn kho thấp, theo dõi nhà cung cấp
- **Luồng chính:**
  1. Quản lý kho đăng nhập
  2. Xem danh sách nguyên liệu
  3. Chọn hành động:
     - **Nhập kho:**
       - Chọn nhà cung cấp
       - Nhập thông tin phiếu nhập
       - Thêm nguyên liệu và số lượng
       - Cập nhật số lượng tồn
       - Cập nhật giá nhập gần nhất
       - Lưu lịch sử
     - **Kiểm kê:**
       - Tạo phiếu kiểm kê
       - Nhập số lượng thực tế
       - So sánh với hệ thống
       - Ghi nhận chênh lệch
       - Cập nhật số lượng
     - **Xuất hủy:**
       - Tạo phiếu xuất hủy
       - Chọn nguyên liệu hỏng
       - Nhập lý do và upload ảnh
       - Trừ tồn kho
       - Lưu vào bảng wastage
  4. Kiểm tra cảnh báo tồn kho
  5. Gửi thông báo nếu dưới mức cảnh báo
  6. Cập nhật sức chứa món ăn
- **Đặc biệt:** Tự động tính sức chứa món ăn dựa trên công thức

---

### 11. ⏰ Chấm Công Nhân Viên
**Mô tả:** Quy trình chấm công tự động và thủ công
- **Actor:** Nhân viên, Quản lý
- **Phương thức:**
  - **Tự động (Nhân viên):**
    1. Đăng nhập
    2. Nhấn "Check In" → Lưu giờ vào
    3. Làm việc
    4. Nhấn "Check Out" → Lưu giờ ra
    5. Tính số giờ làm
  - **Thủ công (Quản lý):**
    1. Đăng nhập
    2. Chọn nhân viên và ngày
    3. Nhập giờ vào, giờ ra
    4. Nhập ghi chú
    5. Tính số giờ làm
- **Luồng chung:**
  1. Kiểm tra ca làm việc
  2. Đánh dấu: "Đúng giờ" / "Đi muộn" / "Về sớm"
  3. Lưu vào bảng cham_cong
  4. Cập nhật tổng giờ làm trong tháng
- **Hỗ trợ:** Nhiều ca (Sáng, Chiều, Tối, Khuya)

---

### 12. 💰 Tính Lương Nhân Viên
**Mô tả:** Quy trình tính lương tự động dựa trên chấm công
- **Actor:** Quản lý / Kế toán
- **Công thức:** Lương = Lương cơ bản + (Giờ làm × Lương giờ) + Thưởng - Phạt
- **Luồng chính:**
  1. Chọn tháng/năm cần tính
  2. Lấy danh sách nhân viên
  3. Với mỗi nhân viên:
     - Lấy dữ liệu chấm công
     - Tính tổng giờ làm
     - Lấy lương cơ bản và lương giờ
     - Tính lương giờ = Tổng giờ × Lương/giờ
     - Nhập thưởng/phạt
     - Tính tổng lương
  4. Lưu vào bảng bang_luong
  5. Đánh dấu: "Chưa thanh toán"
  6. Tạo báo cáo lương tháng
  7. Duyệt lương
  8. Cập nhật: "Đã thanh toán"
  9. Gửi thông báo cho nhân viên
  10. In phiếu lương
- **Hỗ trợ:** Xuất báo cáo Excel

---

## 🛠️ Công Nghệ Sử Dụng

### Backend
- **Framework:** Node.js, Express.js
- **Database:** MySQL
- **Authentication:** JWT, Passport.js, Google OAuth 2.0
- **Email:** Nodemailer (Gmail SMTP)
- **Payment:** MoMo Payment Gateway
- **AI:** Groq API (LLaMA 3.1 70B)
- **GraphQL:** Apollo Server

### Frontend
- **HTML5, CSS3, JavaScript**
- **Bootstrap 5**
- **Chart.js** (Biểu đồ thống kê)
- **SweetAlert2** (Thông báo đẹp)

### Machine Learning
- **Collaborative Filtering**
- **Content-based Filtering**
- **Association Rules Mining**

---

## 📊 Thống Kê Hệ Thống

- **Tổng số bảng database:** 40+ bảng
- **Tổng số API endpoints:** 100+ endpoints
- **Tổng số sơ đồ hoạt động:** 12 sơ đồ
- **Số lượng actors:** 4 (Khách hàng, Admin, Nhân viên, Quản lý kho)

---

## 📁 File Sơ Đồ

- **File HTML:** `So_Do_Hoat_Dong_Day_Du.html`
- **Định dạng:** HTML5 với CSS3 và JavaScript
- **Chuẩn UML:** Activity Diagram
- **Tính năng:**
  - Responsive design
  - Smooth scroll
  - Animation khi scroll
  - Mục lục tương tác
  - In ấn thân thiện
  - Hỗ trợ mobile

---

## 🎨 Đặc Điểm Sơ Đồ

### Ký hiệu UML sử dụng:
- **Hình tròn:** Bắt đầu / Kết thúc
- **Hình chữ nhật bo tròn:** Hoạt động (Activity)
- **Hình thoi xoay 45°:** Điểm quyết định (Decision)
- **Thanh ngang:** Phân nhánh song song (Parallel)
- **Mũi tên:** Luồng điều khiển
- **Hộp vàng:** Ghi chú (Note)

### Màu sắc:
- **Tím gradient:** Bắt đầu/Kết thúc
- **Xanh dương gradient:** Hoạt động
- **Hồng gradient:** Quyết định
- **Vàng:** Ghi chú

---

## 👥 Tác Giả

**Nhóm phát triển Hệ thống Quản lý Nhà hàng Ẩm Thực Phương Nam**
- Năm thực hiện: 2024-2025
- Trường: Trường Đại học Trà Vinh

---

## 📞 Liên Hệ

- **Website:** phuongnam.vn
- **Email:** info@phuongnam.vn
- **Hotline:** 0123 456 789
- **Địa chỉ:** 123 Đường ABC, Phường 1, TP. Vĩnh Long

---

*Tài liệu này được tạo tự động bởi hệ thống phân tích dự án.*
