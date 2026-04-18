#!/usr/bin/env node

/**
 * Comprehensive verification script for natural unit ingredient tracking migrations
 * 
 * This script verifies:
 * 1. Columns in chi_tiet_phieu_nhap (batch tracking)
 * 2. Columns in nguyen_lieu (natural unit configuration)
 * 3. All indexes (batch tracking + natural unit indexes)
 * 4. Rollback functionality (optional test mode)
 * 
 * Requirements: 9.1, 9.2
 * Task: 1.3 Write migration verification script
 */

// Load environment variables from backend/.env
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const db = require('../config/database');

// Expected schema definitions
const EXPECTED_SCHEMA = {
    chi_tiet_phieu_nhap: {
        columns: [
            { name: 'so_luong_tu_nhien', type: 'int', nullable: 'YES' },
            { name: 'trong_luong_trung_binh_tai_thoi_diem_nhap', type: 'decimal(10,2)', nullable: 'YES' }
        ],
        indexes: [
            { name: 'idx_batch_tracking', columns: ['ma_nguyen_lieu', 'ma_phieu_nhap'] }
        ]
    },
    nguyen_lieu: {
        columns: [
            { name: 'don_vi_tu_nhien', type: 'varchar(50)', nullable: 'YES' },
            { name: 'trong_luong_trung_binh', type: 'decimal(10,2)', nullable: 'YES' },
            { name: 'don_vi_chuan', type: 'varchar(10)', nullable: 'YES' }
        ],
        indexes: [
            { name: 'idx_natural_unit', columns: ['don_vi_tu_nhien'] },
            { name: 'idx_low_stock', columns: ['so_luong_ton', 'muc_canh_bao'] }
        ]
    }
};

/**
 * Verify columns exist with correct types
 */
async function verifyColumns(tableName, expectedColumns) {
    console.log(`\n📋 Verifying columns in ${tableName}...`);
    
    const columnNames = expectedColumns.map(c => c.name);
    const [columns] = await db.query(`
        SELECT 
            COLUMN_NAME,
            COLUMN_TYPE,
            IS_NULLABLE,
            COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME IN (?)
        ORDER BY ORDINAL_POSITION
    `, [tableName, columnNames]);
    
    let allValid = true;
    
    for (const expected of expectedColumns) {
        const found = columns.find(c => c.COLUMN_NAME === expected.name);
        
        if (!found) {
            console.log(`❌ Column ${expected.name} is MISSING`);
            allValid = false;
            continue;
        }
        
        // Verify type (normalize for comparison)
        const actualType = found.COLUMN_TYPE.toLowerCase();
        const expectedType = expected.type.toLowerCase();
        
        if (actualType !== expectedType) {
            console.log(`⚠️  Column ${expected.name}: Type mismatch`);
            console.log(`   Expected: ${expectedType}, Found: ${actualType}`);
            allValid = false;
        } else {
            console.log(`✅ Column ${expected.name}: ${actualType} (${found.IS_NULLABLE})`);
            if (found.COLUMN_COMMENT) {
                console.log(`   Comment: ${found.COLUMN_COMMENT}`);
            }
        }
    }
    
    return allValid;
}

/**
 * Verify indexes are created correctly
 */
async function verifyIndexes(tableName, expectedIndexes) {
    console.log(`\n📋 Verifying indexes in ${tableName}...`);
    
    let allValid = true;
    
    for (const expected of expectedIndexes) {
        const [indexes] = await db.query(`
            SELECT 
                INDEX_NAME,
                COLUMN_NAME,
                SEQ_IN_INDEX,
                NON_UNIQUE,
                INDEX_TYPE
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND INDEX_NAME = ?
            ORDER BY SEQ_IN_INDEX
        `, [tableName, expected.name]);
        
        if (indexes.length === 0) {
            console.log(`❌ Index ${expected.name} is MISSING`);
            allValid = false;
            continue;
        }
        
        // Verify columns in index
        const actualColumns = indexes.map(i => i.COLUMN_NAME);
        const expectedColumns = expected.columns;
        
        if (actualColumns.length !== expectedColumns.length) {
            console.log(`⚠️  Index ${expected.name}: Column count mismatch`);
            console.log(`   Expected: ${expectedColumns.join(', ')}`);
            console.log(`   Found: ${actualColumns.join(', ')}`);
            allValid = false;
        } else {
            let columnsMatch = true;
            for (let i = 0; i < expectedColumns.length; i++) {
                if (actualColumns[i] !== expectedColumns[i]) {
                    columnsMatch = false;
                    break;
                }
            }
            
            if (columnsMatch) {
                console.log(`✅ Index ${expected.name}: (${actualColumns.join(', ')})`);
                console.log(`   Type: ${indexes[0].INDEX_TYPE}`);
            } else {
                console.log(`⚠️  Index ${expected.name}: Column order mismatch`);
                console.log(`   Expected: ${expectedColumns.join(', ')}`);
                console.log(`   Found: ${actualColumns.join(', ')}`);
                allValid = false;
            }
        }
    }
    
    return allValid;
}

