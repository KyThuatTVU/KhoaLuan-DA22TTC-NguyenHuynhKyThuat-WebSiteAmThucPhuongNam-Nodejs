const express = require('express');
const router = express.Router();
const db = require('../config/database');
const OpenAI = require('openai');

// Khá»Ÿi táº¡o Groq client (tÆ°Æ¡ng thÃ­ch OpenAI SDK)
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

// Tá»± Ä‘á»™ng táº¡o cÃ¡c báº£ng má»¥c tiÃªu náº¿u chÆ°a tá»“n táº¡i
async function initTables() {
    try {
        // Báº£ng má»¥c tiÃªu thÃ¡ng (cÅ©)
        await db.query(`
            CREATE TABLE IF NOT EXISTS muc_tieu_thang (
                id INT NOT NULL AUTO_INCREMENT,
                thang INT NOT NULL,
                nam INT NOT NULL,
                muc_tieu_doanh_thu DECIMAL(15,2) NOT NULL DEFAULT 0,
                muc_tieu_don_hang INT NOT NULL DEFAULT 0,
                muc_tieu_khach_hang INT DEFAULT 0,
                muc_tieu_dat_ban INT DEFAULT 0,
                ghi_chu TEXT,
                ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY thang_nam (thang, nam)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Báº£ng má»¥c tiÃªu chi tiáº¿t (5 má»¥c tiÃªu)
        await db.query(`
            CREATE TABLE IF NOT EXISTS muc_tieu_chi_tiet (
                id INT NOT NULL AUTO_INCREMENT,
                thang INT NOT NULL,
                nam INT NOT NULL,
                loai_muc_tieu ENUM('doanh_thu', 'don_hang', 'khach_hang_moi', 'dat_ban', 'danh_gia') NOT NULL,
                ten_muc_tieu VARCHAR(255) NOT NULL,
                mo_ta TEXT,
                gia_tri_muc_tieu DECIMAL(15,2) NOT NULL DEFAULT 0,
                don_vi VARCHAR(50) DEFAULT 'Ä‘Æ¡n vá»‹',
                icon VARCHAR(50) DEFAULT 'ðŸŽ¯',
                thu_tu INT DEFAULT 1,
                ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY thang_nam_loai (thang, nam, loai_muc_tieu)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('âœ… CÃ¡c báº£ng má»¥c tiÃªu Ä‘Ã£ sáºµn sÃ ng');
    } catch (error) {
        console.error('âŒ Lá»—i táº¡o báº£ng:', error.message);
    }
}

// Gá»i hÃ m khá»Ÿi táº¡o khi module Ä‘Æ°á»£c load
initTables();

// Middleware kiá»ƒm tra admin
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// Láº¥y dá»¯ liá»‡u thá»‘ng kÃª tá»•ng há»£p cho AI phÃ¢n tÃ­ch
async function getBusinessStats() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // ThÃ¡ng trÆ°á»›c
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = currentYear - 1;
    }

    try {
        // Doanh thu thÃ¡ng nÃ y
        const [revenueThisMonth] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [currentMonth, currentYear]);

        // Doanh thu thÃ¡ng trÆ°á»›c
        const [revenueLastMonth] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [prevMonth, prevYear]);

        // Sá»‘ Ä‘Æ¡n hÃ ng thÃ¡ng nÃ y
        const [ordersThisMonth] = await db.query(`
            SELECT COUNT(*) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        `, [currentMonth, currentYear]);

        // Sá»‘ Ä‘Æ¡n hÃ ng thÃ¡ng trÆ°á»›c
        const [ordersLastMonth] = await db.query(`
            SELECT COUNT(*) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        `, [prevMonth, prevYear]);

        // KhÃ¡ch hÃ ng má»›i thÃ¡ng nÃ y
        const [customersThisMonth] = await db.query(`
            SELECT COUNT(*) as total FROM nguoi_dung 
            WHERE MONTH(ngay_tao) = ? AND YEAR(ngay_tao) = ?
        `, [currentMonth, currentYear]);

        // Äáº·t bÃ n thÃ¡ng nÃ y
        const [reservationsThisMonth] = await db.query(`
            SELECT COUNT(*) as total FROM dat_ban 
            WHERE MONTH(ngay_dat) = ? AND YEAR(ngay_dat) = ?
        `, [currentMonth, currentYear]);

        // Top 5 mÃ³n bÃ¡n cháº¡y thÃ¡ng nÃ y
        const [topProducts] = await db.query(`
            SELECT m.ten_mon, SUM(ct.so_luong) as so_luong_ban
            FROM chi_tiet_don_hang ct
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
            WHERE MONTH(dh.thoi_gian_tao) = ? AND YEAR(dh.thoi_gian_tao) = ? AND dh.trang_thai = 'delivered'
            GROUP BY m.ma_mon, m.ten_mon
            ORDER BY so_luong_ban DESC
            LIMIT 5
        `, [currentMonth, currentYear]);

        // MÃ³n Ã­t bÃ¡n nháº¥t
        const [lowProducts] = await db.query(`
            SELECT m.ten_mon, COALESCE(SUM(ct.so_luong), 0) as so_luong_ban
            FROM mon_an m
            LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
            LEFT JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang 
                AND MONTH(dh.thoi_gian_tao) = ? AND YEAR(dh.thoi_gian_tao) = ? AND dh.trang_thai = 'delivered'
            WHERE m.trang_thai = 1
            GROUP BY m.ma_mon, m.ten_mon
            ORDER BY so_luong_ban ASC
            LIMIT 5
        `, [currentMonth, currentYear]);

        // ÄÃ¡nh giÃ¡ trung bÃ¬nh
        const [avgRating] = await db.query(`
            SELECT AVG(so_sao) as avg_rating, COUNT(*) as total_reviews FROM danh_gia_san_pham
            WHERE trang_thai = 'approved'
        `);

        // ÄÆ¡n hÃ ng theo tráº¡ng thÃ¡i
        const [ordersByStatus] = await db.query(`
            SELECT trang_thai, COUNT(*) as count FROM don_hang
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
            GROUP BY trang_thai
        `, [currentMonth, currentYear]);

        // Giá» cao Ä‘iá»ƒm Ä‘áº·t bÃ n
        const [peakHours] = await db.query(`
            SELECT HOUR(gio_den) as hour, COUNT(*) as count FROM dat_ban
            WHERE MONTH(ngay_dat) = ? AND YEAR(ngay_dat) = ?
            GROUP BY HOUR(gio_den)
            ORDER BY count DESC
            LIMIT 3
        `, [currentMonth, currentYear]);

        // Láº¥y má»¥c tiÃªu thÃ¡ng hiá»‡n táº¡i (xá»­ lÃ½ trÆ°á»ng há»£p báº£ng chÆ°a tá»“n táº¡i)
        let targetData = [null];
        try {
            const [target] = await db.query(`
                SELECT * FROM muc_tieu_thang 
                WHERE thang = ? AND nam = ?
            `, [currentMonth, currentYear]);
            targetData = target;
        } catch (err) {
            console.log('Báº£ng muc_tieu_thang chÆ°a tá»“n táº¡i, bá» qua...');
            targetData = [];
        }
        
        // Láº¥y 5 má»¥c tiÃªu chi tiáº¿t
        let goalsData = [];
        try {
            const [goals] = await db.query(`
                SELECT * FROM muc_tieu_chi_tiet 
                WHERE thang = ? AND nam = ?
                ORDER BY thu_tu ASC
            `, [currentMonth, currentYear]);
            
            // TÃ­nh tiáº¿n Ä‘á»™ cho tá»«ng má»¥c tiÃªu
            const actualData = {
                doanh_thu: revenueThisMonth[0].total,
                don_hang: ordersThisMonth[0].total,
                khach_hang_moi: customersThisMonth[0].total,
                dat_ban: reservationsThisMonth[0].total,
                danh_gia: avgRating[0].total_reviews || 0
            };
            
            goalsData = goals.map(goal => {
                const actual = actualData[goal.loai_muc_tieu] || 0;
                const target = parseFloat(goal.gia_tri_muc_tieu) || 1;
                const progress = Math.min(100, Math.round((actual / target) * 100));
                
                return {
                    ...goal,
                    gia_tri_muc_tieu: Math.round(target), // LÃ m trÃ²n sá»‘
                    gia_tri_hien_tai: Math.round(actual), // LÃ m trÃ²n sá»‘
                    tien_do: progress
                };
            });
        } catch (err) {
            console.log('Báº£ng muc_tieu_chi_tiet chÆ°a tá»“n táº¡i, bá» qua...');
            goalsData = [];
        }

        return {
            currentMonth,
            currentYear,
            revenue: {
                thisMonth: revenueThisMonth[0].total,
                lastMonth: revenueLastMonth[0].total,
                change: revenueLastMonth[0].total > 0 
                    ? ((revenueThisMonth[0].total - revenueLastMonth[0].total) / revenueLastMonth[0].total * 100).toFixed(1)
                    : 0
            },
            orders: {
                thisMonth: ordersThisMonth[0].total,
                lastMonth: ordersLastMonth[0].total
            },
            customers: {
                newThisMonth: customersThisMonth[0].total
            },
            reservations: {
                thisMonth: reservationsThisMonth[0].total
            },
            topProducts,
            lowProducts,
            avgRating: avgRating[0].avg_rating || 0,
            totalReviews: avgRating[0].total_reviews || 0,
            ordersByStatus,
            peakHours,
            target: (targetData && targetData[0]) || null,
            goals: goalsData
        };
    } catch (error) {
        console.error('Error getting business stats:', error);
        return null;
    }
}

