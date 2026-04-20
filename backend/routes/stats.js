const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // 1. Doanh thu hôm nay
        const [revenueToday] = await db.query(`
            SELECT SUM(tong_tien) as total 
            FROM don_hang 
            WHERE DATE(thoi_gian_tao) = CURDATE() AND trang_thai = 'delivered'
        `);

        // 2. Đơn hàng mới hôm nay
        const [ordersToday] = await db.query(`
            SELECT COUNT(*) as count 
            FROM don_hang 
            WHERE DATE(thoi_gian_tao) = CURDATE()
        `);

        // 3. Đặt bàn hôm nay (nếu có bảng dat_ban)
        let reservationsCount = 0;
        try {
            const [reservations] = await db.query(`
                SELECT COUNT(*) as count 
                FROM dat_ban 
                WHERE DATE(ngay_dat) = CURDATE()
            `);
            reservationsCount = reservations[0].count;
        } catch (e) {
            console.warn('Table dat_ban might not exist or error:', e.message);
        }

        // 4. Khách hàng mới tháng này
        const [newCustomers] = await db.query(`
            SELECT COUNT(*) as count 
            FROM nguoi_dung 
            WHERE DATE(ngay_tao) >= ?
        `, [startOfMonth]);

        // 5. Đơn hàng gần đây (5 đơn)
        const [recentOrders] = await db.query(`
            SELECT dh.ma_don_hang, dh.thoi_gian_tao, dh.tong_tien, dh.trang_thai,
                   COALESCE(nd.ten_nguoi_dung, dh.ten_khach_vang_lai) as ten_khach
            FROM don_hang dh
            LEFT JOIN nguoi_dung nd ON dh.ma_nguoi_dung = nd.ma_nguoi_dung
            ORDER BY dh.thoi_gian_tao DESC
            LIMIT 5
        `);

        // 6. Top món ăn bán chạy (theo số lượng trong chi_tiet_don_hang)
        const [topProducts] = await db.query(`
            SELECT m.ten_mon, m.anh_mon, m.gia_tien, SUM(ct.so_luong) as da_ban
            FROM chi_tiet_don_hang ct
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien
            ORDER BY da_ban DESC
            LIMIT 5
        `);

        // 7. Doanh thu 7 ngày qua (cho biểu đồ)
        const [revenueChart] = await db.query(`
            SELECT DATE(thoi_gian_tao) as date, SUM(tong_tien) as total
            FROM don_hang
            WHERE thoi_gian_tao >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) 
              AND trang_thai = 'delivered'
            GROUP BY DATE(thoi_gian_tao)
            ORDER BY date ASC
        `);

        // 8. Trạng thái đơn hàng (cho biểu đồ tròn)
        const [orderStatus] = await db.query(`
            SELECT trang_thai, COUNT(*) as count
            FROM don_hang
            GROUP BY trang_thai
        `);

        res.json({
            success: true,
            data: {
                stats: {
                    revenueToday: revenueToday[0].total || 0,
                    ordersToday: ordersToday[0].count || 0,
                    reservationsToday: reservationsCount,
                    newCustomersMonth: newCustomers[0].count || 0
                },
                recentOrders,
                topProducts,
                charts: {
                    revenue: revenueChart,
                    orderStatus
                }
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Top 10 món ăn bán chạy (có thể filter theo năm, tháng)
router.get('/top-products', requireAdmin, async (req, res) => {
    try {
        const { year, month } = req.query;
        let whereClause = "dh.trang_thai = 'delivered'";
        const params = [];

        if (year) {
            whereClause += ' AND YEAR(dh.thoi_gian_tao) = ?';
            params.push(parseInt(year));
        }

        if (month && parseInt(month) > 0) {
            whereClause += ' AND MONTH(dh.thoi_gian_tao) = ?';
            params.push(parseInt(month));
        }

        const [topProducts] = await db.query(`
            SELECT m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, COALESCE(SUM(ct.so_luong), 0) as da_ban
            FROM mon_an m
            LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
            LEFT JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang AND ${whereClause}
            GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien
            ORDER BY da_ban DESC
            LIMIT 10
        `, params);

        res.json({
            success: true,
            data: topProducts
        });
    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Doanh thu theo tháng (12 tháng gần nhất hoặc theo năm cụ thể)
router.get('/revenue-monthly', requireAdmin, async (req, res) => {
    try {
        const { year, month } = req.query;
        let whereClause = "trang_thai = 'delivered'";
        const params = [];

        if (year) {
            whereClause += ' AND YEAR(thoi_gian_tao) = ?';
            params.push(parseInt(year));
        } else {
            whereClause += ' AND thoi_gian_tao >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)';
        }

        if (month && parseInt(month) > 0) {
            whereClause += ' AND MONTH(thoi_gian_tao) = ?';
            params.push(parseInt(month));
        }

        const [revenueData] = await db.query(`
            SELECT 
                YEAR(thoi_gian_tao) as nam,
                MONTH(thoi_gian_tao) as thang,
                COALESCE(SUM(tong_tien), 0) as doanh_thu
            FROM don_hang
            WHERE ${whereClause}
            GROUP BY YEAR(thoi_gian_tao), MONTH(thoi_gian_tao)
            ORDER BY nam ASC, thang ASC
        `, params);

        res.json({
            success: true,
            data: revenueData
        });
    } catch (error) {
        console.error('Error fetching monthly revenue:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Khách hàng mới theo tháng (12 tháng gần nhất hoặc theo năm cụ thể)
router.get('/customers-monthly', requireAdmin, async (req, res) => {
    try {
        const { year, month } = req.query;
        let whereClause = '1=1';
        const params = [];

        if (year) {
            whereClause += ' AND YEAR(ngay_tao) = ?';
            params.push(parseInt(year));
        } else {
            whereClause += ' AND ngay_tao >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)';
        }

        if (month && parseInt(month) > 0) {
            whereClause += ' AND MONTH(ngay_tao) = ?';
            params.push(parseInt(month));
        }

        const [customerData] = await db.query(`
            SELECT 
                YEAR(ngay_tao) as nam,
                MONTH(ngay_tao) as thang,
                COUNT(*) as so_luong
            FROM nguoi_dung
            WHERE ${whereClause}
            GROUP BY YEAR(ngay_tao), MONTH(ngay_tao)
            ORDER BY nam ASC, thang ASC
        `, params);

        res.json({
            success: true,
            data: customerData
        });
    } catch (error) {
        console.error('Error fetching monthly customers:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Đặt bàn theo khung giờ (có thể filter theo năm, tháng)
router.get('/reservations-by-time', requireAdmin, async (req, res) => {
    try {
        const { year, month } = req.query;
        let whereClause = "trang_thai != 'cancelled'";
        const params = [];

        if (year) {
            whereClause += ' AND YEAR(ngay_dat) = ?';
            params.push(parseInt(year));
        }

        if (month && parseInt(month) > 0) {
            whereClause += ' AND MONTH(ngay_dat) = ?';
            params.push(parseInt(month));
        }

        const [reservationData] = await db.query(`
            SELECT 
                CASE 
                    WHEN HOUR(gio_den) >= 10 AND HOUR(gio_den) < 12 THEN '10-12h'
                    WHEN HOUR(gio_den) >= 12 AND HOUR(gio_den) < 14 THEN '12-14h'
                    WHEN HOUR(gio_den) >= 14 AND HOUR(gio_den) < 16 THEN '14-16h'
                    WHEN HOUR(gio_den) >= 16 AND HOUR(gio_den) < 18 THEN '16-18h'
                    WHEN HOUR(gio_den) >= 18 AND HOUR(gio_den) < 20 THEN '18-20h'
                    WHEN HOUR(gio_den) >= 20 AND HOUR(gio_den) < 22 THEN '20-22h'
                    ELSE 'Khác'
                END as khung_gio,
                COUNT(*) as so_luong
            FROM dat_ban
            WHERE ${whereClause}
            GROUP BY khung_gio
            ORDER BY FIELD(khung_gio, '10-12h', '12-14h', '14-16h', '16-18h', '18-20h', '20-22h', 'Khác')
        `, params);

        res.json({
            success: true,
            data: reservationData
        });
    } catch (error) {
        console.error('Error fetching reservations by time:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Thống kê tin tức - Top bài viết có lượt xem cao nhất
router.get('/news-views', requireAdmin, async (req, res) => {
    try {
        const [newsData] = await db.query(`
            SELECT 
                ma_tin_tuc,
                tieu_de,
                luot_xem,
                ngay_dang,
                trang_thai
            FROM tin_tuc
            WHERE trang_thai = 1
            ORDER BY luot_xem DESC
            LIMIT 10
        `);

        // Tổng lượt xem
        const [totalViews] = await db.query(`
            SELECT COALESCE(SUM(luot_xem), 0) as total FROM tin_tuc
        `);

        // Tổng số bài viết
        const [totalNews] = await db.query(`
            SELECT COUNT(*) as total FROM tin_tuc WHERE trang_thai = 1
        `);

        res.json({
            success: true,
            data: newsData,
            totalViews: totalViews[0].total,
            totalNews: totalNews[0].total
        });
    } catch (error) {
        console.error('Error fetching news views:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Thống kê lượt xem tin tức theo tháng (có thể filter theo năm)
router.get('/news-views-monthly', requireAdmin, async (req, res) => {
    try {
        const { year, month } = req.query;
        let whereClause = '1=1';
        const params = [];

        if (year) {
            whereClause += ' AND YEAR(ngay_dang) = ?';
            params.push(parseInt(year));
        } else {
            whereClause += ' AND ngay_dang >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)';
        }

        if (month && parseInt(month) > 0) {
            whereClause += ' AND MONTH(ngay_dang) = ?';
            params.push(parseInt(month));
        }

        // Lấy số bài viết đăng theo tháng và tổng lượt xem
        const [monthlyData] = await db.query(`
            SELECT 
                YEAR(ngay_dang) as nam,
                MONTH(ngay_dang) as thang,
                COUNT(*) as so_bai_viet,
                COALESCE(SUM(luot_xem), 0) as tong_luot_xem
            FROM tin_tuc
            WHERE ${whereClause}
            GROUP BY YEAR(ngay_dang), MONTH(ngay_dang)
            ORDER BY nam ASC, thang ASC
        `, params);

        res.json({
            success: true,
            data: monthlyData
        });
    } catch (error) {
        console.error('Error fetching monthly news views:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Thống kê phương thức thanh toán
router.get('/payment-methods', requireAdmin, async (req, res) => {
    try {
        const { year, month } = req.query;
        let whereClause = "tt.trang_thai = 'success'";
        const params = [];

        if (year) {
            whereClause += ' AND YEAR(dh.thoi_gian_tao) = ?';
            params.push(parseInt(year));
        }

        if (month && parseInt(month) > 0) {
            whereClause += ' AND MONTH(dh.thoi_gian_tao) = ?';
            params.push(parseInt(month));
        }

        const [paymentData] = await db.query(`
            SELECT 
                tt.phuong_thuc as phuong_thuc_thanh_toan,
                COUNT(*) as so_luong,
                COALESCE(SUM(tt.so_tien), 0) as tong_tien
            FROM thanh_toan tt
            JOIN don_hang dh ON tt.ma_don_hang = dh.ma_don_hang
            WHERE ${whereClause}
            GROUP BY tt.phuong_thuc
            ORDER BY so_luong DESC
        `, params);

        res.json({
            success: true,
            data: paymentData
        });
    } catch (error) {
        console.error('Error fetching payment methods stats:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Doanh thu theo ngày (cho biểu đồ dạng thị trường)
router.get('/revenue-daily', requireAdmin, async (req, res) => {
    try {
        const { range } = req.query;
        let days = 7; // Mặc định 7 ngày
        
        if (range === '30') days = 30;
        else if (range === '90') days = 90;
        else if (range === '180') days = 180;
        else if (range === '365') days = 365;
        else if (range === 'all') days = 730; // 2 năm

        const [revenueData] = await db.query(`
            SELECT 
                DATE(thoi_gian_tao) as ngay,
                COALESCE(SUM(tong_tien), 0) as doanh_thu,
                COUNT(*) as so_don
            FROM don_hang
            WHERE thoi_gian_tao >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
              AND trang_thai = 'delivered'
            GROUP BY DATE(thoi_gian_tao)
            ORDER BY ngay ASC
        `, [days]);

        // Điền các ngày không có doanh thu với giá trị 0
        const filledData = [];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - days + 1);

        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const existingData = revenueData.find(item => {
                const itemDate = new Date(item.ngay).toISOString().split('T')[0];
                return itemDate === dateStr;
            });
            
            filledData.push({
                ngay: dateStr,
                doanh_thu: existingData ? existingData.doanh_thu : 0,
                so_don: existingData ? existingData.so_don : 0
            });
        }

        res.json({
            success: true,
            data: filledData
        });
    } catch (error) {
        console.error('Error fetching daily revenue:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Báo cáo Tài chính Tổng hợp (Thu - Chi - Lợi Nhuận)
router.get('/financial-summary', requireAdmin, async (req, res) => {
    try {
        const { year, month } = req.query;
        const targetYear = parseInt(year) || new Date().getFullYear();
        const targetMonth = parseInt(month) || (new Date().getMonth() + 1);

        // 1. Lấy doanh thu hàng ngày từ tất cả nguồn thanh toán thành công
        const [revenueData] = await db.query(`
            SELECT DATE(thoi_gian_thanh_toan) as ngay, SUM(so_tien) as thu
            FROM thanh_toan
            WHERE trang_thai = 'success'
              AND MONTH(thoi_gian_thanh_toan) = ?
              AND YEAR(thoi_gian_thanh_toan) = ?
            GROUP BY DATE(thoi_gian_thanh_toan)
            
            UNION ALL
            
            SELECT DATE(thoi_gian_thanh_toan) as ngay, SUM(so_tien) as thu
            FROM thanh_toan_dat_ban
            WHERE trang_thai = 'paid'
              AND MONTH(thoi_gian_thanh_toan) = ?
              AND YEAR(thoi_gian_thanh_toan) = ?
            GROUP BY DATE(thoi_gian_thanh_toan)
            
            ORDER BY ngay ASC
        `, [targetMonth, targetYear, targetMonth, targetYear]);

        // 2. Lấy chi phí hàng ngày từ 2 nguồn: phiếu nhập kho + chi phí hàng ngày
        const [expenseData] = await db.query(`
            SELECT DATE(thoi_gian_nhap) as ngay, SUM(tong_tien) as chi
            FROM phieu_nhap
            WHERE trang_thai = 'hoan_tat'
              AND MONTH(thoi_gian_nhap) = ?
              AND YEAR(thoi_gian_nhap) = ?
            GROUP BY DATE(thoi_gian_nhap)
            
            UNION ALL
            
            SELECT DATE(ngay_chi) as ngay, SUM(so_tien) as chi
            FROM chi_phi_hang_ngay
            WHERE MONTH(ngay_chi) = ?
              AND YEAR(ngay_chi) = ?
            GROUP BY DATE(ngay_chi)
            
            ORDER BY ngay ASC
        `, [targetMonth, targetYear, targetMonth, targetYear]);

        // 3. Kết hợp dữ liệu theo ngày
        const dailyStats = {};
        
        // Khởi tạo các ngày trong tháng
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
            dailyStats[dateStr] = { date: dateStr, thu: 0, chi: 0, net: 0 };
        }

        revenueData.forEach(r => {
            const d = new Date(r.ngay).toISOString().split('T')[0];
            if (dailyStats[d]) {
                dailyStats[d].thu = parseFloat(r.thu) || 0;
            }
        });

        expenseData.forEach(e => {
            const d = new Date(e.ngay).toISOString().split('T')[0];
            if (dailyStats[d]) {
                dailyStats[d].chi += parseFloat(e.chi) || 0; // Cộng dồn chi phí từ nhiều nguồn
            }
        });

        // Tính lợi nhuận ròng
        const result = Object.values(dailyStats).map(day => ({
            ...day,
            net: day.thu - day.chi
        }));

        res.json({
            success: true,
            data: result,
            summary: {
                totalRevenue: result.reduce((sum, d) => sum + d.thu, 0),
                totalExpenses: result.reduce((sum, d) => sum + d.chi, 0),
                netProfit: result.reduce((sum, d) => sum + d.net, 0)
            }
        });

    } catch (error) {
        console.error('Error fetching financial summary:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
});

// API lấy chi tiết thu chi theo ngày cụ thể
router.get('/daily-detail', requireAdmin, async (req, res) => {
    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số ngày' });
        }

        // 1. Lấy chi tiết doanh thu (từ thanh toán đơn hàng)
        const [revenueDetails] = await db.query(`
            SELECT 
                tp.so_tien,
                tp.phuong_thuc,
                tp.thoi_gian_thanh_toan,
                dh.ma_don_hang,
                CASE 
                    WHEN dh.ma_nguoi_dung IS NOT NULL THEN CONCAT('Đơn online #', dh.ma_don_hang)
                    WHEN dh.ten_khach_vang_lai IS NOT NULL THEN CONCAT('Bán tại quầy #', dh.ma_don_hang)
                    ELSE CONCAT('Đơn hàng #', dh.ma_don_hang)
                END as mo_ta
            FROM thanh_toan tp
            JOIN don_hang dh ON tp.ma_don_hang = dh.ma_don_hang
            WHERE DATE(tp.thoi_gian_thanh_toan) = ?
              AND tp.trang_thai = 'success'
            ORDER BY tp.thoi_gian_thanh_toan DESC
        `, [date]);
        
        // 1b. Lấy chi tiết doanh thu từ thanh toán đặt bàn
        const [reservationRevenue] = await db.query(`
            SELECT 
                ttdb.so_tien,
                'Chuyển khoản' as phuong_thuc,
                ttdb.thoi_gian_thanh_toan,
                db.ma_dat_ban,
                CONCAT('Đặt bàn #', db.ma_dat_ban, ' - ', db.ten_nguoi_dat) as mo_ta
            FROM thanh_toan_dat_ban ttdb
            JOIN dat_ban db ON ttdb.ma_dat_ban = db.ma_dat_ban
            WHERE DATE(ttdb.thoi_gian_thanh_toan) = ?
              AND ttdb.trang_thai = 'paid'
            ORDER BY ttdb.thoi_gian_thanh_toan DESC
        `, [date]);
        
        // Kết hợp cả 2 nguồn doanh thu
        const allRevenue = [...revenueDetails, ...reservationRevenue];

        // 2. Lấy chi tiết chi phí từ nhập kho
        const [importExpenses] = await db.query(`
            SELECT 
                pn.tong_tien as so_tien,
                pn.thoi_gian_nhap,
                CONCAT('Nhập kho từ ', ncc.ten_nha_cung_cap) as mo_ta,
                'Nhập nguyên liệu' as loai_chi_phi,
                ncc.ten_nha_cung_cap as nguoi_nhan
            FROM phieu_nhap pn
            LEFT JOIN nha_cung_cap ncc ON pn.ma_nha_cung_cap = ncc.ma_nha_cung_cap
            WHERE DATE(pn.thoi_gian_nhap) = ?
              AND pn.trang_thai = 'hoan_tat'
            ORDER BY pn.thoi_gian_nhap DESC
        `, [date]);

        // 3. Lấy chi tiết chi phí hàng ngày
        const [dailyExpenses] = await db.query(`
            SELECT 
                cp.so_tien,
                cp.ngay_chi as thoi_gian_nhap,
                cp.ten_chi_phi as mo_ta,
                cp.loai_chi_phi,
                cp.nguoi_nhan,
                cp.phuong_thuc_thanh_toan
            FROM chi_phi_hang_ngay cp
            WHERE DATE(cp.ngay_chi) = ?
            ORDER BY cp.ngay_tao DESC
        `, [date]);

        // 4. Kết hợp chi phí
        const allExpenses = [
            ...importExpenses.map(e => ({
                ...e,
                phuong_thuc_thanh_toan: 'Chuyển khoản',
                nguon: 'Nhập kho'
            })),
            ...dailyExpenses.map(e => ({
                ...e,
                nguon: 'Chi phí hàng ngày'
            }))
        ];

        // 5. Tính tổng
        const totalRevenue = allRevenue.reduce((sum, r) => sum + parseFloat(r.so_tien), 0);
        const totalExpenses = allExpenses.reduce((sum, e) => sum + parseFloat(e.so_tien), 0);

        res.json({
            success: true,
            data: {
                date,
                revenue: allRevenue,
                expenses: allExpenses,
                summary: {
                    totalRevenue,
                    totalExpenses,
                    netProfit: totalRevenue - totalExpenses
                }
            }
        });

    } catch (error) {
        console.error('Error fetching daily detail:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
});

// Chi tiết Thu - Chi trong 1 ngày cụ thể (Dùng cho Modal đối soát)
router.get('/financial-day-details', requireAdmin, async (req, res) => {
    try {
        const { date } = req.query; // Định dạng YYYY-MM-DD
        if (!date) return res.status(400).json({ success: false, message: 'Thiếu ngày' });

        // 1. Lấy chi tiết các khoản thu (Thanh toán)
        const [incomeDetails] = await db.query(`
            SELECT t.ma_thanh_toan as id, t.so_tien as amount, t.phuong_thuc as method, 
                   t.thoi_gian_thanh_toan as time, t.ma_don_hang, t.ma_order_nha_hang,
                   COALESCE(d.ten_khach_vang_lai, 'Đơn hàng POS/Tại bàn') as source
            FROM thanh_toan t
            LEFT JOIN don_hang d ON t.ma_don_hang = d.ma_don_hang
            WHERE DATE(t.thoi_gian_thanh_toan) = ? AND t.trang_thai = 'success'
            ORDER BY t.thoi_gian_thanh_toan ASC
        `, [date]);

        // 2. Lấy chi tiết các khoản chi (Phiếu nhập)
        const [expenseDetails] = await db.query(`
            SELECT p.ma_phieu_nhap as id, p.tong_tien as amount, p.ghi_chu, 
                   p.thoi_gian_nhap as time, n.ten_nha_cung_cap as source
            FROM phieu_nhap p
            LEFT JOIN nha_cung_cap n ON p.ma_nha_cung_cap = n.ma_nha_cung_cap
            WHERE DATE(p.thoi_gian_nhap) = ? AND p.trang_thai = 'hoan_tat'
            ORDER BY p.thoi_gian_nhap ASC
        `, [date]);

        res.json({
            success: true,
            date: date,
            income: incomeDetails,
            expenses: expenseDetails
        });

    } catch (error) {
        console.error('Error fetching financial day details:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

module.exports = router;
