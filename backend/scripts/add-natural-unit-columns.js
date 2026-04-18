require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function addNaturalUnitColumns() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });
    
    console.log("🔧 Adding natural unit columns to nguyen_lieu table...");
    
    try {
        // Thêm từng cột một và bắt lỗi nếu đã tồn tại
        try {
            await connection.query(`
                ALTER TABLE nguyen_lieu 
                ADD COLUMN don_vi_tu_nhien VARCHAR(50) COMMENT 'Đơn vị tự nhiên: con, quả, trái...' AFTER don_vi_tinh
            `);
            console.log("✅ Column 'don_vi_tu_nhien' added!");
        } catch (e) {
            if (e.message.includes('Duplicate column name')) {
                console.log("⚠️  Column 'don_vi_tu_nhien' already exists");
            } else {
                throw e;
            }
        }
        
        try {
            await connection.query(`
                ALTER TABLE nguyen_lieu 
                ADD COLUMN trong_luong_trung_binh DECIMAL(10, 2) COMMENT 'Trọng lượng TB: 1 con = ? gram' AFTER don_vi_tu_nhien
            `);
            console.log("✅ Column 'trong_luong_trung_binh' added!");
        } catch (e) {
            if (e.message.includes('Duplicate column name')) {
                console.log("⚠️  Column 'trong_luong_trung_binh' already exists");
            } else {
                throw e;
            }
        }
        
        try {
            await connection.query(`
                ALTER TABLE nguyen_lieu 
                ADD COLUMN don_vi_chuan VARCHAR(10) DEFAULT 'g' COMMENT 'Đơn vị chuẩn lưu trữ: g hoặc ml' AFTER trong_luong_trung_binh
            `);
            console.log("✅ Column 'don_vi_chuan' added!");
        } catch (e) {
            if (e.message.includes('Duplicate column name')) {
                console.log("⚠️  Column 'don_vi_chuan' already exists");
            } else {
                throw e;
            }
        }
        
        // Set đơn vị chuẩn cho tất cả nguyên liệu hiện tại
        console.log("🔄 Setting default standard units...");
        await connection.query(`
            UPDATE nguyen_lieu 
            SET don_vi_chuan = CASE 
                WHEN don_vi_tinh IN ('ml', 'l', 'lít', 'mililit') THEN 'ml'
                ELSE 'g'
            END
            WHERE don_vi_chuan IS NULL OR don_vi_chuan = ''
        `);
        
        console.log("✅ Standard units set!");
        
        // Thêm dữ liệu mẫu cho một số nguyên liệu phổ biến
        console.log("📝 Adding sample data for common ingredients...");
        
        const sampleData = [
            { pattern: '%tôm%', unit: 'con', weight: 20 },
            { pattern: '%trứng%', unit: 'quả', weight: 60 },
            { pattern: '%cà chua%', unit: 'quả', weight: 150 },
            { pattern: '%cà rốt%', unit: 'củ', weight: 100 },
            { pattern: '%khoai tây%', unit: 'củ', weight: 200 },
            { pattern: '%hành tây%', unit: 'củ', weight: 150 },
            { pattern: '%ớt%', unit: 'quả', weight: 15 },
            { pattern: '%chanh%', unit: 'quả', weight: 50 },
            { pattern: '%chuối%', unit: 'quả', weight: 120 },
            { pattern: '%táo%', unit: 'quả', weight: 180 },
            { pattern: '%cam%', unit: 'quả', weight: 200 },
            { pattern: '%dưa chuột%', unit: 'quả', weight: 300 },
            { pattern: '%bí đao%', unit: 'quả', weight: 2000 },
            { pattern: '%bí ngô%', unit: 'quả', weight: 1500 },
            { pattern: '%cua%', unit: 'con', weight: 300 },
            { pattern: '%ghẹ%', unit: 'con', weight: 250 },
            { pattern: '%mực%', unit: 'con', weight: 200 },
            { pattern: '%bạch tuộc%', unit: 'con', weight: 500 }
        ];
        
        for (const item of sampleData) {
            try {
                const [result] = await connection.query(`
                    UPDATE nguyen_lieu 
                    SET don_vi_tu_nhien = ?, 
                        trong_luong_trung_binh = ?
                    WHERE ten_nguyen_lieu LIKE ? 
                    AND (don_vi_tu_nhien IS NULL OR don_vi_tu_nhien = '')
                `, [item.unit, item.weight, item.pattern]);
                
                if (result.affectedRows > 0) {
                    console.log(`   ✓ Updated: ${item.pattern} → ${item.weight}g/${item.unit}`);
                }
            } catch (e) {
                console.log(`   ⚠ Skip: ${item.pattern}`);
            }
        }
        
        console.log("\n✅ Migration completed successfully!");
        console.log("\n📊 Summary:");
        
        // Thống kê
        const [stats] = await connection.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN don_vi_tu_nhien IS NOT NULL THEN 1 ELSE 0 END) as with_natural_unit,
                SUM(CASE WHEN don_vi_tu_nhien IS NULL THEN 1 ELSE 0 END) as without_natural_unit
            FROM nguyen_lieu
        `);
        
        console.log(`   Total ingredients: ${stats[0].total}`);
        console.log(`   With natural unit: ${stats[0].with_natural_unit}`);
        console.log(`   Without natural unit: ${stats[0].without_natural_unit}`);
        
    } catch(e) {
        console.error("❌ Error:", e.message);
        throw e;
    } finally {
        await connection.end();
        console.log("\n🔌 Database connection closed.");
    }
}

// Run migration
addNaturalUnitColumns()
    .then(() => {
        console.log("\n🎉 All done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Migration failed:", error);
        process.exit(1);
    });
