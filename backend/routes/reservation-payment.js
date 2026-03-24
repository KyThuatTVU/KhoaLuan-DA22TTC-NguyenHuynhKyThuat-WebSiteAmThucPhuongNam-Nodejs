const express = require('express');
const router = express.Router();
const db = require('../config/database');
const crypto = require('crypto');
const { sendReservationPaymentSuccessEmail } = require('../config/email');

// Tự động tạo bảng thanh_toan_dat_ban nếu chưa có
async function initReservationPaymentTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS thanh_toan_dat_ban (
                ma_thanh_toan INT NOT NULL AUTO_INCREMENT,
                ma_dat_ban INT NOT NULL,
                ma_giao_dich VARCHAR(50) NOT NULL,
                so_tien DECIMAL(14,2) NOT NULL,
                noi_dung_chuyen_khoan VARCHAR(255) NOT NULL,
                trang_thai ENUM('pending', 'paid', 'failed', 'cancelled') DEFAULT 'pending',
                thoi_gian_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                thoi_gian_thanh_toan DATETIME NULL,
                thoi_gian_het_han DATETIME NOT NULL,
                ghi_chu TEXT NULL,
                PRIMARY KEY (ma_thanh_toan),
                UNIQUE KEY unique_transaction (ma_giao_dich),
                KEY idx_ma_dat_ban (ma_dat_ban)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Bảng thanh_toan_dat_ban đã sẵn sàng');
    } catch (error) {
        console.error('⚠️ Lỗi tạo bảng thanh_toan_dat_ban:', error.message);
    }
}

// Gọi khi module được load
initReservationPaymentTable();

// Middleware xác thực token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Vui lòng đăng nhập'
        });
    }

    try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Phiên đăng nhập đã hết hạn'
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

// Thông tin tài khoản nhà hàng
const RESTAURANT_BANK_INFO = {
    bankName: 'Vietcombank',
    accountNumber: '1052053578',
    accountName: 'NGUYEN HUYNH KY THUAT',
    bankCode: 'VCB'
};

// Tạo QR code thanh toán cho đặt bàn
router.post('/create-payment-qr', authenticateToken, async (req, res) => {
    try {
        const { ma_dat_ban } = req.body;
        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Kiểm tra đặt bàn
        const [reservations] = await db.query(
            `SELECT db.*, 
                    (SELECT COUNT(*) FROM chi_tiet_dat_ban WHERE ma_dat_ban = db.ma_dat_ban) as so_mon
             FROM dat_ban db
             WHERE db.ma_dat_ban = ? AND db.ma_nguoi_dung = ?`,
            [ma_dat_ban, ma_nguoi_dung]
        );

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        const reservation = reservations[0];

        // Kiểm tra đã thanh toán chưa (từ bảng thanh_toan_dat_ban)
        const [existingPayments] = await db.query(
            'SELECT * FROM thanh_toan_dat_ban WHERE ma_dat_ban = ? AND trang_thai = ?',
            [ma_dat_ban, 'paid']
        );
        
        if (existingPayments.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Đặt bàn này đã được thanh toán'
            });
        }

        // Kiểm tra phải có món ăn
        if (reservation.so_mon === 0) {
            return res.status(400).json({
                success: false,
                message: 'Đặt bàn phải có ít nhất 1 món ăn'
            });
        }

        const amount = Math.round(parseFloat(reservation.tong_tien_du_kien));
        
        // Tạo mã giao dịch unique
        const transactionCode = `DB${String(ma_dat_ban).padStart(6, '0')}${Date.now().toString().slice(-6)}`;
        
        // Tạo nội dung chuyển khoản
        const transferContent = `DB${String(ma_dat_ban).padStart(6, '0')}`;

        // Tạo URL QR code sử dụng API VietQR
        const qrCodeUrl = `https://img.vietqr.io/image/${RESTAURANT_BANK_INFO.bankCode}-${RESTAURANT_BANK_INFO.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(RESTAURANT_BANK_INFO.accountName)}`;

        // Lưu thông tin thanh toán vào database
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
        
        // Xóa các payment pending cũ của đặt bàn này trước khi tạo mới
        await db.query(
            `DELETE FROM thanh_toan_dat_ban WHERE ma_dat_ban = ? AND trang_thai IN ('pending', 'failed', 'cancelled')`,
            [ma_dat_ban]
        );
        
        // Tạo payment record mới
        await db.query(
            `INSERT INTO thanh_toan_dat_ban (ma_dat_ban, ma_giao_dich, so_tien, noi_dung_chuyen_khoan, trang_thai, thoi_gian_het_han, thoi_gian_tao)
             VALUES (?, ?, ?, ?, 'pending', ?, NOW())`,
            [ma_dat_ban, transactionCode, amount, transferContent, expiryTime]
        );

        res.json({
            success: true,
            data: {
                qrCodeUrl,
                bankInfo: RESTAURANT_BANK_INFO,
                amount,
                transferContent,
                transactionCode,
                expiryTime: expiryTime.toISOString(),
                expiryMinutes: 5
            }
        });

    } catch (error) {
        console.error('Error creating payment QR:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi tạo mã QR thanh toán'
        });
    }
});

