# 🔧 Sửa lỗi phiên làm việc Chatbot

## ❌ Vấn đề trước đây

Khi người dùng đang chat với chatbot:
- **Reload trang** → Phiên chat bị mất
- **Chuyển sang trang khác** → Lịch sử chat biến mất
- **Đóng và mở lại chatbot** → Phải bắt đầu lại từ đầu

**Nguyên nhân:** Session ID được lưu trong `sessionStorage`, bị xóa khi reload hoặc đóng tab.

---

## ✅ Giải pháp đã áp dụng

### 1. **Lưu Session ID vào LocalStorage**
- Thay đổi từ `sessionStorage` → `localStorage`
- Session ID được giữ lại **vĩnh viễn** cho đến khi user xóa cache
- Mỗi user có một session ID riêng, liên tục xuyên suốt

**File:** `frontend/js/load-components.js`
```javascript
// Trước: sessionStorage.setItem('chatbot_session_id', currentChatSessionId);
// Sau: localStorage.setItem('chatbot_session_id', currentChatSessionId);
```

### 2. **Load lịch sử chat khi mở Chatbot**
- Khi user mở chatbot, tự động load lại lịch sử từ backend
- Hiển thị đúng ngữ cảnh cuộc trò chuyện trước đó
- Không cần chào lại nếu đã có lịch sử

**API Endpoint mới:** `GET /api/chatbot/history/:session_id`

**Luồng hoạt động:**
1. User mở chatbot
2. Frontend lấy `session_id` từ localStorage
3. Gọi API `/api/chatbot/history/:session_id`
4. Backend trả về 50 tin nhắn gần nhất
5. Frontend render lại lịch sử chat
6. User tiếp tục chat như bình thường

### 3. **Nút "Cuộc trò chuyện mới"**
- Thêm nút ➕ trên header chatbot
- User có thể bắt đầu cuộc trò chuyện mới khi muốn
- Session cũ được lưu lại, tạo session mới

**Hàm:** `window.startNewChat()`

### 4. **Nút "Lịch sử chat"**
- Thêm nút 🕐 để xem các cuộc trò chuyện trước
- Placeholder cho tính năng tương lai (xem nhiều session)

---

## 📁 Files đã thay đổi

### Frontend
1. **`frontend/js/load-components.js`**
   - ✅ Chuyển từ sessionStorage → localStorage
   - ✅ Thêm hàm `loadChatHistory()`
   - ✅ Thêm hàm `resetChatbotSession()`
   - ✅ Thêm hàm `startNewChat()`
   - ✅ Thêm hàm `toggleChatHistory()`
   - ✅ Thêm hàm `addBotMessageToUI()` với tham số `shouldScroll`
   - ✅ Cập nhật `addUserMessageToUI()` với tham số `shouldScroll`

2. **`frontend/components/chatbot.html`**
   - ✅ Thêm nút "Chat mới" (➕)
   - ✅ Thêm nút "Lịch sử" (🕐)
   - ✅ Thêm dropdown lịch sử chat (hidden mặc định)

### Backend
3. **`backend/routes/chatbot.js`**
   - ✅ Thêm route `GET /api/chatbot/history/:session_id`
   - ✅ Trả về 50 tin nhắn gần nhất của session
   - ✅ Không cần authentication (public API)

---

## 🎯 Kết quả

### Trước khi sửa:
```
User: "Cho tôi xem thực đơn"
Bot: "Dạ, đây là thực đơn..."
[User reload trang]
Bot: "Chào anh/chị! Em là Trà My..." ❌ (Mất ngữ cảnh)
```

### Sau khi sửa:
```
User: "Cho tôi xem thực đơn"
Bot: "Dạ, đây là thực đơn..."
[User reload trang]
[Chatbot tự động load lại lịch sử]
User: "Món nào ngon nhất?"
Bot: "Dựa vào thực đơn em vừa giới thiệu..." ✅ (Giữ ngữ cảnh)
```

---

## 🔍 Cách kiểm tra

### Test 1: Reload trang
1. Mở chatbot, chat vài tin nhắn
2. Reload trang (F5)
3. Mở lại chatbot
4. ✅ Lịch sử chat vẫn còn

### Test 2: Chuyển trang
1. Mở chatbot ở trang chủ, chat vài tin nhắn
2. Chuyển sang trang "Thực đơn"
3. Mở lại chatbot
4. ✅ Lịch sử chat vẫn còn

### Test 3: Đóng và mở lại
1. Mở chatbot, chat vài tin nhắn
2. Đóng chatbot
3. Mở lại chatbot
4. ✅ Lịch sử chat vẫn còn

### Test 4: Cuộc trò chuyện mới
1. Mở chatbot, chat vài tin nhắn
2. Click nút ➕ "Chat mới"
3. Xác nhận
4. ✅ Lịch sử cũ được xóa, bắt đầu session mới

---

## 🚀 Tính năng mở rộng (Future)

1. **Xem nhiều session:** User có thể xem lại các cuộc trò chuyện trước đó
2. **Tìm kiếm trong lịch sử:** Tìm kiếm nội dung chat cũ
3. **Export lịch sử:** Xuất lịch sử chat ra file
4. **Đồng bộ đa thiết bị:** Session được đồng bộ giữa các thiết bị (cần login)

---

## 📊 Database Schema

Bảng `lich_su_chatbot` đã có sẵn:
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

---

## 🎉 Tổng kết

✅ **Session ID được lưu vĩnh viễn** trong localStorage  
✅ **Lịch sử chat được load tự động** khi mở chatbot  
✅ **Ngữ cảnh cuộc trò chuyện được giữ nguyên** qua các lần reload  
✅ **User có thể bắt đầu cuộc trò chuyện mới** khi muốn  
✅ **Trải nghiệm chat liên tục**, không bị gián đoạn  

**Người dùng giờ đây có thể chat thoải mái mà không lo mất lịch sử!** 🎊
