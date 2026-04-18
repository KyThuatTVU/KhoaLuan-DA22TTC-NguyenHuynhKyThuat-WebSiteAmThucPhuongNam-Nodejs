# 🎯 ĐÃ ĐẢO NGƯỢC LOGIC: Nhập "1kg = bao nhiêu con"

## ✅ Logic MỚI (Đúng với thực tế)

### Cách nhập:
```
┌─────────────────────────────────────────┐
│ Đơn vị tự nhiên: con                    │
│ 1 kg = bao nhiêu con?: 50               │
└─────────────────────────────────────────┘
```

### Hệ thống tự tính:
```
┌─────────────────────────────────────────┐
│  🧮 Hệ thống tự tính:                   │
│                                         │
│  1 con = 20 gram                        │
│                                         │
│  ℹ️ Trọng lượng trung bình được tính    │
│     tự động                             │
└─────────────────────────────────────────┘
```

## 📊 So sánh TRƯỚC vs SAU

### ❌ TRƯỚC (Khó hiểu):
- Bạn nhập: "1 con = 20g"
- Hệ thống hiển thị: "1kg = 50 con"
- **Vấn đề**: Không ai biết 1 con tôm nặng bao nhiêu gram!

### ✅ SAU (Dễ hiểu):
- Bạn nhập: "1kg = 50 con" (như người bán nói)
- Hệ thống tự tính: "1 con = 20g"
- **Lợi ích**: Nhập đúng như thực tế mua hàng!

## 🧪 Ví dụ thực tế

| Nguyên liệu | Bạn nhập | Hệ thống tự tính |
|-------------|----------|------------------|
| Tôm         | 1 kg = 50 con | 1 con = 20g |
| Trứng       | 1 kg = 16 quả | 1 quả = 62.5g |
| Cà chua     | 1 kg = 6 quả | 1 quả = 166.7g |
| Cua         | 1 kg = 3 con | 1 con = 333.3g |

## 🔧 Thay đổi kỹ thuật

### 1. Đổi tên field trong form
**Trước:**
```html
<label>Trọng lượng TB (gram)</label>
<input id="trong_luong_trung_binh">
```

**Sau:**
```html
<label>1 kg = bao nhiêu <span>con</span>?</label>
<input id="so_luong_tren_kg">
```

### 2. Đổi công thức tính toán
**Trước:**
```javascript
// Nhập: 20g/con → Tính: 1kg = 50 con
const unitsPerKg = Math.floor(1000 / weight);
```

**Sau:**
```javascript
// Nhập: 1kg = 50 con → Tính: 1 con = 20g
const gramsPerUnit = (1000 / unitsPerKg).toFixed(2);
```

### 3. Load dữ liệu từ database
Database vẫn lưu `trong_luong_trung_binh` (20g), nên khi load cần tính ngược:

```javascript
// DB: trong_luong_trung_binh = 20g
// Hiển thị: so_luong_tren_kg = 1000 / 20 = 50 con
const unitsPerKg = Math.round(1000 / item.trong_luong_trung_binh);
document.getElementById('so_luong_tren_kg').value = unitsPerKg;
```

### 4. Lưu vào database
Khi submit, tính ngược lại để lưu vào DB:

```javascript
// User nhập: so_luong_tren_kg = 50 con
// Lưu DB: trong_luong_trung_binh = 1000 / 50 = 20g
const soLuongTrenKg = parseFloat(document.getElementById('so_luong_tren_kg').value);
const trongLuongTrungBinh = 1000 / soLuongTrenKg;
```

## 📝 Cách sử dụng

1. **Mở trang quản lý nguyên liệu**
2. **Nhấn "Sửa"** nguyên liệu Tôm
3. **Bật checkbox** "Đơn vị tự nhiên"
4. **Nhập**:
   - Đơn vị tự nhiên: `con`
   - 1 kg = bao nhiêu con?: `50`
5. **Xem kết quả**: Khung xanh hiển thị "1 con = 20 gram"
6. **Nhấn Lưu**

## 🎬 Kịch bản thực tế

### Tình huống: Mua tôm từ nhà cung cấp

**Người bán nói:** "Tôm này 1kg có 50 con nhé!"

**Bạn nhập vào hệ thống:**
```
Đơn vị tự nhiên: con
1 kg = bao nhiêu con?: 50
```

**Hệ thống tự động tính:**
```
✅ 1 con = 20 gram
✅ Lưu vào database: trong_luong_trung_binh = 20
```

**Khi nhập kho 2.8kg:**
```
✅ Hệ thống biết: 2.8kg × 50 con/kg = 140 con
✅ Hiển thị: "2800g ≈ 140 con"
```

## 🚀 Lợi ích

- ✅ **Nhập đúng như thực tế**: Người bán luôn nói "1kg = X con"
- ✅ **Không cần tính toán**: Không phải cân 1 con để biết nặng bao nhiêu
- ✅ **Dễ nhớ**: "1kg tôm 50 con" dễ nhớ hơn "1 con 20g"
- ✅ **Tự động tính**: Hệ thống tự tính trọng lượng trung bình
- ✅ **Tương thích ngược**: Database vẫn lưu `trong_luong_trung_binh`

## 📂 File đã sửa

- `frontend/admin/nguyen-lieu.html`
  - Dòng ~169-175: Đổi label và input field
  - Dòng ~177-189: Đổi khung hiển thị kết quả
  - Dòng ~193-199: Cập nhật ví dụ
  - Dòng ~570-583: Load dữ liệu khi edit (tính ngược)
  - Dòng ~509-512: Reset khi thêm mới
  - Dòng ~722-735: Tính trong_luong_trung_binh khi submit
  - Dòng ~1027-1045: Hàm updateNaturalUnitConversion mới

## ✨ Kết quả

Bây giờ form sẽ hiển thị:

```
┌─────────────────────────────────────────────────────────┐
│ 🐟 Đơn vị tự nhiên (con, quả, trái...)          [✓]    │
│                                                         │
│ ┌─────────────────────┬─────────────────────────────┐  │
│ │ Đơn vị tự nhiên     │ 1 kg = bao nhiêu con?      │  │
│ │ [con____________]   │ [50_____________________]  │  │
│ │ Đơn vị hiển thị     │ Nhập số lượng con trong 1kg│  │
│ └─────────────────────┴─────────────────────────────┘  │
│                                                         │
│ ┌───────────────────────────────────────────────────┐  │
│ │ 🧮 Hệ thống tự tính:                              │  │
│ │                                                   │  │
│ │ 1 con = 20 gram                                   │  │
│ │                                                   │  │
│ │ ℹ️ Trọng lượng trung bình được tính tự động       │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ 💡 Ví dụ:                                               │
│ • Tôm: 1 kg = 50 con → Hệ thống tính: 1 con = 20g     │
│ • Trứng: 1 kg = 16 quả → Hệ thống tính: 1 quả = 62.5g │
└─────────────────────────────────────────────────────────┘
```

---

**Trạng thái**: ✅ Hoàn thành
**Logic**: ✅ Đã đảo ngược đúng với thực tế
**Database**: ✅ Tương thích ngược (vẫn lưu trong_luong_trung_binh)
