const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { sendReservationConfirmationEmail } = require('../config/email');

// Hàm khởi tạo/cập nhật cấu trúc database cho đặt bàn
async function initReservationTables() {
    try {
        // Kiểm tra và thêm cột ma_nguoi_dung vào bảng dat_ban
        const [columns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dat_ban' AND COLUMN_NAME = 'ma_nguoi_dung'
        `);
        
        if (columns.length === 0) {
            console.log('📦 Thêm cột ma_nguoi_dung vào bảng dat_ban...');
            await db.query('ALTER TABLE dat_ban ADD COLUMN ma_nguoi_dung int DEFAULT NULL AFTER ma_dat_ban');
        }

        // Kiểm tra và thêm cột tong_tien_du_kien
        const [columns2] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dat_ban' AND COLUMN_NAME = 'tong_tien_du_kien'
        `);
        
        if (columns2.length === 0) {
            console.log('📦 Thêm cột tong_tien_du_kien vào bảng dat_ban...');
            await db.query('ALTER TABLE dat_ban ADD COLUMN tong_tien_du_kien decimal(14,2) DEFAULT 0 AFTER trang_thai');
        }

        // Kiểm tra và thêm cột email vào bảng dat_ban
        const [columnsEmail] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dat_ban' AND COLUMN_NAME = 'email'
        `);
        
        if (columnsEmail.length === 0) {
            console.log('📦 Thêm cột email vào bảng dat_ban...');
            await db.query('ALTER TABLE dat_ban ADD COLUMN email varchar(255) DEFAULT NULL AFTER so_dien_thoai');
        }

        // Tạo bảng chi_tiet_dat_ban nếu chưa có
        await db.query(`
            CREATE TABLE IF NOT EXISTS chi_tiet_dat_ban (
                ma_chi_tiet int NOT NULL AUTO_INCREMENT,
                ma_dat_ban int NOT NULL,
                ma_mon int NOT NULL,
                so_luong int NOT NULL DEFAULT 1,
                gia_tai_thoi_diem decimal(12,2) NOT NULL,
                ghi_chu text,
                ngay_tao datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ma_chi_tiet),
                KEY fk_chi_tiet_dat_ban (ma_dat_ban),
                KEY fk_chi_tiet_mon_an (ma_mon)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('✅ Cấu trúc database đặt bàn đã sẵn sàng');
    } catch (error) {
        console.error('⚠️ Lỗi khởi tạo database đặt bàn:', error.message);
    }
}

// Gọi hàm khởi tạo khi module được load
initReservationTables();

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// Middleware xác thực token người dùng
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Vui lòng đăng nhập để đặt bàn'
        });
    }

    try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'
                });
            }
            req.user = user;
            next();
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi xác thực'
        });
    }
};

