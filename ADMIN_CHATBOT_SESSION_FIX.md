# 🔧 Sửa lỗi phiên làm việc Admin Chatbot

## ❌ Vấn đề

Admin chatbot trong dashboard cũng bị mất phiên chat khi:
- Reload trang dashboard
- Đóng và mở lại chatbot
- Chuyển sang trang admin khác rồi quay lại

**Nguyên nhân:** Không có cơ chế lưu session ID và lịch sử chat.

---

## ✅ Giải pháp

### 1. **Lưu Session ID vào LocalStorage**
- Session ID được lưu trong `localStorage` với key `admin_chat_session_id`
- Mỗi admin có session riêng, giữ nguyên qua các lần reload

### 2. **Load lịch sử chat khi mở Chatbot**
- Khi admin mở chatbot, tự động load lại lịch sử từ backend
- Hiển thị đúng ngữ cảnh cuộc trò chuyện trước đó

### 3. **Nút "Cuộc trò chuyện mới"**
- Thêm nút ➕ trên header chatbot admin
- Admin có thể bắt đầu cuộc trò chuyện mới khi muốn

---

## 📁 Files đã thay đổi

### Frontend
**`frontend/admin/dashboard.html`**

✅ **Thêm biến quản lý session:**
```javascript
let adminChatSessionId = null;
let adminChatHistoryLoaded = false;
```

✅ **Thêm hàm `getAdminChatSessionId()`:**
- Lấy hoặc tạo session ID từ localStorage
- Log session ID để debug

✅ **Thêm hàm `resetAdminChatSession()`:**
- Tạo session mới
- Xóa lịch sử hiển thị
- Reset welcome message

✅ **Thêm hàm `loadAdminChatHistory()`:**
- Gọi API `/admin-chatbot/history/:session_id`
- Render lại lịch sử chat
- Chỉ load 1 lần khi mở chatbot

✅ **Cập nhật hàm `toggleAdminChat()`:**
- Gọi `loadAdminChatHistory()` khi mở chatbot

✅ **Cập nhật hàm `sendAdminChat()`:**
- Gửi kèm `session_id` trong request body

✅ **Cập nhật hàm `appendAdminMessage()`:**
- Thêm tham số `shouldScroll` (mặc định `true`)
- Không scroll khi load history

✅ **Thêm nút "Chat mới" vào header:**
```html
<button onclick="resetAdminChatSession(); loadAdminChatHistory();">
    <i class="fas fa-plus"></i>
</button>
```

### Backend
**`backend/routes/admin-chatbot.js`**

✅ **Cập nhật route `POST /chat`:**
- Nhận `session_id` từ request body
- Lưu tin nhắn user vào `lich_su_chatbot`
- Lưu tin nhắn bot vào `lich_su_chatbot`
- Lấy `adminId` từ session

✅ **Thêm route `GET /history/:session_id`:**
- Load 50 tin nhắn gần nhất của session
- Trả về danh sách tin nhắn theo thứ tự thời gian
- Yêu cầu admin authentication

---

## 🎯 Kết quả

### Trước khi sửa:
```
Admin: "Phân tích doanh thu tháng này"
Bot: "Doanh thu tháng này là..."
[Admin reload trang]
Bot: "Chào chị Linh! Em là Phương Nam..." ❌ (Mất ngữ cảnh)
```

### Sau khi sửa:
```
Admin: "Phân tích doanh thu tháng này"
Bot: "Doanh thu tháng này là..."
[Admin reload trang]
[Chatbot tự động load lại lịch sử]
Admin: "Đề xuất chiến lược tăng doanh thu"
Bot: "Dựa vào phân tích trước đó..." ✅ (Giữ ngữ cảnh)
```

---

## 🔍 Cách kiểm tra

### Test 1: Reload trang dashboard
1. Mở admin chatbot, chat vài tin nhắn
2. Reload trang (F5)
3. Mở lại chatbot
4. ✅ Lịch sử chat vẫn còn

### Test 2: Chuyển trang admin
1. Mở chatbot ở dashboard, chat vài tin nhắn
2. Chuyển sang trang "Đơn hàng"
3. Quay lại dashboard
4. Mở lại chatbot
5. ✅ Lịch sử chat vẫn còn

### Test 3: Đóng và mở lại chatbot
1. Mở chatbot, chat vài tin nhắn
2. Đóng chatbot (nút X)
3. Mở lại chatbot
4. ✅ Lịch sử chat vẫn còn

### Test 4: Cuộc trò chuyện mới
1. Mở chatbot, chat vài tin nhắn
2. Click nút ➕ "Chat mới"
3. ✅ Lịch sử cũ được xóa, bắt đầu session mới

---

## 📊 Database

Sử dụng bảng `lich_su_chatbot` có sẵn:
```sql
CREATE TABLE lich_su_chatbot (
    ma_tin_nhan INT PRIMARY KEY AUTO_INCREMENT,
    ma_nguoi_dung INT NULL,
    session_id VARCHAR(255) NOT NULL,
    nguoi_gui ENUM('user', 'bot') NOT NULL,
    noi_dung TEXT NOT NULL,
    thoi_diem_chat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_user (ma_nguoi_dung)
);
```

**Lưu ý:** 
- Admin chat và User chat dùng chung bảng `lich_su_chatbot`
- Phân biệt bằng `session_id` (admin session có prefix `admin_session_`)
- `ma_nguoi_dung` là ID của admin (từ session)

---

## 🎉 Tổng kết

✅ **Session ID được lưu vĩnh viễn** trong localStorage  
✅ **Lịch sử chat được load tự động** khi mở chatbot  
✅ **Ngữ cảnh cuộc trò chuyện được giữ nguyên** qua các lần reload  
✅ **Admin có thể bắt đầu cuộc trò chuyện mới** khi muốn  
✅ **Trải nghiệm chat liên tục**, không bị gián đoạn  

**Admin giờ đây có thể chat với AI assistant mà không lo mất lịch sử!** 🎊

---

## 🔗 Liên quan

- [CHATBOT_SESSION_FIX.md](./CHATBOT_SESSION_FIX.md) - Sửa lỗi cho User Chatbot
- Cả 2 chatbot (User & Admin) đều đã được sửa lỗi session