/**
 * Display data statistics
 */
async function displayStatistics() {
    console.log('\n📊 Data Statistics...');
    
    // chi_tiet_phieu_nhap statistics
    const [importStats] = await db.query(`
        SELECT 
            COUNT(*) as total_records,
            SUM(CASE WHEN so_luong_tu_nhien IS NOT NULL THEN 1 ELSE 0 END) as with_natural_unit,
            SUM(CASE WHEN so_luong_tu_nhien IS NULL THEN 1 ELSE 0 END) as without_natural_unit
        FROM chi_tiet_phieu_nhap
    `);
    
    console.log('\nImport Records (chi_tiet_phieu_nhap):');
    console.log(`  Total records: ${importStats[0].total_records}`);
    console.log(`  With natural unit: ${importStats[0].with_natural_unit}`);
    console.log(`  Without natural unit: ${importStats[0].without_natural_unit}`);
    
    // nguyen_lieu statistics
    const [ingredientStats] = await db.query(`
        SELECT 
            COUNT(*) as total_ingredients,
            SUM(CASE WHEN don_vi_tu_nhien IS NOT NULL THEN 1 ELSE 0 END) as with_natural_unit,
            SUM(CASE WHEN don_vi_tu_nhien IS NULL THEN 1 ELSE 0 END) as without_natural_unit,
            SUM(CASE WHEN so_luong_ton <= muc_canh_bao THEN 1 ELSE 0 END) as low_stock_items
        FROM nguyen_lieu
    `);
    
    console.log('\nIngredients (nguyen_lieu):');
    console.log(`  Total ingredients: ${ingredientStats[0].total_ingredients}`);
    console.log(`  With natural unit: ${ingredientStats[0].with_natural_unit}`);
    console.log(`  Without natural unit: ${ingredientStats[0].without_natural_unit}`);
    console.log(`  Low stock items: ${ingredientStats[0].low_stock_items}`);
}

/**
 * Test rollback functionality
 * Creates a test transaction and rolls it back to verify database integrity
 */
