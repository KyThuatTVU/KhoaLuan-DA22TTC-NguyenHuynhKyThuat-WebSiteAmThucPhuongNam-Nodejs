const db = require('./config/database');

async function fix() {
    try {
        console.log('--- Fixing phan_ca table ---');
        // Check if trang_thai exists
        const [cols] = await db.query('SHOW COLUMNS FROM phan_ca LIKE "trang_thai"');
        if (cols.length === 0) {
            console.log('Adding trang_thai column...');
            await db.query("ALTER TABLE phan_ca ADD COLUMN trang_thai ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled' AFTER ngay_lam_viec");
            console.log('✅ Column trang_thai added!');
        } else {
            console.log('ℹ️ Column trang_thai already exists.');
        }

        // Check if ma_ca exists (should be renamed or replaced if it exists)
        // From my check, it doesn't exist. It has ca_id.
        console.log('✅ Porting check completed.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error fixing phan_ca:', e);
        process.exit(1);
    }
}

fix();