// PhÃ¢n tÃ­ch vÃ  táº¡o pháº£n há»“i AI
function generateAIResponse(query, stats) {
    const queryLower = query.toLowerCase();
    
    // Format sá»‘ tiá»n
    const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + 'Ä‘';
    
    // PhÃ¢n tÃ­ch cÃ¢u há»i vÃ  táº¡o pháº£n há»“i
    
    // BÃ¡o cÃ¡o tá»•ng quan
    if (queryLower.includes('bÃ¡o cÃ¡o') || queryLower.includes('tá»•ng quan') || queryLower.includes('tÃ¬nh hÃ¬nh')) {
        const revenueChange = parseFloat(stats.revenue.change);
        const trend = revenueChange >= 0 ? 'ðŸ“ˆ tÄƒng' : 'ðŸ“‰ giáº£m';
        
        return {
            type: 'report',
            message: `ðŸ“Š **BÃO CÃO THÃNG ${stats.currentMonth}/${stats.currentYear}**\n\n` +
                `ðŸ’° **Doanh thu:** ${formatMoney(stats.revenue.thisMonth)}\n` +
                `   â†’ ${trend} ${Math.abs(revenueChange)}% so vá»›i thÃ¡ng trÆ°á»›c\n\n` +
                `ðŸ“¦ **ÄÆ¡n hÃ ng:** ${stats.orders.thisMonth} Ä‘Æ¡n\n` +
                `ðŸ‘¥ **KhÃ¡ch hÃ ng má»›i:** ${stats.customers.newThisMonth} ngÆ°á»i\n` +
                `ðŸ½ï¸ **Äáº·t bÃ n:** ${stats.reservations.thisMonth} lÆ°á»£t\n` +
                `â­ **ÄÃ¡nh giÃ¡ TB:** ${parseFloat(stats.avgRating).toFixed(1)}/5 (${stats.totalReviews} Ä‘Ã¡nh giÃ¡)\n\n` +
                `ðŸ† **Top mÃ³n bÃ¡n cháº¡y:**\n` +
                stats.topProducts.map((p, i) => `   ${i+1}. ${p.ten_mon} (${p.so_luong_ban} pháº§n)`).join('\n'),
            suggestions: ['Äá» xuáº¥t chiáº¿n lÆ°á»£c', 'PhÃ¢n tÃ­ch chi tiáº¿t', 'Äáº·t má»¥c tiÃªu thÃ¡ng']
        };
    }
    
    // Doanh thu
    if (queryLower.includes('doanh thu')) {
        const revenueChange = parseFloat(stats.revenue.change);
        let analysis = '';
        
        if (revenueChange > 20) {
            analysis = 'ðŸŽ‰ Doanh thu tÄƒng trÆ°á»Ÿng xuáº¥t sáº¯c! HÃ£y duy trÃ¬ chiáº¿n lÆ°á»£c hiá»‡n táº¡i.';
        } else if (revenueChange > 0) {
            analysis = 'ðŸ‘ Doanh thu tÄƒng nháº¹. CÃ³ thá»ƒ Ä‘áº©y máº¡nh marketing Ä‘á»ƒ tÄƒng tá»‘c.';
        } else if (revenueChange > -10) {
            analysis = 'âš ï¸ Doanh thu giáº£m nháº¹. Cáº§n xem xÃ©t cÃ¡c chÆ°Æ¡ng trÃ¬nh khuyáº¿n mÃ£i.';
        } else {
            analysis = 'ðŸš¨ Doanh thu giáº£m Ä‘Ã¡ng ká»ƒ. Cáº§n cÃ³ chiáº¿n lÆ°á»£c cáº£i thiá»‡n ngay!';
        }
        
        return {
            type: 'revenue',
            message: `ðŸ’° **PHÃ‚N TÃCH DOANH THU**\n\n` +
                `ThÃ¡ng nÃ y: ${formatMoney(stats.revenue.thisMonth)}\n` +
                `ThÃ¡ng trÆ°á»›c: ${formatMoney(stats.revenue.lastMonth)}\n` +
                `Thay Ä‘á»•i: ${revenueChange >= 0 ? '+' : ''}${revenueChange}%\n\n` +
                `ðŸ“ **Nháº­n xÃ©t:** ${analysis}`,
            suggestions: ['Äá» xuáº¥t tÄƒng doanh thu', 'Xem mÃ³n bÃ¡n cháº¡y', 'Äáº·t má»¥c tiÃªu']
        };
    }
    
    // Chiáº¿n lÆ°á»£c / Äá» xuáº¥t
    if (queryLower.includes('chiáº¿n lÆ°á»£c') || queryLower.includes('Ä‘á» xuáº¥t') || queryLower.includes('tÄƒng doanh thu')) {
        const strategies = [];
        
        // PhÃ¢n tÃ­ch vÃ  Ä‘á» xuáº¥t dá»±a trÃªn dá»¯ liá»‡u
        if (stats.lowProducts && stats.lowProducts.length > 0) {
            const lowSelling = stats.lowProducts.filter(p => p.so_luong_ban < 5);
            if (lowSelling.length > 0) {
                strategies.push(`ðŸ½ï¸ **Khuyáº¿n mÃ£i mÃ³n Ã­t bÃ¡n:** ${lowSelling.map(p => p.ten_mon).join(', ')} - Giáº£m giÃ¡ 20-30% hoáº·c combo vá»›i mÃ³n bÃ¡n cháº¡y`);
            }
        }
        
        if (stats.peakHours && stats.peakHours.length > 0) {
            const peakHour = stats.peakHours[0].hour;
            strategies.push(`â° **Tá»‘i Æ°u giá» cao Ä‘iá»ƒm:** Khung giá» ${peakHour}h-${peakHour+2}h cÃ³ nhiá»u khÃ¡ch nháº¥t. TÄƒng nhÃ¢n viÃªn vÃ  chuáº©n bá»‹ nguyÃªn liá»‡u.`);
        }
        
        if (stats.customers.newThisMonth < 10) {
            strategies.push(`ðŸ‘¥ **Thu hÃºt khÃ¡ch má»›i:** Cháº¡y chÆ°Æ¡ng trÃ¬nh "Giá»›i thiá»‡u báº¡n bÃ¨" - Táº·ng voucher 50k cho cáº£ ngÆ°á»i giá»›i thiá»‡u vÃ  ngÆ°á»i má»›i.`);
        }
        
        if (stats.avgRating < 4) {
            strategies.push(`â­ **Cáº£i thiá»‡n Ä‘Ã¡nh giÃ¡:** ÄÃ¡nh giÃ¡ TB ${parseFloat(stats.avgRating).toFixed(1)}/5 cáº§n cáº£i thiá»‡n. Táº­p trung cháº¥t lÆ°á»£ng mÃ³n Äƒn vÃ  dá»‹ch vá»¥.`);
        }
        
        strategies.push(`ðŸ“± **Marketing online:** ÄÄƒng bÃ i thÆ°á»ng xuyÃªn trÃªn Facebook/TikTok vá»›i hÃ¬nh áº£nh mÃ³n Äƒn háº¥p dáº«n.`);
        strategies.push(`ðŸŽ **ChÆ°Æ¡ng trÃ¬nh thÃ nh viÃªn:** TÃ­ch Ä‘iá»ƒm Ä‘á»•i quÃ , giáº£m giÃ¡ cho khÃ¡ch quen.`);
        
        return {
            type: 'strategy',
            message: `ðŸŽ¯ **Äá»€ XUáº¤T CHIáº¾N LÆ¯á»¢C THÃNG ${stats.currentMonth}**\n\n` +
                strategies.join('\n\n'),
            suggestions: ['Äáº·t má»¥c tiÃªu cá»¥ thá»ƒ', 'Xem bÃ¡o cÃ¡o chi tiáº¿t', 'PhÃ¢n tÃ­ch Ä‘á»‘i thá»§']
        };
    }
    
    // Má»¥c tiÃªu - hiá»ƒn thá»‹ 5 má»¥c tiÃªu chi tiáº¿t
    if (queryLower.includes('má»¥c tiÃªu') || queryLower.includes('target') || queryLower.includes('kpi') || queryLower.includes('tiáº¿n Ä‘á»™')) {
        // Náº¿u cÃ³ goals chi tiáº¿t
        if (stats.goals && stats.goals.length > 0) {
            const goalsText = stats.goals.map(g => {
                const statusIcon = g.tien_do >= 100 ? 'âœ…' : g.tien_do >= 70 ? 'ðŸ”¥' : g.tien_do >= 40 ? 'âš¡' : 'ðŸŽ¯';
                const valueText = g.loai_muc_tieu === 'doanh_thu' 
                    ? `${formatMoney(g.gia_tri_hien_tai)} / ${formatMoney(g.gia_tri_muc_tieu)}`
                    : `${g.gia_tri_hien_tai} / ${g.gia_tri_muc_tieu} ${g.don_vi}`;
                return `${g.icon} **${g.ten_muc_tieu}:** ${valueText} (${statusIcon} ${g.tien_do}%)`;
            }).join('\n');
            
            const totalProgress = Math.round(stats.goals.reduce((sum, g) => sum + g.tien_do, 0) / stats.goals.length);
            const completedCount = stats.goals.filter(g => g.tien_do >= 100).length;
            
            return {
                type: 'goals',
                message: `ðŸŽ¯ **5 Má»¤C TIÃŠU THÃNG ${stats.currentMonth}/${stats.currentYear}**\n\n` +
                    goalsText + `\n\n` +
                    `ðŸ“Š **Tá»•ng tiáº¿n Ä‘á»™:** ${totalProgress}%\n` +
                    `âœ… **HoÃ n thÃ nh:** ${completedCount}/5 má»¥c tiÃªu\n\n` +
                    `ðŸ’¡ *Má»¥c tiÃªu Ä‘Ã£ Ä‘Æ°á»£c táº¡o cho thÃ¡ng nÃ y. HÃ£y há»i "Ä‘á» xuáº¥t chiáº¿n lÆ°á»£c" Ä‘á»ƒ cáº£i thiá»‡n!*`,
                suggestions: ['Äá» xuáº¥t chiáº¿n lÆ°á»£c', 'Xem bÃ¡o cÃ¡o', 'MÃ³n bÃ¡n cháº¡y']
            };
        }
        
        // Náº¿u chÆ°a cÃ³ goals, Ä‘á» xuáº¥t táº¡o má»›i
        return {
            type: 'no_goals',
            message: `ðŸŽ¯ **CHÆ¯A CÃ“ Má»¤C TIÃŠU THÃNG ${stats.currentMonth}**\n\n` +
                `Báº¡n chÆ°a Ä‘áº·t má»¥c tiÃªu cho thÃ¡ng nÃ y.\n\n` +
                `TÃ´i cÃ³ thá»ƒ tá»± Ä‘á»™ng táº¡o 5 má»¥c tiÃªu dá»±a trÃªn dá»¯ liá»‡u thÃ¡ng trÆ°á»›c:\n` +
                `ðŸ’° Doanh thu (tÄƒng 15%)\n` +
                `ðŸ“¦ Sá»‘ Ä‘Æ¡n hÃ ng (tÄƒng 20%)\n` +
                `ðŸ‘¥ KhÃ¡ch hÃ ng má»›i (tÄƒng 25%)\n` +
                `ðŸ½ï¸ LÆ°á»£t Ä‘áº·t bÃ n (tÄƒng 15%)\n` +
                `â­ ÄÃ¡nh giÃ¡ tÃ­ch cá»±c (tÄƒng 30%)\n\n` +
                `Nháº¥n nÃºt "AI Táº¡o má»¥c tiÃªu" trÃªn dashboard hoáº·c nÃ³i "táº¡o má»¥c tiÃªu" Ä‘á»ƒ báº¯t Ä‘áº§u!`,
            suggestions: ['Táº¡o má»¥c tiÃªu', 'Xem bÃ¡o cÃ¡o', 'Äá» xuáº¥t chiáº¿n lÆ°á»£c'],
            action: 'generate_goals'
        };
    }
    
    // Táº¡o má»¥c tiÃªu - kiá»ƒm tra xem Ä‘Ã£ cÃ³ chÆ°a
    if (queryLower.includes('táº¡o má»¥c tiÃªu') || queryLower.includes('Ä‘áº·t má»¥c tiÃªu')) {
        // Náº¿u Ä‘Ã£ cÃ³ má»¥c tiÃªu, khÃ´ng cho táº¡o má»›i
        if (stats.goals && stats.goals.length > 0) {
            return {
                type: 'info',
                message: `âš ï¸ **Má»¤C TIÃŠU ÄÃƒ ÄÆ¯á»¢C Táº O**\n\n` +
                    `ThÃ¡ng ${stats.currentMonth}/${stats.currentYear} Ä‘Ã£ cÃ³ 5 má»¥c tiÃªu.\n` +
                    `Má»—i thÃ¡ng chá»‰ Ä‘Æ°á»£c táº¡o má»¥c tiÃªu 1 láº§n Ä‘á»ƒ Ä‘áº£m báº£o tÃ­nh nháº¥t quÃ¡n.\n\n` +
                    `Báº¡n cÃ³ thá»ƒ:\n` +
                    `â€¢ Xem tiáº¿n Ä‘á»™ hiá»‡n táº¡i\n` +
                    `â€¢ Nhá» AI Ä‘á» xuáº¥t chiáº¿n lÆ°á»£c cáº£i thiá»‡n\n` +
                    `â€¢ Chá» sang thÃ¡ng má»›i Ä‘á»ƒ táº¡o má»¥c tiÃªu má»›i`,
                suggestions: ['Xem tiáº¿n Ä‘á»™ má»¥c tiÃªu', 'Äá» xuáº¥t chiáº¿n lÆ°á»£c', 'BÃ¡o cÃ¡o thÃ¡ng nÃ y']
            };
        }
        
        return {
            type: 'action',
            message: `ðŸŽ¯ **Táº O Má»¤C TIÃŠU Tá»° Äá»˜NG**\n\n` +
                `TÃ´i sáº½ phÃ¢n tÃ­ch dá»¯ liá»‡u thÃ¡ng trÆ°á»›c vÃ  táº¡o 5 má»¥c tiÃªu phÃ¹ há»£p cho thÃ¡ng ${stats.currentMonth}.\n\n` +
                `âš ï¸ **LÆ°u Ã½:** Má»—i thÃ¡ng chá»‰ Ä‘Æ°á»£c táº¡o má»¥c tiÃªu 1 láº§n!\n\n` +
                `Nháº¥n nÃºt bÃªn dÆ°á»›i Ä‘á»ƒ báº¯t Ä‘áº§u:`,
            suggestions: ['Xem bÃ¡o cÃ¡o', 'Äá» xuáº¥t chiáº¿n lÆ°á»£c'],
            action: 'generate_goals',
            showGenerateButton: true
        };
    }
    
    // Äá» xuáº¥t chiáº¿n lÆ°á»£c dá»±a trÃªn tÃ¬nh hÃ¬nh thá»±c táº¿
    if (queryLower.includes('chiáº¿n lÆ°á»£c') || queryLower.includes('Ä‘á» xuáº¥t') || queryLower.includes('cáº£i thiá»‡n') || queryLower.includes('strategy')) {
        const strategies = [];
        
        if (stats.goals && stats.goals.length > 0) {
            // PhÃ¢n tÃ­ch tá»«ng má»¥c tiÃªu vÃ  Ä‘á» xuáº¥t
            const lowGoals = stats.goals.filter(g => g.tien_do < 50);
            const mediumGoals = stats.goals.filter(g => g.tien_do >= 50 && g.tien_do < 80);
            const highGoals = stats.goals.filter(g => g.tien_do >= 80);
            
            strategies.push(`ðŸ“Š **PHÃ‚N TÃCH TÃŒNH HÃŒNH THÃNG ${stats.currentMonth}**`);
            
            if (lowGoals.length > 0) {
                strategies.push(`\nðŸ”´ **Cáº§n cáº£i thiá»‡n gáº¥p (< 50%):**`);
                lowGoals.forEach(g => {
                    strategies.push(`â€¢ ${g.icon} ${g.ten_muc_tieu}: ${g.tien_do}%`);
                    // Äá» xuáº¥t cá»¥ thá»ƒ cho tá»«ng loáº¡i
                    if (g.loai_muc_tieu === 'doanh_thu') {
                        strategies.push(`  â†’ TÄƒng cÆ°á»ng khuyáº¿n mÃ£i, combo tiáº¿t kiá»‡m`);
                        strategies.push(`  â†’ Äáº©y máº¡nh marketing trÃªn máº¡ng xÃ£ há»™i`);
                    } else if (g.loai_muc_tieu === 'don_hang') {
                        strategies.push(`  â†’ Giáº£m giÃ¡ ship, miá»…n phÃ­ ship Ä‘Æ¡n tá»« 200k`);
                        strategies.push(`  â†’ Táº¡o flash sale vÃ o giá» cao Ä‘iá»ƒm`);
                    } else if (g.loai_muc_tieu === 'khach_hang_moi') {
                        strategies.push(`  â†’ ChÆ°Æ¡ng trÃ¬nh giá»›i thiá»‡u báº¡n bÃ¨`);
                        strategies.push(`  â†’ Æ¯u Ä‘Ã£i khÃ¡ch hÃ ng má»›i láº§n Ä‘áº§u`);
                    } else if (g.loai_muc_tieu === 'dat_ban') {
                        strategies.push(`  â†’ Æ¯u Ä‘Ã£i Ä‘áº·t bÃ n trÆ°á»›c 2 ngÃ y`);
                        strategies.push(`  â†’ Combo Ä‘áº·t bÃ n + mÃ³n Ä‘áº·c biá»‡t`);
                    } else if (g.loai_muc_tieu === 'danh_gia') {
                        strategies.push(`  â†’ Táº·ng voucher cho khÃ¡ch Ä‘Ã¡nh giÃ¡`);
                        strategies.push(`  â†’ Nháº¯c nhá»Ÿ khÃ¡ch sau khi hoÃ n thÃ nh Ä‘Æ¡n`);
                    }
                });
            }
            
            if (mediumGoals.length > 0) {
                strategies.push(`\nðŸŸ¡ **Äang tiáº¿n triá»ƒn (50-80%):**`);
                mediumGoals.forEach(g => {
                    strategies.push(`â€¢ ${g.icon} ${g.ten_muc_tieu}: ${g.tien_do}% - Tiáº¿p tá»¥c duy trÃ¬!`);
                });
            }
            
            if (highGoals.length > 0) {
                strategies.push(`\nðŸŸ¢ **Sáº¯p hoÃ n thÃ nh (> 80%):**`);
                highGoals.forEach(g => {
                    strategies.push(`â€¢ ${g.icon} ${g.ten_muc_tieu}: ${g.tien_do}% - Tuyá»‡t vá»i! ðŸŽ‰`);
                });
            }
            
            // Äá» xuáº¥t tá»•ng há»£p
            const totalProgress = Math.round(stats.goals.reduce((sum, g) => sum + g.tien_do, 0) / stats.goals.length);
            strategies.push(`\nðŸ’¡ **Tá»”NG Káº¾T:**`);
            strategies.push(`Tiáº¿n Ä‘á»™ tá»•ng: ${totalProgress}%`);
            
            if (totalProgress < 50) {
                strategies.push(`\nâš¡ **HÃ nh Ä‘á»™ng ngay:**`);
                strategies.push(`1. Táº­p trung vÃ o ${lowGoals.length} má»¥c tiÃªu Ä‘ang tháº¥p`);
                strategies.push(`2. Cháº¡y chÆ°Æ¡ng trÃ¬nh khuyáº¿n mÃ£i cuá»‘i thÃ¡ng`);
                strategies.push(`3. TÄƒng cÆ°á»ng quáº£ng cÃ¡o trÃªn Facebook/Zalo`);
            } else if (totalProgress < 80) {
                strategies.push(`\nðŸ“ˆ **Äá» xuáº¥t:**`);
                strategies.push(`1. Duy trÃ¬ Ä‘Ã  tÄƒng trÆ°á»Ÿng hiá»‡n táº¡i`);
                strategies.push(`2. Táº­p trung cáº£i thiá»‡n cÃ¡c má»¥c tiÃªu dÆ°á»›i 70%`);
            } else {
                strategies.push(`\nðŸŽ¯ **Xuáº¥t sáº¯c!** Tiáº¿p tá»¥c phÃ¡t huy!`);
            }
        } else {
            strategies.push(`ðŸ“Š **CHÆ¯A CÃ“ Má»¤C TIÃŠU**\n`);
            strategies.push(`HÃ£y táº¡o má»¥c tiÃªu trÆ°á»›c Ä‘á»ƒ AI cÃ³ thá»ƒ Ä‘á» xuáº¥t chiáº¿n lÆ°á»£c phÃ¹ há»£p.`);
        }
        
        return {
            type: 'strategy',
            message: strategies.join('\n'),
            suggestions: ['Xem tiáº¿n Ä‘á»™ má»¥c tiÃªu', 'BÃ¡o cÃ¡o doanh thu', 'MÃ³n bÃ¡n cháº¡y']
        };
    }
    
    // MÃ³n bÃ¡n cháº¡y
    if (queryLower.includes('mÃ³n bÃ¡n cháº¡y') || queryLower.includes('top') || queryLower.includes('best seller')) {
        return {
            type: 'products',
            message: `ðŸ† **TOP MÃ“N BÃN CHáº Y THÃNG ${stats.currentMonth}**\n\n` +
                stats.topProducts.map((p, i) => {
                    const medal = i === 0 ? 'ðŸ¥‡' : i === 1 ? 'ðŸ¥ˆ' : i === 2 ? 'ðŸ¥‰' : `${i+1}.`;
                    return `${medal} ${p.ten_mon}: ${p.so_luong_ban} pháº§n`;
                }).join('\n') +
                `\n\nðŸ“‰ **MÃ³n cáº§n Ä‘áº©y máº¡nh:**\n` +
                stats.lowProducts.slice(0, 3).map(p => `   â€¢ ${p.ten_mon} (${p.so_luong_ban} pháº§n)`).join('\n'),
            suggestions: ['Äá» xuáº¥t khuyáº¿n mÃ£i', 'Xem doanh thu', 'Chiáº¿n lÆ°á»£c marketing']
        };
    }
    
    // Máº·c Ä‘á»‹nh - hÆ°á»›ng dáº«n
    return {
        type: 'help',
        message: `ðŸ‘‹ **Xin chÃ o! TÃ´i lÃ  trá»£ lÃ½ AI cá»§a báº¡n.**\n\n` +
            `TÃ´i cÃ³ thá»ƒ giÃºp báº¡n:\n` +
            `ðŸ“Š Xem bÃ¡o cÃ¡o tá»•ng quan\n` +
            `ðŸ’° PhÃ¢n tÃ­ch doanh thu\n` +
            `ðŸŽ¯ Äáº·t vÃ  theo dÃµi má»¥c tiÃªu\n` +
            `ðŸ“ˆ Äá» xuáº¥t chiáº¿n lÆ°á»£c kinh doanh\n` +
            `ðŸ½ï¸ PhÃ¢n tÃ­ch mÃ³n Äƒn bÃ¡n cháº¡y\n\n` +
            `HÃ£y há»i tÃ´i báº¥t cá»© Ä‘iá»u gÃ¬!`,
        suggestions: ['BÃ¡o cÃ¡o thÃ¡ng nÃ y', 'Äá» xuáº¥t chiáº¿n lÆ°á»£c', 'Äáº·t má»¥c tiÃªu', 'MÃ³n bÃ¡n cháº¡y']
    };
}

