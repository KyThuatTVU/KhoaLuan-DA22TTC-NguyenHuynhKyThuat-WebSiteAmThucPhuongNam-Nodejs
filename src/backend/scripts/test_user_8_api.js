const http = require('http');
const jwt = require('d:/KhoaLuanTotNghiep2026/src/backend/node_modules/jsonwebtoken');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

const token = jwt.sign(
    { ma_nguoi_dung: 8 },
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
        console.log("=== GỢI Ý CHO HÂN TRẦN THỊ NGỌC ===");
        if (result.success) {
            result.data.forEach((item, i) => {
                console.log(`${i+1}. ${item.ten_mon} (ID ${item.ma_mon}) [${item.recommendation_type}] - Reason: ${item.reason}`);
            });
        } else {
            console.log("API Error:", result.message);
        }
    });
});
req.on('error', e => console.error(e.message));
req.end();
