const express = require('express');
const router = express.Router();
const db = require('../config/database');
const axios = require('axios'); // Add axios for communicating with Python AI Service

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000/api/ml/admin/chat';

// Bỏ đoạn khởi tạo Groq cũ bằng Node.js

// Tự động tạo các bảng mục tiêu nếu chưa tồn tại
async function initTables() {
    try {
        // Bảng mục tiêu tháng (cũ)
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
        
        // Bảng mục tiêu chi tiết (5 mục tiêu)
        await db.query(`
            CREATE TABLE IF NOT EXISTS muc_tieu_chi_tiet (
                id INT NOT NULL AUTO_INCREMENT,
                thang INT NOT NULL,
                nam INT NOT NULL,
                loai_muc_tieu ENUM('doanh_thu', 'don_hang', 'khach_hang_moi', 'dat_ban', 'danh_gia') NOT NULL,
                ten_muc_tieu VARCHAR(255) NOT NULL,
                mo_ta TEXT,
                gia_tri_muc_tieu DECIMAL(15,2) NOT NULL DEFAULT 0,
                don_vi VARCHAR(50) DEFAULT 'đơn vị',
                icon VARCHAR(50) DEFAULT '🎯',
                thu_tu INT DEFAULT 1,
                ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY thang_nam_loai (thang, nam, loai_muc_tieu)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Bảng lịch sử chatbot (admin + user)
        await db.query(`
            CREATE TABLE IF NOT EXISTS lich_su_chatbot (
                ma_tin_nhan INT NOT NULL AUTO_INCREMENT,
                ma_nguoi_dung INT NULL,
                session_id VARCHAR(255) NOT NULL,
                nguoi_gui ENUM('user', 'bot') NOT NULL,
                noi_dung LONGTEXT NOT NULL,
                thoi_diem_chat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_tin_nhan),
                INDEX idx_session (session_id),
                INDEX idx_user (ma_nguoi_dung),
                INDEX idx_user_session (ma_nguoi_dung, session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('✅ Các bảng mục tiêu và chatbot đã sẵn sàng');
    } catch (error) {
        console.error('❌ Lỗi tạo bảng:', error.message);
    }
}

// Gọi hàm khởi tạo khi module được load
initTables();

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// Lấy dữ liệu thống kê tổng hợp cho AI phân tích
async function getBusinessStats() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Tháng trước
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = currentYear - 1;
    }

    try {
        // Doanh thu tháng này
        const [revenueThisMonth] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [currentMonth, currentYear]);

        // Doanh thu tháng trước
        const [revenueLastMonth] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [prevMonth, prevYear]);

        // Số đơn hàng tháng này
        const [ordersThisMonth] = await db.query(`
            SELECT COUNT(*) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        `, [currentMonth, currentYear]);

        // So‘ đơn hàng tháng trưo›c
        const [ordersLastMonth] = await db.query(`
            SELECT COUNT(*) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        `, [prevMonth, prevYear]);

        // Khách hàng mới tháng này
        const [customersThisMonth] = await db.query(`
            SELECT COUNT(*) as total FROM nguoi_dung 
            WHERE MONTH(ngay_tao) = ? AND YEAR(ngay_tao) = ?
        `, [currentMonth, currentYear]);

        // Äáº·t bàn tháng này
        const [reservationsThisMonth] = await db.query(`
            SELECT COUNT(*) as total FROM dat_ban 
            WHERE MONTH(ngay_dat) = ? AND YEAR(ngay_dat) = ?
        `, [currentMonth, currentYear]);

        // Top 5 món bán chạy tháng này
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

        // Món ít bán nháº¥t
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

        // Äánh giá trung bình
        const [avgRating] = await db.query(`
            SELECT AVG(so_sao) as avg_rating, COUNT(*) as total_reviews FROM danh_gia_san_pham
            WHERE trang_thai = 'approved'
        `);

        // Äơn hàng theo trạng thái
        const [ordersByStatus] = await db.query(`
            SELECT trang_thai, COUNT(*) as count FROM don_hang
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
            GROUP BY trang_thai
        `, [currentMonth, currentYear]);

        // Gio cao đioƒm đáº·t bàn
        const [peakHours] = await db.query(`
            SELECT HOUR(gio_den) as hour, COUNT(*) as count FROM dat_ban
            WHERE MONTH(ngay_dat) = ? AND YEAR(ngay_dat) = ?
            GROUP BY HOUR(gio_den)
            ORDER BY count DESC
            LIMIT 3
        `, [currentMonth, currentYear]);

        // Láº¥y mục tiêu tháng hiện tại (xo­ lÃ½ trưong ho£p báº£ng chưa to“n tại)
        let targetData = [null];
        try {
            const [target] = await db.query(`
                SELECT * FROM muc_tieu_thang 
                WHERE thang = ? AND nam = ?
            `, [currentMonth, currentYear]);
            targetData = target;
        } catch (err) {
            console.log('Báº£ng muc_tieu_thang chưa to“n tại, bo qua...');
            targetData = [];
        }
        
        // Láº¥y 5 mục tiêu chi tiáº¿t
        let goalsData = [];
        try {
            const [goals] = await db.query(`
                SELECT * FROM muc_tieu_chi_tiet 
                WHERE thang = ? AND nam = ?
                ORDER BY thu_tu ASC
            `, [currentMonth, currentYear]);
            
            // Tính tiáº¿n độ cho to«ng mục tiêu
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
                    gia_tri_muc_tieu: Math.round(target), // Làm tròn so‘
                    gia_tri_hien_tai: Math.round(actual), // Làm tròn so‘
                    tien_do: progress
                };
            });
        } catch (err) {
            console.log('Báº£ng muc_tieu_chi_tiet chưa to“n tại, bo qua...');
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

// Phân tích và tạo phản hồi AI
function generateAIResponse(query, stats) {
    const queryLower = query.toLowerCase();
    
    // Format số tiền
    const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    
    // Phân tích câu hỏi và tạo phản hồi
    
    // Báo cáo tổng quan
    if (queryLower.includes('báo cáo') || queryLower.includes('tổng quan') || queryLower.includes('tình hình')) {
        const revenueChange = parseFloat(stats.revenue.change);
        const trend = revenueChange >= 0 ? '📈 tăng' : '📉 giảm';
        
        return {
            type: 'report',
            message: `📊 **BÁO CÁO THÁNG ${stats.currentMonth}/${stats.currentYear}**\n\n` +
                `💰 **Doanh thu:** ${formatMoney(stats.revenue.thisMonth)}\n` +
                `   → ${trend} ${Math.abs(revenueChange)}% so với tháng trước\n\n` +
                `📦 **Đơn hàng:** ${stats.orders.thisMonth} đơn\n` +
                `👥 **Khách hàng mới:** ${stats.customers.newThisMonth} người\n` +
                `🍽️ **Đặt bàn:** ${stats.reservations.thisMonth} lượt\n` +
                `⭐ **Đánh giá TB:** ${parseFloat(stats.avgRating).toFixed(1)}/5 (${stats.totalReviews} đánh giá)\n\n` +
                `🏆 **Top món bán chạy:**\n` +
                stats.topProducts.map((p, i) => `   ${i+1}. ${p.ten_mon} (${p.so_luong_ban} phần)`).join('\n'),
            suggestions: ['Đề xuất chiến lược', 'Phân tích chi tiết', 'Đặt mục tiêu tháng']
        };
    }
    
    // Doanh thu
    if (queryLower.includes('doanh thu')) {
        const revenueChange = parseFloat(stats.revenue.change);
        let analysis = '';
        
        if (revenueChange > 20) {
            analysis = '🎉 Doanh thu tăng trưởng xuất sắc! Hãy duy trì chiến lược hiện tại.';
        } else if (revenueChange > 0) {
            analysis = '👍 Doanh thu tăng nhẹ. Có thể đẩy mạnh marketing để tăng tốc.';
        } else if (revenueChange > -10) {
            analysis = '⚠️ Doanh thu giảm nhẹ. Cần xem xét các chương trình khuyến mãi.';
        } else {
            analysis = '🚨 Doanh thu giảm đáng kể. Cần có chiến lược cải thiện ngay!';
        }
        
        return {
            type: 'revenue',
            message: `💰 **PHÂN TÍCH DOANH THU**\n\n` +
                `Tháng này: ${formatMoney(stats.revenue.thisMonth)}\n` +
                `Tháng trước: ${formatMoney(stats.revenue.lastMonth)}\n` +
                `Thay đổi: ${revenueChange >= 0 ? '+' : ''}${revenueChange}%\n\n` +
                `📍 **Nhận xét:** ${analysis}`,
            suggestions: ['Đề xuất tăng doanh thu', 'Xem món bán chạy', 'Đặt mục tiêu']
        };
    }
    
    // Chiến lược / Đề xuất
    if (queryLower.includes('chiến lược') || queryLower.includes('đề xuất') || queryLower.includes('tăng doanh thu')) {
        const strategies = [];
        
        // Phân tích và đề xuất dựa trên dữ liệu
        if (stats.lowProducts && stats.lowProducts.length > 0) {
            const lowSelling = stats.lowProducts.filter(p => p.so_luong_ban < 5);
            if (lowSelling.length > 0) {
                strategies.push(`🍽️ **Khuyến mãi món ít bán:** ${lowSelling.map(p => p.ten_mon).join(', ')} - Giảm giá 20-30% hoặc combo với món bán chạy`);
            }
        }
        
        if (stats.peakHours && stats.peakHours.length > 0) {
            const peakHour = stats.peakHours[0].hour;
            strategies.push(`⏰ **Tối ưu giờ cao điểm:** Khung giờ ${peakHour}h-${peakHour+2}h có nhiều khách nhất. Tăng nhân viên và chuẩn bị nguyên liệu.`);
        }
        
        if (stats.customers.newThisMonth < 10) {
            strategies.push(`👥 **Thu hút khách mới:** Chạy chương trình "Giới thiệu bạn bè" - Tặng voucher 50k cho cả người giới thiệu và người mới.`);
        }
        
        if (stats.avgRating < 4) {
            strategies.push(`⭐ **Cải thiện đánh giá:** Đánh giá TB ${parseFloat(stats.avgRating).toFixed(1)}/5 cần cải thiện. Tập trung chất lượng món ăn và dịch vụ.`);
        }
        
        strategies.push(`📱 **Marketing online:** Đăng bài thường xuyên trên Facebook/TikTok với hình ảnh món ăn hấp dẫn.`);
        strategies.push(`🤝 **Chương trình thành viên:** Tích điểm đổi quà, giảm giá cho khách quen.`);
        
        return {
            type: 'strategy',
            message: `🎯 **ĐỀ XUẤT CHIẾN LƯỢC THÁNG ${stats.currentMonth}**\n\n` +
                strategies.join('\n\n'),
            suggestions: ['Đặt mục tiêu cụ thể', 'Xem báo cáo chi tiết', 'Phân tích đối thủ']
        };
    }
    
    // Mục tiêu - hiển thị 5 mục tiêu chi tiết
    if (queryLower.includes('mục tiêu') || queryLower.includes('target') || queryLower.includes('kpi') || queryLower.includes('tiến độ')) {
        // Nếu có goals chi tiết
        if (stats.goals && stats.goals.length > 0) {
            const goalsText = stats.goals.map(g => {
                const statusIcon = g.tien_do >= 100 ? '✅' : g.tien_do >= 70 ? 'ðŸ”¥' : g.tien_do >= 40 ? 'âš¡' : '🎯';
                const valueText = g.loai_muc_tieu === 'doanh_thu' 
                    ? `${formatMoney(g.gia_tri_hien_tai)} / ${formatMoney(g.gia_tri_muc_tieu)}`
                    : `${g.gia_tri_hien_tai} / ${g.gia_tri_muc_tieu} ${g.don_vi}`;
                return `${g.icon} **${g.ten_muc_tieu}:** ${valueText} (${statusIcon} ${g.tien_do}%)`;
            }).join('\n');
            
            const totalProgress = Math.round(stats.goals.reduce((sum, g) => sum + g.tien_do, 0) / stats.goals.length);
            const completedCount = stats.goals.filter(g => g.tien_do >= 100).length;
            
            return {
                type: 'goals',
                message: `🎯 **5 Mo¤C TIÃŠU THÃNG ${stats.currentMonth}/${stats.currentYear}**\n\n` +
                    goalsText + `\n\n` +
                    `📊 **To•ng tiáº¿n độ:** ${totalProgress}%\n` +
                    `✅ **Hoàn thành:** ${completedCount}/5 mục tiêu\n\n` +
                    `💡 *Mục tiêu đã được tạo cho tháng này. Hãy hỏi "đề xuất chiến lược" để cải thiện!*`,
                suggestions: ['Đề xuất chiến lược', 'Xem báo cáo', 'Món bán chạy']
            };
        }
        
        // Nếu chưa có goals, đề xuất tạo mới
        return {
            type: 'no_goals',
            message: `🎯 **CHƯA CÓ MỤC TIÊU THÁNG ${stats.currentMonth}**\n\n` +
                `Bạn chưa đặt mục tiêu cho tháng này.\n\n` +
                `Tôi có thể tự động tạo 5 mục tiêu dựa trên dữ liệu tháng trước:\n` +
                `💰 Doanh thu (tăng 15%)\n` +
                `📦 Số đơn hàng (tăng 20%)\n` +
                `👥 Khách hàng mới (tăng 25%)\n` +
                `🍽️ Lượt đặt bàn (tăng 15%)\n` +
                `⭐ Đánh giá tích cực (tăng 30%)\n\n` +
                `Nhấn nút "AI Tạo mục tiêu" trên dashboard hoặc nói "tạo mục tiêu" để bắt đầu!`,
            suggestions: ['Tạo mục tiêu', 'Xem báo cáo', 'Đề xuất chiến lược'],
            action: 'generate_goals'
        };
    }
    
    // Tạo mục tiêu - kiểm tra xem đã có chưa
    if (queryLower.includes('tạo mục tiêu') || queryLower.includes('đặt mục tiêu')) {
        // Nếu đã có mục tiêu, không cho tạo mới
        if (stats.goals && stats.goals.length > 0) {
            return {
                type: 'info',
                message: `⚠️ **MỤC TIÊU ĐÃ ĐƯỢC TẠO**\n\n` +
                    `Tháng ${stats.currentMonth}/${stats.currentYear} đã có 5 mục tiêu.\n` +
                    `Mỗi tháng chỉ được tạo mục tiêu 1 lần để đảm bảo tính nhất quán.\n\n` +
                    `Bạn có thể:\n` +
                    `• Xem tiến độ hiện tại\n` +
                    `• Nhờ AI đề xuất chiến lược cải thiện\n` +
                    `• Chờ sang tháng mới để tạo mục tiêu mới`,
                suggestions: ['Xem tiến độ mục tiêu', 'Đề xuất chiến lược', 'Báo cáo tháng này']
            };
        }
        
        return {
            type: 'action',
            message: `🎯 **TẠO MỤC TIÊU TỰ ĐỘNG**\n\n` +
                `Tôi sẽ phân tích dữ liệu tháng trước và tạo 5 mục tiêu phù hợp cho tháng ${stats.currentMonth}.\n\n` +
                `⚠️ **Lưu ý:** Mỗi tháng chỉ được tạo mục tiêu 1 lần!\n\n` +
                `Nhấn nút bên dưới để bắt đầu:`,
            suggestions: ['Xem báo cáo', 'Đề xuất chiến lược'],
            action: 'generate_goals',
            showGenerateButton: true
        };
    }
    
    // Đề xuất chiến lược dựa trên tình hình thực tế
    if (queryLower.includes('chiến lược') || queryLower.includes('đề xuất') || queryLower.includes('cải thiện') || queryLower.includes('strategy')) {
        const strategies = [];
        
        if (stats.goals && stats.goals.length > 0) {
            // Phân tích từng mục tiêu và đề xuất
            const lowGoals = stats.goals.filter(g => g.tien_do < 50);
            const mediumGoals = stats.goals.filter(g => g.tien_do >= 50 && g.tien_do < 80);
            const highGoals = stats.goals.filter(g => g.tien_do >= 80);
            
            strategies.push(`📊 **PHÂN TÍCH TÌNH HÌNH THÁNG ${stats.currentMonth}**`);
            
            if (lowGoals.length > 0) {
                strategies.push(`\n🔴 **Cần cải thiện gấp (< 50%):**`);
                lowGoals.forEach(g => {
                    strategies.push(`• ${g.icon} ${g.ten_muc_tieu}: ${g.tien_do}%`);
                    // Đề xuất cụ thể cho từng loại
                    if (g.loai_muc_tieu === 'doanh_thu') {
                        strategies.push(`  → Tăng cường khuyến mãi, combo tiết kiệm`);
                        strategies.push(`  → Đẩy mạnh marketing trên mạng xã hội`);
                    } else if (g.loai_muc_tieu === 'don_hang') {
                        strategies.push(`  â†’ Giáº£m giá ship, mio…n phí ship đơn to« 200k`);
                        strategies.push(`  â†’ Tạo flash sale vào gio cao đioƒm`);
                    } else if (g.loai_muc_tieu === 'khach_hang_moi') {
                        strategies.push(`  â†’ Chương trình gio›i thiệu bạn bè`);
                        strategies.push(`  â†’ Æ¯u đãi khách hàng mo›i láº§n đáº§u`);
                    } else if (g.loai_muc_tieu === 'dat_ban') {
                        strategies.push(`  â†’ Æ¯u đãi đáº·t bàn trưo›c 2 ngày`);
                        strategies.push(`  â†’ Combo đáº·t bàn + món đáº·c biệt`);
                    } else if (g.loai_muc_tieu === 'danh_gia') {
                        strategies.push(`  â†’ Táº·ng voucher cho khách đánh giá`);
                        strategies.push(`  â†’ Nháº¯c nhở khách sau khi hoàn thành đơn`);
                    }
                });
            }
            
            if (mediumGoals.length > 0) {
                strategies.push(`\nðŸŸ¡ **Äang tiáº¿n trioƒn (50-80%):**`);
                mediumGoals.forEach(g => {
                    strategies.push(`• ${g.icon} ${g.ten_muc_tieu}: ${g.tien_do}% - Tiáº¿p to¥c duy trì!`);
                });
            }
            
            if (highGoals.length > 0) {
                strategies.push(`\nðŸŸ¢ **Sắp hoàn thành (> 80%):**`);
                highGoals.forEach(g => {
                    strategies.push(`• ${g.icon} ${g.ten_muc_tieu}: ${g.tien_do}% - Tuyệt vời! 🎉`);
                });
            }
            
            // Ä o  xuáº¥t to•ng ho£p
            const totalProgress = Math.round(stats.goals.reduce((sum, g) => sum + g.tien_do, 0) / stats.goals.length);
            strategies.push(`\n💡 **TỔNG KẾT:**`);
            strategies.push(`Tiến độ tổng: ${totalProgress}%`);
            
            if (totalProgress < 50) {
                strategies.push(`\nâš¡ **Hành động ngay:**`);
                strategies.push(`1. Tập trung vào ${lowGoals.length} mục tiêu đang tháº¥p`);
                strategies.push(`2. Chạy chương trình khuyến mãi cuối tháng`);
                strategies.push(`3. Tăng cường quảng cáo trên Facebook/Zalo`);
            } else if (totalProgress < 80) {
                strategies.push(`\n📈 **Đề xuất:**`);
                strategies.push(`1. Duy trì đà tăng trưởng hiện tại`);
                strategies.push(`2. Táº­p trung cải thiện các mục tiêu dưới 70%`);
            } else {
                strategies.push(`\n🎯 **Xuất sắc!** Tiáº¿p to¥c phát huy!`);
            }
        } else {
            strategies.push(`📊 **CHƯA CÓ MỤC TIÊU**\n`);
            strategies.push(`Hãy tạo mục tiêu trước để AI có thoƒ đo xuáº¥t chiến lược phù hợp.`);
        }
        
        return {
            type: 'strategy',
            message: strategies.join('\n'),
            suggestions: ['Xem tiến độ mục tiêu', 'Báo cáo doanh thu', 'Món bán chạy']
        };
    }
    
    // Món bán chạy
    if (queryLower.includes('món bán chạy') || queryLower.includes('top') || queryLower.includes('best seller')) {
        return {
            type: 'products',
            message: `ðŸ† **TOP MÃ“N BÃN CHáº Y THÃNG ${stats.currentMonth}**\n\n` +
                stats.topProducts.map((p, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                    return `${medal} ${p.ten_mon}: ${p.so_luong_ban} phần`;
                }).join('\n') +
                `\n\n📉 **Món cần đẩy mạnh:**\n` +
                stats.lowProducts.slice(0, 3).map(p => `   • ${p.ten_mon} (${p.so_luong_ban} phần)`).join('\n'),
            suggestions: ['Äo xuáº¥t khuyến mãi', 'Xem doanh thu', 'Chiến lược marketing']
        };
    }
    
    // Máº·c đo‹nh - hưo›ng dáº«n
    return {
        type: 'help',
        message: `👋 **Xin chào! Tôi là trợ lý AI của bạn.**\n\n` +
            `Tôi có thể giúp bạn:\n` +
            `📊 Xem báo cáo tổng quan\n` +
            `💰 Phân tích doanh thu\n` +
            `🎯 Đặt và theo dõi mục tiêu\n` +
            `📈 Đề xuất chiến lược kinh doanh\n` +
            `🍽️ Phân tích món ăn bán chạy\n\n` +
            `Hãy hỏi tôi bất cứ điều gì!`,
        suggestions: ['Báo cáo tháng này', 'Đề xuất chiến lược', 'Đặt mục tiêu', 'Món bán chạy']
    };
}

// API: Chat với AI (Python / Langchain - Llama 3)
router.post('/chat', requireAdmin, async (req, res) => {
    try {
        const { message, session_id } = req.body;
        
        if (!message) {
            return res.status(400).json({ success: false, message: 'Thiếu nội dung tin nhắn' });
        }
        
        // Lấy admin ID từ session
        const adminId = req.session?.admin?.ma_admin || null;
        const sessionId = session_id || 'admin_guest_' + Date.now();
        
        console.log('🔍 Admin chat debug: (Via Python AI Service)');
        console.log('- Admin ID:', adminId);
        console.log('- Session ID:', sessionId);
        
        // Lưu tin nhắn user vào lịch sử
        try {
            await db.query(
                `INSERT INTO lich_su_chatbot (ma_nguoi_dung, session_id, nguoi_gui, noi_dung) VALUES (?, ?, 'user', ?)`,
                [adminId, sessionId, message]
            );
        } catch (historyError) {
            console.error('Error saving user message to history:', historyError);
        }
        
        // Gọi Python AI Service
        let aiResponse = '';
        try {
            const pythonResponse = await axios.post(AI_SERVICE_URL, {
                question: message,
                session_id: sessionId
            }, { timeout: 30000 }); // Langchain agent có thể cần thời gian chạy truy vấn

            if (pythonResponse.data && pythonResponse.data.success) {
                aiResponse = pythonResponse.data.answer;
            } else {
                throw new Error("Python API returned unsuccessful response");
            }
        } catch (pyError) {
            console.error('Lỗi khi gọi Python AI service:', pyError.message);
            
            // Fallback về hệ thống cũ nếu Python timeout hoặc lỗi
            const stats = await getBusinessStats();
            const fallbackObj = generateAIResponse(message, stats);
            aiResponse = fallbackObj.message;
        }

        // Lưu tin nhắn bot vào lịch sử
        try {
            await db.query(
                `INSERT INTO lich_su_chatbot (ma_nguoi_dung, session_id, nguoi_gui, noi_dung) VALUES (?, ?, 'bot', ?)`,
                [adminId, sessionId, aiResponse]
            );
        } catch (historyError) {
            console.error('Error saving bot message to history:', historyError);
        }
        
        res.json({
            success: true,
            data: {
                type: 'ai_response',
                message: aiResponse,
                suggestions: ['Doanh thu tháng này', 'Sản phẩm nào đang bán chạy?', 'Phân tích chiến lược giảm giá']
            }
        });
    } catch (error) {
        console.error('Error in admin chatbot:', error);
        res.status(500).json({ success: false, message: 'Lỗi xử lý tin nhắn: ' + error.message });
    }
});

// API: Láº¥y mục tiêu tháng hiện tại
router.get('/target', requireAdmin, async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        // Xo­ lÃ½ trưong ho£p báº£ng chưa to“n tại
        let target = [];
        try {
            const [result] = await db.query(`
                SELECT * FROM muc_tieu_thang WHERE thang = ? AND nam = ?
            `, [currentMonth, currentYear]);
            target = result;
        } catch (err) {
            console.log('Báº£ng muc_tieu_thang chưa to“n tại');
            target = [];
        }
        
        // Láº¥y doanh thu và đơn hàng hiện tại
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
        res.status(500).json({ success: false, message: 'Lo—i láº¥y mục tiêu' });
    }
});