// API: Chat vá»›i AI (Groq - Llama 3)
router.post('/chat', requireAdmin, async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ success: false, message: 'Thiáº¿u ná»™i dung tin nháº¯n' });
        }
        
        // Láº¥y dá»¯ liá»‡u thá»‘ng kÃª
        const stats = await getBusinessStats();
        
        if (!stats) {
            return res.status(500).json({ success: false, message: 'KhÃ´ng thá»ƒ láº¥y dá»¯ liá»‡u thá»‘ng kÃª' });
        }
        
        // Táº¡o context tá»« dá»¯ liá»‡u thá»‘ng kÃª
        const revenueThisMonth = stats.revenue?.thisMonth || 0;
        const revenueLastMonth = stats.revenue?.lastMonth || 0;
        const revenueGrowth = stats.revenue?.change || 0;
        const ordersThisMonth = stats.orders?.thisMonth || 0;
        const ordersLastMonth = stats.orders?.lastMonth || 0;
        const ordersGrowth = ordersLastMonth > 0 ? Math.round(((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100) : 0;
        const newCustomers = stats.customers?.newThisMonth || 0;
        const reservationsThisMonth = stats.reservations?.thisMonth || 0;
        
        const businessContext = `
Dá»¯ liá»‡u kinh doanh nhÃ  hÃ ng "áº¨m Thá»±c PhÆ°Æ¡ng Nam" (ThÃ¡ng ${stats.currentMonth}/${stats.currentYear}):

ðŸ“Š DOANH THU:
- ThÃ¡ng nÃ y: ${new Intl.NumberFormat('vi-VN').format(revenueThisMonth)}Ä‘
- ThÃ¡ng trÆ°á»›c: ${new Intl.NumberFormat('vi-VN').format(revenueLastMonth)}Ä‘
- TÄƒng trÆ°á»Ÿng: ${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%

ðŸ“¦ ÄÆ N HÃ€NG:
- ThÃ¡ng nÃ y: ${ordersThisMonth} Ä‘Æ¡n
- ThÃ¡ng trÆ°á»›c: ${ordersLastMonth} Ä‘Æ¡n
- TÄƒng trÆ°á»Ÿng: ${ordersGrowth > 0 ? '+' : ''}${ordersGrowth}%

ðŸ‘¥ KHÃCH HÃ€NG:
- Má»›i thÃ¡ng nÃ y: ${newCustomers} ngÆ°á»i

ðŸ½ï¸ Äáº¶T BÃ€N:
- ThÃ¡ng nÃ y: ${reservationsThisMonth} lÆ°á»£t

â­ ÄÃNH GIÃ:
- Trung bÃ¬nh: ${stats.avgRating || 0}/5 sao
- Tá»•ng Ä‘Ã¡nh giÃ¡: ${stats.totalReviews || 0}

ðŸ† TOP MÃ“N BÃN CHáº Y:
${stats.topProducts && stats.topProducts.length > 0 ? stats.topProducts.map((p, i) => `${i+1}. ${p.ten_mon} - ${p.so_luong_ban} lÆ°á»£t`).join('\n') : 'ChÆ°a cÃ³ dá»¯ liá»‡u'}

ðŸ“ˆ Má»¤C TIÃŠU THÃNG:
${stats.goals && stats.goals.length > 0 ? stats.goals.map(g => `- ${g.ten_muc_tieu}: ${g.tien_do}% (${g.gia_tri_hien_tai}/${g.gia_tri_muc_tieu})`).join('\n') : 'ChÆ°a Ä‘áº·t má»¥c tiÃªu'}
`;

        // Gá»i Groq AI
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `Báº¡n lÃ  "PhÆ°Æ¡ng Nam" - trá»£ lÃ½ AI thÃ´ng minh cá»§a nhÃ  hÃ ng "áº¨m Thá»±c PhÆ°Æ¡ng Nam".
Chá»§ nhÃ  hÃ ng lÃ  chá»‹ Linh. HÃ£y xÆ°ng hÃ´ thÃ¢n thiá»‡n: "chá»‹ Linh", "em" (em lÃ  PhÆ°Æ¡ng Nam).

Nhiá»‡m vá»¥ cá»§a báº¡n:
- PhÃ¢n tÃ­ch dá»¯ liá»‡u kinh doanh vÃ  Ä‘Æ°a ra nháº­n xÃ©t
- Äá» xuáº¥t chiáº¿n lÆ°á»£c cáº£i thiá»‡n doanh thu, thu hÃºt khÃ¡ch hÃ ng
- Tráº£ lá»i cÃ¢u há»i vá» tÃ¬nh hÃ¬nh kinh doanh
- ÄÆ°a ra lá»i khuyÃªn thá»±c táº¿, cá»¥ thá»ƒ

Quy táº¯c:
- Tráº£ lá»i báº±ng tiáº¿ng Viá»‡t
- XÆ°ng "em", gá»i chá»§ lÃ  "chá»‹ Linh"
- Ngáº¯n gá»n, sÃºc tÃ­ch, dá»… hiá»ƒu, thÃ¢n thiá»‡n
- Sá»­ dá»¥ng emoji phÃ¹ há»£p
- Dá»±a trÃªn dá»¯ liá»‡u thá»±c táº¿ Ä‘Æ°á»£c cung cáº¥p
- Náº¿u khÃ´ng cÃ³ dá»¯ liá»‡u, hÃ£y nÃ³i rÃµ vÃ  Ä‘á» xuáº¥t hÃ nh Ä‘á»™ng

${businessContext}`
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 1024
        });

        const aiResponse = completion.choices[0]?.message?.content || 'Xin lá»—i, tÃ´i khÃ´ng thá»ƒ xá»­ lÃ½ yÃªu cáº§u nÃ y.';
        
        res.json({
            success: true,
            data: {
                type: 'ai_response',
                message: aiResponse,
                suggestions: ['PhÃ¢n tÃ­ch doanh thu', 'Äá» xuáº¥t chiáº¿n lÆ°á»£c', 'Xem má»¥c tiÃªu', 'Top sáº£n pháº©m']
            }
        });
    } catch (error) {
        console.error('Error in admin chatbot:', error);
        
        // Fallback vá» response cÅ© náº¿u Groq lá»—i
        if (error.message?.includes('API') || error.message?.includes('fetch')) {
            const stats = await getBusinessStats();
            const response = generateAIResponse(req.body.message, stats);
            return res.json({ success: true, data: response });
        }
        
        res.status(500).json({ success: false, message: 'Lá»—i xá»­ lÃ½ tin nháº¯n: ' + error.message });
    }
});