// Tạo đặt bàn mới (YÊU CẦU ĐĂNG NHẬP + ĐẶT MÓN)
router.post('/create', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();
    
    console.log('📝 Nhận request đặt bàn:', JSON.stringify(req.body, null, 2));
    try {
        await connection.beginTransaction();
        
        const ma_nguoi_dung = req.user.ma_nguoi_dung;
        const { 
            ten_nguoi_dat, 
            so_dien_thoai, 
            email, 
            ngay_dat, 
            gio_den, 
            so_luong, 
            khu_vuc, 
            ghi_chu,
            mon_an // Mảng các món ăn đã chọn: [{ma_mon, so_luong, ghi_chu}]
        } = req.body;

        // Validate dữ liệu bắt buộc
        if (!ten_nguoi_dat || !so_dien_thoai || !ngay_dat || !gio_den || !so_luong) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
            });
        }

        // Validate phải có ít nhất 1 món ăn
        if (!mon_an || !Array.isArray(mon_an) || mon_an.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn ít nhất 1 món ăn để đặt trước. Điều này giúp nhà hàng chuẩn bị món ăn kịp thời khi quý khách đến.'
            });
        }

        // Validate thời gian đặt bàn (phải trước ít nhất 3 tiếng)
        const MIN_HOURS_ADVANCE = 3;
        const bookingDateTime = new Date(`${ngay_dat}T${gio_den}`);
        const now = new Date();
        const minBookingTime = new Date(now.getTime() + MIN_HOURS_ADVANCE * 60 * 60 * 1000);

        if (bookingDateTime < minBookingTime) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Vui lòng đặt bàn trước ít nhất ${MIN_HOURS_ADVANCE} tiếng để nhà hàng có thời gian chuẩn bị món ăn`
            });
        }

        // Validate giờ mở cửa (7:00 - 23:00)
        const hours = bookingDateTime.getHours();
        if (hours < 7 || hours >= 23) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Nhà hàng mở cửa từ 7:00 đến 23:00'
            });
        }

        // Thêm ghi chú về khu vực nếu có
        let fullGhiChu = ghi_chu || '';
        if (khu_vuc) {
            const khuVucMap = {
                'indoor': 'Khu vực trong nhà',
                'outdoor': 'Khu vực sân vườn',
                'vip': 'Phòng VIP'
            };
            fullGhiChu = `[${khuVucMap[khu_vuc] || khu_vuc}] ${fullGhiChu}`.trim();
        }

        // Kiểm tra và tính tổng tiền món ăn
        let tongTienMonAn = 0;
        const monAnDetails = [];
        
        for (const item of mon_an) {
            const [dishRows] = await connection.query(
                'SELECT ma_mon, ten_mon, gia_tien, trang_thai FROM mon_an WHERE ma_mon = ?',
                [item.ma_mon]
            );
            
            if (dishRows.length === 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Món ăn với mã ${item.ma_mon} không tồn tại`
                });
            }
            
            const dish = dishRows[0];
            if (dish.trang_thai !== 1) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Món "${dish.ten_mon}" hiện không còn phục vụ`
                });
            }
            
            const soLuongMon = parseInt(item.so_luong) || 1;
            const thanhTien = parseFloat(dish.gia_tien) * soLuongMon;
            tongTienMonAn += thanhTien;
            
            monAnDetails.push({
                ma_mon: dish.ma_mon,
                ten_mon: dish.ten_mon,
                so_luong: soLuongMon,
                gia_tai_thoi_diem: dish.gia_tien,
                thanh_tien: thanhTien,
                ghi_chu: item.ghi_chu || null
            });
        }

        // Insert vào bảng dat_ban
        const [result] = await connection.query(
            `INSERT INTO dat_ban (ma_nguoi_dung, ten_nguoi_dat, so_dien_thoai, email, so_luong, ngay_dat, gio_den, ghi_chu, trang_thai, tong_tien_du_kien)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [ma_nguoi_dung, ten_nguoi_dat, so_dien_thoai, email || null, parseInt(so_luong), ngay_dat, gio_den, fullGhiChu || null, tongTienMonAn]
        );

        const ma_dat_ban = result.insertId;
        console.log('✅ Đã tạo đặt bàn với mã:', ma_dat_ban);

        // Insert chi tiết món ăn đã đặt
        console.log('📦 Đang insert', monAnDetails.length, 'món ăn...');
        for (const item of monAnDetails) {
            console.log('  - Insert món:', item.ma_mon, item.ten_mon, 'SL:', item.so_luong);
            await connection.query(
                `INSERT INTO chi_tiet_dat_ban (ma_dat_ban, ma_mon, so_luong, gia_tai_thoi_diem, ghi_chu)
                 VALUES (?, ?, ?, ?, ?)`,
                [ma_dat_ban, item.ma_mon, item.so_luong, item.gia_tai_thoi_diem, item.ghi_chu]
            );
        }
        console.log('✅ Đã insert xong chi tiết món ăn');

        await connection.commit();

        // Gửi email xác nhận đặt bàn (nếu có email)
        if (email) {
            try {
                await sendReservationConfirmationEmail(email, {
                    ma_dat_ban,
                    ten_nguoi_dat,
                    so_dien_thoai,
                    ngay_dat,
                    gio_den,
                    so_luong,
                    ghi_chu: fullGhiChu,
                    mon_an: monAnDetails,
                    tong_tien_du_kien: tongTienMonAn
                });
                console.log(`📧 Đã gửi email xác nhận đặt bàn #${ma_dat_ban} đến ${email}`);
            } catch (emailError) {
                console.error('⚠️ Lỗi gửi email xác nhận đặt bàn:', emailError.message);
                // Không throw lỗi, vẫn tiếp tục vì đặt bàn đã được tạo thành công
            }
        }

        res.json({
            success: true,
            message: 'Đặt bàn và đặt món thành công! Nhà hàng sẽ liên hệ xác nhận.',
            data: {
                ma_dat_ban,
                ten_nguoi_dat,
                so_dien_thoai,
                ngay_dat,
                gio_den,
                so_luong,
                tong_tien_du_kien: tongTienMonAn,
                so_mon_da_dat: monAnDetails.length,
                chi_tiet_mon_an: monAnDetails
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating reservation:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đặt bàn: ' + error.message
        });
    } finally {
        connection.release();
    }
});