// API: Äáº·t/Cáº­p nháº­t mục tiêu tháng
router.post('/target', requireAdmin, async (req, res) => {
    try {
        const { muc_tieu_doanh_thu, muc_tieu_don_hang, ghi_chu } = req.body;
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        // Upsert mục tiêu
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
            message: 'Äã cáº­p nháº­t mục tiêu tháng'
        });
    } catch (error) {
        console.error('Error setting target:', error);
        res.status(500).json({ success: false, message: 'Lo—i đáº·t mục tiêu: ' + error.message });
    }
});

// API: Láº¥y do¯ liệu cho bioƒu đo“ gauge (to· lệ hoàn thành)
router.get('/gauge-data', requireAdmin, async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        // Láº¥y mục tiêu (xo­ lÃ½ trưong ho£p báº£ng chưa to“n tại)
        let target = [];
        try {
            const [result] = await db.query(`
                SELECT * FROM muc_tieu_thang WHERE thang = ? AND nam = ?
            `, [currentMonth, currentYear]);
            target = result;
        } catch (err) {
            console.log('Báº£ng muc_tieu_thang chưa to“n tại');
            target = [];
        }
        
        // Láº¥y doanh thu hiện tại
        const [revenue] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [currentMonth, currentYear]);
        
        let percentage = 0;
        let targetAmount = 100000000; // Máº·c đo‹nh 100 triệu
        
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
        res.status(500).json({ success: false, message: 'Lo—i láº¥y do¯ liệu' });
    }
});

