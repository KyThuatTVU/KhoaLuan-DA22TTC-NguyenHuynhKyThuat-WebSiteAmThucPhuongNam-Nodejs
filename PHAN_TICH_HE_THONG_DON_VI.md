# Phân Tích Hệ Thống Quản Lý Đơn Vị Nguyên Liệu

## 📊 TÌNH TRẠNG HIỆN TẠI

### 1. Cấu Trúc Database

#### Bảng `nguyen_lieu`:
```sql
CREATE TABLE nguyen_lieu (
  ma_nguyen_lieu INT PRIMARY KEY AUTO_INCREMENT,
  ten_nguyen_lieu VARCHAR(150) NOT NULL UNIQUE,
  so_luong_ton DECIMAL(10, 2) NOT NULL DEFAULT 0,
  don_vi_tinh VARCHAR(50) NOT NULL,           -- Đơn vị xuất (hiển thị)
  don_vi_nhap VARCHAR(50),                     -- Đơn vị nhập (kho)
  ti_le_chuyen_doi DECIMAL(10, 2) DEFAULT 1,  -- Tỉ lệ: 1 nhập = ? xuất
  muc_canh_bao DECIMAL(10, 2) DEFAULT 1000,
  ma_loai_nglieu INT,
  trang_thai TINYINT DEFAULT 1,
  ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Bảng `cong_thuc`:
```sql
CREATE TABLE cong_thuc (
  ma_cong_thuc INT PRIMARY KEY AUTO_INCREMENT,
  ma_mon INT NOT NULL,
  ma_nguyen_lieu INT NOT NULL,
  so_luong_can DECIMAL(10, 2) NOT NULL  -- Lượng nguyên liệu cho 1 món
);
```

### 2. Logic Hiện Tại

#### ✅ Đã Có:
1. **Đơn vị kép**: `don_vi_nhap` (nhập kho) và `don_vi_tinh` (xuất/hiển thị)
2. **Tỉ lệ quy đổi**: `ti_le_chuyen_doi` (1 đơn vị nhập = ? đơn vị xuất)
3. **Tự động quy đổi khi nhập kho**:
   ```javascript
   const actualAddedAmount = amount * conversionRate;
   // Ví dụ: Nhập 1 kg = 1000g vào kho
   ```
4. **Lưu trữ thống nhất**: `so_luong_ton` luôn theo `don_vi_tinh`

#### ⚠️ VẤN ĐỀ:

### 🔴 VẤN ĐỀ 1: Không Hỗ Trợ Đơn Vị Tự Nhiên Đúng Cách

**Yêu cầu:**
- Tôm, trứng, cua... cần lưu theo gram (đơn vị chuẩn)
- Nhưng hiển thị theo "con", "quả" (đơn vị tự nhiên)
- Cần lưu trọng lượng trung bình: 1 con tôm = 20g

**Thực tế hiện tại:**
```javascript
// Ví dụ: Tôm
don_vi_nhap: "kg"          // ❌ Không phải "con"
don_vi_tinh: "g"           // ✅ Đúng (đơn vị chuẩn)
ti_le_chuyen_doi: 1000     // ❌ Không phản ánh "1 con = 20g"
```

**Vấn đề:**
- Không thể nhập "50 con tôm" và tự động quy đổi về gram
- Không thể hiển thị "5 con tôm" khi công thức cần 100g
- Không lưu trọng lượng trung bình của 1 con

---

### 🔴 VẤN ĐỀ 2: Công Thức Không Linh Hoạt

**Yêu cầu:**
- Công thức lưu: "100g tôm / món"
- Hiển thị: "5 con tôm / món" (nếu 1 con = 20g)

**Thực tế hiện tại:**
```sql
-- Bảng cong_thuc
so_luong_can: 100  -- ✅ Lưu theo gram
-- Nhưng không có cách hiển thị "5 con"
```

**Vấn đề:**
- Frontend không biết cách quy đổi 100g → 5 con
- Không có metadata về trọng lượng trung bình

---

### 🔴 VẤN ĐỀ 3: Nhập Kho Không Linh Hoạt

**Yêu cầu:**
- Nhập kho: "Nhập 50 con tôm" → Tự động +1000g vào kho
- Hiển thị: "Tồn kho: 5000g (250 con)"

**Thực tế hiện tại:**
```javascript
// API: POST /api/inventory/:id/add-stock
// Body: { amount: 50 }
// Logic: actualAmount = 50 * ti_le_chuyen_doi