// API: Láº¥y má»¥c tiÃªu thÃ¡ng hiá»‡n táº¡i
router.get('/target', requireAdmin, async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        // Xá»­ lÃ½ trÆ°á»ng há»£p báº£ng chÆ°a tá»“n táº¡i
        let target = [];
        try {
            const [result] = await db.query(`
                SELECT * FROM muc_tieu_thang WHERE thang = ? AND nam = ?
            `, [currentMonth, currentYear]);
            target = result;
        } catch (err) {
            console.log('Báº£ng muc_tieu_thang chÆ°a tá»“n táº¡i');
            target = [];
        }
        
        // Láº¥y doanh thu vÃ  Ä‘Æ¡n hÃ ng hiá»‡n táº¡i
        const [revenue] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [currentMonth, currentYear]);
        
        const [orders] = await db.query(`
            SELECT COUNT(*) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        `, [currentMonth, currentYear]);
        
        res.json({
            success: true,
            data: {
                target: target[0] || null,
                current: {
                    revenue: revenue[0].total,
                    orders: orders[0].total
                },
                month: currentMonth,
                year: currentYear
            }
        });
    } catch (error) {
        console.error('Error getting target:', error);
        res.status(500).json({ success: false, message: 'Lá»—i láº¥y má»¥c tiÃªu' });
    }
});

// API: Äáº·t/Cáº­p nháº­t má»¥c tiÃªu thÃ¡ng
router.post('/target', requireAdmin, async (req, res) => {
    try {
        const { muc_tieu_doanh_thu, muc_tieu_don_hang, ghi_chu } = req.body;
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        // Upsert má»¥c tiÃªu
        await db.query(`
            INSERT INTO muc_tieu_thang (thang, nam, muc_tieu_doanh_thu, muc_tieu_don_hang, ghi_chu)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                muc_tieu_doanh_thu = VALUES(muc_tieu_doanh_thu),
                muc_tieu_don_hang = VALUES(muc_tieu_don_hang),
                ghi_chu = VALUES(ghi_chu),
                ngay_cap_nhat = CURRENT_TIMESTAMP
        `, [currentMonth, currentYear, muc_tieu_doanh_thu, muc_tieu_don_hang, ghi_chu || null]);
        
        res.json({
            success: true,
            message: 'ÄÃ£ cáº­p nháº­t má»¥c tiÃªu thÃ¡ng'
        });
    } catch (error) {
        console.error('Error setting target:', error);
        res.status(500).json({ success: false, message: 'Lá»—i Ä‘áº·t má»¥c tiÃªu: ' + error.message });
    }
});

// API: Láº¥y dá»¯ liá»‡u cho biá»ƒu Ä‘á»“ gauge (tá»· lá»‡ hoÃ n thÃ nh)
router.get('/gauge-data', requireAdmin, async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        // Láº¥y má»¥c tiÃªu (xá»­ lÃ½ trÆ°á»ng há»£p báº£ng chÆ°a tá»“n táº¡i)
        let target = [];
        try {
            const [result] = await db.query(`
                SELECT * FROM muc_tieu_thang WHERE thang = ? AND nam = ?
            `, [currentMonth, currentYear]);
            target = result;
        } catch (err) {
            console.log('Báº£ng muc_tieu_thang chÆ°a tá»“n táº¡i');
            target = [];
        }
        
        // Láº¥y doanh thu hiá»‡n táº¡i
        const [revenue] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [currentMonth, currentYear]);
        
        let percentage = 0;
        let targetAmount = 100000000; // Máº·c Ä‘á»‹nh 100 triá»‡u
        
        if (target[0] && target[0].muc_tieu_doanh_thu > 0) {
            targetAmount = target[0].muc_tieu_doanh_thu;
            percentage = Math.min(100, Math.round((revenue[0].total / targetAmount) * 100));
        } else {
            percentage = Math.min(100, Math.round((revenue[0].total / targetAmount) * 100));
        }
        
        res.json({
            success: true,
            data: {
                percentage,
                current: revenue[0].total,
                target: targetAmount,
                hasTarget: !!target[0]
            }
        });
    } catch (error) {
        console.error('Error getting gauge data:', error);
        res.status(500).json({ success: false, message: 'Lá»—i láº¥y dá»¯ liá»‡u' });
    }
});

// API: Láº¥y 5 má»¥c tiÃªu chi tiáº¿t vá»›i tiáº¿n Ä‘á»™ thá»±c táº¿
router.get('/goals', requireAdmin, async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentDate = new Date();
        // Sá»­ dá»¥ng thÃ¡ng/nÄƒm tá»« query hoáº·c máº·c Ä‘á»‹nh lÃ  thÃ¡ng/nÄƒm hiá»‡n táº¡i
        const targetMonth = month ? parseInt(month) : (currentDate.getMonth() + 1);
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();
        
        // Láº¥y má»¥c tiÃªu Ä‘Ã£ lÆ°u
        let goals = [];
        try {
            const [result] = await db.query(`
                SELECT * FROM muc_tieu_chi_tiet 
                WHERE thang = ? AND nam = ?
                ORDER BY thu_tu ASC
            `, [targetMonth, targetYear]);
            goals = result;
        } catch (err) {
            goals = [];
        }
        
        // Láº¥y dá»¯ liá»‡u thá»±c táº¿ tá»« database
        const [revenueData] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [targetMonth, targetYear]);
        
        const [ordersData] = await db.query(`
            SELECT COUNT(*) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        `, [targetMonth, targetYear]);
        
        const [customersData] = await db.query(`
            SELECT COUNT(*) as total FROM nguoi_dung 
            WHERE MONTH(ngay_tao) = ? AND YEAR(ngay_tao) = ?
        `, [targetMonth, targetYear]);
        
        const [reservationsData] = await db.query(`
            SELECT COUNT(*) as total FROM dat_ban 
            WHERE MONTH(ngay_dat) = ? AND YEAR(ngay_dat) = ?
        `, [targetMonth, targetYear]);
        
        const [reviewsData] = await db.query(`
            SELECT COUNT(*) as total FROM danh_gia_san_pham 
            WHERE MONTH(ngay_danh_gia) = ? AND YEAR(ngay_danh_gia) = ? AND trang_thai = 'approved'
        `, [targetMonth, targetYear]);
        
        // Map dá»¯ liá»‡u thá»±c táº¿
        const actualData = {
            doanh_thu: parseFloat(revenueData[0].total) || 0,
            don_hang: parseInt(ordersData[0].total) || 0,
            khach_hang_moi: parseInt(customersData[0].total) || 0,
            dat_ban: parseInt(reservationsData[0].total) || 0,
            danh_gia: parseInt(reviewsData[0].total) || 0
        };
        
        // Náº¿u chÆ°a cÃ³ má»¥c tiÃªu, tráº£ vá» máº£ng rá»—ng vá»›i dá»¯ liá»‡u thá»±c táº¿
        if (goals.length === 0) {
            res.json({
                success: true,
                data: {
                    goals: [],
                    actual: actualData,
                    totalProgress: 0,
                    month: targetMonth,
                    year: targetYear,
                    hasGoals: false
                }
            });
            return;
        }
        
        // TÃ­nh tiáº¿n Ä‘á»™ cho tá»«ng má»¥c tiÃªu
        const goalsWithProgress = goals.map(goal => {
            const actual = actualData[goal.loai_muc_tieu] || 0;
            const target = parseFloat(goal.gia_tri_muc_tieu) || 1;
            const progress = Math.min(100, Math.round((actual / target) * 100));
            
            return {
                ...goal,
                gia_tri_muc_tieu: Math.round(target), // LÃ m trÃ²n sá»‘, bá» .00
                gia_tri_hien_tai: Math.round(actual), // LÃ m trÃ²n sá»‘
                tien_do: progress,
                hoan_thanh: progress >= 100
            };
        });
        
        // TÃ­nh tá»•ng tiáº¿n Ä‘á»™
        const totalProgress = goalsWithProgress.length > 0 
            ? Math.round(goalsWithProgress.reduce((sum, g) => sum + g.tien_do, 0) / goalsWithProgress.length)
            : 0;
        
        res.json({
            success: true,
            data: {
                goals: goalsWithProgress,
                actual: actualData,
                totalProgress,
                month: targetMonth,
                year: targetYear,
                hasGoals: true
            }
        });
    } catch (error) {
        console.error('Error getting goals:', error);
        res.status(500).json({ success: false, message: 'Lá»—i láº¥y má»¥c tiÃªu: ' + error.message });
    }
});