// Xác nhận đã thanh toán (người dùng bấm nút)
router.post('/confirm-payment', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { ma_dat_ban } = req.body;
        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Kiểm tra đặt bàn và lấy thông tin người dùng
        const [reservations] = await connection.query(
            `SELECT db.*, 
                    COALESCE(db.email, nd.email) as email_to_send,
                    nd.ten_nguoi_dung
             FROM dat_ban db
             LEFT JOIN nguoi_dung nd ON db.ma_nguoi_dung = nd.ma_nguoi_dung
             WHERE db.ma_dat_ban = ? AND db.ma_nguoi_dung = ?`,
            [ma_dat_ban, ma_nguoi_dung]
        );

        if (reservations.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        const reservation = reservations[0];

        // Kiểm tra thông tin thanh toán
        const [payments] = await connection.query(
            'SELECT * FROM thanh_toan_dat_ban WHERE ma_dat_ban = ? ORDER BY thoi_gian_tao DESC LIMIT 1',
            [ma_dat_ban]
        );

        if (payments.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Chưa tạo mã QR thanh toán'
            });
        }

        const payment = payments[0];

        // Kiểm tra đã thanh toán chưa
        if (payment.trang_thai === 'paid') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Đặt bàn này đã được thanh toán'
            });
        }

        // Demo mode: Không kiểm tra hết hạn QR code
        // Khi người dùng bấm "Đã thanh toán" thì ghi nhận ngay

        // Cập nhật trạng thái thanh toán
        await connection.query(
            `UPDATE thanh_toan_dat_ban 
             SET trang_thai = 'paid', thoi_gian_thanh_toan = NOW()
             WHERE ma_dat_ban = ?`,
            [ma_dat_ban]
        );

        // Cập nhật trạng thái đặt bàn thành confirmed
        await connection.query(
            `UPDATE dat_ban 
             SET trang_thai = 'confirmed'
             WHERE ma_dat_ban = ?`,
            [ma_dat_ban]
        );

        // Lấy chi tiết món ăn đã đặt
        const [monAn] = await connection.query(
            `SELECT ct.*, m.ten_mon, m.anh_mon
             FROM chi_tiet_dat_ban ct
             JOIN mon_an m ON ct.ma_mon = m.ma_mon
             WHERE ct.ma_dat_ban = ?`,
            [ma_dat_ban]
        );

        await connection.commit();

        // Gửi email xác nhận thanh toán thành công (nếu có email)
        const emailToSend = reservation.email_to_send;
        console.log('📧 Kiểm tra email người dùng:', emailToSend);
        if (emailToSend) {
            try {
                console.log('📧 Đang gửi email đến:', emailToSend);
                await sendReservationPaymentSuccessEmail(emailToSend, {
                    ma_dat_ban,
                    ten_nguoi_dat: reservation.ten_nguoi_dat,
                    so_dien_thoai: reservation.so_dien_thoai,
                    ngay_dat: reservation.ngay_dat,
                    gio_den: reservation.gio_den,
                    so_luong: reservation.so_luong,
                    ghi_chu: reservation.ghi_chu,
                    mon_an: monAn,
                    tong_tien: payment.so_tien,
                    ma_giao_dich: payment.ma_giao_dich,
                    thoi_gian_thanh_toan: new Date()
                });
                console.log(`📧 Đã gửi email xác nhận thanh toán đặt bàn #${ma_dat_ban} đến ${emailToSend}`);
            } catch (emailError) {
                console.error('⚠️ Lỗi gửi email xác nhận thanh toán:', emailError.message);
                // Không throw lỗi, vẫn tiếp tục vì thanh toán đã thành công
            }
        }

        res.json({
            success: true,
            message: 'Xác nhận thanh toán thành công! Đặt bàn của bạn đã được xác nhận.'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error confirming payment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xác nhận thanh toán'
        });
    } finally {
        connection.release();
    }
});

