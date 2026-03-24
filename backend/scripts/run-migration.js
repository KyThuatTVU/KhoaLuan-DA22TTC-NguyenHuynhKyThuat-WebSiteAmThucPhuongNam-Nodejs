#!/usr/bin/env node

/**
 * Script chạy migration SQL
 * Usage: node scripts/run-migration.js <migration-file>
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('❌ Vui lòng chỉ định file migration!');
    console.log('Usage: node scripts/run-migration.js <migration-file>');
    console.log('Example: node scripts/run-migration.js create_order_status_history.sql');
    process.exit(1);
}

// Build full path
const migrationPath = path.join(__dirname, '../migrations', migrationFile);

// Check if file exists
if (!fs.existsSync(migrationPath)) {
    console.error(`❌ File không tồn tại: ${migrationPath}`);
    process.exit(1);
}

console.log('🚀 Đang chạy migration...');
console.log('📁 File:', migrationFile);
console.log('');

// Read SQL file
const sql = fs.readFileSync(migrationPath, 'utf8');

// Split by delimiter to handle multiple statements
const statements = sql
    .split(/DELIMITER\s+\$\$/gi)
    .map(s => s.trim())
    .filter(s => s.length > 0);

async function runMigration() {
    let connection;
    
    try {
        connection = await db.getConnection();
        
        console.log('✅ Kết nối database thành công!');
        console.log('');
        
        // Process each section
        for (let i = 0; i < statements.length; i++) {
            const section = statements[i];
            
            // Split section into individual statements
            const queries = section
                .split(/DELIMITER\s+;/gi)
                .join('')
                .split(';')
                .map(q => q.trim())
                .filter(q => q.length > 0 && !q.match(/^(DELIMITER|--)/i));
            
            for (const query of queries) {
                if (query.trim().length === 0) continue;
                
                try {
                    console.log('⏳ Executing:', query.substring(0, 100) + '...');
                    const [result] = await connection.query(query);
                    
                    if (result.message) {
                        console.log('✅', result.message);
                    } else if (result.affectedRows !== undefined) {
                        console.log(`✅ Affected rows: ${result.affectedRows}`);
                    } else {
                        console.log('✅ Success');
                    }
                } catch (error) {
                    // Ignore "already exists" errors
                    if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
                        error.code === 'ER_DUP_KEYNAME' ||
                        error.message.includes('already exists')) {
                        console.log('⚠️  Already exists, skipping...');
                    } else {
                        throw error;
                    }
                }
            }
        }
        
        console.log('');
        console.log('🎉 Migration hoàn tất!');
        
    } catch (error) {
        console.error('');
        console.error('❌ Lỗi khi chạy migration:');
        console.error(error.message);
        console.error('');
        console.error('SQL Error:', error.sqlMessage || error.sql);
        process.exit(1);
    } finally {
        if (connection) {
            connection.release();
        }
        process.exit(0);
    }
}

// Run migration
runMigration();