// Lấy danh sách đặt bàn của người dùng hiện tại
router.get('/my-reservations', authenticateToken, async (req, res) => {
    try {
        const ma_nguoi_dung = req.user.ma_nguoi_dung;
        
        // Kiểm tra xem cột ma_nguoi_dung có tồn tại không
        let reservations = [];
        try {
            const [rows] = await db.query(`
                SELECT db.*, 
                       tt.trang_thai as payment_status,
                       tt.so_tien as so_tien_da_thanh_toan,
                       tt.thoi_gian_het_han as payment_expiry
                FROM dat_ban db
                LEFT JOIN (
                    SELECT ma_dat_ban, trang_thai, so_tien, thoi_gian_het_han
                    FROM thanh_toan_dat_ban t1
                    WHERE thoi_gian_tao = (
                        SELECT MAX(thoi_gian_tao) FROM thanh_toan_dat_ban t2 WHERE t2.ma_dat_ban = t1.ma_dat_ban
                    )
                ) tt ON db.ma_dat_ban = tt.ma_dat_ban
                WHERE db.ma_nguoi_dung = ?
                ORDER BY db.ngay_dat DESC, db.gio_den DESC
            `, [ma_nguoi_dung]);
            
            // Xử lý trạng thái thanh toán
            reservations = rows.map(r => {
                let trang_thai_thanh_toan = 'unpaid';
                
                if (r.payment_status === 'paid') {
                    trang_thai_thanh_toan = 'paid';
                } else if (r.payment_status === 'pending') {
                    // Kiểm tra xem pending đã hết hạn chưa
                    const now = new Date();
                    const expiry = new Date(r.payment_expiry);
                    trang_thai_thanh_toan = now > expiry ? 'failed' : 'pending';
                } else if (r.payment_status === 'failed') {
                    trang_thai_thanh_toan = 'failed';
                } else if (r.payment_status === 'cancelled') {
                    trang_thai_thanh_toan = 'cancelled';
                }
                
                return {
                    ...r,
                    trang_thai_thanh_toan,
                    payment_status: undefined,
                    payment_expiry: undefined
                };
            });
        } catch (dbError) {
            // Nếu cột ma_nguoi_dung chưa tồn tại, trả về mảng rỗng
            console.log('Database chưa được cập nhật với cột ma_nguoi_dung:', dbError.message);
            return res.json({
                success: true,
                data: [],
                message: 'Chưa có đặt bàn nào'
            });
        }

        // Thử lấy số món đã đặt (nếu bảng chi_tiet_dat_ban tồn tại)
        for (let reservation of reservations) {
            try {
                const [countResult] = await db.query(
                    'SELECT COUNT(*) as count FROM chi_tiet_dat_ban WHERE ma_dat_ban = ?',
                    [reservation.ma_dat_ban]
                );
                reservation.so_mon_da_dat = countResult[0]?.count || 0;

                // Lấy chi tiết món ăn
                const [items] = await db.query(`
                    SELECT ct.*, m.ten_mon, m.anh_mon
                    FROM chi_tiet_dat_ban ct
                    JOIN mon_an m ON ct.ma_mon = m.ma_mon
                    WHERE ct.ma_dat_ban = ?
                `, [reservation.ma_dat_ban]);
                reservation.mon_an = items;
            } catch (e) {
                // Bảng chi_tiet_dat_ban chưa tồn tại
                reservation.so_mon_da_dat = 0;
                reservation.mon_an = [];
            }
        }

        res.json({
            success: true,
            data: reservations
        });
    } catch (error) {
        console.error('Error fetching user reservations:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đặt bàn'
        });
    }
});