// Kiểm tra trạng thái thanh toán
router.get('/payment-status/:ma_dat_ban', authenticateToken, async (req, res) => {
    try {
        const { ma_dat_ban } = req.params;
        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Kiểm tra quyền truy cập
        const [reservations] = await db.query(
            'SELECT * FROM dat_ban WHERE ma_dat_ban = ? AND ma_nguoi_dung = ?',
            [ma_dat_ban, ma_nguoi_dung]
        );

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        // Lấy thông tin thanh toán
        const [payments] = await db.query(
            'SELECT * FROM thanh_toan_dat_ban WHERE ma_dat_ban = ? ORDER BY thoi_gian_tao DESC LIMIT 1',
            [ma_dat_ban]
        );

        if (payments.length === 0) {
            return res.json({
                success: true,
                data: {
                    hasPendingPayment: false,
                    status: 'unpaid'
                }
            });
        }

        const payment = payments[0];
        const now = new Date();
        const expiryTime = new Date(payment.thoi_gian_het_han);
        const isExpired = now > expiryTime;

        res.json({
            success: true,
            data: {
                hasPendingPayment: payment.trang_thai === 'pending' && !isExpired,
                status: payment.trang_thai,
                isExpired,
                expiryTime: payment.thoi_gian_het_han,
                amount: payment.so_tien,
                transactionCode: payment.ma_giao_dich
            }
        });

    } catch (error) {
        console.error('Error checking payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi kiểm tra trạng thái thanh toán'
        });
    }
});

// Hủy thanh toán (hết hạn hoặc người dùng hủy)
router.post('/cancel-payment', authenticateToken, async (req, res) => {
    try {
        const { ma_dat_ban, reason } = req.body;
        const ma_nguoi_dung = req.user.ma_nguoi_dung;

        // Kiểm tra quyền
        const [reservations] = await db.query(
            'SELECT * FROM dat_ban WHERE ma_dat_ban = ? AND ma_nguoi_dung = ?',
            [ma_dat_ban, ma_nguoi_dung]
        );

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt bàn'
            });
        }

        // Xác định trạng thái: 'expired' = hết hạn, 'cancelled' = người dùng hủy
        const newStatus = reason === 'expired' ? 'failed' : 'cancelled';

        // Cập nhật trạng thái thanh toán
        await db.query(
            `UPDATE thanh_toan_dat_ban 
             SET trang_thai = ?
             WHERE ma_dat_ban = ? AND trang_thai = 'pending'`,
            [newStatus, ma_dat_ban]
        );

        res.json({
            success: true,
            message: reason === 'expired' ? 'Mã QR đã hết hạn' : 'Đã hủy thanh toán'
        });

    } catch (error) {
        console.error('Error cancelling payment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hủy thanh toán'
        });
    }
});

module.exports = router;
