const http = require('http');
const jwt = require('d:/KhoaLuanTotNghiep2026/src/backend/node_modules/jsonwebtoken');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

const token = jwt.sign(
    { ma_nguoi_dung: 3 },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: '1h' }
);

function get(path, withToken) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'localhost', port: 3000, path, method: 'GET',
            headers: withToken ? { 'Authorization': 'Bearer ' + token } : {}
        };
        const req = http.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    // 1. Gọi API "Dành riêng cho bạn" — đúng như index.html gọi
    const personalRes = await get('/api/recommendations?limit=8&mode=homepage&t=' + Date.now(), true);
    const personalDishes = personalRes.success ? personalRes.data : [];
    const personalIds = new Set(personalDishes.map(d => d.ma_mon));

    console.log('══════════════════════════════════════════════════');
    console.log('SECTION 1: "DÀNH RIÊNG CHO BẠN" (mode=homepage)');
    console.log('══════════════════════════════════════════════════');
    personalDishes.forEach((d, i) => {
        console.log(`${i+1}. [${d.recommendation_type}] ${d.ten_mon} (ID ${d.ma_mon})`);
        console.log(`   → ${d.reason}`);
    });

    // 2. Gọi API "Top Bán Chạy" — đúng như index.html gọi (WITH token)
    const topRes = await get('/api/menu/top-selling?limit=24', true);
    const topDishes = topRes.success ? topRes.data : [];

    console.log('\n══════════════════════════════════════════════════');
    console.log('SECTION 2: "TOP BÁN CHẠY" — Raw API (24 món)');
    console.log('══════════════════════════════════════════════════');
    topDishes.forEach((d, i) => {
        const duplicate = personalIds.has(d.ma_mon) ? ' ⚠️ TRÙNG với "Dành riêng cho bạn"' : '';
        console.log(`${i+1}. ${d.ten_mon} (ID ${d.ma_mon}) | Score: ${parseFloat(d.popularity_score).toFixed(0)} | da_ban: ${d.da_ban}${duplicate}`);
    });

    // 3. Simulate frontend filter (loại bỏ món đã có trong personalized)
    const afterFilter = topDishes.filter(d => !personalIds.has(d.ma_mon)).slice(0, 8);
    console.log('\n══════════════════════════════════════════════════');
    console.log('SECTION 2 SAU KHI FRONTEND LỌC TRÙNG (hiển thị 8 món)');
    console.log('══════════════════════════════════════════════════');
    afterFilter.forEach((d, i) => {
        console.log(`${i+1}. ${d.ten_mon} (ID ${d.ma_mon}) | Score: ${parseFloat(d.popularity_score).toFixed(0)}`);
    });

    // 4. Phân tích gốc rễ
    console.log('\n══════════════════════════════════════════════════');
    console.log('PHÂN TÍCH GỐC RỄ');
    console.log('══════════════════════════════════════════════════');
    const overlap = topDishes.filter(d => personalIds.has(d.ma_mon));
    if (overlap.length > 0) {
        console.log(`⚠️  ${overlap.length} món TRÙNG giữa 2 section:`);
        overlap.forEach(d => console.log(`   - ${d.ten_mon} (ID ${d.ma_mon}) score=${parseFloat(d.popularity_score).toFixed(0)}`));
        console.log('   → Dedup frontend SẼ loại chúng ra khỏi Top Bán Chạy ✅');
    } else {
        console.log('✅ Không có món nào trùng giữa 2 section.');
    }

    const topWithFlavor = topDishes.filter(d => !personalIds.has(d.ma_mon));
    console.log(`\nℹ️  Top Bán Chạy còn lại sau dedup: ${topWithFlavor.length} món`);
    if (topWithFlavor.length < 8) {
        console.log(`⚠️  THIẾU MÓN — chỉ có ${topWithFlavor.length} / 8 món để hiển thị`);
    }
}

main().catch(console.error);