// Nếu ti_le_chuyen_doi = 1000 (kg→g)
// → actualAmount = 50,000g ❌ SAI!
// Mong muốn: 50 con × 20g = 1000g
```

---

## 💡 GIẢI PHÁP ĐỀ XUẤT

### Phương Án 1: Thêm Cột Metadata (Khuyến Nghị ⭐)

#### 1.1. Cập Nhật Schema

```sql
ALTER TABLE nguyen_lieu 
ADD COLUMN don_vi_tu_nhien VARCHAR(50) AFTER don_vi_tinh,
ADD COLUMN trong_luong_trung_binh DECIMAL(10, 2) AFTER don_vi_tu_nhien,
ADD COLUMN don_vi_chuan VARCHAR(10) DEFAULT 'g' AFTER trong_luong_trung_binh;

-- Ví dụ dữ liệu:
-- Tôm:
--   don_vi_chuan: 'g'                    (Lưu trữ nội bộ)
--   don_vi_tu_nhien: 'con'               (Hiển thị cho người dùng)
--   trong_luong_trung_binh: 20           (1 con = 20g)
--   so_luong_ton: 5000                   (5000g trong kho)
--   don_vi_nhap: 'kg'                    (Nhập theo kg)
--   ti_le_chuyen_doi: 1000               (1kg = 1000g)

-- Cà chua:
--   don_vi_chuan: 'g'
--   don_vi_tu_nhien: 'quả'
--   trong_luong_trung_binh: 150          (1 quả = 150g)
--   so_luong_ton: 3000                   (3000g = 20 quả)

-- Gạo:
--   don_vi_chuan: 'g'
--   don_vi_tu_nhien: NULL                (Không có đơn vị tự nhiên)
--   trong_luong_trung_binh: NULL
--   so_luong_ton: 50000                  (50kg gạo)
```

#### 1.2. Logic Backend

```javascript
// Controller: inventoryController.js

// Hàm helper: Quy đổi đơn vị tự nhiên → đơn vị chuẩn
function convertNaturalToStandard(amount, avgWeight) {
    if (!avgWeight) return amount;
    return amount * avgWeight;
}

// Hàm helper: Quy đổi đơn vị chuẩn → đơn vị tự nhiên
function convertStandardToNatural(amount, avgWeight) {
    if (!avgWeight) return amount;
    return Math.floor(amount / avgWeight);
}

// API: Nhập kho với đơn vị tự nhiên
const addStockNatural = async (req, res) => {
    const { id } = req.params;
    const { amount, unit_type } = req.body; 
    // unit_type: 'natural' (con, quả) hoặc 'import' (kg, thùng)
    
    const [ing] = await db.query(
        'SELECT don_vi_nhap, ti_le_chuyen_doi, trong_luong_trung_binh FROM nguyen_lieu WHERE ma_nguyen_lieu = ?', 
        [id]
    );
    
    let actualAmount;
    if (unit_type === 'natural' && ing[0].trong_luong_trung_binh) {
        // Nhập theo đơn vị tự nhiên: 50 con × 20g = 1000g
        actualAmount = convertNaturalToStandard(amount, ing[0].trong_luong_trung_binh);
    } else {
        // Nhập theo đơn vị nhập: 1 kg × 1000 = 1000g
        actualAmount = amount * ing[0].ti_le_chuyen_doi;
    }
    
    await db.query(
        'UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton + ? WHERE ma_nguyen_lieu = ?',
        [actualAmount, id]
    );
    
    res.json({ 
        success: true, 
        actual_amount_added: actualAmount,
        natural_unit_added: ing[0].trong_luong_trung_binh 
            ? convertStandardToNatural(actualAmount, ing[0].trong_luong_trung_binh)
            : null
    });
};

// API: Lấy danh sách với thông tin quy đổi
const getAllIngredientsEnhanced = async (req, res) => {
    const [ingredients] = await db.query(`
        SELECT 
            nl.*,
            lnl.ten_loai_nglieu,
            CASE 
                WHEN nl.trong_luong_trung_binh IS NOT NULL 
                THEN FLOOR(nl.so_luong_ton / nl.trong_luong_trung_binh)
                ELSE NULL
            END as so_luong_tu_nhien
        FROM nguyen_lieu nl
        LEFT JOIN loai_nguyen_lieu lnl ON nl.ma_loai_nglieu = lnl.ma_loai_nglieu
        ORDER BY nl.ten_nguyen_lieu ASC
    `);
    
    res.json({ success: true, data: ingredients });
};
```

#### 1.3. Frontend Hiển Thị

```javascript
// nguyen-lieu.html