async function testRollback() {
    console.log('\n🔄 Testing rollback functionality...');
    
    let connection;
    try {
        connection = await db.getConnection();
        
        // Get current state
        const [beforeStats] = await connection.query(`
            SELECT COUNT(*) as count FROM nguyen_lieu WHERE don_vi_tu_nhien IS NOT NULL
        `);
        const beforeCount = beforeStats[0].count;
        
        console.log(`  Current ingredients with natural unit: ${beforeCount}`);
        
        // Start transaction
        await connection.beginTransaction();
        console.log('  ✓ Transaction started');
        
        // Make a test change
        await connection.query(`
            UPDATE nguyen_lieu 
            SET don_vi_tu_nhien = 'test_rollback', trong_luong_trung_binh = 999.99
            WHERE ma_nguyen_lieu = (
                SELECT ma_nguyen_lieu FROM (
                    SELECT ma_nguyen_lieu FROM nguyen_lieu LIMIT 1
                ) as temp
            )
        `);
        console.log('  ✓ Test modification applied');
        
        // Verify change within transaction
        const [duringStats] = await connection.query(`
            SELECT COUNT(*) as count FROM nguyen_lieu WHERE don_vi_tu_nhien = 'test_rollback'
        `);
        
        if (duringStats[0].count === 0) {
            throw new Error('Test modification not visible within transaction');
        }
        console.log('  ✓ Modification visible within transaction');
        
        // Rollback
        await connection.rollback();
        console.log('  ✓ Transaction rolled back');
        
        // Verify rollback
        const [afterStats] = await connection.query(`
            SELECT COUNT(*) as count FROM nguyen_lieu WHERE don_vi_tu_nhien = 'test_rollback'
        `);
        
        if (afterStats[0].count > 0) {
            throw new Error('Rollback failed: test data still exists');
        }
        
        const [finalStats] = await connection.query(`
            SELECT COUNT(*) as count FROM nguyen_lieu WHERE don_vi_tu_nhien IS NOT NULL
        `);
        
        if (finalStats[0].count !== beforeCount) {
            throw new Error(`Rollback failed: count mismatch (before: ${beforeCount}, after: ${finalStats[0].count})`);
        }
        
        console.log('  ✓ Rollback successful: data restored to original state');
        console.log('✅ Rollback functionality verified');
        
        return true;
        
    } catch (error) {
        console.error('❌ Rollback test failed:', error.message);
        return false;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

/**
 * Main verification function
 */
async function verifyMigration(options = {}) {
    const { testRollbackFlag = false } = options;
    
    try {
        console.log('🚀 Starting comprehensive natural unit migration verification...');
        console.log('=' .repeat(70));
        
        let allValid = true;
        
        // Verify chi_tiet_phieu_nhap columns
        console.log('\n### Table: chi_tiet_phieu_nhap (Batch Tracking) ###');
        const batchColumnsValid = await verifyColumns(
            'chi_tiet_phieu_nhap',
            EXPECTED_SCHEMA.chi_tiet_phieu_nhap.columns
        );
        allValid = allValid && batchColumnsValid;
        
        // Verify chi_tiet_phieu_nhap indexes
        const batchIndexesValid = await verifyIndexes(
            'chi_tiet_phieu_nhap',
            EXPECTED_SCHEMA.chi_tiet_phieu_nhap.indexes
        );
        allValid = allValid && batchIndexesValid;
        
        // Verify nguyen_lieu columns
        console.log('\n### Table: nguyen_lieu (Natural Unit Configuration) ###');
        const ingredientColumnsValid = await verifyColumns(
            'nguyen_lieu',
            EXPECTED_SCHEMA.nguyen_lieu.columns
        );
        allValid = allValid && ingredientColumnsValid;
        
        // Verify nguyen_lieu indexes
        const ingredientIndexesValid = await verifyIndexes(
            'nguyen_lieu',
            EXPECTED_SCHEMA.nguyen_lieu.indexes
        );
        allValid = allValid && ingredientIndexesValid;
        
        // Display statistics
        await displayStatistics();
        
        // Test rollback if requested
        if (testRollbackFlag) {
            const rollbackValid = await testRollback();
            allValid = allValid && rollbackValid;
        }
        
        // Final summary
        console.log('\n' + '='.repeat(70));
        if (allValid) {
            console.log('🎉 Migration verification PASSED!');
            console.log('✅ All columns exist with correct types');
            console.log('✅ All indexes are created correctly');
            if (testRollbackFlag) {
                console.log('✅ Rollback functionality verified');
            }
            console.log('\n📝 Next steps:');
            console.log('   - Implement natural unit calculation logic');
            console.log('   - Update controllers to use natural unit fields');
            console.log('   - Write property-based tests for core utilities');
            process.exit(0);
        } else {
            console.log('❌ Migration verification FAILED!');
            console.log('⚠️  Some columns or indexes are missing or incorrect');
            console.log('\n📝 Action required:');
            console.log('   - Run migration scripts: add-natural-unit-batch-tracking.js');
            console.log('   - Run migration scripts: add-natural-unit-indexes.js');
            console.log('   - Check database permissions');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ Verification failed with error:', error.message);
        if (error.sqlMessage) {
            console.error('SQL Error:', error.sqlMessage);
        }
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

// Run verification
if (require.main === module) {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const testRollbackFlag = args.includes('--test-rollback');
    
    if (testRollbackFlag) {
        console.log('ℹ️  Rollback testing enabled\n');
    }
    
    verifyMigration({ testRollbackFlag })
        .then(() => {
            console.log('\n✅ Script execution completed.');
        })
        .catch((error) => {
            console.error('\n💥 Script execution failed:', error);
            process.exit(1);
        });
}

module.exports = verifyMigration;
