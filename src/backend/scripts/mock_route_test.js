const express = require('express');
const db = require('d:/KhoaLuanTotNghiep2026/src/backend/config/database');
const jwt = require('d:/KhoaLuanTotNghiep2026/src/backend/node_modules/jsonwebtoken');
require('dotenv').config({ path: 'd:/KhoaLuanTotNghiep2026/src/backend/.env' });

const router = require('d:/KhoaLuanTotNghiep2026/src/backend/routes/recommendation.js');

// Mô phỏng req, res
const req = {
    headers: {
        authorization: 'Bearer ' + jwt.sign(
            { ma_nguoi_dung: 3 },
            process.env.JWT_SECRET || 'your-secret-key-change-this',
            { expiresIn: '1h' }
        )
    },
    query: {
        limit: '8',
        mode: 'homepage'
    }
};

const res = {
    json: function(data) {
        console.log("SUCCESS RESPONSE:", JSON.stringify(data, null, 2));
        process.exit(0);
    },
    status: function(code) {
        console.log("STATUS CODE:", code);
        return this;
    }
};

// Tìm handler cho route '/'
const routeHandler = router.stack.find(s => s.route && s.route.path === '/').route.stack[0].handle;

console.log("Executing route handler mock...");
routeHandler(req, res, (err) => {
    if (err) {
        console.error("Mock handler execution failed with error:", err);
    } else {
        console.log("Mock handler done (next called).");
    }
    process.exit(1);
}).catch(e => {
    console.error("Mock handler execution rejected with error:", e);
    process.exit(1);
});
