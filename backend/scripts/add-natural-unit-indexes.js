#!/usr/bin/env node

/**
 * Migration script: Add indexes for natural unit ingredient tracking
 * 
 * This migration adds performance indexes to the nguyen_lieu table to optimize
 * queries for natural unit filtering and low stock warnings.
 * 
 * Requirements: 9.5
 * Task: 1.2 Create database indexes for nguyen_lieu table
 */

// Load environment variables from backend/.env
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const db = require('../config/database');

async function addNaturalUnitIndexes() {
    let connection;
    
    try {
        connection = await db.getConnection();
        
        console.log('🚀 Starting natural unit indexes migration...\n');
        
        // Step 1: Create index on don_vi_tu_nhien
        console.log('📋 Step 1: Creating idx_natural_unit index...');
        try {
            const [indexes1] = await connection.query(`
                SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'nguyen_lieu'
                AND INDEX_NAME = 'idx_natural_unit'
            `);
            
            if (indexes1.length === 0) {
                await connection.query(`
                    CREATE INDEX idx_natural_unit 
                    ON nguyen_lieu(don_vi_tu_nhien)
                `);
                console.log('✅ Index idx_natural_unit created successfully!');
                console.log('   Purpose: Optimize filtering ingredients by natural unit type\n');
            } else {
                console.log('⚠️  Index idx_natural_unit already exists, skipping...\n');
            }
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('⚠️  Index idx_natural_unit already exists, skipping...\n');
            } else {
                throw error;
            }
        }
        
        // Step 2: Create composite index on (so_luong_ton, muc_canh_bao)
        console.log('📋 Step 2: Creating idx_low_stock index...');
        try {
            const [indexes2] = await connection.query(`
                SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'nguyen_lieu'
                AND INDEX_NAME = 'idx_low_stock'
            `);
            
            if (indexes2.length === 0) {
                await connection.query(`
                    CREATE INDEX idx_low_stock 
                    ON nguyen_lieu(so_luong_ton, muc_canh_bao)
                `);
                console.log('✅ Index idx_low_stock created successfully!');
                console.log('   Purpose: Optimize low stock warning queries\n');
            } else {
                console.log('⚠️  Index idx_low_stock already exists, skipping...\n');
            }
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('⚠️  Index idx_low_stock already exists, skipping...\n');
            } else {
                throw error;
            }
        }
        
        // Step 3: Verify the indexes
        console.log('📋 Step 3: Verifying indexes...');
        const [indexInfo] = await connection.query(`
            SELECT 
                INDEX_NAME,
                COLUMN_NAME,
                SEQ_IN_INDEX,
                NON_UNIQUE,
                INDEX_TYPE
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'nguyen_lieu'
            AND INDEX_NAME IN ('idx_natural_unit', 'idx_low_stock')
            ORDER BY INDEX_NAME, SEQ_IN_INDEX
        `);
        
        console.log('✅ Verification results:');
        let currentIndex = '';
        indexInfo.forEach(idx => {
            if (idx.INDEX_NAME !== currentIndex) {
                currentIndex = idx.INDEX_NAME;
                console.log(`\n   ${idx.INDEX_NAME} (${idx.INDEX_TYPE}):`);
            }
            console.log(`     - Column ${idx.SEQ_IN_INDEX}: ${idx.COLUMN_NAME}`);
        });
        console.log('');
        
        // Step 4: Display statistics
        console.log('📋 Step 4: Statistics...');
        const [stats] = await connection.query(`
            SELECT 
                COUNT(*) as total_ingredients,
                SUM(CASE WHEN don_vi_tu_nhien IS NOT NULL THEN 1 ELSE 0 END) as with_natural_unit,
                SUM(CASE WHEN so_luong_ton <= muc_canh_bao THEN 1 ELSE 0 END) as low_stock_items
            FROM nguyen_lieu
        `);
        
        console.log('✅ Ingredient statistics:');
        console.log(`   Total ingredients: ${stats[0].total_ingredients}`);
        console.log(`   With natural unit: ${stats[0].with_natural_unit}`);
        console.log(`   Low stock items: ${stats[0].low_stock_items}`);
        console.log('');
        
        // Step 5: Test query performance (optional)
        console.log('📋 Step 5: Testing index usage...');
        
        // Test idx_natural_unit
        const [explainNaturalUnit] = await connection.query(`
            EXPLAIN SELECT ma_nguyen_lieu, ten_nguyen_lieu, don_vi_tu_nhien
            FROM nguyen_lieu
            WHERE don_vi_tu_nhien IS NOT NULL
        `);
        console.log('✅ Query plan for natural unit filter:');
        console.log(`   Using index: ${explainNaturalUnit[0].key || 'None'}`);
        console.log(`   Rows examined: ${explainNaturalUnit[0].rows}`);
        
        // Test idx_low_stock
        const [explainLowStock] = await connection.query(`
            EXPLAIN SELECT ma_nguyen_lieu, ten_nguyen_lieu, so_luong_ton, muc_canh_bao
            FROM nguyen_lieu
            WHERE so_luong_ton <= muc_canh_bao
        `);
        console.log('\n✅ Query plan for low stock warning:');
        console.log(`   Using index: ${explainLowStock[0].key || 'None'}`);
        console.log(`   Rows examined: ${explainLowStock[0].rows}`);
        console.log('');
        
        console.log('🎉 Migration completed successfully!');
        console.log('📝 Benefits:');
        console.log('   - Faster filtering of ingredients with natural units');
        console.log('   - Optimized low stock warning queries');
        console.log('   - Improved performance for inventory dashboard');
        console.log('');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        if (error.sqlMessage) {
            console.error('SQL Error:', error.sqlMessage);
        }
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Run migration
if (require.main === module) {
    addNaturalUnitIndexes()
        .then(() => {
            console.log('✅ Script execution completed.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Script execution failed:', error);
            process.exit(1);
        });
}

module.exports = addNaturalUnitIndexes;