// API: AI tá»± Ä‘á»™ng táº¡o 5 má»¥c tiÃªu dá»±a trÃªn dá»¯ liá»‡u thÃ¡ng trÆ°á»›c
// CHá»ˆ CHO PHÃ‰P Táº O 1 Láº¦N/THÃNG
router.post('/goals/generate', requireAdmin, async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        // Kiá»ƒm tra xem Ä‘Ã£ cÃ³ má»¥c tiÃªu cho thÃ¡ng nÃ y chÆ°a
        const [existingGoals] = await db.query(`
            SELECT COUNT(*) as count FROM muc_tieu_chi_tiet 
            WHERE thang = ? AND nam = ?
        `, [currentMonth, currentYear]);
        
        if (existingGoals[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Má»¥c tiÃªu thÃ¡ng ${currentMonth}/${currentYear} Ä‘Ã£ Ä‘Æ°á»£c táº¡o. Má»—i thÃ¡ng chá»‰ Ä‘Æ°á»£c táº¡o má»¥c tiÃªu 1 láº§n. Báº¡n cÃ³ thá»ƒ xem tiáº¿n Ä‘á»™ hoáº·c nhá» AI Ä‘á» xuáº¥t chiáº¿n lÆ°á»£c cáº£i thiá»‡n.`,
                alreadyExists: true
            });
        }
        
        // ThÃ¡ng trÆ°á»›c
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = currentYear - 1;
        }
        
        // Láº¥y dá»¯ liá»‡u thÃ¡ng trÆ°á»›c
        const [prevRevenue] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [prevMonth, prevYear]);
        
        const [prevOrders] = await db.query(`
            SELECT COUNT(*) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        `, [prevMonth, prevYear]);
        
        const [prevCustomers] = await db.query(`
            SELECT COUNT(*) as total FROM nguoi_dung 
            WHERE MONTH(ngay_tao) = ? AND YEAR(ngay_tao) = ?
        `, [prevMonth, prevYear]);
        
        const [prevReservations] = await db.query(`
            SELECT COUNT(*) as total FROM dat_ban 
            WHERE MONTH(ngay_dat) = ? AND YEAR(ngay_dat) = ?
        `, [prevMonth, prevYear]);
        
        const [prevReviews] = await db.query(`
            SELECT COUNT(*) as total FROM danh_gia_san_pham 
            WHERE MONTH(ngay_danh_gia) = ? AND YEAR(ngay_danh_gia) = ? AND trang_thai = 'approved'
        `, [prevMonth, prevYear]);
        
        // Láº¥y dá»¯ liá»‡u hiá»‡n táº¡i cá»§a thÃ¡ng nÃ y Ä‘á»ƒ phÃ¢n tÃ­ch
        const [currentRevenue] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [currentMonth, currentYear]);
        
        const [currentOrders] = await db.query(`
            SELECT COUNT(*) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        `, [currentMonth, currentYear]);
        
        // TÃ­nh sá»‘ ngÃ y Ä‘Ã£ qua trong thÃ¡ng vÃ  sá»‘ ngÃ y cÃ²n láº¡i
        const dayOfMonth = currentDate.getDate();
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const daysRemaining = daysInMonth - dayOfMonth;
        const progressRatio = dayOfMonth / daysInMonth; // Tá»· lá»‡ thá»i gian Ä‘Ã£ qua
        
        // PhÃ¢n tÃ­ch dá»¯ liá»‡u thÃ¡ng trÆ°á»›c
        const prevRevenueVal = parseFloat(prevRevenue[0].total) || 0;
        const prevOrdersVal = parseInt(prevOrders[0].total) || 0;
        const prevCustomersVal = parseInt(prevCustomers[0].total) || 0;
        const prevReservationsVal = parseInt(prevReservations[0].total) || 0;
        const prevReviewsVal = parseInt(prevReviews[0].total) || 0;
        
        // Dá»¯ liá»‡u hiá»‡n táº¡i
        const currentRevenueVal = parseFloat(currentRevenue[0].total) || 0;
        const currentOrdersVal = parseInt(currentOrders[0].total) || 0;
        
        // AI phÃ¢n tÃ­ch vÃ  Ä‘á» xuáº¥t má»¥c tiÃªu thÃ´ng minh
        // Náº¿u cÃ³ dá»¯ liá»‡u thÃ¡ng trÆ°á»›c -> tÄƒng 10-15%
        // Náº¿u khÃ´ng cÃ³ -> dá»±a trÃªn dá»¯ liá»‡u hiá»‡n táº¡i Æ°á»›c tÃ­nh cáº£ thÃ¡ng
        // Náº¿u cáº£ 2 Ä‘á»u khÃ´ng cÃ³ -> Ä‘áº·t má»¥c tiÃªu khá»Ÿi Ä‘áº§u há»£p lÃ½
        
        let targetRevenue, targetOrders, targetCustomers, targetReservations, targetReviews;
        let revenueDesc, ordersDesc, customersDesc, reservationsDesc, reviewsDesc;
        
        // Doanh thu - LUÃ”N Ä‘Æ°a ra con sá»‘ cá»¥ thá»ƒ
        if (prevRevenueVal > 0) {
            // CÃ³ dá»¯ liá»‡u thÃ¡ng trÆ°á»›c -> tÄƒng 10%
            targetRevenue = Math.round(prevRevenueVal * 1.1 / 1000000) * 1000000; // LÃ m trÃ²n triá»‡u
            if (targetRevenue < 1000000) targetRevenue = Math.round(prevRevenueVal * 1.1 / 100000) * 100000; // LÃ m trÃ²n trÄƒm nghÃ¬n náº¿u nhá»
            revenueDesc = `TÄƒng 10% so vá»›i thÃ¡ng trÆ°á»›c (${new Intl.NumberFormat('vi-VN').format(prevRevenueVal)}Ä‘)`;
        } else if (currentRevenueVal > 0 && progressRatio > 0.1) {
            // Æ¯á»›c tÃ­nh doanh thu cáº£ thÃ¡ng dá»±a trÃªn hiá»‡n táº¡i
            const estimatedRevenue = Math.round(currentRevenueVal / progressRatio);
            targetRevenue = Math.round(estimatedRevenue * 1.05 / 1000000) * 1000000; // TÄƒng 5%
            if (targetRevenue < 1000000) targetRevenue = Math.round(estimatedRevenue * 1.05 / 100000) * 100000;
            revenueDesc = `Dá»±a trÃªn xu hÆ°á»›ng hiá»‡n táº¡i (${new Intl.NumberFormat('vi-VN').format(currentRevenueVal)}Ä‘ Ä‘Ã£ Ä‘áº¡t)`;
        } else if (currentRevenueVal > 0) {
            // CÃ³ doanh thu nhÆ°ng cÃ²n Ã­t ngÃ y -> Æ°á»›c tÃ­nh dá»±a trÃªn trung bÃ¬nh ngÃ y
            const avgPerDay = currentRevenueVal / Math.max(1, dayOfMonth);
            targetRevenue = Math.round(avgPerDay * daysInMonth * 1.1 / 100000) * 100000;
            if (targetRevenue < 500000) targetRevenue = 500000;
            revenueDesc = `Æ¯á»›c tÃ­nh tá»« doanh thu hiá»‡n táº¡i (${new Intl.NumberFormat('vi-VN').format(currentRevenueVal)}Ä‘)`;
        } else {
            // KhÃ´ng cÃ³ dá»¯ liá»‡u -> Ä‘áº·t má»¥c tiÃªu khá»Ÿi Ä‘áº§u cá»¥ thá»ƒ
            targetRevenue = 10000000; // 10 triá»‡u - má»¥c tiÃªu khá»Ÿi Ä‘áº§u rÃµ rÃ ng
            revenueDesc = 'Má»¥c tiÃªu khá»Ÿi Ä‘áº§u: 10 triá»‡u Ä‘á»“ng/thÃ¡ng';
        }
        // Äáº£m báº£o luÃ´n cÃ³ giÃ¡ trá»‹ tá»‘i thiá»ƒu
        if (!targetRevenue || targetRevenue <= 0) {
            targetRevenue = 10000000;
            revenueDesc = 'Má»¥c tiÃªu máº·c Ä‘á»‹nh: 10 triá»‡u Ä‘á»“ng/thÃ¡ng';
        }
        
        // ÄÆ¡n hÃ ng
        if (prevOrdersVal > 0) {
            targetOrders = Math.max(5, Math.round(prevOrdersVal * 1.1)); // TÄƒng 10%
            ordersDesc = `TÄƒng 10% so vá»›i thÃ¡ng trÆ°á»›c (${prevOrdersVal} Ä‘Æ¡n)`;
        } else if (currentOrdersVal > 0 && progressRatio > 0.1) {
            const estimatedOrders = Math.round(currentOrdersVal / progressRatio);
            targetOrders = Math.max(5, Math.round(estimatedOrders * 1.05));
            ordersDesc = `Dá»±a trÃªn xu hÆ°á»›ng hiá»‡n táº¡i (${currentOrdersVal} Ä‘Æ¡n Ä‘Ã£ cÃ³)`;
        } else {
            targetOrders = 10; // Má»¥c tiÃªu khá»Ÿi Ä‘áº§u
            ordersDesc = 'Má»¥c tiÃªu khá»Ÿi Ä‘áº§u cho quÃ¡n má»›i';
        }
        
        // KhÃ¡ch hÃ ng má»›i
        if (prevCustomersVal > 0) {
            targetCustomers = Math.max(3, Math.round(prevCustomersVal * 1.15)); // TÄƒng 15%
            customersDesc = `TÄƒng 15% so vá»›i thÃ¡ng trÆ°á»›c (${prevCustomersVal} khÃ¡ch)`;
        } else {
            targetCustomers = 5;
            customersDesc = 'Má»¥c tiÃªu thu hÃºt khÃ¡ch hÃ ng má»›i';
        }
        
        // Äáº·t bÃ n
        if (prevReservationsVal > 0) {
            targetReservations = Math.max(3, Math.round(prevReservationsVal * 1.1)); // TÄƒng 10%
            reservationsDesc = `TÄƒng 10% so vá»›i thÃ¡ng trÆ°á»›c (${prevReservationsVal} lÆ°á»£t)`;
        } else {
            targetReservations = 5;
            reservationsDesc = 'Má»¥c tiÃªu Ä‘áº·t bÃ n cho quÃ¡n';
        }
        
        // ÄÃ¡nh giÃ¡
        if (prevReviewsVal > 0) {
            targetReviews = Math.max(2, Math.round(prevReviewsVal * 1.2)); // TÄƒng 20%
            reviewsDesc = `TÄƒng 20% so vá»›i thÃ¡ng trÆ°á»›c (${prevReviewsVal} Ä‘Ã¡nh giÃ¡)`;
        } else {
            targetReviews = 3;
            reviewsDesc = 'Má»¥c tiÃªu thu tháº­p Ä‘Ã¡nh giÃ¡ tá»« khÃ¡ch';
        }
        
        // 5 má»¥c tiÃªu Ä‘Æ°á»£c AI Ä‘á» xuáº¥t
        const goals = [
            {
                loai_muc_tieu: 'doanh_thu',
                ten_muc_tieu: 'Doanh thu thÃ¡ng',
                mo_ta: revenueDesc,
                gia_tri_muc_tieu: targetRevenue,
                don_vi: 'Ä‘á»“ng',
                icon: 'ðŸ’°',
                thu_tu: 1
            },
            {
                loai_muc_tieu: 'don_hang',
                ten_muc_tieu: 'Sá»‘ Ä‘Æ¡n hÃ ng',
                mo_ta: ordersDesc,
                gia_tri_muc_tieu: targetOrders,
                don_vi: 'Ä‘Æ¡n',
                icon: 'ðŸ“¦',
                thu_tu: 2
            },
            {
                loai_muc_tieu: 'khach_hang_moi',
                ten_muc_tieu: 'KhÃ¡ch hÃ ng má»›i',
                mo_ta: customersDesc,
                gia_tri_muc_tieu: targetCustomers,
                don_vi: 'ngÆ°á»i',
                icon: 'ðŸ‘¥',
                thu_tu: 3
            },
            {
                loai_muc_tieu: 'dat_ban',
                ten_muc_tieu: 'LÆ°á»£t Ä‘áº·t bÃ n',
                mo_ta: reservationsDesc,
                gia_tri_muc_tieu: targetReservations,
                don_vi: 'lÆ°á»£t',
                icon: 'ðŸ½ï¸',
                thu_tu: 4
            },
            {
                loai_muc_tieu: 'danh_gia',
                ten_muc_tieu: 'ÄÃ¡nh giÃ¡ tÃ­ch cá»±c',
                mo_ta: reviewsDesc,
                gia_tri_muc_tieu: targetReviews,
                don_vi: 'Ä‘Ã¡nh giÃ¡',
                icon: 'â­',
                thu_tu: 5
            }
        ];
        
        // LÆ°u vÃ o database (upsert)
        for (const goal of goals) {
            await db.query(`
                INSERT INTO muc_tieu_chi_tiet (thang, nam, loai_muc_tieu, ten_muc_tieu, mo_ta, gia_tri_muc_tieu, don_vi, icon, thu_tu)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    ten_muc_tieu = VALUES(ten_muc_tieu),
                    mo_ta = VALUES(mo_ta),
                    gia_tri_muc_tieu = VALUES(gia_tri_muc_tieu),
                    don_vi = VALUES(don_vi),
                    icon = VALUES(icon),
                    thu_tu = VALUES(thu_tu),
                    ngay_cap_nhat = CURRENT_TIMESTAMP
            `, [currentMonth, currentYear, goal.loai_muc_tieu, goal.ten_muc_tieu, goal.mo_ta, goal.gia_tri_muc_tieu, goal.don_vi, goal.icon, goal.thu_tu]);
        }
        
        res.json({
            success: true,
            message: 'ÄÃ£ táº¡o 5 má»¥c tiÃªu cho thÃ¡ng ' + currentMonth,
            data: goals
        });
    } catch (error) {
        console.error('Error generating goals:', error);
        res.status(500).json({ success: false, message: 'Lá»—i táº¡o má»¥c tiÃªu: ' + error.message });
    }
});

// API: Cáº­p nháº­t má»™t má»¥c tiÃªu cá»¥ thá»ƒ
router.put('/goals/:loai', requireAdmin, async (req, res) => {
    try {
        const { loai } = req.params;
        const { gia_tri_muc_tieu, ten_muc_tieu, mo_ta } = req.body;
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        await db.query(`
            UPDATE muc_tieu_chi_tiet 
            SET gia_tri_muc_tieu = ?, ten_muc_tieu = COALESCE(?, ten_muc_tieu), mo_ta = COALESCE(?, mo_ta), ngay_cap_nhat = CURRENT_TIMESTAMP
            WHERE thang = ? AND nam = ? AND loai_muc_tieu = ?
        `, [gia_tri_muc_tieu, ten_muc_tieu, mo_ta, currentMonth, currentYear, loai]);
        
        res.json({ success: true, message: 'ÄÃ£ cáº­p nháº­t má»¥c tiÃªu' });
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ success: false, message: 'Lá»—i cáº­p nháº­t má»¥c tiÃªu' });
    }
});

// API: XÃ³a táº¥t cáº£ má»¥c tiÃªu thÃ¡ng hiá»‡n táº¡i
router.delete('/goals', requireAdmin, async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        await db.query(`
            DELETE FROM muc_tieu_chi_tiet WHERE thang = ? AND nam = ?
        `, [currentMonth, currentYear]);
        
        res.json({ success: true, message: 'ÄÃ£ xÃ³a táº¥t cáº£ má»¥c tiÃªu' });
    } catch (error) {
        console.error('Error deleting goals:', error);
        res.status(500).json({ success: false, message: 'Lá»—i xÃ³a má»¥c tiÃªu' });
    }
});

// ========== API BÃO CÃO Tá»”NG Há»¢P Má»¤C TIÃŠU ==========

// API: BÃ¡o cÃ¡o tá»•ng há»£p má»¥c tiÃªu theo thÃ¡ng/nÄƒm
router.get('/goals/report', requireAdmin, async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentDate = new Date();
        const reportMonth = parseInt(month) || currentDate.getMonth() + 1;
        const reportYear = parseInt(year) || currentDate.getFullYear();
        
        // Láº¥y má»¥c tiÃªu cá»§a thÃ¡ng Ä‘Æ°á»£c chá»n
        const [goals] = await db.query(`
            SELECT * FROM muc_tieu_chi_tiet 
            WHERE thang = ? AND nam = ?
            ORDER BY thu_tu ASC
        `, [reportMonth, reportYear]);
        
        if (goals.length === 0) {
            return res.json({
                success: true,
                data: {
                    hasData: false,
                    message: `ChÆ°a cÃ³ má»¥c tiÃªu cho thÃ¡ng ${reportMonth}/${reportYear}`,
                    month: reportMonth,
                    year: reportYear
                }
            });
        }
        
        // Láº¥y dá»¯ liá»‡u thá»±c táº¿ cá»§a thÃ¡ng Ä‘Ã³
        const [revenueData] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [reportMonth, reportYear]);
        
        const [ordersData] = await db.query(`
            SELECT COUNT(*) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        `, [reportMonth, reportYear]);
        
        const [customersData] = await db.query(`
            SELECT COUNT(*) as total FROM nguoi_dung 
            WHERE MONTH(ngay_tao) = ? AND YEAR(ngay_tao) = ?
        `, [reportMonth, reportYear]);
        
        const [reservationsData] = await db.query(`
            SELECT COUNT(*) as total FROM dat_ban 
            WHERE MONTH(ngay_dat) = ? AND YEAR(ngay_dat) = ?
        `, [reportMonth, reportYear]);
        
        const [reviewsData] = await db.query(`
            SELECT COUNT(*) as total FROM danh_gia_san_pham 
            WHERE MONTH(ngay_danh_gia) = ? AND YEAR(ngay_danh_gia) = ? AND trang_thai = 'approved'
        `, [reportMonth, reportYear]);
        
        // Map dá»¯ liá»‡u thá»±c táº¿
        const actualData = {
            doanh_thu: parseFloat(revenueData[0].total) || 0,
            don_hang: parseInt(ordersData[0].total) || 0,
            khach_hang_moi: parseInt(customersData[0].total) || 0,
            dat_ban: parseInt(reservationsData[0].total) || 0,
            danh_gia: parseInt(reviewsData[0].total) || 0
        };
        
        // TÃ­nh tiáº¿n Ä‘á»™ vÃ  Ä‘Ã¡nh giÃ¡ tá»«ng má»¥c tiÃªu
        const goalsReport = goals.map(goal => {
            const actual = actualData[goal.loai_muc_tieu] || 0;
            const target = parseFloat(goal.gia_tri_muc_tieu) || 1;
            const progress = Math.round((actual / target) * 100);
            const difference = actual - target;
            
            let status, statusColor, evaluation;
            if (progress >= 100) {
                status = 'HoÃ n thÃ nh';
                statusColor = 'green';
                evaluation = 'ðŸŽ‰ Xuáº¥t sáº¯c! VÆ°á»£t má»¥c tiÃªu';
            } else if (progress >= 80) {
                status = 'Gáº§n Ä‘áº¡t';
                statusColor = 'blue';
                evaluation = 'ðŸ‘ Tá»‘t! Cáº§n cá»‘ gáº¯ng thÃªm má»™t chÃºt';
            } else if (progress >= 50) {
                status = 'Äang tiáº¿n triá»ƒn';
                statusColor = 'yellow';
                evaluation = 'âš¡ Cáº§n tÄƒng tá»‘c Ä‘á»ƒ Ä‘áº¡t má»¥c tiÃªu';
            } else {
                status = 'Cáº§n cáº£i thiá»‡n';
                statusColor = 'red';
                evaluation = 'ðŸ”´ Cáº§n xem xÃ©t láº¡i chiáº¿n lÆ°á»£c';
            }
            
            return {
                ...goal,
                gia_tri_thuc_te: actual,
                tien_do: progress,
                chenh_lech: difference,
                trang_thai: status,
                mau_trang_thai: statusColor,
                danh_gia: evaluation,
                hoan_thanh: progress >= 100
            };
        });
        
        // TÃ­nh tá»•ng há»£p
        const totalProgress = Math.round(goalsReport.reduce((sum, g) => sum + g.tien_do, 0) / goalsReport.length);
        const completedCount = goalsReport.filter(g => g.hoan_thanh).length;
        const nearCompletedCount = goalsReport.filter(g => g.tien_do >= 80 && g.tien_do < 100).length;
        const needImprovementCount = goalsReport.filter(g => g.tien_do < 50).length;
        
        // ÄÃ¡nh giÃ¡ tá»•ng thá»ƒ
        let overallEvaluation, overallStatus;
        if (totalProgress >= 100) {
            overallStatus = 'Xuáº¥t sáº¯c';
            overallEvaluation = 'ðŸ† ThÃ¡ng nÃ y hoÃ n thÃ nh xuáº¥t sáº¯c táº¥t cáº£ má»¥c tiÃªu!';
        } else if (totalProgress >= 80) {
            overallStatus = 'Tá»‘t';
            overallEvaluation = 'âœ¨ Káº¿t quáº£ tá»‘t! Háº§u háº¿t má»¥c tiÃªu Ä‘Ã£ Ä‘áº¡t hoáº·c gáº§n Ä‘áº¡t.';
        } else if (totalProgress >= 60) {
            overallStatus = 'KhÃ¡';
            overallEvaluation = 'ðŸ“Š Káº¿t quáº£ khÃ¡. Cáº§n cáº£i thiá»‡n má»™t sá»‘ má»¥c tiÃªu.';
        } else if (totalProgress >= 40) {
            overallStatus = 'Trung bÃ¬nh';
            overallEvaluation = 'âš ï¸ Káº¿t quáº£ trung bÃ¬nh. Cáº§n xem xÃ©t láº¡i chiáº¿n lÆ°á»£c kinh doanh.';
        } else {
            overallStatus = 'Cáº§n cáº£i thiá»‡n';
            overallEvaluation = 'ðŸ”´ Káº¿t quáº£ chÆ°a Ä‘áº¡t. Cáº§n phÃ¢n tÃ­ch nguyÃªn nhÃ¢n vÃ  Ä‘iá»u chá»‰nh.';
        }
        
        res.json({
            success: true,
            data: {
                hasData: true,
                month: reportMonth,
                year: reportYear,
                goals: goalsReport,
                summary: {
                    totalProgress,
                    completedCount,
                    nearCompletedCount,
                    needImprovementCount,
                    totalGoals: goalsReport.length,
                    overallStatus,
                    overallEvaluation
                }
            }
        });
    } catch (error) {
        console.error('Error getting goals report:', error);
        res.status(500).json({ success: false, message: 'Lá»—i láº¥y bÃ¡o cÃ¡o: ' + error.message });
    }
});

// API: Láº¥y lá»‹ch sá»­ má»¥c tiÃªu cÃ¡c thÃ¡ng trÆ°á»›c
router.get('/goals/history', requireAdmin, async (req, res) => {
    try {
        // Láº¥y danh sÃ¡ch cÃ¡c thÃ¡ng Ä‘Ã£ cÃ³ má»¥c tiÃªu
        const [months] = await db.query(`
            SELECT DISTINCT thang, nam, 
                   COUNT(*) as so_muc_tieu,
                   MIN(ngay_tao) as ngay_tao
            FROM muc_tieu_chi_tiet 
            GROUP BY thang, nam
            ORDER BY nam DESC, thang DESC
            LIMIT 12
        `);
        
        // Láº¥y tiáº¿n Ä‘á»™ tá»•ng há»£p cho má»—i thÃ¡ng
        const historyWithProgress = await Promise.all(months.map(async (m) => {
            const [goals] = await db.query(`
                SELECT loai_muc_tieu, gia_tri_muc_tieu FROM muc_tieu_chi_tiet 
                WHERE thang = ? AND nam = ?
            `, [m.thang, m.nam]);
            
            // Láº¥y dá»¯ liá»‡u thá»±c táº¿
            const [revenue] = await db.query(`
                SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
                WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
            `, [m.thang, m.nam]);
            
            const [orders] = await db.query(`
                SELECT COUNT(*) as total FROM don_hang 
                WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
            `, [m.thang, m.nam]);
            
            const actualData = {
                doanh_thu: parseFloat(revenue[0].total) || 0,
                don_hang: parseInt(orders[0].total) || 0
            };
            
            // TÃ­nh tiáº¿n Ä‘á»™ trung bÃ¬nh
            let totalProgress = 0;
            let count = 0;
            goals.forEach(g => {
                const actual = actualData[g.loai_muc_tieu] || 0;
                const target = parseFloat(g.gia_tri_muc_tieu) || 1;
                totalProgress += Math.min(100, Math.round((actual / target) * 100));
                count++;
            });
            
            return {
                thang: m.thang,
                nam: m.nam,
                so_muc_tieu: m.so_muc_tieu,
                tien_do_trung_binh: count > 0 ? Math.round(totalProgress / count) : 0,
                ngay_tao: m.ngay_tao
            };
        }));
        
        res.json({
            success: true,
            data: historyWithProgress
        });
    } catch (error) {
        console.error('Error getting goals history:', error);
        res.status(500).json({ success: false, message: 'Lá»—i láº¥y lá»‹ch sá»­: ' + error.message });
    }
});

// API: AI phÃ¢n tÃ­ch vÃ  Ä‘á» xuáº¥t chiáº¿n lÆ°á»£c dá»±a trÃªn má»¥c tiÃªu
router.post('/goals/ai-strategy', requireAdmin, async (req, res) => {
    try {
        const stats = await getBusinessStats();
        
        if (!stats || !stats.goals || stats.goals.length === 0) {
            return res.json({
                success: true,
                data: {
                    message: 'ChÆ°a cÃ³ má»¥c tiÃªu Ä‘á»ƒ phÃ¢n tÃ­ch. HÃ£y táº¡o má»¥c tiÃªu trÆ°á»›c!',
                    suggestions: ['Táº¡o má»¥c tiÃªu']
                }
            });
        }
        
        // PhÃ¢n tÃ­ch má»¥c tiÃªu
        const lowGoals = stats.goals.filter(g => g.tien_do < 50);
        const mediumGoals = stats.goals.filter(g => g.tien_do >= 50 && g.tien_do < 80);
        const highGoals = stats.goals.filter(g => g.tien_do >= 80);
        
        // Táº¡o context cho AI
        const analysisContext = `
PhÃ¢n tÃ­ch má»¥c tiÃªu thÃ¡ng ${stats.currentMonth}/${stats.currentYear}:

ðŸ“Š Tá»”NG QUAN:
- Tiáº¿n Ä‘á»™ trung bÃ¬nh: ${Math.round(stats.goals.reduce((sum, g) => sum + g.tien_do, 0) / stats.goals.length)}%
- HoÃ n thÃ nh: ${stats.goals.filter(g => g.tien_do >= 100).length}/${stats.goals.length} má»¥c tiÃªu

ðŸ”´ Cáº¦N Cáº¢I THIá»†N Gáº¤P (< 50%):
${lowGoals.length > 0 ? lowGoals.map(g => `- ${g.ten_muc_tieu}: ${g.tien_do}% (${g.gia_tri_hien_tai}/${g.gia_tri_muc_tieu})`).join('\n') : 'KhÃ´ng cÃ³'}

ðŸŸ¡ ÄANG TIáº¾N TRIá»‚N (50-80%):
${mediumGoals.length > 0 ? mediumGoals.map(g => `- ${g.ten_muc_tieu}: ${g.tien_do}%`).join('\n') : 'KhÃ´ng cÃ³'}

ðŸŸ¢ Sáº®P HOÃ€N THÃ€NH (> 80%):
${highGoals.length > 0 ? highGoals.map(g => `- ${g.ten_muc_tieu}: ${g.tien_do}%`).join('\n') : 'KhÃ´ng cÃ³'}

Dá»® LIá»†U Bá»” SUNG:
- Doanh thu thÃ¡ng nÃ y: ${new Intl.NumberFormat('vi-VN').format(stats.revenueThisMonth)}Ä‘
- Doanh thu thÃ¡ng trÆ°á»›c: ${new Intl.NumberFormat('vi-VN').format(stats.revenueLastMonth)}Ä‘
- Sá»‘ Ä‘Æ¡n hÃ ng: ${stats.ordersThisMonth} (thÃ¡ng trÆ°á»›c: ${stats.ordersLastMonth})
- NgÃ y cÃ²n láº¡i trong thÃ¡ng: ${new Date(stats.currentYear, stats.currentMonth, 0).getDate() - new Date().getDate()}
`;

        // Gá»i Groq AI Ä‘á»ƒ phÃ¢n tÃ­ch
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `Báº¡n lÃ  "PhÆ°Æ¡ng Nam" - trá»£ lÃ½ AI cá»§a nhÃ  hÃ ng "áº¨m Thá»±c PhÆ°Æ¡ng Nam".
Chá»§ nhÃ  hÃ ng lÃ  chá»‹ Linh. XÆ°ng "em", gá»i "chá»‹ Linh".

HÃ£y phÃ¢n tÃ­ch dá»¯ liá»‡u vÃ  Ä‘Æ°a ra chiáº¿n lÆ°á»£c Cá»¤ THá»‚, THá»°C Táº¾ Ä‘á»ƒ Ä‘áº¡t má»¥c tiÃªu.

Quy táº¯c:
- Tráº£ lá»i báº±ng tiáº¿ng Viá»‡t, thÃ¢n thiá»‡n
- XÆ°ng "em", gá»i "chá»‹ Linh"
- ÄÆ°a ra 3-5 hÃ nh Ä‘á»™ng cá»¥ thá»ƒ, cÃ³ thá»ƒ thá»±c hiá»‡n ngay
- Æ¯u tiÃªn cÃ¡c má»¥c tiÃªu Ä‘ang tháº¥p nháº¥t
- Äá» xuáº¥t pháº£i phÃ¹ há»£p vá»›i nhÃ  hÃ ng Viá»‡t Nam
- Sá»­ dá»¥ng emoji vÃ  format rÃµ rÃ ng`
                },
                {
                    role: 'user',
                    content: `Dá»±a trÃªn dá»¯ liá»‡u sau, hÃ£y Ä‘á» xuáº¥t chiáº¿n lÆ°á»£c cá»¥ thá»ƒ Ä‘á»ƒ cáº£i thiá»‡n cÃ¡c má»¥c tiÃªu:\n\n${analysisContext}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1024
        });

        const aiStrategy = completion.choices[0]?.message?.content || 'KhÃ´ng thá»ƒ táº¡o chiáº¿n lÆ°á»£c. Vui lÃ²ng thá»­ láº¡i.';
        
        res.json({
            success: true,
            data: {
                type: 'ai_strategy',
                message: aiStrategy,
                analysis: {
                    lowGoals: lowGoals.length,
                    mediumGoals: mediumGoals.length,
                    highGoals: highGoals.length,
                    totalProgress: Math.round(stats.goals.reduce((sum, g) => sum + g.tien_do, 0) / stats.goals.length)
                },
                suggestions: ['Xem chi tiáº¿t má»¥c tiÃªu', 'BÃ¡o cÃ¡o thÃ¡ng', 'Lá»‹ch sá»­ má»¥c tiÃªu']
            }
        });
    } catch (error) {
        console.error('Error generating AI strategy:', error);
        res.status(500).json({ success: false, message: 'Lá»—i táº¡o chiáº¿n lÆ°á»£c: ' + error.message });
    }
});