// Thống kê đặt bàn - PHẢI ĐẶT TRƯỚC /:id
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

        // Tổng số đặt bàn theo filter
        let totalQuery = `SELECT COUNT(*) as total FROM dat_ban WHERE 1=1`;
        const totalParams = [];
        
        if (year) {
            totalQuery += ` AND YEAR(ngay_dat) = ?`;
            totalParams.push(targetYear);
        }
        if (month && parseInt(month) > 0) {
            totalQuery += ` AND MONTH(ngay_dat) = ?`;
            totalParams.push(targetMonth);
        }
        
        const [totalCount] = await db.query(totalQuery, totalParams);
        
        // Đặt bàn hôm nay
        const [todayCount] = await db.query(`
            SELECT COUNT(*) as count FROM dat_ban WHERE DATE(ngay_dat) = CURDATE()
        `);

        // Đặt bàn theo trạng thái (theo filter)
        let statusQuery = `SELECT trang_thai, COUNT(*) as count FROM dat_ban WHERE 1=1`;
        const statusParams = [];
        if (year) {
            statusQuery += ` AND YEAR(ngay_dat) = ?`;
            statusParams.push(targetYear);
        }
        if (month && parseInt(month) > 0) {
            statusQuery += ` AND MONTH(ngay_dat) = ?`;
            statusParams.push(targetMonth);
        }
        statusQuery += ` GROUP BY trang_thai`;
        
        const [statusStats] = await db.query(statusQuery, statusParams);

        // Đặt bàn tuần này
        const [weekStats] = await db.query(`
            SELECT COUNT(*) as count FROM dat_ban 
            WHERE YEARWEEK(ngay_dat, 1) = YEARWEEK(CURDATE(), 1)
        `);

        // Đặt bàn trong tháng được chọn
        const [thisMonthCount] = await db.query(`
            SELECT COUNT(*) as count FROM dat_ban 
            WHERE MONTH(ngay_dat) = ? AND YEAR(ngay_dat) = ?
        `, [targetMonth, targetYear]);

        // Đặt bàn tháng trước
        const [lastMonthCount] = await db.query(`
            SELECT COUNT(*) as count FROM dat_ban 
            WHERE MONTH(ngay_dat) = ? AND YEAR(ngay_dat) = ?
        `, [prevMonth, prevYear]);

        // Tính phần trăm thay đổi
        const reservationsChange = lastMonthCount[0].count > 0 
            ? ((thisMonthCount[0].count - lastMonthCount[0].count) / lastMonthCount[0].count * 100).toFixed(1)
            : (thisMonthCount[0].count > 0 ? 100 : 0);

        // Tạo label so sánh
        const comparisonLabel = `So với T${prevMonth}/${prevYear}`;

        res.json({
            success: true,
            totalReservations: month && parseInt(month) > 0 ? thisMonthCount[0].count : totalCount[0].total,
            today: todayCount[0].count,
            thisWeek: weekStats[0].count,
            thisMonth: thisMonthCount[0].count,
            lastMonth: lastMonthCount[0].count,
            byStatus: statusStats,
            comparison: {
                reservationsChange: parseFloat(reservationsChange),
                label: comparisonLabel
            },
            filters: { year: targetYear, month: targetMonth }
        });
    } catch (error) {
        console.error('Error fetching reservation stats:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê' });
    }
});

// Lấy tất cả đặt bàn (Admin)
router.get('/', requireAdmin, async (req, res) => {
    try {
        // Kiểm tra bảng thanh_toan_dat_ban có tồn tại không
        let hasPaymentTable = true;
        try {
            await db.query('SELECT 1 FROM thanh_toan_dat_ban LIMIT 1');
        } catch (e) {
            hasPaymentTable = false;
        }

        let query;
        if (hasPaymentTable) {
            // Lấy record thanh toán mới nhất cho mỗi đặt bàn
            query = `
                SELECT db.*, nd.ten_nguoi_dung, nd.email,
                       (SELECT COUNT(*) FROM chi_tiet_dat_ban WHERE ma_dat_ban = db.ma_dat_ban) as so_mon_da_dat,
                       db.tong_tien_du_kien,
                       COALESCE(tt.trang_thai, 'unpaid') as trang_thai_thanh_toan,
                       tt.so_tien as so_tien_da_thanh_toan
                FROM dat_ban db
                LEFT JOIN nguoi_dung nd ON db.ma_nguoi_dung = nd.ma_nguoi_dung
                LEFT JOIN (
                    SELECT t1.ma_dat_ban, t1.trang_thai, t1.so_tien
                    FROM thanh_toan_dat_ban t1
                    INNER JOIN (
                        SELECT ma_dat_ban, MAX(thoi_gian_tao) as max_time
                        FROM thanh_toan_dat_ban
                        GROUP BY ma_dat_ban
                    ) t2 ON t1.ma_dat_ban = t2.ma_dat_ban AND t1.thoi_gian_tao = t2.max_time
                ) tt ON db.ma_dat_ban = tt.ma_dat_ban
                ORDER BY db.ngay_dat DESC, db.gio_den DESC
            `;
        } else {
            query = `
                SELECT db.*, nd.ten_nguoi_dung, nd.email,
                       (SELECT COUNT(*) FROM chi_tiet_dat_ban WHERE ma_dat_ban = db.ma_dat_ban) as so_mon_da_dat,
                       db.tong_tien_du_kien,
                       'unpaid' as trang_thai_thanh_toan,
                       NULL as so_tien_da_thanh_toan
                FROM dat_ban db
                LEFT JOIN nguoi_dung nd ON db.ma_nguoi_dung = nd.ma_nguoi_dung
                ORDER BY db.ngay_dat DESC, db.gio_den DESC
            `;
        }

        const [reservations] = await db.query(query);

        res.json({
            success: true,
            data: reservations
        });
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đặt bàn'
        });
    }
});

