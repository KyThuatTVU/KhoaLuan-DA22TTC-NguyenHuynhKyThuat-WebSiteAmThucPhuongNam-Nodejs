# ✅ ĐÃ CẬP NHẬT: Hiển thị "1 kg = bao nhiêu con"

## 🎯 Tính năng mới

Khi bạn chỉnh sửa nguyên liệu và bật **"Đơn vị tự nhiên"**, hệ thống sẽ tự động hiển thị:

```
┌─────────────────────────────────────────┐
│  🧮 Quy đổi tự động:                    │
│                                         │
│  1 kg = 50 con                          │
│                                         │
│  ℹ️ Giúp bạn dễ dàng ước tính số lượng  │
│     khi nhập kho                        │
└─────────────────────────────────────────┘
```

## 📝 Cách sử dụng

1. **Mở trang quản lý nguyên liệu**: `frontend/admin/nguyen-lieu.html`

2. **Nhấn nút "Sửa"** (icon bút chì) trên một nguyên liệu

3. **Bật checkbox** "Đơn vị tự nhiên (con, quả, trái...)"

4. **Nhập thông tin**:
   - Đơn vị tự nhiên: `con`
   - Trọng lượng TB: `20` (gram)

5. **Xem kết quả**: Khung màu xanh hiển thị ngay:
   ```
   1 kg = 50 con
   ```

## 🧪 Ví dụ thực tế

| Nguyên liệu | Đơn vị | Trọng lượng/con | Kết quả hiển thị |
|-------------|--------|-----------------|------------------|
| Tôm         | con    | 20g             | 1 kg = 50 con    |
| Trứng       | quả    | 60g             | 1 kg = 16 quả    |
| Cà chua     | quả    | 150g            | 1 kg = 6 quả     |
| Cua         | con    | 300g            | 1 kg = 3 con     |

## 🔧 Code đã thay đổi

### File: `frontend/admin/nguyen-lieu.html`

**1. Thêm khung hiển thị quy đổi** (dòng ~177):
```html
<div id="conversion-display" class="hidden bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-lg p-3">
    <p class="text-xs font-bold text-emerald-700 mb-1 flex items-center">
        <i class="fas fa-calculator mr-2"></i>
        Quy đổi tự động:
    </p>
    <div class="text-sm font-bold text-slate-800">
        1 kg = <span id="units-per-kg" class="text-2xl text-emerald-600">0</span> 
        <span id="unit-name-display" class="text-emerald-600">con</span>
    </div>
</div>
```

**2. Thêm hàm tính toán** (dòng ~1024):
```javascript
function updateNaturalUnitConversion() {
    const weightInput = document.getElementById('trong_luong_trung_binh');
    const unitInput = document.getElementById('don_vi_tu_nhien');
    const conversionDisplay = document.getElementById('conversion-display');
    const unitsPerKgSpan = document.getElementById('units-per-kg');
    
    const weight = parseFloat(weightInput.value);
    const unit = unitInput.value.trim();
    
    if (weight > 0 && unit) {
        // 1 kg = 1000g, chia cho trọng lượng 1 con
        const unitsPerKg = Math.floor(1000 / weight);
        unitsPerKgSpan.textContent = unitsPerKg;
        conversionDisplay.classList.remove('hidden');
    } else {
        conversionDisplay.classList.add('hidden');
    }
}
```

**3. Gọi hàm khi edit nguyên liệu** (dòng ~577):
```javascript
if (item.don_vi_tu_nhien && item.trong_luong_trung_binh) {
    // ... load dữ liệu ...
    updateNaturalUnitConversion(); // ← Thêm dòng này
}
```

**4. Thêm event listener** (dòng ~1015):
```javascript
document.getElementById('don_vi_tu_nhien').addEventListener('input', function() {
    // ... cập nhật preview ...
    updateNaturalUnitConversion(); // ← Gọi hàm tính toán
});
```

**5. Thêm oninput vào input trọng lượng** (dòng ~171):
```html
<input type="number" id="trong_luong_trung_binh" 
       oninput="updateNaturalUnitConversion()">
```

## ✨ Lợi ích

- ✅ **Trực quan**: Nhìn thấy ngay 1kg = bao nhiêu con
- ✅ **Tiện lợi**: Không cần tính toán thủ công
- ✅ **Real-time**: Cập nhật ngay khi thay đổi số liệu
- ✅ **Dễ ước tính**: Biết được 2.8kg ≈ 140 con tôm

## 🚀 Cách test

1. Mở trình duyệt
2. Vào: `http://localhost:3000/admin/nguyen-lieu.html`
3. Đăng nhập admin
4. Nhấn "Sửa" một nguyên liệu (ví dụ: Tôm)
5. Bật checkbox "Đơn vị tự nhiên"
6. Nhập:
   - Đơn vị: `con`
   - Trọng lượng: `20`
7. Xem khung màu xanh xuất hiện với text: **"1 kg = 50 con"**

---

**Trạng thái**: ✅ Hoàn thành
**File đã sửa**: `frontend/admin/nguyen-lieu.html`
**Số dòng thay đổi**: ~50 dòng
