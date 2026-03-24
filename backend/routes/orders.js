const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { createAdminNotification } = require('./admin-notifications');
const { sendOrderConfirmationEmail } = require('../config/email');

// Middleware kiểm tra admin session
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// Map database status to frontend status
const mapOrderStatus = (dbStatus) => {
    const statusMap = {
        'pending': 'cho_xac_nhan',
        'confirmed': 'da_xac_nhan',
        'preparing': 'dang_chuan_bi',
        'delivered': 'hoan_thanh',
        'cancelled': 'da_huy'
    };
    return statusMap[dbStatus] || dbStatus;
};

// Map frontend status to database status
const mapStatusToDB = (frontendStatus) => {
    const statusMap = {
        'cho_xac_nhan': 'pending',
        'da_xac_nhan': 'confirmed',
        'dang_chuan_bi': 'preparing',
        'dang_giao': 'preparing', // Map to preparing as there's no 'delivering' status
        'hoan_thanh': 'delivered',
        'da_huy': 'cancelled'
    };
    return statusMap[frontendStatus] || frontendStatus;
};

// Middleware xác thực token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Không có token xác thực'
        });
    }

    try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Token không hợp lệ'
                });
            }
            req.user = user;
            next();
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi xác thực token'
        });
    }
};

// Tạo đơn hàng mới từ giỏ hàng
router.post('/create', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const ma_nguoi_dung = req.user.ma_nguoi_dung;
        const {
            ten_nguoi_nhan,
            so_dien_thoai,
            email,
            dia_chi,
            tinh_thanh,
            quan_huyen,
            phuong_xa,
            ghi_chu,
            phuong_thuc_thanh_toan,
            ma_khuyen_mai,
            ma_code
        } = req.body;

        console.log('📦 Order request - ma_khuyen_mai:', ma_khuyen_mai, 'ma_code:', ma_code);

        // Validate input
        if (!ten_nguoi_nhan || !so_dien_thoai || !dia_chi || !tinh_thanh || !quan_huyen || !phuong_xa) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin giao hàng'
            });
        }

        if (!phuong_thuc_thanh_toan) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn phương thức thanh toán'
            });
        }

        // Lấy giỏ hàng active của user
        const [cartRows] = await connection.query(
            'SELECT * FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"',
            [ma_nguoi_dung]
        );

        if (cartRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng trống'
            });
        }

        const ma_gio_hang = cartRows[0].ma_gio_hang;

        // Lấy chi tiết giỏ hàng
        const [cartItems] = await connection.query(`
            SELECT
                ct.ma_chi_tiet,
                ct.ma_mon,
                ct.so_luong,
                ct.gia_tai_thoi_diem,
                (ct.so_luong * ct.gia_tai_thoi_diem) as thanh_tien,
                m.ten_mon,
                m.anh_mon,
                m.so_luong_ton
            FROM chi_tiet_gio_hang ct
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            WHERE ct.ma_gio_hang = ?
        `, [ma_gio_hang]);

        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng trống'
            });
        }

        // Kiểm tra tồn kho cho từng món
        for (const item of cartItems) {
            if (item.so_luong_ton < item.so_luong) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Món "${item.ten_mon}" không đủ số lượng trong kho (còn ${item.so_luong_ton})`
                });
            }
        }

        // Tính tổng tiền
        const tong_tien_hang = cartItems.reduce((sum, item) => sum + parseFloat(item.thanh_tien), 0);
        const phi_giao_hang = tong_tien_hang >= 150000 ? 0 : 30000; // Miễn phí ship từ 150k
        let tien_giam_gia = 0;

        // Xử lý mã khuyến mãi (nếu có)
        if (ma_khuyen_mai) {
            const [promoRows] = await connection.query(
                `SELECT * FROM khuyen_mai 
                 WHERE ma_khuyen_mai = ? 
                 AND trang_thai = 1 
                 AND ngay_bat_dau <= NOW() 
                 AND ngay_ket_thuc >= NOW()
                 AND (so_luong_gioi_han IS NULL OR so_luong_da_dung < so_luong_gioi_han)`,
                [ma_khuyen_mai]
            );

            if (promoRows.length > 0) {
                const promo = promoRows[0];
                console.log('🎫 Found promo:', promo);

                // Kiểm tra đơn hàng tối thiểu (nếu không có hoặc = 0 thì bỏ qua)
                const minOrder = parseFloat(promo.don_hang_toi_thieu) || 0;
                if (tong_tien_hang >= minOrder) {
                    if (promo.loai_giam_gia === 'percentage') {
                        tien_giam_gia = (tong_tien_hang * parseFloat(promo.gia_tri)) / 100;
                        // Áp dụng giới hạn giảm tối đa nếu có
                        if (promo.giam_toi_da && tien_giam_gia > parseFloat(promo.giam_toi_da)) {
                            tien_giam_gia = parseFloat(promo.giam_toi_da);
                        }
                    } else {
                        // fixed_amount hoặc các loại khác
                        tien_giam_gia = parseFloat(promo.gia_tri);
                    }
                    
                    console.log('💰 Discount applied:', tien_giam_gia);

                    // Cập nhật số lượng đã dùng
                    await connection.query(
                        'UPDATE khuyen_mai SET so_luong_da_dung = so_luong_da_dung + 1 WHERE ma_khuyen_mai = ?',
                        [promo.ma_khuyen_mai]
                    );
                    console.log('✅ Promo usage count updated');
                } else {
                    console.log('⚠️ Order total', tong_tien_hang, 'is less than minimum', minOrder);
                }
            } else {
                console.log('⚠️ No valid promo found for ID:', ma_khuyen_mai);
            }
        }

        const tong_tien = tong_tien_hang + phi_giao_hang - tien_giam_gia;

        // Tạo địa chỉ giao hàng đầy đủ
        const dia_chi_day_du = `${dia_chi}, ${phuong_xa}, ${quan_huyen}, ${tinh_thanh}`;

        // Lấy ma_code từ promo nếu có (để lưu vào đơn hàng)
        let promoCodeToSave = ma_code || null;
        if (!promoCodeToSave && ma_khuyen_mai && tien_giam_gia > 0) {
            // Nếu không có ma_code nhưng có ma_khuyen_mai và đã tính giảm giá, lấy ma_code từ DB
            const [promoInfo] = await connection.query(
                'SELECT ma_code FROM khuyen_mai WHERE ma_khuyen_mai = ?',
                [ma_khuyen_mai]
            );
            if (promoInfo.length > 0) {
                promoCodeToSave = promoInfo[0].ma_code;
            }
        }

        // Tạo đơn hàng
        const [orderResult] = await connection.query(
            `INSERT INTO don_hang (
                ma_nguoi_dung, 
                ten_khach_vang_lai, 
                so_dt_khach,
                dia_chi_giao,
                tong_tien, 
                trang_thai, 
                ghi_chu,
                ma_khuyen_mai,
                tien_giam_gia
            ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
            [
                ma_nguoi_dung,
                ten_nguoi_nhan,
                so_dien_thoai,
                dia_chi_day_du,
                tong_tien,
                ghi_chu || null,
                promoCodeToSave,
                tien_giam_gia
            ]
        );

        const ma_don_hang = orderResult.insertId;

        // Tạo chi tiết đơn hàng từ giỏ hàng
        for (const item of cartItems) {
            await connection.query(
                `INSERT INTO chi_tiet_don_hang (
                    ma_don_hang, 
                    ma_mon, 
                    so_luong, 
                    gia_tai_thoi_diem
                ) VALUES (?, ?, ?, ?)`,
                [ma_don_hang, item.ma_mon, item.so_luong, item.gia_tai_thoi_diem]
            );

            // Giảm số lượng tồn kho
            await connection.query(
                'UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?',
                [item.so_luong, item.ma_mon]
            );
        }

        // Tạo bản ghi thanh toán
        const [paymentResult] = await connection.query(
            `INSERT INTO thanh_toan (
                ma_don_hang,
                so_tien,
                phuong_thuc,
                trang_thai
            ) VALUES (?, ?, ?, ?)`,
            [
                ma_don_hang,
                tong_tien,
                phuong_thuc_thanh_toan,
                phuong_thuc_thanh_toan === 'cod' ? 'pending' : 'pending'
            ]
        );

        const ma_thanh_toan = paymentResult.insertId;

        // Tạo hóa đơn
        const [invoiceResult] = await connection.query(
            `INSERT INTO hoa_don (
                ma_don_hang,
                ma_thanh_toan,
                ma_nguoi_dat,
                tong_tien,
                trang_thai
            ) VALUES (?, ?, ?, ?, 'issued')`,
            [ma_don_hang, ma_thanh_toan, ma_nguoi_dung, tong_tien]
        );

        const ma_hoa_don = invoiceResult.insertId;

        // Tạo chi tiết hóa đơn
        for (const item of cartItems) {
            await connection.query(
                `INSERT INTO chi_tiet_hoa_don (
                    ma_hoa_don,
                    ma_mon,
                    ten_mon,
                    so_luong,
                    don_gia,
                    thanh_tien
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    ma_hoa_don,
                    item.ma_mon,
                    item.ten_mon,
                    item.so_luong,
                    item.gia_tai_thoi_diem,
                    item.thanh_tien
                ]
            );
        }

        // KHÔNG đánh dấu cart = "ordered" ở đây vì user chưa thanh toán
        // Cart sẽ được xử lý sau khi thanh toán thành công trong trang dat-hang-thanh-cong.html

        // GIỮ NGUYÊN cart = "active" để nếu thanh toán thất bại, user vẫn còn món

        await connection.commit();

        // Tạo thông báo cho admin
        const customerName = ma_nguoi_dung ? 
            (await db.query('SELECT ten_nguoi_dung FROM nguoi_dung WHERE ma_nguoi_dung = ?', [ma_nguoi_dung]))[0][0]?.ten_nguoi_dung || 'Khách hàng' 
            : ten_khach_vang_lai || 'Khách vãng lai';
        
        await createAdminNotification(
            'new_order',
            `Đơn hàng mới #${ma_don_hang}`,
            `${customerName} đã đặt ${cartItems.length} món - Tổng: ${new Intl.NumberFormat('vi-VN').format(tong_tien)}đ`,
            `orders.html?id=${ma_don_hang}`,
            ma_don_hang
        );

        // Gửi email xác nhận đơn hàng (nếu có email)
        if (email) {
            try {
                await sendOrderConfirmationEmail(email, {
                    ma_don_hang,
                    ten_nguoi_nhan,
                    so_dien_thoai,
                    dia_chi: dia_chi_day_du,
                    items: cartItems.map(item => ({
                        ten_mon: item.ten_mon,
                        so_luong: item.so_luong,
                        gia_tai_thoi_diem: item.gia_tai_thoi_diem,
                        anh_mon: item.anh_mon
                    })),
                    tong_tien_hang,
                    phi_giao_hang,
                    tien_giam_gia,
                    tong_tien,
                    phuong_thuc_thanh_toan,
                    ngay_dat: new Date()
                });
                console.log(`📧 Đã gửi email xác nhận đơn hàng #${ma_don_hang} đến ${email}`);
            } catch (emailError) {
                console.error('⚠️ Lỗi gửi email xác nhận đơn hàng:', emailError.message);
                // Không throw lỗi, vẫn tiếp tục vì đơn hàng đã được tạo thành công
            }
        }

        res.json({
            success: true,
            message: 'Đặt hàng thành công!',
            data: {
                ma_don_hang,
                ma_hoa_don,
                ma_thanh_toan,
                tong_tien,
                tien_giam_gia,
                phi_giao_hang,
                phuong_thuc_thanh_toan
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Lỗi tạo đơn hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo đơn hàng',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// IMPORTANT: Specific routes MUST come BEFORE parameterized routes (/:id)
// Otherwise Express will match /my-orders as /:id with id="my-orders"

// Thống kê đơn hàng cho Dashboard (Admin)
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const { year, month, status } = req.query;
        
        // Build WHERE clause cho filter
        let whereClause = '1=1';
        let whereClauseDelivered = "trang_thai = 'delivered'";
        const params = [];
        const paramsDelivered = [];

        if (year) {
            whereClause += ' AND YEAR(thoi_gian_tao) = ?';
            whereClauseDelivered += ' AND YEAR(thoi_gian_tao) = ?';
            params.push(parseInt(year));
            paramsDelivered.push(parseInt(year));
        }

        if (month && parseInt(month) > 0) {
            whereClause += ' AND MONTH(thoi_gian_tao) = ?';
            whereClauseDelivered += ' AND MONTH(thoi_gian_tao) = ?';
            params.push(parseInt(month));
            paramsDelivered.push(parseInt(month));
        }

        if (status && status !== 'all') {
            whereClause += ' AND trang_thai = ?';
            params.push(status);
        }

        // Tổng số đơn hàng (theo filter)
        const [totalOrders] = await db.query(`SELECT COUNT(*) as total FROM don_hang WHERE ${whereClause}`, params);
        
        // Tổng doanh thu (chỉ tính đơn hoàn thành, theo filter năm/tháng)
        const [totalRevenue] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang WHERE ${whereClauseDelivered}
        `, paramsDelivered);
        
        // Tổng số lượng món đã bán
        let quantityWhere = "dh.trang_thai = 'delivered'";
        const quantityParams = [];
        if (year) {
            quantityWhere += ' AND YEAR(dh.thoi_gian_tao) = ?';
            quantityParams.push(parseInt(year));
        }
        if (month && parseInt(month) > 0) {
            quantityWhere += ' AND MONTH(dh.thoi_gian_tao) = ?';
            quantityParams.push(parseInt(month));
        }
        
        const [totalQuantity] = await db.query(`
            SELECT COALESCE(SUM(ct.so_luong), 0) as total 
            FROM chi_tiet_don_hang ct
            JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
            WHERE ${quantityWhere}
        `, quantityParams);
        
        // Đơn hàng hôm nay
        const [todayOrders] = await db.query(`
            SELECT COUNT(*) as count FROM don_hang WHERE DATE(thoi_gian_tao) = CURDATE()
        `);
        
        // Doanh thu hôm nay
        const [todayRevenue] = await db.query(`
            SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
            WHERE DATE(thoi_gian_tao) = CURDATE() AND trang_thai = 'delivered'
        `);
        
        // Đơn hàng theo trạng thái (theo filter năm/tháng)
        let statusWhere = '1=1';
        const statusParams = [];
        if (year) {
            statusWhere += ' AND YEAR(thoi_gian_tao) = ?';
            statusParams.push(parseInt(year));
        }
        if (month && parseInt(month) > 0) {
            statusWhere += ' AND MONTH(thoi_gian_tao) = ?';
            statusParams.push(parseInt(month));
        }
        
        const [statusStats] = await db.query(`
            SELECT trang_thai, COUNT(*) as count FROM don_hang WHERE ${statusWhere} GROUP BY trang_thai
        `, statusParams);

        // === TÍNH SO SÁNH VỚI THÁNG TRƯỚC ===
        const currentDate = new Date();
        let compareMonth, compareYear, prevCompareMonth, prevCompareYear;
        
        // Nếu có filter tháng cụ thể, so sánh với tháng trước của tháng đó
        if (month && parseInt(month) > 0 && year) {
            compareMonth = parseInt(month);
            compareYear = parseInt(year);
            prevCompareMonth = compareMonth - 1;
            prevCompareYear = compareYear;
            if (prevCompareMonth === 0) {
                prevCompareMonth = 12;
                prevCompareYear = compareYear - 1;
            }
        } else if (year && (!month || parseInt(month) === 0)) {
            // Nếu chỉ filter năm, so sánh tổng năm đó với năm trước
            compareYear = parseInt(year);
            prevCompareYear = compareYear - 1;
            compareMonth = 0; // 0 = cả năm
            prevCompareMonth = 0;
        } else {
            // Mặc định: so sánh tháng hiện tại với tháng trước
            compareMonth = currentDate.getMonth() + 1;
            compareYear = currentDate.getFullYear();
            prevCompareMonth = compareMonth - 1;
            prevCompareYear = compareYear;
            if (prevCompareMonth === 0) {
                prevCompareMonth = 12;
                prevCompareYear = compareYear - 1;
            }
        }

        let revenueThisMonth, revenueLastMonth, ordersThisMonth, ordersLastMonth;

        if (compareMonth === 0) {
            // So sánh cả năm
            [revenueThisMonth] = await db.query(`
                SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
                WHERE YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
            `, [compareYear]);

            [revenueLastMonth] = await db.query(`
                SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
                WHERE YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
            `, [prevCompareYear]);

            [ordersThisMonth] = await db.query(`
                SELECT COUNT(*) as total FROM don_hang 
                WHERE YEAR(thoi_gian_tao) = ?
            `, [compareYear]);

            [ordersLastMonth] = await db.query(`
                SELECT COUNT(*) as total FROM don_hang 
                WHERE YEAR(thoi_gian_tao) = ?
            `, [prevCompareYear]);
        } else {
            // So sánh theo tháng
            [revenueThisMonth] = await db.query(`
                SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
                WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
            `, [compareMonth, compareYear]);

            [revenueLastMonth] = await db.query(`
                SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
                WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'
            `, [prevCompareMonth, prevCompareYear]);

            [ordersThisMonth] = await db.query(`
                SELECT COUNT(*) as total FROM don_hang 
                WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
            `, [compareMonth, compareYear]);

            [ordersLastMonth] = await db.query(`
                SELECT COUNT(*) as total FROM don_hang 
                WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?
            `, [prevCompareMonth, prevCompareYear]);
        }

        // Tính phần trăm thay đổi
        const revenueChange = revenueLastMonth[0].total > 0 
            ? ((revenueThisMonth[0].total - revenueLastMonth[0].total) / revenueLastMonth[0].total * 100).toFixed(1)
            : (revenueThisMonth[0].total > 0 ? 100 : 0);

        const ordersChange = ordersLastMonth[0].total > 0 
            ? ((ordersThisMonth[0].total - ordersLastMonth[0].total) / ordersLastMonth[0].total * 100).toFixed(1)
            : (ordersThisMonth[0].total > 0 ? 100 : 0);

        // Tạo label so sánh
        let comparisonLabel = '';
        if (compareMonth === 0) {
            comparisonLabel = `So với năm ${prevCompareYear}`;
        } else {
            comparisonLabel = `So với T${prevCompareMonth}/${prevCompareYear}`;
        }

        res.json({
            success: true,
            totalOrders: totalOrders[0].total,
            totalRevenue: totalRevenue[0].total,
            totalQuantity: totalQuantity[0].total,
            todayOrders: todayOrders[0].count,
            todayRevenue: todayRevenue[0].total,
            byStatus: statusStats,
            filters: { year, month, status },
            // Dữ liệu so sánh
            comparison: {
                revenueChange: parseFloat(revenueChange),
                ordersChange: parseFloat(ordersChange),
                revenueThisMonth: revenueThisMonth[0].total,
                revenueLastMonth: revenueLastMonth[0].total,
                ordersThisMonth: ordersThisMonth[0].total,
                ordersLastMonth: ordersLastMonth[0].total,
                label: comparisonLabel,
                compareMonth,
                compareYear,
                prevCompareMonth,
                prevCompareYear
            }
        });
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê' });
    }
});

// Admin: Lấy tất cả đơn hàng (dùng session)
router.get('/all', requireAdmin, async (req, res) => {
    try {
        const { trang_thai, status, limit = 50, offset = 0 } = req.query;
        // Support both 'trang_thai' and 'status' params
        const filterStatus = status || trang_thai;

        let query = `
            SELECT 
                dh.*,
                nd.ten_nguoi_dung,
                nd.email,
                MAX(tt.phuong_thuc) as phuong_thuc_thanh_toan,
                MAX(tt.trang_thai) as trang_thai_thanh_toan,
                COUNT(DISTINCT ct.ma_ct_don) as so_luong_mon
            FROM don_hang dh
            LEFT JOIN nguoi_dung nd ON dh.ma_nguoi_dung = nd.ma_nguoi_dung
            LEFT JOIN thanh_toan tt ON dh.ma_don_hang = tt.ma_don_hang
            LEFT JOIN chi_tiet_don_hang ct ON dh.ma_don_hang = ct.ma_don_hang
            WHERE 1=1
        `;

        const params = [];

        if (filterStatus) {
            query += ` AND dh.trang_thai = ?`;
            params.push(filterStatus);
        }

        query += ` GROUP BY dh.ma_don_hang
                   ORDER BY dh.thoi_gian_tao DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await db.query(query, params);

        // Load items for each order
        const ordersWithItems = [];
        for (let order of orders) {
            const [items] = await db.query(
                `SELECT 
                    ct.*,
                    m.ten_mon, 
                    m.anh_mon 
                 FROM chi_tiet_don_hang ct
                 JOIN mon_an m ON ct.ma_mon = m.ma_mon
                 WHERE ct.ma_don_hang = ?`,
                [order.ma_don_hang]
            );

            ordersWithItems.push({
                ...order,
                ten_khach_hang: order.ten_khach_vang_lai || order.ten_nguoi_dung || 'Khách hàng',
                items: items
            });
        }

        res.json({
            success: true,
            data: ordersWithItems,
            total: ordersWithItems.length
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách đơn hàng admin:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Lấy danh sách đơn hàng của user
router.get('/my-orders', authenticateToken, async (req, res) => {
    try {
        const ma_nguoi_dung = req.user.ma_nguoi_dung;
        const { trang_thai, limit = 10, offset = 0 } = req.query;

        let query = `
            SELECT 
                dh.*,
                MAX(tt.phuong_thuc) as phuong_thuc,
                MAX(tt.trang_thai) as trang_thai_thanh_toan,
                MAX(tt.thoi_gian_thanh_toan) as thoi_gian_thanh_toan,
                COUNT(ct.ma_ct_don) as so_luong_mon
            FROM don_hang dh
            LEFT JOIN thanh_toan tt ON dh.ma_don_hang = tt.ma_don_hang
            LEFT JOIN chi_tiet_don_hang ct ON dh.ma_don_hang = ct.ma_don_hang
            WHERE dh.ma_nguoi_dung = ?
        `;

        const params = [ma_nguoi_dung];

        if (trang_thai) {
            // Map frontend status to database status
            const dbStatus = mapStatusToDB(trang_thai);
            query += ` AND dh.trang_thai = ?`;
            params.push(dbStatus);
        }

        query += ` GROUP BY dh.ma_don_hang
                   ORDER BY dh.thoi_gian_tao DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await db.query(query, params);

        // Load items for each order and transform data
        const transformedOrders = [];
        for (let order of orders) {
            const [items] = await db.query(
                `SELECT 
                    ct.ma_mon,
                    ct.so_luong,
                    ct.gia_tai_thoi_diem as gia,
                    (ct.so_luong * ct.gia_tai_thoi_diem) as thanh_tien,
                    m.ten_mon, 
                    m.anh_mon 
                 FROM chi_tiet_don_hang ct
                 JOIN mon_an m ON ct.ma_mon = m.ma_mon
                 WHERE ct.ma_don_hang = ?`,
                [order.ma_don_hang]
            );

            // Kiểm tra trạng thái thanh toán
            // Nếu không có record trong bảng thanh_toan, coi như COD
            const paymentMethod = order.phuong_thuc || 'cod';
            const paymentStatus = order.trang_thai_thanh_toan; // 'pending', 'success', 'failed'
            
            // Đơn hàng được coi là "chưa thanh toán" nếu:
            // - Có bản ghi thanh toán (không phải COD) VÀ
            // - Trạng thái thanh toán là 'pending' hoặc 'failed'
            const isPaymentFailed = 
                order.phuong_thuc && // Có record trong thanh_toan (không phải COD)
                order.phuong_thuc !== 'cod' && 
                (!paymentStatus || paymentStatus === 'pending' || paymentStatus === 'failed');

            // Transform order data to match frontend expectations
            transformedOrders.push({
                id_don_hang: order.ma_don_hang,
                ma_don_hang: `DH${String(order.ma_don_hang).padStart(6, '0')}`,
                ma_nguoi_dung: order.ma_nguoi_dung,
                ngay_dat: order.thoi_gian_tao,
                trang_thai: mapOrderStatus(order.trang_thai),
                ten_nguoi_nhan: order.ten_khach_vang_lai || 'Khách hàng',
                so_dien_thoai: order.so_dt_khach || '',
                email: '',
                dia_chi: order.dia_chi_giao || '',
                phuong_xa: '',
                quan_huyen: '',
                tinh_thanh: '',
                ghi_chu: order.ghi_chu || '',
                phuong_thuc_thanh_toan: paymentMethod,
                trang_thai_thanh_toan: paymentStatus,
                can_thanh_toan_lai: isPaymentFailed, // Flag để hiển thị nút "Thanh toán lại"
                tong_tien_hang: parseFloat(order.tong_tien) || 0,
                phi_van_chuyen: 0,
                giam_gia: parseFloat(order.tien_giam_gia) || 0,
                tong_thanh_toan: parseFloat(order.tong_tien) || 0,
                so_luong_mon: order.so_luong_mon || 0,
                items: items.map(item => ({
                    ...item,
                    thanh_tien: parseFloat(item.so_luong) * parseFloat(item.gia_tai_thoi_diem)
                }))
            });
        }

        res.json({
            success: true,
            data: transformedOrders
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách đơn hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Lấy chi tiết đơn hàng
router.get('/:orderId', authenticateToken, async (req, res) => {
    try {
        const ma_nguoi_dung = req.user.ma_nguoi_dung;
        const { orderId } = req.params;

        // Lấy thông tin đơn hàng
        const [orderRows] = await db.query(
            `SELECT 
                dh.*,
                tt.phuong_thuc as phuong_thuc_thanh_toan,
                tt.ma_giao_dich,
                tt.trang_thai as trang_thai_thanh_toan,
                tt.thoi_gian_thanh_toan
            FROM don_hang dh
            LEFT JOIN thanh_toan tt ON dh.ma_don_hang = tt.ma_don_hang
            WHERE dh.ma_don_hang = ? AND dh.ma_nguoi_dung = ?`,
            [orderId, ma_nguoi_dung]
        );

        if (orderRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        const order = orderRows[0];

        // Lấy chi tiết đơn hàng
        const [orderItems] = await db.query(
            `SELECT 
                ct.*,
                m.ten_mon,
                m.anh_mon,
                m.don_vi_tinh
            FROM chi_tiet_don_hang ct
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            WHERE ct.ma_don_hang = ?`,
            [orderId]
        );

        // Lấy lịch sử trạng thái (nếu bảng tồn tại)
        let lichSuTrangThai = [];
        try {
            const [historyRows] = await db.query(
                `SELECT 
                    ma_lich_su,
                    ma_don_hang,
                    trang_thai_cu,
                    trang_thai_moi,
                    nguoi_thay_doi,
                    loai_nguoi_thay_doi,
                    ghi_chu,
                    thoi_gian_thay_doi
                 FROM lich_su_trang_thai_don_hang 
                 WHERE ma_don_hang = ? 
                 ORDER BY thoi_gian_thay_doi DESC`,
                [orderId]
            );
            console.log(`📜 Raw history for order ${orderId}:`, historyRows);
            lichSuTrangThai = historyRows;
        } catch (err) {
            // Bảng chưa tồn tại hoặc lỗi query, bỏ qua
            console.error('Lỗi khi lấy lịch sử trạng thái:', err.message);
        }

        // Transform order data to match frontend expectations
        res.json({
            success: true,
            data: {
                id_don_hang: order.ma_don_hang,
                ma_don_hang: `DH${String(order.ma_don_hang).padStart(6, '0')}`,
                ngay_dat: order.thoi_gian_tao,
                trang_thai: mapOrderStatus(order.trang_thai),
                ten_nguoi_nhan: order.ten_khach_vang_lai || 'Khách hàng',
                so_dien_thoai: order.so_dt_khach || '',
                email: '',
                dia_chi: order.dia_chi_giao || '',
                phuong_xa: '',
                quan_huyen: '',
                tinh_thanh: '',
                ghi_chu: order.ghi_chu || '',
                tong_tien_hang: parseFloat(order.tong_tien) || 0,
                phi_van_chuyen: 0,
                giam_gia: parseFloat(order.tien_giam_gia) || 0,
                tong_thanh_toan: parseFloat(order.tong_tien) || 0,
                phuong_thuc_thanh_toan: order.phuong_thuc_thanh_toan || 'cod',
                ma_giao_dich: order.ma_giao_dich,
                items: orderItems.map(item => ({
                    ...item,
                    thanh_tien: parseFloat(item.so_luong) * parseFloat(item.gia_tai_thoi_diem)
                })),
                lich_su_trang_thai: lichSuTrangThai.map(h => {
                    // Sử dụng trang_thai_moi vì đó là trạng thái hiện tại của log
                    const originalStatus = h.trang_thai_moi || h.trang_thai;
                    const mappedStatus = mapOrderStatus(originalStatus);
                    console.log(`🔄 Mapping history: trang_thai_moi=${h.trang_thai_moi}, trang_thai=${h.trang_thai} -> ${mappedStatus}`);
                    return {
                        ma_lich_su: h.ma_lich_su,
                        ma_don_hang: h.ma_don_hang,
                        trang_thai_cu: h.trang_thai_cu ? mapOrderStatus(h.trang_thai_cu) : null,
                        trang_thai: mappedStatus,
                        nguoi_thay_doi: h.nguoi_thay_doi,
                        loai_nguoi_thay_doi: h.loai_nguoi_thay_doi,
                        ghi_chu: h.ghi_chu,
                        thoi_gian_thay_doi: h.thoi_gian_thay_doi
                    };
                })
            }
        });

    } catch (error) {
        console.error('Lỗi lấy chi tiết đơn hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Admin: Cập nhật trạng thái đơn hàng
router.put('/:orderId/status', requireAdmin, async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { orderId } = req.params;
        const { trang_thai_don_hang } = req.body;

        if (!trang_thai_don_hang) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Thiếu trạng thái đơn hàng'
            });
        }

        // Map frontend status to database status
        const statusMap = {
            'cho_xac_nhan': 'pending',
            'da_xac_nhan': 'confirmed',
            'dang_chuan_bi': 'preparing',
            'dang_giao': 'preparing',
            'hoan_thanh': 'delivered',
            'huy': 'cancelled'
        };

        const dbStatus = statusMap[trang_thai_don_hang] || trang_thai_don_hang;

        // Lấy thông tin đơn hàng hiện tại
        const [orderInfo] = await connection.query(
            'SELECT ma_nguoi_dung, trang_thai FROM don_hang WHERE ma_don_hang = ?',
            [orderId]
        );

        if (orderInfo.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        const currentStatus = orderInfo[0].trang_thai;

        // Nếu chuyển sang trạng thái cancelled và đơn hàng chưa bị hủy trước đó
        // thì hoàn trả số lượng tồn kho
        if (dbStatus === 'cancelled' && currentStatus !== 'cancelled') {
            const [orderItems] = await connection.query(
                'SELECT ma_mon, so_luong FROM chi_tiet_don_hang WHERE ma_don_hang = ?',
                [orderId]
            );

            for (const item of orderItems) {
                await connection.query(
                    'UPDATE mon_an SET so_luong_ton = so_luong_ton + ? WHERE ma_mon = ?',
                    [item.so_luong, item.ma_mon]
                );
            }
            console.log(`📦 Đã hoàn trả kho cho đơn hàng #${orderId}`);
        }

        await connection.query(
            'UPDATE don_hang SET trang_thai = ? WHERE ma_don_hang = ?',
            [dbStatus, orderId]
        );

        // Gửi thông báo cho khách hàng về trạng thái đơn hàng
        if (orderInfo[0].ma_nguoi_dung) {
            const statusMessages = {
                'pending': 'Đơn hàng đang chờ xác nhận',
                'confirmed': 'Đơn hàng đã được xác nhận',
                'preparing': 'Đơn hàng đang được chuẩn bị',
                'delivered': 'Đơn hàng đã giao thành công',
                'cancelled': 'Đơn hàng đã bị hủy'
            };
            
            try {
                await connection.query(`
                    INSERT INTO thong_bao (ma_nguoi_dung, loai, tieu_de, noi_dung, duong_dan, ma_lien_quan)
                    VALUES (?, 'order_status', ?, ?, ?, ?)
                `, [
                    orderInfo[0].ma_nguoi_dung,
                    `Cập nhật đơn hàng #${orderId}`,
                    statusMessages[dbStatus] || `Trạng thái: ${dbStatus}`,
                    `don-hang-cua-toi.html`,
                    orderId
                ]);
                console.log(`📢 Đã gửi thông báo cập nhật đơn hàng #${orderId} cho user ${orderInfo[0].ma_nguoi_dung}`);
            } catch (notifError) {
                console.error('Lỗi gửi thông báo:', notifError.message);
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Cập nhật trạng thái thành công'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Lỗi cập nhật trạng thái:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Hủy đơn hàng (chỉ cho đơn hàng chờ xác nhận hoặc đã xác nhận)
router.put('/:orderId/cancel', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const ma_nguoi_dung = req.user.ma_nguoi_dung;
        const { orderId } = req.params;
        const { ly_do_huy } = req.body;

        // Kiểm tra đơn hàng
        const [orderRows] = await connection.query(
            'SELECT * FROM don_hang WHERE ma_don_hang = ? AND ma_nguoi_dung = ?',
            [orderId, ma_nguoi_dung]
        );

        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        const order = orderRows[0];

        // Kiểm tra trạng thái thanh toán
        const [paymentRows] = await connection.query(
            'SELECT * FROM thanh_toan WHERE ma_don_hang = ?',
            [orderId]
        );

        // Không cho phép hủy nếu đã thanh toán thành công
        if (paymentRows.length > 0) {
            const payment = paymentRows[0];
            if (payment.trang_thai === 'success' || payment.trang_thai === 'completed') {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Không thể hủy đơn hàng đã thanh toán thành công. Vui lòng liên hệ CSKH để được hỗ trợ.'
                });
            }
        }

        // Chỉ cho phép hủy đơn hàng chờ xác nhận hoặc đã xác nhận
        const canCancel = ['cho_xac_nhan', 'da_xac_nhan', 'pending', 'confirmed'].includes(order.trang_thai);

        if (!canCancel) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy đơn hàng ở trạng thái này'
            });
        }

        // Hoàn lại số lượng tồn kho
        const [orderItems] = await connection.query(
            'SELECT ma_mon, so_luong FROM chi_tiet_don_hang WHERE ma_don_hang = ?',
            [orderId]
        );

        for (const item of orderItems) {
            await connection.query(
                'UPDATE mon_an SET so_luong_ton = so_luong_ton + ? WHERE ma_mon = ?',
                [item.so_luong, item.ma_mon]
            );
        }

        // Cập nhật trạng thái đơn hàng (sử dụng giá trị database 'cancelled')
        const ghi_chu_huy = ly_do_huy ? `Lý do: ${ly_do_huy}` : 'Khách hàng hủy đơn';

        await connection.query(
            'UPDATE don_hang SET trang_thai = "cancelled", ghi_chu = CONCAT(IFNULL(ghi_chu, ""), "\n", ?) WHERE ma_don_hang = ?',
            [ghi_chu_huy, orderId]
        );

        // Cập nhật trạng thái thanh toán (sử dụng 'cancelled')
        await connection.query(
            'UPDATE thanh_toan SET trang_thai = "cancelled" WHERE ma_don_hang = ?',
            [orderId]
        );

        // Cập nhật hóa đơn (sử dụng 'cancelled')
        await connection.query(
            'UPDATE hoa_don SET trang_thai = "cancelled" WHERE ma_don_hang = ?',
            [orderId]
        );

        // Lưu lịch sử trạng thái (trigger sẽ tự động ghi log khi UPDATE don_hang)
        // Không cần insert thủ công vì trigger after_don_hang_update sẽ xử lý

        await connection.commit();

        res.json({
            success: true,
            message: 'Đã hủy đơn hàng thành công'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Lỗi hủy đơn hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
