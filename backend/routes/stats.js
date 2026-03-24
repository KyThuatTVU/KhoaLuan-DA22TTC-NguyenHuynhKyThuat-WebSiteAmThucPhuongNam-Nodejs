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

module.exports = router;
