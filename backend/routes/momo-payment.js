const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/database');
const momoConfig = require('../config/momo');

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

// Tạo payment request MoMo
router.post('/momo/create-payment', authenticateToken, async (req, res) => {
    try {
        const { orderId, amount: rawAmount, orderInfo } = req.body;

        // Validate
        if (!orderId || !rawAmount) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin đơn hàng'
            });
        }

        // MoMo yêu cầu amount là số nguyên
        const amount = Math.round(parseFloat(rawAmount));

        // Kiểm tra đơn hàng
        const [orderRows] = await db.query(
            'SELECT * FROM don_hang WHERE ma_don_hang = ? AND ma_nguoi_dung = ?',
            [orderId, req.user.ma_nguoi_dung]
        );

        if (orderRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Tạo request ID và order ID
        const requestId = `${orderId}_${Date.now()}`;
        const momoOrderId = `DH${String(orderId).padStart(6, '0')}`;

        // Tạo raw signature
        const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=&ipnUrl=${momoConfig.ipnUrl}&orderId=${requestId}&orderInfo=${orderInfo || `Thanh toan don hang ${orderId}`}&partnerCode=${momoConfig.partnerCode}&redirectUrl=${momoConfig.redirectUrl}&requestId=${requestId}&requestType=${momoConfig.requestType}`;

        console.log('🔐 MoMo Raw Signature:', rawSignature);

        // Tạo chữ ký HMAC SHA256
        const signature = crypto
            .createHmac('sha256', momoConfig.secretKey)
            .update(rawSignature)
            .digest('hex');

        console.log('🔐 MoMo Signature:', signature);

        // Tạo request body - amount phải là số nguyên
        const requestBody = {
            partnerCode: momoConfig.partnerCode,
            accessKey: momoConfig.accessKey,
            requestId: requestId,
            amount: amount,
            orderId: requestId,
            orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
            redirectUrl: momoConfig.redirectUrl,
            ipnUrl: momoConfig.ipnUrl,
            requestType: momoConfig.requestType,
            extraData: '',
            lang: momoConfig.lang,
            signature: signature
        };

        console.log('📤 MoMo Request:', requestBody);

        // Gửi request đến MoMo
        const response = await axios.post(momoConfig.endpoint, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('📥 MoMo Response:', response.data);

        if (response.data.resultCode === 0) {
            // Cập nhật thông tin giao dịch
            await db.query(
                `UPDATE thanh_toan 
                 SET ma_giao_dich = ?, phuong_thuc = 'momo', trang_thai = 'pending'
                 WHERE ma_don_hang = ?`,
                [requestId, orderId]
            );

            res.json({
                success: true,
                data: {
                    paymentUrl: response.data.payUrl,
                    requestId: requestId,
                    qrCodeUrl: response.data.qrCodeUrl
                }
            });
        } else {
            throw new Error(response.data.message || 'Không thể tạo thanh toán MoMo');
        }

    } catch (error) {
        console.error('❌ Lỗi tạo thanh toán MoMo:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// Xử lý callback từ MoMo (redirect)
router.get('/momo-return', async (req, res) => {
    try {
        console.log('📥 MoMo Return:', req.query);

        const {
            partnerCode,
            orderId,
            requestId,
            amount,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            responseTime,
            extraData,
            signature
        } = req.query;

        // Verify signature
        const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

        const calculatedSignature = crypto
            .createHmac('sha256', momoConfig.secretKey)
            .update(rawSignature)
            .digest('hex');

        console.log('🔐 Signature Match:', signature === calculatedSignature);

        if (signature === calculatedSignature) {
            // Lấy order ID từ requestId
            const orderIdMatch = requestId.match(/^(\d+)_/);
            const realOrderId = orderIdMatch ? orderIdMatch[1] : null;

            if (resultCode === '0') {
                // Thanh toán thành công
                await db.query(
                    `UPDATE thanh_toan 
                     SET trang_thai = 'success', 
                         thoi_gian_thanh_toan = NOW(),
                         thong_tin_them = ?
                     WHERE ma_giao_dich = ?`,
                    [JSON.stringify({ transId, payType, message }), requestId]
                );

                await db.query(
                    `UPDATE don_hang SET trang_thai = 'confirmed' WHERE ma_don_hang = ?`,
                    [realOrderId]
                );

                res.redirect(`/dat-hang-thanh-cong.html?orderId=${realOrderId}&payment=momo&status=success`);
            } else {
                // Thanh toán thất bại
                await db.query(
                    `UPDATE thanh_toan 
                     SET trang_thai = 'failed',
                         thong_tin_them = ?
                     WHERE ma_giao_dich = ?`,
                    [JSON.stringify({ resultCode, message }), requestId]
                );

                res.redirect(`/don-hang-cua-toi.html?payment_failed=true&orderId=${realOrderId}&message=${encodeURIComponent(message || 'Thanh toán không thành công')}`);
            }
        } else {
            res.redirect(`/don-hang-cua-toi.html?payment_failed=true&message=${encodeURIComponent('Chữ ký không hợp lệ')}`);
        }
    } catch (error) {
        console.error('❌ Lỗi xử lý callback MoMo:', error);
        res.redirect(`/don-hang-cua-toi.html?payment_failed=true&message=${encodeURIComponent('Lỗi xử lý thanh toán')}`);
    }
});

// Retry payment MoMo
router.post('/momo/retry-payment/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;

        // Kiểm tra đơn hàng
        const [orderRows] = await db.query(
            'SELECT * FROM don_hang WHERE ma_don_hang = ? AND ma_nguoi_dung = ?',
            [orderId, req.user.ma_nguoi_dung]
        );

        if (orderRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        const order = orderRows[0];

        // Kiểm tra đơn hàng chưa thanh toán và chưa bị hủy
        if (order.trang_thai === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã bị hủy, không thể thanh toán'
            });
        }

        // Tạo request ID mới
        const requestId = `${orderId}_${Date.now()}`;
        const amount = Math.round(parseFloat(order.tong_tien)); // MoMo yêu cầu số nguyên
        const orderInfo = `Thanh toan lai don hang ${orderId}`;

        // Tạo raw signature
        const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=&ipnUrl=${momoConfig.ipnUrl}&orderId=${requestId}&orderInfo=${orderInfo}&partnerCode=${momoConfig.partnerCode}&redirectUrl=${momoConfig.redirectUrl}&requestId=${requestId}&requestType=${momoConfig.requestType}`;

        // Tạo chữ ký
        const signature = crypto
            .createHmac('sha256', momoConfig.secretKey)
            .update(rawSignature)
            .digest('hex');

        // Tạo request body
        const requestBody = {
            partnerCode: momoConfig.partnerCode,
            accessKey: momoConfig.accessKey,
            requestId: requestId,
            amount: amount, // MoMo yêu cầu số nguyên, không phải string
            orderId: requestId,
            orderInfo: orderInfo,
            redirectUrl: momoConfig.redirectUrl,
            ipnUrl: momoConfig.ipnUrl,
            requestType: momoConfig.requestType,
            extraData: '',
            lang: momoConfig.lang,
            signature: signature
        };

        // Gửi request đến MoMo
        const response = await axios.post(momoConfig.endpoint, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.resultCode === 0) {
            // Cập nhật thông tin giao dịch
            await db.query(
                `UPDATE thanh_toan 
                 SET ma_giao_dich = ?, phuong_thuc = 'momo', trang_thai = 'pending', thoi_gian_thanh_toan = NULL
                 WHERE ma_don_hang = ?`,
                [requestId, orderId]
            );

            res.json({
                success: true,
                data: {
                    paymentUrl: response.data.payUrl,
                    requestId: requestId
                }
            });
        } else {
            throw new Error(response.data.message || 'Không thể tạo thanh toán MoMo');
        }

    } catch (error) {
        console.error('❌ Lỗi thanh toán lại MoMo:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
});

