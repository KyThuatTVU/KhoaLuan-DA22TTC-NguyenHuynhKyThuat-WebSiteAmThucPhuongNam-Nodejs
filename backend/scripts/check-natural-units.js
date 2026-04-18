require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function checkNaturalUnits() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });
    
    console.log("🔍 Checking natural units in database...\n");
    
    try {
        // Kiểm tra cột có tồn tại không
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM nguyen_lieu 
            WHERE Field IN ('don_vi_tu_nhien', 'trong_luong_trung_binh', 'don_vi_chuan')
        `);
        
        console.log("📋 Columns found:");
        columns.forEach(col => {
            console.log(`   ✓ ${col.Field} (${col.Type})`);
        });
        
        if (columns.length < 3) {
            console.log("\n❌ Missing columns! Please run: node add-natural-unit-columns.js");
            await connection.end();
            return;
        }
        
        console.log("\n📊 Ingredients with natural units:");
        const [withUnits] = await connection.query(`
            SELECT 
                ma_nguyen_lieu,
                ten_nguyen_lieu,
                so_luong_ton,
                don_vi_tinh,
                don_vi_tu_nhien,
                trong_luong_trung_binh,
                FLOOR(so_luong_ton / trong_luong_trung_binh) as so_luong_tu_nhien
            FROM nguyen_lieu 
            WHERE don_vi_tu_nhien IS NOT NULL 
            AND trong_luong_trung_binh IS NOT NULL
            ORDER BY ten_nguyen_lieu
        `);
        
        if (withUnits.length === 0) {
            console.log("   ⚠️  No ingredients with natural units found!");
            console.log("   💡 Run the migration script to add sample data.");
        } else {
            withUnits.forEach(item => {
                console.log(`   ✓ ${item.ten_nguyen_lieu}: ${item.so_luong_ton}${item.don_vi_tinh} ≈ ${item.so_luong_tu_nhien} ${item.don_vi_tu_nhien}`);
            });
        }
        
        console.log("\n📊 Ingredients without natural units:");
        const [withoutUnits] = await connection.query(`
            SELECT 
                ma_nguyen_lieu,
                ten_nguyen_lieu,
                so_luong_ton,
                don_vi_tinh
            FROM nguyen_lieu 
            WHERE don_vi_tu_nhien IS NULL 
            OR trong_luong_trung_binh IS NULL
            ORDER BY ten_nguyen_lieu
            LIMIT 10
        `);
        
        if (withoutUnits.length === 0) {
            console.log("   ✓ All ingredients have natural units!");
        } else {
            withoutUnits.forEach(item => {
                console.log(`   - ${item.ten_nguyen_lieu}: ${item.so_luong_ton}${item.don_vi_tinh}`);
            });
            if (withoutUnits.length === 10) {
                console.log("   ... (showing first 10)");
            }
        }
        
        // Thống kê tổng quan
        const [stats] = await connection.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN don_vi_tu_nhien IS NOT NULL THEN 1 ELSE 0 END) as with_natural,
                SUM(CASE WHEN don_vi_tu_nhien IS NULL THEN 1 ELSE 0 END) as without_natural
            FROM nguyen_lieu
        `);
        
        console.log("\n📈 Summary:");
        console.log(`   Total ingredients: ${stats[0].total}`);
        console.log(`   With natural unit: ${stats[0].with_natural} (${Math.round(stats[0].with_natural / stats[0].total * 100)}%)`);
        console.log(`   Without natural unit: ${stats[0].without_natural} (${Math.round(stats[0].without_natural / stats[0].total * 100)}%)`);
        
    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await connection.end();
        console.log("\n🔌 Database connection closed.");
    }
}

checkNaturalUnits()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Error:", error);
        process.exit(1);
    });
