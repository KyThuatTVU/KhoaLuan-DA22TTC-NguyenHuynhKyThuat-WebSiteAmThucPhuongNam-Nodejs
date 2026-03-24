const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware kiểm tra admin (có thể tách ra file riêng)
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// Thống kê khách hàng cho Dashboard - PHẢI ĐẶT TRƯỚC /:id
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const { year, month } = req.query;
        const currentDate = new Date();
        
        // Xác định tháng/năm để thống kê
        const targetMonth = month && parseInt(month) > 0 ? parseInt(month) : (currentDate.getMonth() + 1);
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();
        
        // Tháng trước để so sánh
        let prevMonth = targetMonth - 1;
        let prevYear = targetYear;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = targetYear - 1;
        }

        // Tổng số khách hàng (tính đến thời điểm cuối tháng được chọn)
        let totalCustomersQuery = `SELECT COUNT(*) as total FROM nguoi_dung WHERE 1=1`;
        const totalParams = [];
        
        if (year) {
            if (month && parseInt(month) > 0) {
                // Đếm khách hàng đăng ký đến cuối tháng được chọn
                totalCustomersQuery = `SELECT COUNT(*) as total FROM nguoi_dung 
                    WHERE (YEAR(ngay_tao) < ? OR (YEAR(ngay_tao) = ? AND MONTH(ngay_tao) <= ?))`;
                totalParams.push(targetYear, targetYear, targetMonth);
            } else {
                // Đếm khách hàng đăng ký trong năm được chọn
                totalCustomersQuery = `SELECT COUNT(*) as total FROM nguoi_dung WHERE YEAR(ngay_tao) = ?`;
                totalParams.push(targetYear);
            }
        }
        
        const [totalCustomers] = await db.query(totalCustomersQuery, totalParams);
        
        // Khách hàng mới trong tháng được chọn
        const [newThisMonth] = await db.query(`
            SELECT COUNT(*) as count FROM nguoi_dung 
            WHERE MONTH(ngay_tao) = ? AND YEAR(ngay_tao) = ?
        `, [targetMonth, targetYear]);
        
        // Khách hàng mới tháng trước
        const [newLastMonth] = await db.query(`
            SELECT COUNT(*) as count FROM nguoi_dung 
            WHERE MONTH(ngay_tao) = ? AND YEAR(ngay_tao) = ?
        `, [prevMonth, prevYear]);
        
        // Khách hàng active
        const [activeCustomers] = await db.query(`
            SELECT COUNT(*) as count FROM nguoi_dung WHERE trang_thai = 1
        `);

        // Tính phần trăm thay đổi
        const customersChange = newLastMonth[0].count > 0 
            ? ((newThisMonth[0].count - newLastMonth[0].count) / newLastMonth[0].count * 100).toFixed(1)
            : (newThisMonth[0].count > 0 ? 100 : 0);

        // Tạo label so sánh
        const comparisonLabel = `So với T${prevMonth}/${prevYear}`;

        res.json({
            success: true,
            totalCustomers: month && parseInt(month) > 0 ? newThisMonth[0].count : totalCustomers[0].total,
            newThisMonth: newThisMonth[0].count,
            newLastMonth: newLastMonth[0].count,
            activeCustomers: activeCustomers[0].count,
            comparison: {
                customersChange: parseFloat(customersChange),
                label: comparisonLabel
            },
            filters: { year: targetYear, month: targetMonth }
        });
    } catch (error) {
        console.error('Error fetching customer stats:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê' });
    }
});

// Lấy danh sách khách hàng
router.get('/', requireAdmin, async (req, res) => {
    try {
        const [customers] = await db.query(`
            SELECT ma_nguoi_dung, ten_nguoi_dung, email, so_dien_thoai, 
                   gioi_tinh, dia_chi, trang_thai, ngay_tao, anh_dai_dien 
            FROM nguoi_dung 
            ORDER BY ngay_tao DESC
        `);
        res.json({ success: true, data: customers });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Lấy chi tiết khách hàng
router.get('/:id', requireAdmin, async (req, res) => {
    try {
        const [customers] = await db.query(`
            SELECT * FROM nguoi_dung WHERE ma_nguoi_dung = ?
        `, [req.params.id]);

        if (customers.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        }

        res.json({ success: true, data: customers[0] });
    } catch (error) {
        console.error('Error fetching customer detail:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Cập nhật trạng thái khách hàng (khóa/mở khóa)
router.put('/:id/status', requireAdmin, async (req, res) => {
    try {
        const { trang_thai } = req.body;
        await db.query(`
            UPDATE nguoi_dung SET trang_thai = ? WHERE ma_nguoi_dung = ?
        `, [trang_thai, req.params.id]);

        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        console.error('Error updating customer status:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

module.exports = router;
