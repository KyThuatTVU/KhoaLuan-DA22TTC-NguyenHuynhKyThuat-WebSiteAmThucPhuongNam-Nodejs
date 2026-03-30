const db = require('./config/database');

async function checkTables() {
    try {
        const tables = ['cham_cong', 'phan_ca', 'ca_lam_viec', 'bang_luong', 'nhan_vien'];
        for (const table of tables) {
            console.log(`--- Table: ${table} ---`);
            const [cols] = await db.query(`SHOW COLUMNS FROM ${table}`);
            cols.forEach(c => {
                console.log(`${c.Field} (${c.Type})`);
            });
            console.log('\n');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTables();