// API: Láº¥y 5 mục tiêu chi tiáº¿t vo›i tiáº¿n độ thực tế
router.get('/goals', requireAdmin, async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentDate = new Date();
        // So­ do¥ng tháng/năm to« query hoáº·c máº·c đo‹nh là tháng/năm hiện tại
        const targetMonth = month ? parseInt(month) : (currentDate.getMonth() + 1);
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();
        
        // Láº¥y mục tiêu đã lưu
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
        
        // Láº¥y do¯ liệu thực tế to« database
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
        
        // Map do¯ liệu thực tế
        const actualData = {
            doanh_thu: parseFloat(revenueData[0].total) || 0,
            don_hang: parseInt(ordersData[0].total) || 0,
            khach_hang_moi: parseInt(customersData[0].total) || 0,
            dat_ban: parseInt(reservationsData[0].total) || 0,
            danh_gia: parseInt(reviewsData[0].total) || 0
        };
        
        // Náº¿u chưa có mục tiêu, tráº£ vo máº£ng ro—ng vo›i do¯ liệu thực tế
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
        
        // Tính tiáº¿n độ cho to«ng mục tiêu
        const goalsWithProgress = goals.map(goal => {
            const actual = actualData[goal.loai_muc_tieu] || 0;
            const target = parseFloat(goal.gia_tri_muc_tieu) || 1;
            const progress = Math.min(100, Math.round((actual / target) * 100));
            
            return {
                ...goal,
                gia_tri_muc_tieu: Math.round(target), // Làm tròn so‘, bo .00
                gia_tri_hien_tai: Math.round(actual), // Làm tròn so‘
                tien_do: progress,
                hoan_thanh: progress >= 100
            };
        });
        
        // Tính to•ng tiáº¿n độ
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
        res.status(500).json({ success: false, message: 'Lo—i láº¥y mục tiêu: ' + error.message });
    }
});

