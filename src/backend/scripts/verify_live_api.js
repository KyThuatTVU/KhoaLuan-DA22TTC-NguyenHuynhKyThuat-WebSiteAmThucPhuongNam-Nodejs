const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

async function testLive() {
    const userId = 3; // Thuật Thuật
    const token = jwt.sign({ ma_nguoi_dung: userId }, JWT_SECRET, { expiresIn: '1d' });
    
    try {
        console.log("Calling live API http://localhost:3000/api/recommendations ...");
        const response = await axios.get('http://localhost:3000/api/recommendations?limit=8', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log("=== API RESPONSE SUCCESS ===");
        const recommendations = response.data.data;
        recommendations.forEach((r, idx) => {
            console.log(`${idx + 1}. Item ID ${r.ma_mon} (${r.ten_mon})`);
            console.log(`   Type: ${r.recommendation_type}`);
            console.log(`   Reason: ${r.reason}`);
        });
    } catch (e) {
        console.error("API Call error:", e.message);
        console.log("Make sure backend server is running on port 3000 (npm run dev or node server.js)");
    }
}

testLive();