// Lấy chi tiết một đặt bàn
router.get('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra bảng thanh_toan_dat_ban có tồn tại không
        let hasPaymentTable = true;
        try {
            await db.query('SELECT 1 FROM thanh_toan_dat_ban LIMIT 1');
        } catch (e) {
            hasPaymentTable = false;
        }

        let query;
        if (hasPaymentTable) {
            // Lấy record thanh toán mới nhất
            query = `
                SELECT db.*, nd.ten_nguoi_dung, nd.email as nguoi_dung_email, nd.so_dien_thoai as sdt_nguoi_dung,
                       COALESCE(tt.trang_thai, 'unpaid') as trang_thai_thanh_toan,
                       tt.so_tien as so_tien_da_thanh_toan,
                       tt.thoi_gian_thanh_toan
                FROM dat_ban db
                LEFT JOIN nguoi_dung nd ON db.ma_nguoi_dung = nd.ma_nguoi_dung
                LEFT JOIN (
                    SELECT t1.ma_dat_ban, t1.trang_thai, t1.so_tien, t1.thoi_gian_thanh_toan
                    FROM thanh_toan_dat_ban t1
                    INNER JOIN (
                        SELECT ma_dat_ban, MAX(thoi_gian_tao) as max_time
                        FROM thanh_toan_dat_ban
                        GROUP BY ma_dat_ban
                    ) t2 ON t1.ma_dat_ban = t2.ma_dat_ban AND t1.thoi_gian_tao = t2.max_time
                ) tt ON db.ma_dat_ban = tt.ma_dat_ban
                WHERE db.ma_dat_ban = ?
            `;
        } else {
            query = `
                SELECT db.*, nd.ten_nguoi_dung, nd.email as nguoi_dung_email, nd.so_dien_thoai as sdt_nguoi_dung,
                       'unpaid' as trang_thai_thanh_toan,
                       NULL as so_tien_da_thanh_toan,
                       NULL as thoi_gian_thanh_toan
                FROM dat_ban db
                LEFT JOIN nguoi_dung nd ON db.ma_nguoi_dung = nd.ma_nguoi_dung
                WHERE db.ma_dat_ban = ?
            `;
        }

        const [reservations] = await db.query(query, [id]);

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        // Lấy chi tiết món ăn đã đặt
        const [items] = await db.query(`
            SELECT ct.*, m.ten_mon, m.anh_mon
            FROM chi_tiet_dat_ban ct
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            WHERE ct.ma_dat_ban = ?
        `, [id]);

        res.json({
            success: true,
            data: {
                ...reservations[0],
                mon_an: items
            }
        });
    } catch (error) {
        console.error('Error fetching reservation:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin đặt bàn'
        });
    }
});