// IPN (Instant Payment Notification) từ MoMo
router.post('/momo-ipn', async (req, res) => {
    try {
        console.log('📥 MoMo IPN:', req.body);

        const {
            partnerCode,
            orderId,
            requestId,
            amount,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            responseTime,
            extraData,
            signature
        } = req.body;

        // Verify signature
        const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

        const calculatedSignature = crypto
            .createHmac('sha256', momoConfig.secretKey)
            .update(rawSignature)
            .digest('hex');

        if (signature === calculatedSignature && resultCode === 0) {
            // Lấy order ID từ requestId
            const orderIdMatch = requestId.match(/^(\d+)_/);
            const realOrderId = orderIdMatch ? orderIdMatch[1] : null;

            // Cập nhật database
            await db.query(
                `UPDATE thanh_toan 
                 SET trang_thai = 'success', 
                     thoi_gian_thanh_toan = NOW()
                 WHERE ma_giao_dich = ?`,
                [requestId]
            );

            await db.query(
                `UPDATE don_hang SET trang_thai = 'confirmed' WHERE ma_don_hang = ?`,
                [realOrderId]
            );

            res.status(200).json({ resultCode: 0, message: 'Success' });
        } else {
            res.status(200).json({ resultCode: 97, message: 'Invalid signature' });
        }
    } catch (error) {
        console.error('❌ Lỗi IPN MoMo:', error);
        res.status(200).json({ resultCode: 99, message: 'Unknown error' });
    }
});

module.exports = router;
