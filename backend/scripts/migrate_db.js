const db = require('./config/database');

async function migrate() {
    try {
        console.log('🚀 Starting Database Migration...');

        // 1. Table: cham_cong
        console.log('--- Migrating cham_cong ---');
        const [ccCols] = await db.query('SHOW COLUMNS FROM cham_cong');
        const ccFields = ccCols.map(c => c.Field);
        
        if (ccFields.includes('id') && !ccFields.includes('ma_cham_cong')) {
            await db.query('ALTER TABLE cham_cong RENAME COLUMN id TO ma_cham_cong');
            console.log('✅ RENAME id TO ma_cham_cong');
        }
        if (ccFields.includes('ngay_lam') && !ccFields.includes('ngay')) {
            await db.query('ALTER TABLE cham_cong RENAME COLUMN ngay_lam TO ngay');
            console.log('✅ RENAME ngay_lam TO ngay');
        }
        if (!ccFields.includes('so_gio_lam')) {
            await db.query('ALTER TABLE cham_cong ADD COLUMN so_gio_lam FLOAT DEFAULT 0 AFTER gio_ra');
            console.log('✅ ADD COLUMN so_gio_lam');
        }
        if (!ccFields.includes('ngay_tao')) {
            await db.query('ALTER TABLE cham_cong ADD COLUMN ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP');
            console.log('✅ ADD COLUMN ngay_tao');
        }

        // 2. Table: phan_ca
        console.log('--- Migrating phan_ca ---');
        const [pcCols] = await db.query('SHOW COLUMNS FROM phan_ca');
        const pcFields = pcCols.map(c => c.Field);

        if (pcFields.includes('id') && !pcFields.includes('ma_phan_ca')) {
            await db.query('ALTER TABLE phan_ca RENAME COLUMN id TO ma_phan_ca');
            console.log('✅ RENAME id TO ma_phan_ca');
        }
        if (pcFields.includes('ca_id') && !pcFields.includes('ma_ca')) {
            await db.query('ALTER TABLE phan_ca RENAME COLUMN ca_id TO ma_ca');
            console.log('✅ RENAME ca_id TO ma_ca');
        }
        if (pcFields.includes('ngay_lam_viec') && !pcFields.includes('ngay')) {
            await db.query('ALTER TABLE phan_ca RENAME COLUMN ngay_lam_viec TO ngay');
            console.log('✅ RENAME ngay_lam_viec TO ngay');
        }

        // 3. Table: ca_lam_viec
        console.log('--- Migrating ca_lam_viec ---');
        const [clvCols] = await db.query('SHOW COLUMNS FROM ca_lam_viec');
        const clvFields = clvCols.map(c => c.Field);

        if (clvFields.includes('id') && !clvFields.includes('ma_ca')) {
            await db.query('ALTER TABLE ca_lam_viec RENAME COLUMN id TO ma_ca');
            console.log('✅ RENAME id TO ma_ca');
        }

        // 4. Table: bang_luong
        console.log('--- Migrating bang_luong ---');
        const [blCols] = await db.query('SHOW COLUMNS FROM bang_luong');
        const blFields = blCols.map(c => c.Field);

        if (blFields.includes('id') && !blFields.includes('ma_luong')) {
            await db.query('ALTER TABLE bang_luong RENAME COLUMN id TO ma_luong');
            console.log('✅ RENAME id TO ma_luong');
        }

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