// Cập nhật trạng thái đặt bàn
router.put('/:id/status', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { trang_thai } = req.body;

        // Validate trạng thái
        const validStatuses = ['pending', 'confirmed', 'attended', 'cancelled'];
        if (!validStatuses.includes(trang_thai)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ'
            });
        }

        // Lấy thông tin đặt bàn trước khi cập nhật
        const [reservations] = await db.query(
            'SELECT * FROM dat_ban WHERE ma_dat_ban = ?',
            [id]
        );

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        const reservation = reservations[0];
        const oldStatus = reservation.trang_thai;

        // Cập nhật trạng thái
        await db.query(
            'UPDATE dat_ban SET trang_thai = ? WHERE ma_dat_ban = ?',
            [trang_thai, id]
        );

        // Gửi thông báo cho người dùng nếu có ma_nguoi_dung
        if (reservation.ma_nguoi_dung && oldStatus !== trang_thai) {
            const statusMessages = {
                'confirmed': {
                    title: 'Đặt bàn đã được xác nhận',
                    content: `Đặt bàn #${id} của bạn đã được nhà hàng xác nhận. Ngày: ${new Date(reservation.ngay_dat).toLocaleDateString('vi-VN')}, Giờ: ${reservation.gio_den}`
                },
                'attended': {
                    title: 'Đặt bàn đã hoàn thành',
                    content: `Cảm ơn bạn đã đến nhà hàng! Đặt bàn #${id} đã được ghi nhận hoàn thành.`
                },
                'cancelled': {
                    title: 'Đặt bàn đã bị hủy',
                    content: `Đặt bàn #${id} của bạn đã bị hủy. Vui lòng liên hệ nhà hàng nếu cần hỗ trợ.`
                },
                'pending': {
                    title: 'Đặt bàn đang chờ xác nhận',
                    content: `Đặt bàn #${id} của bạn đang được xử lý. Vui lòng chờ xác nhận từ nhà hàng.`
                }
            };

            const message = statusMessages[trang_thai];
            if (message) {
                try {
                    await db.query(`
                        INSERT INTO thong_bao (ma_nguoi_dung, loai, tieu_de, noi_dung, duong_dan, ma_lien_quan)
                        VALUES (?, 'system', ?, ?, ?, ?)
                    `, [
                        reservation.ma_nguoi_dung,
                        message.title,
                        message.content,
                        '/dat-ban-cua-toi.html',
                        id
                    ]);
                } catch (notifError) {
                    console.error('Error creating notification:', notifError);
                    // Không throw lỗi, vẫn tiếp tục
                }
            }
        }

        res.json({
            success: true,
            message: 'Cập nhật trạng thái thành công'
        });
    } catch (error) {
        console.error('Error updating reservation status:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái'
        });
    }
});

// Xóa đặt bàn
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Xóa chi tiết món ăn trước
        await db.query('DELETE FROM chi_tiet_dat_ban WHERE ma_dat_ban = ?', [id]);

        const [result] = await db.query(
            'DELETE FROM dat_ban WHERE ma_dat_ban = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        res.json({
            success: true,
            message: 'Xóa đặt bàn thành công'
        });
    } catch (error) {
        console.error('Error deleting reservation:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa đặt bàn'
        });
    }
});

// Hủy đặt bàn (cho người dùng)
// Ràng buộc: Chỉ có thể hủy trong vòng 1 tiếng sau khi đặt
router.put('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Kiểm tra đặt bàn thuộc về người dùng
        const [reservations] = await db.query(
            'SELECT * FROM dat_ban WHERE ma_dat_ban = ? AND ma_nguoi_dung = ?',
            [id, ma_nguoi_dung]
        );

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn hoặc bạn không có quyền hủy'
            });
        }

        const reservation = reservations[0];
        
        // Chỉ cho phép hủy nếu trạng thái là pending hoặc confirmed
        if (!['pending', 'confirmed'].includes(reservation.trang_thai)) {
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy đặt bàn ở trạng thái này'
            });
        }

        // Kiểm tra thời gian - chỉ cho hủy trong vòng 1 tiếng sau khi đặt
        const createdAt = new Date(reservation.thoi_gian_tao);
        const now = new Date();
        const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);

        if (hoursSinceCreated > 1) {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể hủy đặt bàn trong vòng 1 tiếng sau khi đặt. Vui lòng liên hệ nhà hàng qua hotline để được hỗ trợ.'
            });
        }

        await db.query(
            'UPDATE dat_ban SET trang_thai = ? WHERE ma_dat_ban = ?',
            ['cancelled', id]
        );

        res.json({
            success: true,
            message: 'Hủy đặt bàn thành công'
        });
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy đặt bàn'
        });
    }
});

module.exports = router;