function renderIngredients(items) {
    container.innerHTML = items.map(item => {
        let stockDisplay;
        if (item.don_vi_tu_nhien && item.trong_luong_trung_binh) {
            // Hiển thị cả 2: "5000g (250 con)"
            const naturalAmount = Math.floor(item.so_luong_ton / item.trong_luong_trung_binh);
            stockDisplay = `${formatStock(item.so_luong_ton, 'g')} g 
                           <span class="text-blue-600">(${naturalAmount} ${item.don_vi_tu_nhien})</span>`;
        } else {
            // Chỉ hiển thị đơn vị chuẩn: "5000g"
            stockDisplay = `${formatStock(item.so_luong_ton, item.don_vi_chuan)} ${item.don_vi_chuan}`;
        }
        
        return `
            <tr>
                <td>${item.ten_nguyen_lieu}</td>
                <td>${stockDisplay}</td>
                ...
            </tr>
        `;
    }).join('');
}
```

#### 1.4. Form Thêm/Sửa Nguyên Liệu

```html
<!-- Thêm vào modal -->
<div>
    <label>Có đơn vị tự nhiên không?</label>
    <input type="checkbox" id="has_natural_unit" onchange="toggleNaturalUnit()">
</div>

<div id="natural-unit-group" class="hidden">
    <div>
        <label>Đơn vị tự nhiên (con, quả, trái...)</label>
        <input type="text" id="don_vi_tu_nhien" placeholder="Ví dụ: con, quả">
    </div>
    <div>
        <label>Trọng lượng trung bình (gram)</label>
        <input type="number" id="trong_luong_trung_binh" placeholder="Ví dụ: 20">
        <p class="text-xs text-gray-500">1 ${don_vi_tu_nhien} = ? gram</p>
    </div>
</div>
```

---

### Phương Án 2: Bảng Quy Đổi Riêng (Phức Tạp Hơn)

```sql
CREATE TABLE don_vi_quy_doi (
  ma_quy_doi INT PRIMARY KEY AUTO_INCREMENT,
  ma_nguyen_lieu INT NOT NULL,
  don_vi_nguon VARCHAR(50) NOT NULL,      -- 'con', 'quả'
  don_vi_dich VARCHAR(50) NOT NULL,       -- 'g'
  ti_le DECIMAL(10, 2) NOT NULL,          -- 1 con = 20g
  FOREIGN KEY (ma_nguyen_lieu) REFERENCES nguyen_lieu(ma_nguyen_lieu)
);

-- Ví dụ:
-- Tôm: con → g, tỉ lệ 20
-- Tôm: kg → g, tỉ lệ 1000
-- Cà chua: quả → g, tỉ lệ 150
```

**Ưu điểm:**
- Linh hoạt, có thể có nhiều đơn vị quy đổi
- Dễ mở rộng

**Nhược điểm:**
- Phức tạp hơn
- Cần nhiều query hơn
- Overkill cho nhu cầu hiện tại

---

## 🎯 KHUYẾN NGHỊ

### ⭐ Chọn Phương Án 1

**Lý do:**
1. ✅ Đơn giản, dễ implement
2. ✅ Đáp ứng đủ yêu cầu
3. ✅ Không cần thay đổi nhiều code hiện tại
4. ✅ Performance tốt (không cần join thêm bảng)

### 📋 Roadmap Triển Khai

#### Bước 1: Cập Nhật Database
```bash
cd backend/scripts
node add-natural-unit-columns.js
```

#### Bước 2: Cập Nhật Backend
- [ ] Thêm cột vào schema
- [ ] Cập nhật `inventoryController.js`
- [ ] Thêm API `addStockNatural`
- [ ] Cập nhật `getAllIngredients` để trả về `so_luong_tu_nhien`

#### Bước 3: Cập Nhật Frontend
- [ ] Thêm checkbox "Có đơn vị tự nhiên" vào form
- [ ] Thêm input "Đơn vị tự nhiên" và "Trọng lượng TB"
- [ ] Cập nhật hiển thị: "5000g (250 con)"
- [ ] Cập nhật modal nhập kho: Cho phép chọn nhập theo "con" hoặc "kg"

#### Bước 4: Migration Dữ Liệu Cũ
```sql
-- Tôm
UPDATE nguyen_lieu 
SET don_vi_tu_nhien = 'con', trong_luong_trung_binh = 20 
WHERE ten_nguyen_lieu LIKE '%tôm%';