// ========== CHIáº¾N LÆ¯á»¢C DOANH THU CHI TIáº¾T ==========

// HÃ m phÃ¢n tÃ­ch doanh thu chuyÃªn sÃ¢u
async function analyzeRevenueData() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const dayOfMonth = currentDate.getDate();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    
    // ThÃ¡ng trÆ°á»›c
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = currentYear - 1;
    }
    
    // 1. Doanh thu theo thá»i gian
    const [revenueThisMonth] = await db.query(`
        SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
        WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
    `, [currentMonth, currentYear]);
    
    const [revenueLastMonth] = await db.query(`
        SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
        WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
    `, [prevMonth, prevYear]);
    
    // 2. Doanh thu theo ngÃ y trong tuáº§n (phÃ¢n tÃ­ch xu hÆ°á»›ng)
    const [revenueByDayOfWeek] = await db.query(`
        SELECT 
            DAYOFWEEK(thoi_gian_tao) as ngay_trong_tuan,
            DAYNAME(thoi_gian_tao) as ten_ngay,
            COUNT(*) as so_don,
            COALESCE(SUM(tong_tien), 0) as doanh_thu
        FROM don_hang 
        WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        GROUP BY DAYOFWEEK(thoi_gian_tao), DAYNAME(thoi_gian_tao)
        ORDER BY doanh_thu DESC
    `, [currentMonth, currentYear]);
    
    // 3. Doanh thu theo khung giá»
    const [revenueByHour] = await db.query(`
        SELECT 
            HOUR(thoi_gian_tao) as gio,
            COUNT(*) as so_don,
            COALESCE(SUM(tong_tien), 0) as doanh_thu
        FROM don_hang 
        WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        GROUP BY HOUR(thoi_gian_tao)
        ORDER BY doanh_thu DESC
    `, [currentMonth, currentYear]);
    
    // 4. Top sáº£n pháº©m bÃ¡n cháº¡y (Ä‘Ã³ng gÃ³p doanh thu)
    const [topProducts] = await db.query(`
        SELECT 
            sp.ten_san_pham,
            sp.gia,
            SUM(ctdh.so_luong) as so_luong_ban,
            SUM(ctdh.so_luong * ctdh.gia) as doanh_thu_sp
        FROM chi_tiet_don_hang ctdh
        JOIN san_pham sp ON ctdh.san_pham_id = sp.id
        JOIN don_hang dh ON ctdh.don_hang_id = dh.id
        WHERE MONTH(dh.thoi_gian_tao) = ? AND YEAR(dh.thoi_gian_tao) = ? AND dh.trang_thai = 'delivered'
        GROUP BY sp.id, sp.ten_san_pham, sp.gia
        ORDER BY doanh_thu_sp DESC
        LIMIT 10
    `, [currentMonth, currentYear]);
    
    // 5. Sáº£n pháº©m Ã­t bÃ¡n (cáº§n Ä‘áº©y máº¡nh)
    const [lowSellingProducts] = await db.query(`
        SELECT 
            sp.ten_san_pham,
            sp.gia,
            COALESCE(SUM(ctdh.so_luong), 0) as so_luong_ban
        FROM san_pham sp
        LEFT JOIN chi_tiet_don_hang ctdh ON sp.id = ctdh.san_pham_id
        LEFT JOIN don_hang dh ON ctdh.don_hang_id = dh.id 
            AND MONTH(dh.thoi_gian_tao) = ? AND YEAR(dh.thoi_gian_tao) = ?
        WHERE sp.trang_thai = 'active'
        GROUP BY sp.id, sp.ten_san_pham, sp.gia
        HAVING so_luong_ban < 3
        ORDER BY so_luong_ban ASC
        LIMIT 10
    `, [currentMonth, currentYear]);
    
    // 6. GiÃ¡ trá»‹ Ä‘Æ¡n hÃ ng trung bÃ¬nh
    const [avgOrderValue] = await db.query(`
        SELECT 
            COALESCE(AVG(tong_tien), 0) as trung_binh,
            COALESCE(MAX(tong_tien), 0) as cao_nhat,
            COALESCE(MIN(tong_tien), 0) as thap_nhat,
            COUNT(*) as tong_don
        FROM don_hang 
        WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
    `, [currentMonth, currentYear]);
    
    // 7. Tá»· lá»‡ Ä‘Æ¡n hÃ ng thÃ nh cÃ´ng vs há»§y
    const [orderStatus] = await db.query(`
        SELECT 
            trang_thai,
            COUNT(*) as so_luong,
            COALESCE(SUM(tong_tien), 0) as gia_tri
        FROM don_hang 
        WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        GROUP BY trang_thai
    `, [currentMonth, currentYear]);
    
    // 8. KhÃ¡ch hÃ ng quay láº¡i vs khÃ¡ch má»›i
    const [customerAnalysis] = await db.query(`
        SELECT 
            CASE 
                WHEN order_count = 1 THEN 'KhÃ¡ch má»›i'
                ELSE 'KhÃ¡ch quay láº¡i'
            END as loai_khach,
            COUNT(*) as so_khach,
            SUM(total_spent) as tong_chi_tieu
        FROM (
            SELECT 
                nguoi_dung_id,
                COUNT(*) as order_count,
                SUM(tong_tien) as total_spent
            FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
            GROUP BY nguoi_dung_id
        ) as customer_orders
        GROUP BY loai_khach
    `, [currentMonth, currentYear]);
    
    // 9. Má»¥c tiÃªu doanh thu
    const [revenueGoal] = await db.query(`
        SELECT gia_tri_muc_tieu FROM muc_tieu_chi_tiet 
        WHERE thang = ? AND nam = ? AND loai_muc_tieu = 'doanh_thu'
    `, [currentMonth, currentYear]);
    
    // TÃ­nh toÃ¡n cÃ¡c chá»‰ sá»‘
    const currentRevenue = parseFloat(revenueThisMonth[0].total) || 0;
    const lastMonthRevenue = parseFloat(revenueLastMonth[0].total) || 0;
    const targetRevenue = parseFloat(revenueGoal[0]?.gia_tri_muc_tieu) || 0;
    const avgDaily = dayOfMonth > 0 ? currentRevenue / dayOfMonth : 0;
    const projectedRevenue = avgDaily * daysInMonth;
    const revenueNeeded = targetRevenue - currentRevenue;
    const dailyNeeded = daysRemaining > 0 ? revenueNeeded / daysRemaining : 0;
    const progress = targetRevenue > 0 ? Math.round((currentRevenue / targetRevenue) * 100) : 0;
    const growthRate = lastMonthRevenue > 0 ? Math.round(((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;
    
    return {
        currentMonth,
        currentYear,
        dayOfMonth,
        daysInMonth,
        daysRemaining,
        currentRevenue,
        lastMonthRevenue,
        targetRevenue,
        avgDaily,
        projectedRevenue,
        revenueNeeded,
        dailyNeeded,
        progress,
        growthRate,
        revenueByDayOfWeek,
        revenueByHour,
        topProducts,
        lowSellingProducts,
        avgOrderValue: avgOrderValue[0],
        orderStatus,
        customerAnalysis
    };
}

// API: Chiáº¿n lÆ°á»£c tÄƒng doanh thu chi tiáº¿t
router.get('/revenue/strategy', requireAdmin, async (req, res) => {
    try {
        const data = await analyzeRevenueData();
        
        // XÃ¢y dá»±ng chiáº¿n lÆ°á»£c dá»±a trÃªn phÃ¢n tÃ­ch
        const strategies = [];
        const urgentActions = [];
        const recommendations = [];
        
        // 1. PhÃ¢n tÃ­ch tiáº¿n Ä‘á»™ má»¥c tiÃªu
        if (data.targetRevenue > 0) {
            if (data.progress < 50 && data.daysRemaining < 15) {
                urgentActions.push({
                    priority: 'critical',
                    icon: 'ðŸš¨',
                    title: 'Cáº§n tÄƒng tá»‘c gáº¥p!',
                    detail: `CÃ²n ${data.daysRemaining} ngÃ y, cáº§n Ä‘áº¡t thÃªm ${new Intl.NumberFormat('vi-VN').format(data.revenueNeeded)}Ä‘`,
                    action: `Má»—i ngÃ y cáº§n Ä‘áº¡t ${new Intl.NumberFormat('vi-VN').format(Math.round(data.dailyNeeded))}Ä‘`
                });
            } else if (data.progress < 80) {
                strategies.push({
                    priority: 'high',
                    icon: 'âš¡',
                    title: 'TÄƒng cÆ°á»ng bÃ¡n hÃ ng',
                    detail: `Tiáº¿n Ä‘á»™ ${data.progress}%, cáº§n thÃªm ${new Intl.NumberFormat('vi-VN').format(data.revenueNeeded)}Ä‘`
                });
            }
        }
        
        // 2. PhÃ¢n tÃ­ch ngÃ y bÃ¡n cháº¡y
        if (data.revenueByDayOfWeek.length > 0) {
            const bestDay = data.revenueByDayOfWeek[0];
            const worstDay = data.revenueByDayOfWeek[data.revenueByDayOfWeek.length - 1];
            
            const dayNames = {
                1: 'Chá»§ nháº­t', 2: 'Thá»© 2', 3: 'Thá»© 3', 4: 'Thá»© 4', 
                5: 'Thá»© 5', 6: 'Thá»© 6', 7: 'Thá»© 7'
            };
            
            recommendations.push({
                icon: 'ðŸ“…',
                title: 'Tá»‘i Æ°u theo ngÃ y',
                detail: `${dayNames[bestDay.ngay_trong_tuan]} bÃ¡n cháº¡y nháº¥t (${new Intl.NumberFormat('vi-VN').format(bestDay.doanh_thu)}Ä‘)`,
                action: `TÄƒng khuyáº¿n mÃ£i vÃ o ${dayNames[worstDay?.ngay_trong_tuan] || 'ngÃ y Ã­t khÃ¡ch'} Ä‘á»ƒ cÃ¢n báº±ng`
            });
        }
        
        // 3. PhÃ¢n tÃ­ch khung giá» vÃ ng
        if (data.revenueByHour.length > 0) {
            const peakHours = data.revenueByHour.slice(0, 3);
            const peakHourText = peakHours.map(h => `${h.gio}h`).join(', ');
            
            recommendations.push({
                icon: 'â°',
                title: 'Khung giá» vÃ ng',
                detail: `Doanh thu cao nháº¥t: ${peakHourText}`,
                action: 'Táº­p trung nhÃ¢n sá»± vÃ  quáº£ng cÃ¡o vÃ o khung giá» nÃ y'
            });
        }
        
        // 4. PhÃ¢n tÃ­ch sáº£n pháº©m
        if (data.topProducts.length > 0) {
            const topProduct = data.topProducts[0];
            recommendations.push({
                icon: 'ðŸ†',
                title: 'Sáº£n pháº©m chá»§ lá»±c',
                detail: `"${topProduct.ten_san_pham}" - ${topProduct.so_luong_ban} lÆ°á»£t bÃ¡n`,
                action: 'Äáº©y máº¡nh quáº£ng bÃ¡, táº¡o combo vá»›i sáº£n pháº©m nÃ y'
            });
        }
        
        if (data.lowSellingProducts.length > 0) {
            strategies.push({
                priority: 'medium',
                icon: 'ðŸ“¦',
                title: 'KÃ­ch cáº§u sáº£n pháº©m Ã­t bÃ¡n',
                detail: `${data.lowSellingProducts.length} sáº£n pháº©m bÃ¡n dÆ°á»›i 3 lÆ°á»£t/thÃ¡ng`,
                action: 'Giáº£m giÃ¡, táº¡o combo, hoáº·c xem xÃ©t ngá»«ng kinh doanh'
            });
        }
        
        // 5. PhÃ¢n tÃ­ch giÃ¡ trá»‹ Ä‘Æ¡n hÃ ng
        if (data.avgOrderValue.trung_binh > 0) {
            const avgValue = Math.round(data.avgOrderValue.trung_binh);
            if (avgValue < 100000) {
                strategies.push({
                    priority: 'high',
                    icon: 'ðŸ’°',
                    title: 'TÄƒng giÃ¡ trá»‹ Ä‘Æ¡n hÃ ng',
                    detail: `Trung bÃ¬nh chá»‰ ${new Intl.NumberFormat('vi-VN').format(avgValue)}Ä‘/Ä‘Æ¡n`,
                    action: 'Táº¡o combo, upsell, miá»…n phÃ­ ship Ä‘Æ¡n tá»« 150k'
                });
            }
            
            recommendations.push({
                icon: 'ðŸ“Š',
                title: 'GiÃ¡ trá»‹ Ä‘Æ¡n hÃ ng',
                detail: `TB: ${new Intl.NumberFormat('vi-VN').format(avgValue)}Ä‘ | Cao nháº¥t: ${new Intl.NumberFormat('vi-VN').format(data.avgOrderValue.cao_nhat)}Ä‘`,
                action: 'Äáº·t má»¥c tiÃªu tÄƒng 20% giÃ¡ trá»‹ Ä‘Æ¡n TB'
            });
        }
        
        // 6. PhÃ¢n tÃ­ch khÃ¡ch hÃ ng
        const newCustomers = data.customerAnalysis.find(c => c.loai_khach === 'KhÃ¡ch má»›i');
        const returningCustomers = data.customerAnalysis.find(c => c.loai_khach === 'KhÃ¡ch quay láº¡i');
        
        if (newCustomers && returningCustomers) {
            const returnRate = Math.round((returningCustomers.so_khach / (newCustomers.so_khach + returningCustomers.so_khach)) * 100);
            
            if (returnRate < 30) {
                strategies.push({
                    priority: 'high',
                    icon: 'ðŸ‘¥',
                    title: 'TÄƒng tá»· lá»‡ khÃ¡ch quay láº¡i',
                    detail: `Chá»‰ ${returnRate}% khÃ¡ch quay láº¡i mua`,
                    action: 'Táº¡o chÆ°Æ¡ng trÃ¬nh tÃ­ch Ä‘iá»ƒm, voucher cho láº§n mua sau'
                });
            }
        }
        
        // 7. PhÃ¢n tÃ­ch Ä‘Æ¡n há»§y
        const cancelledOrders = data.orderStatus.find(o => o.trang_thai === 'cancelled');
        if (cancelledOrders && cancelledOrders.so_luong > 0) {
            const totalOrders = data.orderStatus.reduce((sum, o) => sum + o.so_luong, 0);
            const cancelRate = Math.round((cancelledOrders.so_luong / totalOrders) * 100);
            
            if (cancelRate > 10) {
                urgentActions.push({
                    priority: 'high',
                    icon: 'âŒ',
                    title: 'Giáº£m tá»· lá»‡ há»§y Ä‘Æ¡n',
                    detail: `${cancelRate}% Ä‘Æ¡n bá»‹ há»§y (${cancelledOrders.so_luong} Ä‘Æ¡n)`,
                    action: 'Kiá»ƒm tra quy trÃ¬nh, liÃªn há»‡ khÃ¡ch Ä‘á»ƒ tÃ¬m nguyÃªn nhÃ¢n'
                });
            }
        }
        
        // 8. Dá»± bÃ¡o cuá»‘i thÃ¡ng
        const forecast = {
            projected: Math.round(data.projectedRevenue),
            target: data.targetRevenue,
            gap: Math.round(data.targetRevenue - data.projectedRevenue),
            willAchieve: data.projectedRevenue >= data.targetRevenue
        };
        
        res.json({
            success: true,
            data: {
                overview: {
                    currentRevenue: data.currentRevenue,
                    targetRevenue: data.targetRevenue,
                    lastMonthRevenue: data.lastMonthRevenue,
                    progress: data.progress,
                    growthRate: data.growthRate,
                    avgDaily: Math.round(data.avgDaily),
                    daysRemaining: data.daysRemaining,
                    revenueNeeded: data.revenueNeeded,
                    dailyNeeded: Math.round(data.dailyNeeded)
                },
                forecast,
                urgentActions,
                strategies,
                recommendations,
                details: {
                    topProducts: data.topProducts.slice(0, 5),
                    lowSellingProducts: data.lowSellingProducts.slice(0, 5),
                    peakHours: data.revenueByHour.slice(0, 3),
                    bestDays: data.revenueByDayOfWeek.slice(0, 3),
                    avgOrderValue: data.avgOrderValue,
                    customerAnalysis: data.customerAnalysis
                }
            }
        });
    } catch (error) {
        console.error('Error getting revenue strategy:', error);
        res.status(500).json({ success: false, message: 'Lá»—i phÃ¢n tÃ­ch doanh thu: ' + error.message });
    }
});

// API: AI Ä‘á» xuáº¥t chiáº¿n lÆ°á»£c doanh thu thÃ´ng minh
router.post('/revenue/ai-strategy', requireAdmin, async (req, res) => {
    try {
        const data = await analyzeRevenueData();
        
        // Táº¡o context chi tiáº¿t cho AI
        const revenueContext = `
ðŸ“Š PHÃ‚N TÃCH DOANH THU THÃNG ${data.currentMonth}/${data.currentYear}

ðŸ’° Tá»”NG QUAN:
- Doanh thu hiá»‡n táº¡i: ${new Intl.NumberFormat('vi-VN').format(data.currentRevenue)}Ä‘
- Má»¥c tiÃªu: ${new Intl.NumberFormat('vi-VN').format(data.targetRevenue)}Ä‘
- Tiáº¿n Ä‘á»™: ${data.progress}%
- CÃ²n thiáº¿u: ${new Intl.NumberFormat('vi-VN').format(data.revenueNeeded)}Ä‘
- ThÃ¡ng trÆ°á»›c: ${new Intl.NumberFormat('vi-VN').format(data.lastMonthRevenue)}Ä‘ (${data.growthRate > 0 ? '+' : ''}${data.growthRate}%)

ðŸ“… THá»œI GIAN:
- NgÃ y hiá»‡n táº¡i: ${data.dayOfMonth}/${data.daysInMonth}
- CÃ²n láº¡i: ${data.daysRemaining} ngÃ y
- Trung bÃ¬nh/ngÃ y: ${new Intl.NumberFormat('vi-VN').format(Math.round(data.avgDaily))}Ä‘
- Cáº§n Ä‘áº¡t/ngÃ y: ${new Intl.NumberFormat('vi-VN').format(Math.round(data.dailyNeeded))}Ä‘

ðŸ† TOP Sáº¢N PHáº¨M:
${data.topProducts.slice(0, 5).map((p, i) => `${i+1}. ${p.ten_san_pham}: ${p.so_luong_ban} lÆ°á»£t - ${new Intl.NumberFormat('vi-VN').format(p.doanh_thu_sp)}Ä‘`).join('\n')}

ðŸ“¦ Sáº¢N PHáº¨M ÃT BÃN:
${data.lowSellingProducts.slice(0, 5).map(p => `- ${p.ten_san_pham}: ${p.so_luong_ban} lÆ°á»£t`).join('\n')}

â° KHUNG GIá»œ VÃ€NG:
${data.revenueByHour.slice(0, 3).map(h => `- ${h.gio}h: ${h.so_don} Ä‘Æ¡n - ${new Intl.NumberFormat('vi-VN').format(h.doanh_thu)}Ä‘`).join('\n')}

ðŸ“Š GIÃ TRá»Š ÄÆ N HÃ€NG:
- Trung bÃ¬nh: ${new Intl.NumberFormat('vi-VN').format(Math.round(data.avgOrderValue.trung_binh))}Ä‘
- Cao nháº¥t: ${new Intl.NumberFormat('vi-VN').format(data.avgOrderValue.cao_nhat)}Ä‘
- Tá»•ng Ä‘Æ¡n: ${data.avgOrderValue.tong_don}

ðŸ‘¥ KHÃCH HÃ€NG:
${data.customerAnalysis.map(c => `- ${c.loai_khach}: ${c.so_khach} ngÆ°á»i - ${new Intl.NumberFormat('vi-VN').format(c.tong_chi_tieu)}Ä‘`).join('\n')}

ðŸ“ˆ Dá»° BÃO:
- Dá»± kiáº¿n cuá»‘i thÃ¡ng: ${new Intl.NumberFormat('vi-VN').format(Math.round(data.projectedRevenue))}Ä‘
- ${data.projectedRevenue >= data.targetRevenue ? 'âœ… CÃ³ thá»ƒ Ä‘áº¡t má»¥c tiÃªu' : 'âš ï¸ KhÃ³ Ä‘áº¡t má»¥c tiÃªu náº¿u khÃ´ng tÄƒng tá»‘c'}
`;

        // Gá»i Groq AI
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `Báº¡n lÃ  "PhÆ°Æ¡ng Nam" - trá»£ lÃ½ AI cá»§a nhÃ  hÃ ng "áº¨m Thá»±c PhÆ°Æ¡ng Nam".
Chá»§ nhÃ  hÃ ng lÃ  chá»‹ Linh. XÆ°ng "em", gá»i "chá»‹ Linh".

NHIá»†M Vá»¤: PhÃ¢n tÃ­ch dá»¯ liá»‡u vÃ  Ä‘Æ°a ra CHIáº¾N LÆ¯á»¢C TÄ‚NG DOANH THU cá»¥ thá»ƒ cho chá»‹ Linh.

QUY Táº®C:
1. Tráº£ lá»i báº±ng tiáº¿ng Viá»‡t, thÃ¢n thiá»‡n
2. XÆ°ng "em", gá»i "chá»‹ Linh"
3. ÄÆ°a ra 5-7 hÃ nh Ä‘á»™ng Cá»¤ THá»‚, cÃ³ thá»ƒ thá»±c hiá»‡n NGAY
4. Má»—i Ä‘á» xuáº¥t pháº£i cÃ³: HÃ nh Ä‘á»™ng + LÃ½ do + Káº¿t quáº£ dá»± kiáº¿n
5. Æ¯u tiÃªn cÃ¡c giáº£i phÃ¡p nhanh, chi phÃ­ tháº¥p
6. Dá»±a trÃªn dá»¯ liá»‡u thá»±c táº¿ Ä‘Æ°á»£c cung cáº¥p
7. Sá»­ dá»¥ng emoji Ä‘á»ƒ dá»… Ä‘á»c

FORMAT:
ðŸŽ¯ Chá»‹ Linh Æ¡i, [TÃ³m táº¯t tÃ¬nh hÃ¬nh]

ðŸ“‹ EM Äá»€ XUáº¤T:
1. [HÃ nh Ä‘á»™ng] - [LÃ½ do] â†’ [Káº¿t quáº£ dá»± kiáº¿n]
2. ...

âš¡ VIá»†C Cáº¦N LÃ€M NGAY:
- [Viá»‡c cáº§n lÃ m hÃ´m nay]

ðŸ’¡ Gá»¢I Ã THÃŠM:
- [Ã tÆ°á»Ÿng dÃ i háº¡n]`
                },
                {
                    role: 'user',
                    content: `Dá»±a trÃªn dá»¯ liá»‡u sau, hÃ£y Ä‘á» xuáº¥t chiáº¿n lÆ°á»£c TÄ‚NG DOANH THU cá»¥ thá»ƒ:\n\n${revenueContext}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1500
        });

        const aiStrategy = completion.choices[0]?.message?.content || 'KhÃ´ng thá»ƒ táº¡o chiáº¿n lÆ°á»£c. Vui lÃ²ng thá»­ láº¡i.';
        
        res.json({
            success: true,
            data: {
                type: 'revenue_strategy',
                message: aiStrategy,
                overview: {
                    currentRevenue: data.currentRevenue,
                    targetRevenue: data.targetRevenue,
                    progress: data.progress,
                    daysRemaining: data.daysRemaining,
                    dailyNeeded: Math.round(data.dailyNeeded)
                },
                suggestions: ['Xem chi tiáº¿t phÃ¢n tÃ­ch', 'BÃ¡o cÃ¡o doanh thu', 'Top sáº£n pháº©m']
            }
        });
    } catch (error) {
        console.error('Error generating revenue AI strategy:', error);
        res.status(500).json({ success: false, message: 'Lá»—i táº¡o chiáº¿n lÆ°á»£c: ' + error.message });
    }
});

module.exports = router;
