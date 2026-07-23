const http = require('http');
const jwt = require('d:/KhoaLuanTotNghiep2026/src/backend/node_modules/jsonwebtoken');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

// Tạo token cho user 3 (Thuật Thuật)
const token = jwt.sign(
    { ma_nguoi_dung: 3 },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: '1h' }
);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/recommendations?limit=8&mode=homepage&t=' + Date.now(),
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const result = JSON.parse(data);
        if (!result.success) { console.log('API Error:', result); return; }
        console.log(`=== DÀNH RIÊNG CHO BẠN — Thuật Thuật (mode=homepage) ===`);
        console.log(`Tổng số món trả về: ${result.data.length}\n`);
        result.data.forEach((item, i) => {
            console.log(`${i+1}. [${item.recommendation_type}] ${item.ten_mon} (ID ${item.ma_mon})`);
            console.log(`   → ${item.reason}`);
        });
        const types = result.data.reduce((acc, r) => { acc[r.recommendation_type] = (acc[r.recommendation_type]||0)+1; return acc; }, {});
        console.log('\n--- Phân bổ theo phương pháp ---');
        Object.entries(types).forEach(([t, c]) => console.log(`  ${t}: ${c} món`));
    });
});
req.on('error', e => console.error(e.message));
req.end();