-- Trứng
UPDATE nguyen_lieu 
SET don_vi_tu_nhien = 'quả', trong_luong_trung_binh = 60 
WHERE ten_nguyen_lieu LIKE '%trứng%';

-- Cà chua
UPDATE nguyen_lieu 
SET don_vi_tu_nhien = 'quả', trong_luong_trung_binh = 150 
WHERE ten_nguyen_lieu LIKE '%cà chua%';
```

---

## 📊 SO SÁNH TRƯỚC/SAU

### TRƯỚC (Hiện tại):
```
Tôm:
- Tồn kho: 5000g
- Nhập kho: "Nhập 1kg" → +1000g
- Công thức: "100g tôm/món"
- Hiển thị: "5000g" ❌ Không trực quan
```

### SAU (Sau cải tiến):
```
Tôm:
- Tồn kho: 5000g (250 con) ✅
- Nhập kho: 
  + "Nhập 50 con" → +1000g (50×20) ✅
  + "Nhập 1kg" → +1000g ✅
- Công thức: "100g tôm/món" = "5 con/món" ✅
- Hiển thị: "5000g (250 con)" ✅ Trực quan
```

---

## 🔧 CODE MẪU

### Script Migration

```javascript
// backend/scripts/add-natural-unit-columns.js
require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function addNaturalUnitColumns() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });
    
    console.log("Adding natural unit columns...");
    
    try {
        await connection.query(`
            ALTER TABLE nguyen_lieu 
            ADD COLUMN don_vi_tu_nhien VARCHAR(50) AFTER don_vi_tinh,
            ADD COLUMN trong_luong_trung_binh DECIMAL(10, 2) AFTER don_vi_tu_nhien,
            ADD COLUMN don_vi_chuan VARCHAR(10) DEFAULT 'g' AFTER trong_luong_trung_binh
        `);
        
        // Set đơn vị chuẩn cho tất cả nguyên liệu hiện tại
        await connection.query(`
            UPDATE nguyen_lieu 
            SET don_vi_chuan = CASE 
                WHEN don_vi_tinh IN ('ml', 'l') THEN 'ml'
                ELSE 'g'
            END
        `);
        
        console.log("✅ Success! Natural unit columns added.");
    } catch(e) {
        if (e.message.includes('Duplicate column name')) {
            console.log("⚠️ Columns already exist");
        } else {
            console.error("❌ Error:", e.message);
        }
    }
    
    await connection.end();
}

addNaturalUnitColumns();
```

### Chạy Migration:
```bash
cd backend/scripts
node add-natural-unit-columns.js
```

---

## 📈 LỢI ÍCH

### 1. Cho Nhân Viên Kho
- ✅ Nhập kho dễ dàng: "Nhập 50 con tôm" thay vì phải tính "50×20=1000g"
- ✅ Kiểm kê trực quan: "250 con tôm" thay vì "5000g"

### 2. Cho Đầu Bếp
- ✅ Công thức rõ ràng: "5 con tôm/món" thay vì "100g/món"
- ✅ Dễ ước lượng nguyên liệu cần chuẩn bị

### 3. Cho Hệ Thống
- ✅ Lưu trữ chuẩn hóa: Tất cả đều theo gram/ml
- ✅ Tính toán chính xác: Không bị sai số do quy đổi
- ✅ Báo cáo chính xác: Biết chính xác tồn kho theo cả 2 đơn vị

---

## ⚠️ LƯU Ý

1. **Không bắt buộc**: Nguyên liệu không có đơn vị tự nhiên (gạo, dầu...) để NULL
2. **Trọng lượng trung bình**: Là giá trị ước lượng, có thể điều chỉnh
3. **Đơn vị chuẩn**: Luôn là 'g' hoặc 'ml', không thay đổi
4. **Backward compatible**: Code cũ vẫn hoạt động bình thường

---

**Tác giả:** AI Assistant  
**Ngày:** 2026-04-18  
**Phiên bản:** 1.0
