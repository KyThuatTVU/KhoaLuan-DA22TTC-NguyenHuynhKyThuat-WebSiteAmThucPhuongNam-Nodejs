const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Cache settings để tránh query DB liên tục
let settingsCache = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 1 phút

// Lấy tất cả cài đặt (public - không cần auth)
router.get('/', async (req, res) => {
    try {
        // Kiểm tra cache
        const now = Date.now();
        if (settingsCache && (now - cacheTime) < CACHE_DURATION) {
            return res.json({ success: true, data: settingsCache });
        }
        
        const [settings] = await db.query('SELECT * FROM cai_dat');
        
        // Chuyển đổi thành object key-value
        const settingsObj = {};
        settings.forEach(item => {
            settingsObj[item.setting_key] = item.setting_value;
        });
        
        // Cập nhật cache
        settingsCache = settingsObj;
        cacheTime = now;
        
        res.json({ success: true, data: settingsObj });
    } catch (error) {
        console.error('Error getting settings:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lấy cài đặt' });
    }
});

// Lấy một cài đặt theo key (đặt sau route /public để tránh conflict)
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const [settings] = await db.query('SELECT * FROM cai_dat WHERE setting_key = ?', [key]);
        
        if (settings.length === 0) {
            return res.json({ success: true, data: null });
        }
        
        res.json({ success: true, data: settings[0] });
    } catch (error) {
        console.error('Error getting setting:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lấy cài đặt' });
    }
});

// Cập nhật một cài đặt
router.put('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        
        // Upsert - insert hoặc update
        await db.query(
            `INSERT INTO cai_dat (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = ?, ngay_cap_nhat = CURRENT_TIMESTAMP`,
            [key, value, value]
        );
        
        // Clear cache sau khi cập nhật
        settingsCache = null;
        cacheTime = 0;
        
        res.json({ success: true, message: 'Đã lưu cài đặt' });
    } catch (error) {
        console.error('Error updating setting:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lưu cài đặt' });
    }
});

// Cập nhật nhiều cài đặt cùng lúc
router.post('/bulk', async (req, res) => {
    try {
        const { settings } = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }
        
        // Cập nhật từng setting
        for (const [key, value] of Object.entries(settings)) {
            await db.query(
                `INSERT INTO cai_dat (setting_key, setting_value) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = ?, ngay_cap_nhat = CURRENT_TIMESTAMP`,
                [key, value, value]
            );
        }
        
        // Clear cache sau khi cập nhật
        settingsCache = null;
        cacheTime = 0;
        
        res.json({ success: true, message: 'Đã lưu tất cả cài đặt' });
    } catch (error) {
        console.error('Error bulk updating settings:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi lưu cài đặt' });
    }
});

module.exports = router;
