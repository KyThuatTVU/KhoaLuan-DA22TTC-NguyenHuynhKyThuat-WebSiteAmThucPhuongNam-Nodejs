#!/usr/bin/env node

/**
 * Migration script: Add natural unit batch tracking to chi_tiet_phieu_nhap
 * 
 * This migration adds columns to track natural unit quantities and average weights
 * at the time of import, enabling batch-level tracking for ingredients with variable sizes.
 * 
 * Requirements: 5.1, 5.2, 5.3
 */

const db = require('../config/database');

async function addNaturalUnitBatchTracking() {
    let connection;
    
    try {
        connection = await db.getConnection();
        
        console.log('🚀 Starting natural unit batch tracking migration...\n');
        
        // Step 1: Add so_luong_tu_nhien column
        console.log('📋 Step 1: Adding so_luong_tu_nhien column...');
        try {
            const [columns1] = await connection.query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'chi_tiet_phieu_nhap' 
                AND COLUMN_NAME = 'so_luong_tu_nhien'
            `);
            
            if (columns1.length === 0) {
                await connection.query(`
                    ALTER TABLE chi_tiet_phieu_nhap
                    ADD COLUMN so_luong_tu_nhien INT NULL 
                    COMMENT 'Natural unit quantity at time of import'
                    AFTER don_vi_nhap
                `);
                console.log('✅ Column so_luong_tu_nhien added successfully!\n');
            } else {
                console.log('⚠️  Column so_luong_tu_nhien already exists, skipping...\n');
            }
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️  Column so_luong_tu_nhien already exists, skipping...\n');
            } else {
                throw error;
            }
        }
        
        // Step 2: Add trong_luong_trung_binh_tai_thoi_diem_nhap column
        console.log('📋 Step 2: Adding trong_luong_trung_binh_tai_thoi_diem_nhap column...');
        try {
            const [columns2] = await connection.query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'chi_tiet_phieu_nhap' 
                AND COLUMN_NAME = 'trong_luong_trung_binh_tai_thoi_diem_nhap'
            `);
            
            if (columns2.length === 0) {
                await connection.query(`
                    ALTER TABLE chi_tiet_phieu_nhap
                    ADD COLUMN trong_luong_trung_binh_tai_thoi_diem_nhap DECIMAL(10,2) NULL
                    COMMENT 'Calculated average weight at time of import (grams per natural unit)'
                    AFTER so_luong_tu_nhien
                `);
                console.log('✅ Column trong_luong_trung_binh_tai_thoi_diem_nhap added successfully!\n');
            } else {
                console.log('⚠️  Column trong_luong_trung_binh_tai_thoi_diem_nhap already exists, skipping...\n');
            }
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️  Column trong_luong_trung_binh_tai_thoi_diem_nhap already exists, skipping...\n');
            } else {
                throw error;
            }
        }
        
        // Step 3: Create index for batch tracking queries
        console.log('📋 Step 3: Creating idx_batch_tracking index...');
        try {
            const [indexes] = await connection.query(`
                SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'chi_tiet_phieu_nhap'
                AND INDEX_NAME = 'idx_batch_tracking'
            `);
            
            if (indexes.length === 0) {
                await connection.query(`
                    CREATE INDEX idx_batch_tracking 
                    ON chi_tiet_phieu_nhap(ma_nguyen_lieu, ma_phieu_nhap)
                `);
                console.log('✅ Index idx_batch_tracking created successfully!\n');
            } else {
                console.log('⚠️  Index idx_batch_tracking already exists, skipping...\n');
            }
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('⚠️  Index idx_batch_tracking already exists, skipping...\n');
            } else {
                throw error;
            }
        }
        
        // Step 4: Verify the changes
        console.log('📋 Step 4: Verifying changes...');
        const [tableInfo] = await connection.query(`
            SELECT 
                COLUMN_NAME,
                COLUMN_TYPE,
                IS_NULLABLE,
                COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'chi_tiet_phieu_nhap'
            AND COLUMN_NAME IN ('so_luong_tu_nhien', 'trong_luong_trung_binh_tai_thoi_diem_nhap')
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('✅ Verification results:');
        tableInfo.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
            console.log(`     Comment: ${col.COLUMN_COMMENT || 'None'}`);
        });
        console.log('');
        
        // Step 5: Display statistics
        console.log('📋 Step 5: Statistics...');
        const [stats] = await connection.query(`
            SELECT 
                COUNT(*) as total_records,
                SUM(CASE WHEN so_luong_tu_nhien IS NOT NULL THEN 1 ELSE 0 END) as with_natural_unit,
                SUM(CASE WHEN so_luong_tu_nhien IS NULL THEN 1 ELSE 0 END) as without_natural_unit
            FROM chi_tiet_phieu_nhap
        `);
        
        console.log('✅ Import records statistics:');
        console.log(`   Total import records: ${stats[0].total_records}`);
        console.log(`   With natural unit: ${stats[0].with_natural_unit}`);
        console.log(`   Without natural unit: ${stats[0].without_natural_unit}`);
        console.log('');
        
        console.log('🎉 Migration completed successfully!');
        console.log('📝 Next steps:');
        console.log('   - Update importController.js to accept so_luong_tu_nhien in import requests');
        console.log('   - Implement average weight calculation logic');
        console.log('   - Update import history queries to display batch-specific weights');
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
    addNaturalUnitBatchTracking()
        .then(() => {
            console.log('✅ Script execution completed.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Script execution failed:', error);
            process.exit(1);
        });
}

module.exports = addNaturalUnitBatchTracking;
