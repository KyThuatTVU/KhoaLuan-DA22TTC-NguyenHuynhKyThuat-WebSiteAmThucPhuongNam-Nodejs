require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function alterTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'amthuc_phuongnam'
    });
    console.log("Adding don_vi_nhap and ti_le_chuyen_doi...");
    try {
        await connection.query("ALTER TABLE nguyen_lieu ADD COLUMN don_vi_nhap VARCHAR(50) AFTER don_vi_tinh, ADD COLUMN ti_le_chuyen_doi DECIMAL(10,2) DEFAULT 1 AFTER don_vi_nhap");
        await connection.query("UPDATE nguyen_lieu SET don_vi_nhap = don_vi_tinh, ti_le_chuyen_doi = 1");
        console.log("Success sql table alteration");
    } catch(e) { 
        if (e.message.includes('Duplicate column name')) {
            console.log("Columns already exist");
        } else {
            console.log(e.message); 
        }
    }
    await connection.end();
}
alterTable();