// API: AI tự động tạo 5 mục tiêu dựa trên do¯ liệu tháng trưo›c
// CHoˆ CHO PHÃ‰P Táº O 1 Láº¦N/THÃNG
router.post('/goals/generate', requireAdmin, async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        // Kioƒm tra xem đã có mục tiêu cho tháng này chưa
        const [existingGoals] = await db.query(`
            SELECT COUNT(*) as count FROM muc_tieu_chi_tiet 
            WHERE thang = ? AND nam = ?
        `, [currentMonth, currentYear]);
        
        if (existingGoals[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Mo¥c tiêu tháng ${currentMonth}/${currentYear} đã đưo£c tạo. Mo—i tháng cho‰ đưo£c tạo mục tiêu 1 láº§n. Bạn có thoƒ xem tiáº¿n độ hoáº·c nho AI đo xuáº¥t chiến lược cải thiện.`,
                alreadyExists: true
            });
        }
        
        // Tháng trưo›c
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = currentYear - 1;
        }
        
        // Láº¥y do¯ liệu tháng trưo›c
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
        
        // Láº¥y do¯ liệu hiện tại co§a tháng này đoƒ phân tích
        const [currentRevenue] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
        `, [currentMonth, currentYear]);
        
        const [currentOrders] = await db.query(`
            SELECT COUNT(*) as total FROM don_hang 
            WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        `, [currentMonth, currentYear]);
        
        // Tính so‘ ngày đã qua trong tháng và so‘ ngày còn lại
        const dayOfMonth = currentDate.getDate();
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const daysRemaining = daysInMonth - dayOfMonth;
        const progressRatio = dayOfMonth / daysInMonth; // To· lệ thoi gian đã qua
        
        // Phân tích do¯ liệu tháng trưo›c
        const prevRevenueVal = parseFloat(prevRevenue[0].total) || 0;
        const prevOrdersVal = parseInt(prevOrders[0].total) || 0;
        const prevCustomersVal = parseInt(prevCustomers[0].total) || 0;
        const prevReservationsVal = parseInt(prevReservations[0].total) || 0;
        const prevReviewsVal = parseInt(prevReviews[0].total) || 0;
        
        // Do¯ liệu hiện tại
        const currentRevenueVal = parseFloat(currentRevenue[0].total) || 0;
        const currentOrdersVal = parseInt(currentOrders[0].total) || 0;
        
        // AI phân tích và đo xuáº¥t mục tiêu thông minh
        // Náº¿u có do¯ liệu tháng trưo›c -> tăng 10-15%
        // Náº¿u không có -> dựa trên do¯ liệu hiện tại ưo›c tính cáº£ tháng
        // Náº¿u cáº£ 2 đou không có -> đáº·t mục tiêu khởi đáº§u ho£p lÃ½
        
        let targetRevenue, targetOrders, targetCustomers, targetReservations, targetReviews;
        let revenueDesc, ordersDesc, customersDesc, reservationsDesc, reviewsDesc;
        
        // Doanh thu - LUÃ”N đưa ra con so‘ co¥ thoƒ
        if (prevRevenueVal > 0) {
            // Có do¯ liệu tháng trưo›c -> tăng 10%
            targetRevenue = Math.round(prevRevenueVal * 1.1 / 1000000) * 1000000; // Làm tròn triệu
            if (targetRevenue < 1000000) targetRevenue = Math.round(prevRevenueVal * 1.1 / 100000) * 100000; // Làm tròn trăm nghìn náº¿u nho
            revenueDesc = `Tăng 10% so với tháng trước (${new Intl.NumberFormat('vi-VN').format(prevRevenueVal)}đ)`;
        } else if (currentRevenueVal > 0 && progressRatio > 0.1) {
            // Æ¯o›c tính doanh thu cáº£ tháng dựa trên hiện tại
            const estimatedRevenue = Math.round(currentRevenueVal / progressRatio);
            targetRevenue = Math.round(estimatedRevenue * 1.05 / 1000000) * 1000000; // Tăng 5%
            if (targetRevenue < 1000000) targetRevenue = Math.round(estimatedRevenue * 1.05 / 100000) * 100000;
            revenueDesc = `Dựa trên xu hưo›ng hiện tại (${new Intl.NumberFormat('vi-VN').format(currentRevenueVal)}đ đã đạt)`;
        } else if (currentRevenueVal > 0) {
            // Có doanh thu nhưng còn ít ngày -> ưo›c tính dựa trên trung bình ngày
            const avgPerDay = currentRevenueVal / Math.max(1, dayOfMonth);
            targetRevenue = Math.round(avgPerDay * daysInMonth * 1.1 / 100000) * 100000;
            if (targetRevenue < 500000) targetRevenue = 500000;
            revenueDesc = `Æ¯o›c tính to« doanh thu hiện tại (${new Intl.NumberFormat('vi-VN').format(currentRevenueVal)}đ)`;
        } else {
            // Không có do¯ liệu -> đáº·t mục tiêu khởi đáº§u co¥ thoƒ
            targetRevenue = 10000000; // 10 triệu - mục tiêu khởi đáº§u rÃµ ràng
            revenueDesc = 'Mo¥c tiêu khởi đáº§u: 10 triệu đo“ng/tháng';
        }
        // Äáº£m báº£o luôn có giá tro‹ to‘i thioƒu
        if (!targetRevenue || targetRevenue <= 0) {
            targetRevenue = 10000000;
            revenueDesc = 'Mo¥c tiêu máº·c đo‹nh: 10 triệu đo“ng/tháng';
        }
        
        // Äơn hàng
        if (prevOrdersVal > 0) {
            targetOrders = Math.max(5, Math.round(prevOrdersVal * 1.1)); // Tăng 10%
            ordersDesc = `Tăng 10% so với tháng trước (${prevOrdersVal} đơn)`;
        } else if (currentOrdersVal > 0 && progressRatio > 0.1) {
            const estimatedOrders = Math.round(currentOrdersVal / progressRatio);
            targetOrders = Math.max(5, Math.round(estimatedOrders * 1.05));
            ordersDesc = `Dựa trên xu hưo›ng hiện tại (${currentOrdersVal} đơn đã có)`;
        } else {
            targetOrders = 10; // Mo¥c tiêu khởi đáº§u
            ordersDesc = 'Mo¥c tiêu khởi đáº§u cho quán mo›i';
        }
        
        // Khách hàng mới
        if (prevCustomersVal > 0) {
            targetCustomers = Math.max(3, Math.round(prevCustomersVal * 1.15)); // Tăng 15%
            customersDesc = `Tăng 15% so với tháng trước (${prevCustomersVal} khách)`;
        } else {
            targetCustomers = 5;
            customersDesc = 'Mo¥c tiêu thu hÃºt khách hàng mo›i';
        }
        
        // Äáº·t bàn
        if (prevReservationsVal > 0) {
            targetReservations = Math.max(3, Math.round(prevReservationsVal * 1.1)); // Tăng 10%
            reservationsDesc = `Tăng 10% so với tháng trước (${prevReservationsVal} lưo£t)`;
        } else {
            targetReservations = 5;
            reservationsDesc = 'Mo¥c tiêu đáº·t bàn cho quán';
        }
        
        // Äánh giá
        if (prevReviewsVal > 0) {
            targetReviews = Math.max(2, Math.round(prevReviewsVal * 1.2)); // Tăng 20%
            reviewsDesc = `Tăng 20% so với tháng trước (${prevReviewsVal} đánh giá)`;
        } else {
            targetReviews = 3;
            reviewsDesc = 'Mo¥c tiêu thu tháº­p đánh giá to« khách';
        }
        
        // 5 mục tiêu đưo£c AI đo xuáº¥t
        const goals = [
            {
                loai_muc_tieu: 'doanh_thu',
                ten_muc_tieu: 'Doanh thu tháng',
                mo_ta: revenueDesc,
                gia_tri_muc_tieu: targetRevenue,
                don_vi: 'đo“ng',
                icon: '💰',
                thu_tu: 1
            },
            {
                loai_muc_tieu: 'don_hang',
                ten_muc_tieu: 'So‘ đơn hàng',
                mo_ta: ordersDesc,
                gia_tri_muc_tieu: targetOrders,
                don_vi: 'đơn',
                icon: '📦',
                thu_tu: 2
            },
            {
                loai_muc_tieu: 'khach_hang_moi',
                ten_muc_tieu: 'Khách hàng mới',
                mo_ta: customersDesc,
                gia_tri_muc_tieu: targetCustomers,
                don_vi: 'ngưoi',
                icon: '👥',
                thu_tu: 3
            },
            {
                loai_muc_tieu: 'dat_ban',
                ten_muc_tieu: 'Lưo£t đáº·t bàn',
                mo_ta: reservationsDesc,
                gia_tri_muc_tieu: targetReservations,
                don_vi: 'lưo£t',
                icon: 'ðŸ½ï¸',
                thu_tu: 4
            },
            {
                loai_muc_tieu: 'danh_gia',
                ten_muc_tieu: 'Äánh giá tích cực',
                mo_ta: reviewsDesc,
                gia_tri_muc_tieu: targetReviews,
                don_vi: 'đánh giá',
                icon: 'â­',
                thu_tu: 5
            }
        ];
        
        // Lưu vào database (upsert)
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
            message: 'Äã tạo 5 mục tiêu cho tháng ' + currentMonth,
            data: goals
        });
    } catch (error) {
        console.error('Error generating goals:', error);
        res.status(500).json({ success: false, message: 'Lo—i tạo mục tiêu: ' + error.message });
    }
});

// API: Cáº­p nháº­t một mục tiêu co¥ thoƒ
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
        
        res.json({ success: true, message: 'Äã cáº­p nháº­t mục tiêu' });
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ success: false, message: 'Lo—i cáº­p nháº­t mục tiêu' });
    }
});

// API: Xóa táº¥t cáº£ mục tiêu tháng hiện tại
router.delete('/goals', requireAdmin, async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        await db.query(`
            DELETE FROM muc_tieu_chi_tiet WHERE thang = ? AND nam = ?
        `, [currentMonth, currentYear]);
        
        res.json({ success: true, message: 'Äã xóa táº¥t cáº£ mục tiêu' });
    } catch (error) {
        console.error('Error deleting goals:', error);
        res.status(500).json({ success: false, message: 'Lo—i xóa mục tiêu' });
    }
});

// ========== API BÃO CÃO To”NG Ho¢P Mo¤C TIÃŠU ==========

// API: Báo cáo to•ng ho£p mục tiêu theo tháng/năm
router.get('/goals/report', requireAdmin, async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentDate = new Date();
        const reportMonth = parseInt(month) || currentDate.getMonth() + 1;
        const reportYear = parseInt(year) || currentDate.getFullYear();
        
        // Láº¥y mục tiêu co§a tháng đưo£c chon
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
                    message: `Chưa có mục tiêu cho tháng ${reportMonth}/${reportYear}`,
                    month: reportMonth,
                    year: reportYear
                }
            });
        }
        
        // Láº¥y do¯ liệu thực tế co§a tháng đó
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
        
        // Map do¯ liệu thực tế
        const actualData = {
            doanh_thu: parseFloat(revenueData[0].total) || 0,
            don_hang: parseInt(ordersData[0].total) || 0,
            khach_hang_moi: parseInt(customersData[0].total) || 0,
            dat_ban: parseInt(reservationsData[0].total) || 0,
            danh_gia: parseInt(reviewsData[0].total) || 0
        };
        
        // Tính tiáº¿n độ và đánh giá to«ng mục tiêu
        const goalsReport = goals.map(goal => {
            const actual = actualData[goal.loai_muc_tieu] || 0;
            const target = parseFloat(goal.gia_tri_muc_tieu) || 1;
            const progress = Math.round((actual / target) * 100);
            const difference = actual - target;
            
            let status, statusColor, evaluation;
            if (progress >= 100) {
                status = 'Hoàn thành';
                statusColor = 'green';
                evaluation = 'ðŸŽ‰ Xuất sắc! Vưo£t mục tiêu';
            } else if (progress >= 80) {
                status = 'Gáº§n đạt';
                statusColor = 'blue';
                evaluation = 'ðŸ‘ To‘t! Cáº§n co‘ gáº¯ng thêm một chÃºt';
            } else if (progress >= 50) {
                status = 'Äang tiáº¿n trioƒn';
                statusColor = 'yellow';
                evaluation = 'âš¡ Cáº§n tăng to‘c đoƒ đạt mục tiêu';
            } else {
                status = 'Cáº§n cải thiện';
                statusColor = 'red';
                evaluation = 'ðŸ”´ Cáº§n xem xét lại chiến lược';
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
        
        // Tính to•ng ho£p
        const totalProgress = Math.round(goalsReport.reduce((sum, g) => sum + g.tien_do, 0) / goalsReport.length);
        const completedCount = goalsReport.filter(g => g.hoan_thanh).length;
        const nearCompletedCount = goalsReport.filter(g => g.tien_do >= 80 && g.tien_do < 100).length;
        const needImprovementCount = goalsReport.filter(g => g.tien_do < 50).length;
        
        // Äánh giá to•ng thoƒ
        let overallEvaluation, overallStatus;
        if (totalProgress >= 100) {
            overallStatus = 'Xuáº¥t sáº¯c';
            overallEvaluation = 'ðŸ† Tháng này hoàn thành xuáº¥t sáº¯c táº¥t cáº£ mục tiêu!';
        } else if (totalProgress >= 80) {
            overallStatus = 'To‘t';
            overallEvaluation = 'âœ¨ Káº¿t quáº£ to‘t! Háº§u háº¿t mục tiêu đã đạt hoáº·c gáº§n đạt.';
        } else if (totalProgress >= 60) {
            overallStatus = 'Khá';
            overallEvaluation = '📊 Káº¿t quáº£ khá. Cáº§n cải thiện một so‘ mục tiêu.';
        } else if (totalProgress >= 40) {
            overallStatus = 'Trung bình';
            overallEvaluation = 'âš ï¸ Káº¿t quáº£ trung bình. Cáº§n xem xét lại chiến lược kinh doanh.';
        } else {
            overallStatus = 'Cáº§n cải thiện';
            overallEvaluation = 'ðŸ”´ Káº¿t quáº£ chưa đạt. Cáº§n phân tích nguyên nhân và điou cho‰nh.';
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
        res.status(500).json({ success: false, message: 'Lo—i láº¥y báo cáo: ' + error.message });
    }
});

// API: Láº¥y lo‹ch so­ mục tiêu các tháng trưo›c
router.get('/goals/history', requireAdmin, async (req, res) => {
    try {
        // Láº¥y danh sách các tháng đã có mục tiêu
        const [months] = await db.query(`
            SELECT DISTINCT thang, nam, 
                   COUNT(*) as so_muc_tieu,
                   MIN(ngay_tao) as ngay_tao
            FROM muc_tieu_chi_tiet 
            GROUP BY thang, nam
            ORDER BY nam DESC, thang DESC
            LIMIT 12
        `);
        
        // Láº¥y tiáº¿n độ to•ng ho£p cho mo—i tháng
        const historyWithProgress = await Promise.all(months.map(async (m) => {
            const [goals] = await db.query(`
                SELECT loai_muc_tieu, gia_tri_muc_tieu FROM muc_tieu_chi_tiet 
                WHERE thang = ? AND nam = ?
            `, [m.thang, m.nam]);
            
            // Láº¥y do¯ liệu thực tế
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
            
            // Tính tiáº¿n độ trung bình
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
        res.status(500).json({ success: false, message: 'Lo—i láº¥y lo‹ch so­: ' + error.message });
    }
});

// API: AI phân tích và đo xuáº¥t chiến lược dựa trên mục tiêu
router.post('/goals/ai-strategy', requireAdmin, async (req, res) => {
    try {
        const stats = await getBusinessStats();
        
        if (!stats || !stats.goals || stats.goals.length === 0) {
            return res.json({
                success: true,
                data: {
                    message: 'Chưa có mục tiêu đoƒ phân tích. Hãy tạo mục tiêu trưo›c!',
                    suggestions: ['Tạo mục tiêu']
                }
            });
        }
        
        // Phân tích mục tiêu
        const lowGoals = stats.goals.filter(g => g.tien_do < 50);
        const mediumGoals = stats.goals.filter(g => g.tien_do >= 50 && g.tien_do < 80);
        const highGoals = stats.goals.filter(g => g.tien_do >= 80);
        
        // Tạo context cho AI
        const analysisContext = `
Phân tích mục tiêu tháng ${stats.currentMonth}/${stats.currentYear}:

📊 To”NG QUAN:
- Tiáº¿n độ trung bình: ${Math.round(stats.goals.reduce((sum, g) => sum + g.tien_do, 0) / stats.goals.length)}%
- Hoàn thành: ${stats.goals.filter(g => g.tien_do >= 100).length}/${stats.goals.length} mục tiêu

ðŸ”´ Cáº¦N Cáº¢I THIo†N Gáº¤P (< 50%):
${lowGoals.length > 0 ? lowGoals.map(g => `- ${g.ten_muc_tieu}: ${g.tien_do}% (${g.gia_tri_hien_tai}/${g.gia_tri_muc_tieu})`).join('\n') : 'Không có'}

ðŸŸ¡ ÄANG TIáº¾N TRIo‚N (50-80%):
${mediumGoals.length > 0 ? mediumGoals.map(g => `- ${g.ten_muc_tieu}: ${g.tien_do}%`).join('\n') : 'Không có'}

ðŸŸ¢ Sáº®P HOÃ€N THÃ€NH (> 80%):
${highGoals.length > 0 ? highGoals.map(g => `- ${g.ten_muc_tieu}: ${g.tien_do}%`).join('\n') : 'Không có'}

Do® LIo†U Bo” SUNG:
- Doanh thu tháng này: ${new Intl.NumberFormat('vi-VN').format(stats.revenueThisMonth)}đ
- Doanh thu tháng trưo›c: ${new Intl.NumberFormat('vi-VN').format(stats.revenueLastMonth)}đ
- So‘ đơn hàng: ${stats.ordersThisMonth} (tháng trưo›c: ${stats.ordersLastMonth})
- Ngày còn lại trong tháng: ${new Date(stats.currentYear, stats.currentMonth, 0).getDate() - new Date().getDate()}
`;

        // Goi Groq AI đoƒ phân tích
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `Bạn là "Phương Nam" - tro£ lÃ½ AI co§a nhà hàng "Ẩm Thực Phương Nam".
Cho§ nhà hàng là chị Linh. Xưng "em", goi "chị Linh".

Hãy phân tích do¯ liệu và đưa ra chiến lược Co¤ THo‚, THo°C Táº¾ đoƒ đạt mục tiêu.

Quy táº¯c:
- Tráº£ loi báº±ng tiếng Việt, thân thiện
- Xưng "em", goi "chị Linh"
- Äưa ra 3-5 hành động co¥ thoƒ, có thoƒ thực hiện ngay
- Æ¯u tiên các mục tiêu đang tháº¥p nháº¥t
- Äo xuáº¥t pháº£i phù hợp vo›i nhà hàng Việt Nam
- So­ do¥ng emoji và format rÃµ ràng`
                },
                {
                    role: 'user',
                    content: `Dựa trên do¯ liệu sau, hãy đo xuáº¥t chiến lược co¥ thoƒ để cải thiện các mục tiêu:\n\n${analysisContext}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1024
        });

        const aiStrategy = completion.choices[0]?.message?.content || 'Không thoƒ tạo chiến lược. Vui lòng tho­ lại.';
        
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
                suggestions: ['Xem chi tiáº¿t mục tiêu', 'Báo cáo tháng', 'Lo‹ch so­ mục tiêu']
            }
        });
    } catch (error) {
        console.error('Error generating AI strategy:', error);
        res.status(500).json({ success: false, message: 'Lo—i tạo chiến lược: ' + error.message });
    }
});

// ========== CHIáº¾N LÆ¯o¢C DOANH THU CHI TIáº¾T ==========

// Hàm phân tích doanh thu chuyên sâu
async function analyzeRevenueData() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const dayOfMonth = currentDate.getDate();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    
    // Tháng trưo›c
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = currentYear - 1;
    }
    
    // 1. Doanh thu theo thoi gian
    const [revenueThisMonth] = await db.query(`
        SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
        WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
    `, [currentMonth, currentYear]);
    
    const [revenueLastMonth] = await db.query(`
        SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
        WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
    `, [prevMonth, prevYear]);
    
    // 2. Doanh thu theo ngày trong tuáº§n (phân tích xu hưo›ng)
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
    
    // 3. Doanh thu theo khung gio
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
    
    // 4. Top sáº£n pháº©m bán chạy (đóng góp doanh thu)
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
    
    // 5. Sáº£n pháº©m ít bán (cáº§n đáº©y mạnh)
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
    
    // 6. Giá tro‹ đơn hàng trung bình
    const [avgOrderValue] = await db.query(`
        SELECT 
            COALESCE(AVG(tong_tien), 0) as trung_binh,
            COALESCE(MAX(tong_tien), 0) as cao_nhat,
            COALESCE(MIN(tong_tien), 0) as thap_nhat,
            COUNT(*) as tong_don
        FROM don_hang 
        WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
    `, [currentMonth, currentYear]);
    
    // 7. To· lệ đơn hàng thành công vs ho§y
    const [orderStatus] = await db.query(`
        SELECT 
            trang_thai,
            COUNT(*) as so_luong,
            COALESCE(SUM(tong_tien), 0) as gia_tri
        FROM don_hang 
        WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
        GROUP BY trang_thai
    `, [currentMonth, currentYear]);
    
    // 8. Khách hàng quay lại vs khách mo›i
    const [customerAnalysis] = await db.query(`
        SELECT 
            CASE 
                WHEN order_count = 1 THEN 'Khách mo›i'
                ELSE 'Khách quay lại'
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
    
    // 9. Mo¥c tiêu doanh thu
    const [revenueGoal] = await db.query(`
        SELECT gia_tri_muc_tieu FROM muc_tieu_chi_tiet 
        WHERE thang = ? AND nam = ? AND loai_muc_tieu = 'doanh_thu'
    `, [currentMonth, currentYear]);
    
    // Tính toán các cho‰ so‘
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

// API: Chiáº¿n lưo£c tăng doanh thu chi tiáº¿t
router.get('/revenue/strategy', requireAdmin, async (req, res) => {
    try {
        const data = await analyzeRevenueData();
        
        // Xây dựng chiến lược dựa trên phân tích
        const strategies = [];
        const urgentActions = [];
        const recommendations = [];
        
        // 1. Phân tích tiáº¿n độ mục tiêu
        if (data.targetRevenue > 0) {
            if (data.progress < 50 && data.daysRemaining < 15) {
                urgentActions.push({
                    priority: 'critical',
                    icon: 'ðŸš¨',
                    title: 'Cáº§n tăng to‘c gáº¥p!',
                    detail: `Còn ${data.daysRemaining} ngày, cáº§n đạt thêm ${new Intl.NumberFormat('vi-VN').format(data.revenueNeeded)}đ`,
                    action: `Mo—i ngày cáº§n đạt ${new Intl.NumberFormat('vi-VN').format(Math.round(data.dailyNeeded))}đ`
                });
            } else if (data.progress < 80) {
                strategies.push({
                    priority: 'high',
                    icon: 'âš¡',
                    title: 'Tăng cưong bán hàng',
                    detail: `Tiáº¿n độ ${data.progress}%, cáº§n thêm ${new Intl.NumberFormat('vi-VN').format(data.revenueNeeded)}đ`
                });
            }
        }
        
        // 2. Phân tích ngày bán chạy
        if (data.revenueByDayOfWeek.length > 0) {
            const bestDay = data.revenueByDayOfWeek[0];
            const worstDay = data.revenueByDayOfWeek[data.revenueByDayOfWeek.length - 1];
            
            const dayNames = {
                1: 'Cho§ nháº­t', 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 
                5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7'
            };
            
            recommendations.push({
                icon: 'ðŸ“…',
                title: 'To‘i ưu theo ngày',
                detail: `${dayNames[bestDay.ngay_trong_tuan]} bán chạy nháº¥t (${new Intl.NumberFormat('vi-VN').format(bestDay.doanh_thu)}đ)`,
                action: `Tăng khuyến mãi vào ${dayNames[worstDay?.ngay_trong_tuan] || 'ngày ít khách'} đoƒ cân báº±ng`
            });
        }
        
        // 3. Phân tích khung gio vàng
        if (data.revenueByHour.length > 0) {
            const peakHours = data.revenueByHour.slice(0, 3);
            const peakHourText = peakHours.map(h => `${h.gio}h`).join(', ');
            
            recommendations.push({
                icon: 'â°',
                title: 'Khung gio vàng',
                detail: `Doanh thu cao nháº¥t: ${peakHourText}`,
                action: 'Táº­p trung nhân sự và quảng cáo vào khung gio này'
            });
        }
        
        // 4. Phân tích sáº£n pháº©m
        if (data.topProducts.length > 0) {
            const topProduct = data.topProducts[0];
            recommendations.push({
                icon: 'ðŸ†',
                title: 'Sáº£n pháº©m cho§ lực',
                detail: `"${topProduct.ten_san_pham}" - ${topProduct.so_luong_ban} lưo£t bán`,
                action: 'Äáº©y mạnh quáº£ng bá, tạo combo vo›i sáº£n pháº©m này'
            });
        }
        
        if (data.lowSellingProducts.length > 0) {
            strategies.push({
                priority: 'medium',
                icon: '📦',
                title: 'Kích cáº§u sáº£n pháº©m ít bán',
                detail: `${data.lowSellingProducts.length} sáº£n pháº©m bán dưo›i 3 lưo£t/tháng`,
                action: 'Giáº£m giá, tạo combo, hoáº·c xem xét ngo«ng kinh doanh'
            });
        }
        
        // 5. Phân tích giá tro‹ đơn hàng
        if (data.avgOrderValue.trung_binh > 0) {
            const avgValue = Math.round(data.avgOrderValue.trung_binh);
            if (avgValue < 100000) {
                strategies.push({
                    priority: 'high',
                    icon: '💰',
                    title: 'Tăng giá tro‹ đơn hàng',
                    detail: `Trung bình cho‰ ${new Intl.NumberFormat('vi-VN').format(avgValue)}đ/đơn`,
                    action: 'Tạo combo, upsell, mio…n phí ship đơn to« 150k'
                });
            }
            
            recommendations.push({
                icon: '📊',
                title: 'Giá tro‹ đơn hàng',
                detail: `TB: ${new Intl.NumberFormat('vi-VN').format(avgValue)}đ | Cao nháº¥t: ${new Intl.NumberFormat('vi-VN').format(data.avgOrderValue.cao_nhat)}đ`,
                action: 'Äáº·t mục tiêu tăng 20% giá tro‹ đơn TB'
            });
        }
        
        // 6. Phân tích khách hàng
        const newCustomers = data.customerAnalysis.find(c => c.loai_khach === 'Khách mo›i');
        const returningCustomers = data.customerAnalysis.find(c => c.loai_khach === 'Khách quay lại');
        
        if (newCustomers && returningCustomers) {
            const returnRate = Math.round((returningCustomers.so_khach / (newCustomers.so_khach + returningCustomers.so_khach)) * 100);
            
            if (returnRate < 30) {
                strategies.push({
                    priority: 'high',
                    icon: '👥',
                    title: 'Tăng to· lệ khách quay lại',
                    detail: `Cho‰ ${returnRate}% khách quay lại mua`,
                    action: 'Tạo chương trình tích đioƒm, voucher cho láº§n mua sau'
                });
            }
        }
        
        // 7. Phân tích đơn ho§y
        const cancelledOrders = data.orderStatus.find(o => o.trang_thai === 'cancelled');
        if (cancelledOrders && cancelledOrders.so_luong > 0) {
            const totalOrders = data.orderStatus.reduce((sum, o) => sum + o.so_luong, 0);
            const cancelRate = Math.round((cancelledOrders.so_luong / totalOrders) * 100);
            
            if (cancelRate > 10) {
                urgentActions.push({
                    priority: 'high',
                    icon: 'âŒ',
                    title: 'Giáº£m to· lệ ho§y đơn',
                    detail: `${cancelRate}% đơn bo‹ ho§y (${cancelledOrders.so_luong} đơn)`,
                    action: 'Kioƒm tra quy trình, liên hệ khách đoƒ tìm nguyên nhân'
                });
            }
        }
        
        // 8. Dự báo cuối tháng
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
        res.status(500).json({ success: false, message: 'Lo—i phân tích doanh thu: ' + error.message });
    }
});

// API: AI đo xuáº¥t chiến lược doanh thu thông minh
router.post('/revenue/ai-strategy', requireAdmin, async (req, res) => {
    try {
        const data = await analyzeRevenueData();
        
        // Tạo context chi tiáº¿t cho AI
        const revenueContext = `
📊 PHÃ‚N TÃCH DOANH THU THÃNG ${data.currentMonth}/${data.currentYear}

💰 To”NG QUAN:
- Doanh thu hiện tại: ${new Intl.NumberFormat('vi-VN').format(data.currentRevenue)}đ
- Mo¥c tiêu: ${new Intl.NumberFormat('vi-VN').format(data.targetRevenue)}đ
- Tiáº¿n độ: ${data.progress}%
- Còn thiếu: ${new Intl.NumberFormat('vi-VN').format(data.revenueNeeded)}đ
- Tháng trưo›c: ${new Intl.NumberFormat('vi-VN').format(data.lastMonthRevenue)}đ (${data.growthRate > 0 ? '+' : ''}${data.growthRate}%)

ðŸ“… THoœI GIAN:
- Ngày hiện tại: ${data.dayOfMonth}/${data.daysInMonth}
- Còn lại: ${data.daysRemaining} ngày
- Trung bình/ngày: ${new Intl.NumberFormat('vi-VN').format(Math.round(data.avgDaily))}đ
- Cáº§n đạt/ngày: ${new Intl.NumberFormat('vi-VN').format(Math.round(data.dailyNeeded))}đ

ðŸ† TOP Sáº¢N PHáº¨M:
${data.topProducts.slice(0, 5).map((p, i) => `${i+1}. ${p.ten_san_pham}: ${p.so_luong_ban} lưo£t - ${new Intl.NumberFormat('vi-VN').format(p.doanh_thu_sp)}đ`).join('\n')}

📦 Sáº¢N PHáº¨M ÃT BÃN:
${data.lowSellingProducts.slice(0, 5).map(p => `- ${p.ten_san_pham}: ${p.so_luong_ban} lưo£t`).join('\n')}

â° KHUNG GIoœ VÃ€NG:
${data.revenueByHour.slice(0, 3).map(h => `- ${h.gio}h: ${h.so_don} đơn - ${new Intl.NumberFormat('vi-VN').format(h.doanh_thu)}đ`).join('\n')}

📊 GIÃ TRoŠ ÄÆ N HÃ€NG:
- Trung bình: ${new Intl.NumberFormat('vi-VN').format(Math.round(data.avgOrderValue.trung_binh))}đ
- Cao nháº¥t: ${new Intl.NumberFormat('vi-VN').format(data.avgOrderValue.cao_nhat)}đ
- To•ng đơn: ${data.avgOrderValue.tong_don}

👥 KHÃCH HÃ€NG:
${data.customerAnalysis.map(c => `- ${c.loai_khach}: ${c.so_khach} ngưoi - ${new Intl.NumberFormat('vi-VN').format(c.tong_chi_tieu)}đ`).join('\n')}

📈 Do° BÃO:
- Dự kiáº¿n cuối tháng: ${new Intl.NumberFormat('vi-VN').format(Math.round(data.projectedRevenue))}đ
- ${data.projectedRevenue >= data.targetRevenue ? '✅ Có thoƒ đạt mục tiêu' : 'âš ï¸ Khó đạt mục tiêu náº¿u không tăng to‘c'}
`;

        // Goi Groq AI
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `Bạn là "Phương Nam" - tro£ lÃ½ AI co§a nhà hàng "Ẩm Thực Phương Nam".
Cho§ nhà hàng là chị Linh. Xưng "em", goi "chị Linh".

NHIo†M Vo¤: Phân tích do¯ liệu và đưa ra CHIáº¾N LÆ¯o¢C TÄ‚NG DOANH THU co¥ thoƒ cho chị Linh.

QUY Táº®C:
1. Tráº£ loi báº±ng tiếng Việt, thân thiện
2. Xưng "em", goi "chị Linh"
3. Äưa ra 5-7 hành động Co¤ THo‚, có thoƒ thực hiện NGAY
4. Mo—i đo xuáº¥t pháº£i có: Hành động + LÃ½ do + Káº¿t quáº£ dự kiáº¿n
5. Æ¯u tiên các giáº£i pháp nhanh, chi phí tháº¥p
6. Dựa trên do¯ liệu thực tế đưo£c cung cáº¥p
7. So­ do¥ng emoji đoƒ do… đoc

FORMAT:
🎯 Cho‹ Linh ơi, [Tóm táº¯t tình hình]

ðŸ“‹ EM Äo€ XUáº¤T:
1. [Hành động] - [LÃ½ do] â†’ [Káº¿t quáº£ dự kiáº¿n]
2. ...

âš¡ VIo†C Cáº¦N LÃ€M NGAY:
- [Việc cáº§n làm hôm nay]

💡 Go¢I Ã THÃŠM:
- [Ã tưởng dài hạn]`
                },
                {
                    role: 'user',
                    content: `Dựa trên do¯ liệu sau, hãy đo xuáº¥t chiến lược TÄ‚NG DOANH THU co¥ thoƒ:\n\n${revenueContext}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1500
        });

        const aiStrategy = completion.choices[0]?.message?.content || 'Không thoƒ tạo chiến lược. Vui lòng tho­ lại.';
        
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
                suggestions: ['Xem chi tiáº¿t phân tích', 'Báo cáo doanh thu', 'Top sáº£n pháº©m']
            }
        });
    } catch (error) {
        console.error('Error generating revenue AI strategy:', error);
        res.status(500).json({ success: false, message: 'Lo—i tạo chiến lược: ' + error.message });
    }
});

// API: Lấy danh sách các session chat của admin
router.get('/sessions', requireAdmin, async (req, res) => {
    try {
        const adminId = req.session.admin?.ma_admin;
        if (!adminId) {
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập admin' });
        }

        const [sessions] = await db.query(
            'SELECT session_id, MIN(thoi_diem_chat) as thoi_diem_chat, COUNT(*) as message_count FROM lich_su_chatbot WHERE ma_nguoi_dung = ? AND session_id LIKE "admin_session_%" GROUP BY session_id ORDER BY MIN(thoi_diem_chat) DESC LIMIT 50',
            [adminId]
        );

        for (let session of sessions) {
            const [firstMsg] = await db.query(
                'SELECT noi_dung FROM lich_su_chatbot WHERE session_id = ? AND nguoi_gui = \'user\' ORDER BY thoi_diem_chat ASC LIMIT 1',
                [session.session_id]
            );
            session.first_message = firstMsg.length > 0 ? firstMsg[0].noi_dung : 'Cuộc trò chuyện admin';
        }

        res.json({ success: true, data: sessions });
    } catch (error) {
        console.error('Error getting admin sessions:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách session admin' });
    }
});

module.exports = router;


// API: Load lịch sử admin chat theo session_id
router.get('/history/:session_id', requireAdmin, async (req, res) => {
    try {
        const sessionId = req.params.session_id;
        const adminId = req.session?.admin?.ma_admin || null;
        
        console.log('🔍 Loading admin history debug:');
        console.log('- Session ID:', sessionId);
        console.log('- Admin ID:', adminId);
        
        // Lấy lịch sử chat của session này (giới hạn 50 tin nhắn gần nhất)
        const [messages] = await db.query(
            `SELECT ma_tin_nhan, session_id, nguoi_gui, noi_dung, thoi_diem_chat 
             FROM lich_su_chatbot 
             WHERE session_id = ? AND ma_nguoi_dung = ?
             ORDER BY thoi_diem_chat ASC 
             LIMIT 50`,
            [sessionId, adminId]
        );
        
        console.log(`📜 Found ${messages.length} admin messages for session: ${sessionId}`);
        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error loading admin chat history:', error);
        res.status(500).json({ success: false, message: 'Lỗi tải lịch sử chat' });
    }
});
