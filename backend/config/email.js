const nodemailer = require('nodemailer');
require('dotenv').config();

// Cấu hình transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // hoặc 'smtp.gmail.com'
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // App Password từ Google
    }
});

// Verify connection
transporter.verify(function (error, success) {
    if (error) {
        console.log('❌ Lỗi kết nối email:', error);
    } else {
        console.log('✅ Email server sẵn sàng gửi mail');
    }
});

// Gửi email xác thực
async function sendVerificationEmail(email, verificationCode, userName) {
    const mailOptions = {
        from: `"Nhà hàng Phương Nam" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Xác thực tài khoản - Nhà hàng Phương Nam',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: white;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .code-box {
                        background: #fff5f0;
                        border: 2px dashed #ea580c;
                        padding: 20px;
                        text-align: center;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .code {
                        font-size: 32px;
                        font-weight: bold;
                        color: #ea580c;
                        letter-spacing: 5px;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        color: #666;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🍽️ Nhà hàng Phương Nam</h1>
                        <p>Xác thực tài khoản của bạn</p>
                    </div>
                    <div class="content">
                        <h2>Xin chào ${userName}!</h2>
                        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Nhà hàng Phương Nam</strong>.</p>
                        <p>Để hoàn tất quá trình đăng ký, vui lòng nhập mã xác thực bên dưới:</p>
                        
                        <div class="code-box">
                            <p style="margin: 0; color: #666;">Mã xác thực của bạn:</p>
                            <div class="code">${verificationCode}</div>
                            <p style="margin: 10px 0 0 0; color: #999; font-size: 14px;">Mã có hiệu lực trong 10 phút</p>
                        </div>
                        
                        <p><strong>Lưu ý:</strong></p>
                        <ul>
                            <li>Mã xác thực chỉ có hiệu lực trong <strong>10 phút</strong></li>
                            <li>Không chia sẻ mã này với bất kỳ ai</li>
                            <li>Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này</li>
                        </ul>
                        
                        <p>Trân trọng,<br><strong>Đội ngũ Nhà hàng Phương Nam</strong></p>
                    </div>
                    <div class="footer">
                        <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                        <p>© 2025 Nhà hàng Phương Nam - Vĩnh Long</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email đã gửi:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Lỗi gửi email:', error);
        return { success: false, error: error.message };
    }
}

// Gửi email chào mừng sau khi xác thực thành công
async function sendWelcomeEmail(email, userName) {
    const mailOptions = {
        from: `"Nhà hàng Phương Nam" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Chào mừng đến với Nhà hàng Phương Nam! 🎉',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: white;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Chào mừng bạn!</h1>
                    </div>
                    <div class="content">
                        <h2>Xin chào ${userName}!</h2>
                        <p>Tài khoản của bạn đã được kích hoạt thành công! 🎊</p>
                        <p>Bạn đã trở thành thành viên của <strong>Nhà hàng Phương Nam</strong>.</p>
                        
                        <p><strong>Bạn có thể:</strong></p>
                        <ul>
                            <li>🍽️ Đặt món ăn trực tuyến</li>
                            <li>📅 Đặt bàn trước</li>
                            <li>🎁 Nhận ưu đãi đặc biệt</li>
                            <li>⭐ Đánh giá và bình luận món ăn</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="http://localhost:3000" class="button">Khám phá thực đơn ngay</a>
                        </div>
                        
                        <p>Cảm ơn bạn đã tin tưởng và lựa chọn chúng tôi!</p>
                        <p>Trân trọng,<br><strong>Đội ngũ Nhà hàng Phương Nam</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email chào mừng đã gửi:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Lỗi gửi email chào mừng:', error);
        return { success: false, error: error.message };
    }
}

// Gửi email đặt lại mật khẩu
async function sendPasswordResetEmail(email, resetCode, userName) {
    const mailOptions = {
        from: `"Nhà hàng Phương Nam" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Đặt lại mật khẩu - Nhà hàng Phương Nam',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: white;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .code-box {
                        background: #fff5f0;
                        border: 2px dashed #ea580c;
                        padding: 20px;
                        text-align: center;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .code {
                        font-size: 32px;
                        font-weight: bold;
                        color: #ea580c;
                        letter-spacing: 5px;
                    }
                    .warning-box {
                        background: #fef2f2;
                        border-left: 4px solid #dc2626;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        color: #666;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔑 Đặt lại mật khẩu</h1>
                    </div>
                    <div class="content">
                        <h2>Xin chào ${userName}!</h2>
                        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>Nhà hàng Phương Nam</strong>.</p>
                        <p>Để tiếp tục, vui lòng sử dụng mã xác thực bên dưới:</p>
                        
                        <div class="code-box">
                            <p style="margin: 0; color: #666;">Mã xác thực của bạn:</p>
                            <div class="code">${resetCode}</div>
                            <p style="margin: 10px 0 0 0; color: #999; font-size: 14px;">Mã có hiệu lực trong 10 phút</p>
                        </div>
                        
                        <div class="warning-box">
                            <p style="margin: 0;"><strong>⚠️ Lưu ý quan trọng:</strong></p>
                            <ul style="margin: 10px 0 0 20px; padding: 0;">
                                <li>Mã xác thực chỉ có hiệu lực trong <strong>10 phút</strong></li>
                                <li>Không chia sẻ mã này với bất kỳ ai</li>
                                <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và thay đổi mật khẩu của bạn ngay lập tức</li>
                            </ul>
                        </div>
                        
                        <p>Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ với chúng tôi.</p>
                        <p>Trân trọng,<br><strong>Đội ngũ Nhà hàng Phương Nam</strong></p>
                    </div>
                    <div class="footer">
                        <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                        <p>© 2025 Nhà hàng Phương Nam - Vĩnh Long</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email đặt lại mật khẩu đã gửi:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Lỗi gửi email đặt lại mật khẩu:', error);
        return { success: false, error: error.message };
    }
}

// Gửi email xác nhận đặt hàng thành công
async function sendOrderConfirmationEmail(email, orderData) {
    const {
        ma_don_hang,
        ten_nguoi_nhan,
        so_dien_thoai,
        dia_chi,
        items,
        tong_tien_hang,
        phi_giao_hang,
        tien_giam_gia,
        tong_tien,
        phuong_thuc_thanh_toan,
        ngay_dat
    } = orderData;

    // Format danh sách món ăn
    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <div style="display: flex; align-items: center;">
                    ${item.anh_mon ? `<img src="${item.anh_mon}" alt="${item.ten_mon}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; margin-right: 12px;">` : ''}
                    <span>${item.ten_mon}</span>
                </div>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.so_luong}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat('vi-VN').format(item.gia_tai_thoi_diem || item.gia)}đ</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat('vi-VN').format((item.gia_tai_thoi_diem || item.gia) * item.so_luong)}đ</td>
        </tr>
    `).join('');

    // Format phương thức thanh toán
    const paymentMethodText = {
        'cod': 'Thanh toán khi nhận hàng (COD)',
        'momo': 'Ví MoMo',
        'vnpay': 'VNPay',
        'bank_transfer': 'Chuyển khoản ngân hàng'
    }[phuong_thuc_thanh_toan] || phuong_thuc_thanh_toan;

    const mailOptions = {
        from: `"Nhà hàng Phương Nam" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Xác nhận đơn hàng #${ma_don_hang} - Nhà hàng Phương Nam`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
                    .header { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
                    .order-info { background: #fff5f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .order-table th { background: #f8f8f8; padding: 12px; text-align: left; border-bottom: 2px solid #ea580c; }
                    .total-row { font-weight: bold; background: #fff5f0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .highlight { color: #ea580c; font-weight: bold; }
                    .button { display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🍽️ Nhà hàng Phương Nam</h1>
                        <p>Xác nhận đơn hàng thành công!</p>
                    </div>
                    <div class="content">
                        <h2>Xin chào ${ten_nguoi_nhan}!</h2>
                        <p>Cảm ơn bạn đã đặt hàng tại <strong>Nhà hàng Phương Nam</strong>. Đơn hàng của bạn đã được tiếp nhận và đang được xử lý.</p>
                        
                        <div class="order-info">
                            <h3 style="margin-top: 0; color: #ea580c;">📦 Thông tin đơn hàng #${ma_don_hang}</h3>
                            <p><strong>Ngày đặt:</strong> ${new Date(ngay_dat || Date.now()).toLocaleString('vi-VN')}</p>
                            <p><strong>Người nhận:</strong> ${ten_nguoi_nhan}</p>
                            <p><strong>Số điện thoại:</strong> ${so_dien_thoai}</p>
                            <p><strong>Địa chỉ giao hàng:</strong> ${dia_chi}</p>
                            <p><strong>Phương thức thanh toán:</strong> ${paymentMethodText}</p>
                        </div>

                        <h3>🛒 Chi tiết đơn hàng</h3>
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th>Món ăn</th>
                                    <th style="text-align: center;">SL</th>
                                    <th style="text-align: right;">Đơn giá</th>
                                    <th style="text-align: right;">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" style="padding: 12px; text-align: right;">Tạm tính:</td>
                                    <td style="padding: 12px; text-align: right;">${new Intl.NumberFormat('vi-VN').format(tong_tien_hang)}đ</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="padding: 12px; text-align: right;">Phí giao hàng:</td>
                                    <td style="padding: 12px; text-align: right;">${phi_giao_hang > 0 ? new Intl.NumberFormat('vi-VN').format(phi_giao_hang) + 'đ' : 'Miễn phí'}</td>
                                </tr>
                                ${tien_giam_gia > 0 ? `
                                <tr>
                                    <td colspan="3" style="padding: 12px; text-align: right; color: #16a34a;">Giảm giá:</td>
                                    <td style="padding: 12px; text-align: right; color: #16a34a;">-${new Intl.NumberFormat('vi-VN').format(tien_giam_gia)}đ</td>
                                </tr>
                                ` : ''}
                                <tr class="total-row">
                                    <td colspan="3" style="padding: 15px; text-align: right; font-size: 18px;">Tổng cộng:</td>
                                    <td style="padding: 15px; text-align: right; font-size: 18px; color: #ea580c;">${new Intl.NumberFormat('vi-VN').format(tong_tien)}đ</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/don-hang-cua-toi.html" class="button">Theo dõi đơn hàng</a>
                        </div>

                        <p><strong>Lưu ý:</strong></p>
                        <ul>
                            <li>Đơn hàng sẽ được giao trong vòng 30-60 phút (tùy khu vực)</li>
                            <li>Vui lòng giữ điện thoại để nhận cuộc gọi từ shipper</li>
                            <li>Nếu cần hỗ trợ, vui lòng liên hệ hotline: <strong>0123 456 789</strong></li>
                        </ul>
                        
                        <p>Trân trọng,<br><strong>Đội ngũ Nhà hàng Phương Nam</strong></p>
                    </div>
                    <div class="footer">
                        <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                        <p>© 2025 Nhà hàng Phương Nam - Vĩnh Long</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email xác nhận đơn hàng đã gửi:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Lỗi gửi email xác nhận đơn hàng:', error);
        return { success: false, error: error.message };
    }
}

// Gửi email xác nhận đặt bàn thành công
async function sendReservationConfirmationEmail(email, reservationData) {
    const {
        ma_dat_ban,
        ten_nguoi_dat,
        so_dien_thoai,
        ngay_dat,
        gio_den,
        so_luong,
        ghi_chu,
        mon_an,
        tong_tien_du_kien
    } = reservationData;

    // Format danh sách món ăn đã đặt trước
    const itemsHtml = mon_an && mon_an.length > 0 ? mon_an.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.ten_mon}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.so_luong}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat('vi-VN').format(item.gia_tai_thoi_diem)}đ</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat('vi-VN').format(item.gia_tai_thoi_diem * item.so_luong)}đ</td>
        </tr>
    `).join('') : '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #666;">Chưa đặt món trước</td></tr>';

    // Format ngày
    const formattedDate = new Date(ngay_dat).toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const mailOptions = {
        from: `"Nhà hàng Phương Nam" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Xác nhận đặt bàn #${ma_dat_ban} - Nhà hàng Phương Nam`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
                    .header { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
                    .reservation-info { background: #fff5f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                    .info-item { padding: 10px; background: white; border-radius: 6px; }
                    .info-label { font-size: 12px; color: #666; margin-bottom: 5px; }
                    .info-value { font-size: 16px; font-weight: bold; color: #333; }
                    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .order-table th { background: #f8f8f8; padding: 10px; text-align: left; border-bottom: 2px solid #ea580c; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .highlight { color: #ea580c; font-weight: bold; }
                    .button { display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .time-box { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
                    .time-box .date { font-size: 18px; margin-bottom: 5px; }
                    .time-box .time { font-size: 32px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🍽️ Nhà hàng Phương Nam</h1>
                        <p>Xác nhận đặt bàn thành công!</p>
                    </div>
                    <div class="content">
                        <h2>Xin chào ${ten_nguoi_dat}!</h2>
                        <p>Cảm ơn bạn đã đặt bàn tại <strong>Nhà hàng Phương Nam</strong>. Chúng tôi đã nhận được yêu cầu đặt bàn của bạn và sẽ liên hệ xác nhận sớm nhất.</p>
                        
                        <div class="time-box">
                            <div class="date">📅 ${formattedDate}</div>
                            <div class="time">🕐 ${gio_den}</div>
                        </div>

                        <div class="reservation-info">
                            <h3 style="margin-top: 0; color: #ea580c;">📋 Thông tin đặt bàn #${ma_dat_ban}</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Họ tên</div>
                                    <div class="info-value">${ten_nguoi_dat}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Số điện thoại</div>
                                    <div class="info-value">${so_dien_thoai}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Số người</div>
                                    <div class="info-value">${so_luong} người</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Trạng thái</div>
                                    <div class="info-value" style="color: #f59e0b;">⏳ Chờ xác nhận</div>
                                </div>
                            </div>
                            ${ghi_chu ? `<p style="margin-top: 15px;"><strong>Ghi chú:</strong> ${ghi_chu}</p>` : ''}
                        </div>

                        ${mon_an && mon_an.length > 0 ? `
                        <h3>🍴 Món ăn đặt trước</h3>
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th>Món ăn</th>
                                    <th style="text-align: center;">SL</th>
                                    <th style="text-align: right;">Đơn giá</th>
                                    <th style="text-align: right;">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                            <tfoot>
                                <tr style="background: #fff5f0; font-weight: bold;">
                                    <td colspan="3" style="padding: 15px; text-align: right;">Tổng tiền dự kiến:</td>
                                    <td style="padding: 15px; text-align: right; color: #ea580c; font-size: 18px;">${new Intl.NumberFormat('vi-VN').format(tong_tien_du_kien)}đ</td>
                                </tr>
                            </tfoot>
                        </table>
                        <p style="color: #666; font-size: 14px;"><em>* Giá trên chưa bao gồm các món gọi thêm tại nhà hàng</em></p>
                        ` : ''}

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dat-ban-cua-toi.html" class="button">Xem đặt bàn của tôi</a>
                        </div>

                        <p><strong>Lưu ý quan trọng:</strong></p>
                        <ul>
                            <li>Vui lòng đến đúng giờ đã đặt</li>
                            <li>Nếu muốn thay đổi hoặc hủy, vui lòng thông báo trước ít nhất 2 tiếng</li>
                            <li>Bàn sẽ được giữ trong vòng 15 phút kể từ giờ đặt</li>
                            <li>Hotline hỗ trợ: <strong>0123 456 789</strong></li>
                        </ul>
                        
                        <p>Chúng tôi rất mong được đón tiếp quý khách!</p>
                        <p>Trân trọng,<br><strong>Đội ngũ Nhà hàng Phương Nam</strong></p>
                    </div>
                    <div class="footer">
                        <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                        <p>© 2025 Nhà hàng Phương Nam - Vĩnh Long</p>
                        <p>📍 Địa chỉ: 123 Đường ABC, Phường XYZ, TP. Vĩnh Long</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email xác nhận đặt bàn đã gửi:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Lỗi gửi email xác nhận đặt bàn:', error);
        return { success: false, error: error.message };
    }
}

// Gửi email xác nhận thanh toán đặt bàn thành công
async function sendReservationPaymentSuccessEmail(email, paymentData) {
    const {
        ma_dat_ban,
        ten_nguoi_dat,
        so_dien_thoai,
        ngay_dat,
        gio_den,
        so_luong,
        ghi_chu,
        mon_an,
        tong_tien,
        ma_giao_dich,
        thoi_gian_thanh_toan
    } = paymentData;

    // Format danh sách món ăn
    const itemsHtml = mon_an && mon_an.length > 0 ? mon_an.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.ten_mon}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.so_luong}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat('vi-VN').format(item.gia_tai_thoi_diem)}đ</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat('vi-VN').format(item.gia_tai_thoi_diem * item.so_luong)}đ</td>
        </tr>
    `).join('') : '';

    // Format ngày
    const formattedDate = new Date(ngay_dat).toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const formattedPaymentTime = new Date(thoi_gian_thanh_toan || Date.now()).toLocaleString('vi-VN');

    const mailOptions = {
        from: `"Nhà hàng Phương Nam" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `✅ Thanh toán thành công - Đặt bàn #${ma_dat_ban} - Nhà hàng Phương Nam`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
                    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
                    .success-badge { background: #dcfce7; border: 2px solid #16a34a; border-radius: 50px; padding: 10px 25px; display: inline-block; margin: 20px 0; }
                    .success-badge span { color: #16a34a; font-weight: bold; font-size: 18px; }
                    .reservation-info { background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #16a34a; }
                    .payment-info { background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                    .info-item { padding: 10px; background: white; border-radius: 6px; }
                    .info-label { font-size: 12px; color: #666; margin-bottom: 5px; }
                    .info-value { font-size: 16px; font-weight: bold; color: #333; }
                    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .order-table th { background: #f8f8f8; padding: 10px; text-align: left; border-bottom: 2px solid #16a34a; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .button { display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .time-box { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
                    .time-box .date { font-size: 18px; margin-bottom: 5px; }
                    .time-box .time { font-size: 32px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Thanh toán thành công!</h1>
                        <p>Đặt bàn của bạn đã được xác nhận</p>
                    </div>
                    <div class="content">
                        <div style="text-align: center;">
                            <div class="success-badge">
                                <span>✓ ĐÃ THANH TOÁN</span>
                            </div>
                        </div>

                        <h2>Xin chào ${ten_nguoi_dat}!</h2>
                        <p>Chúng tôi đã nhận được thanh toán của bạn. Đặt bàn <strong>#${ma_dat_ban}</strong> đã được xác nhận thành công!</p>
                        
                        <div class="time-box">
                            <div class="date">📅 ${formattedDate}</div>
                            <div class="time">🕐 ${gio_den}</div>
                        </div>

                        <div class="payment-info">
                            <h3 style="margin-top: 0; color: #f59e0b;">💳 Thông tin thanh toán</h3>
                            <p><strong>Mã giao dịch:</strong> ${ma_giao_dich}</p>
                            <p><strong>Số tiền:</strong> <span style="color: #16a34a; font-size: 20px; font-weight: bold;">${new Intl.NumberFormat('vi-VN').format(tong_tien)}đ</span></p>
                            <p><strong>Thời gian:</strong> ${formattedPaymentTime}</p>
                            <p><strong>Trạng thái:</strong> <span style="color: #16a34a;">✓ Thành công</span></p>
                        </div>

                        <div class="reservation-info">
                            <h3 style="margin-top: 0; color: #16a34a;">📋 Thông tin đặt bàn</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Mã đặt bàn</div>
                                    <div class="info-value">#${ma_dat_ban}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Số người</div>
                                    <div class="info-value">${so_luong} người</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Số điện thoại</div>
                                    <div class="info-value">${so_dien_thoai}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Trạng thái</div>
                                    <div class="info-value" style="color: #16a34a;">✓ Đã xác nhận</div>
                                </div>
                            </div>
                            ${ghi_chu ? `<p style="margin-top: 15px;"><strong>Ghi chú:</strong> ${ghi_chu}</p>` : ''}
                        </div>

                        ${mon_an && mon_an.length > 0 ? `
                        <h3>🍴 Món ăn đã đặt trước</h3>
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th>Món ăn</th>
                                    <th style="text-align: center;">SL</th>
                                    <th style="text-align: right;">Đơn giá</th>
                                    <th style="text-align: right;">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                            <tfoot>
                                <tr style="background: #f0fdf4; font-weight: bold;">
                                    <td colspan="3" style="padding: 15px; text-align: right;">Tổng tiền đã thanh toán:</td>
                                    <td style="padding: 15px; text-align: right; color: #16a34a; font-size: 18px;">${new Intl.NumberFormat('vi-VN').format(tong_tien)}đ</td>
                                </tr>
                            </tfoot>
                        </table>
                        ` : ''}

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dat-ban-cua-toi.html" class="button">Xem đặt bàn của tôi</a>
                        </div>

                        <p><strong>Lưu ý quan trọng:</strong></p>
                        <ul>
                            <li>✅ Đặt bàn của bạn đã được xác nhận, không cần thao tác thêm</li>
                            <li>📍 Vui lòng đến đúng giờ đã đặt</li>
                            <li>⏰ Bàn sẽ được giữ trong vòng 15 phút kể từ giờ đặt</li>
                            <li>📞 Nếu cần thay đổi, vui lòng liên hệ hotline: <strong>0123 456 789</strong></li>
                        </ul>
                        
                        <p>Chúng tôi rất mong được đón tiếp quý khách!</p>
                        <p>Trân trọng,<br><strong>Đội ngũ Nhà hàng Phương Nam</strong></p>
                    </div>
                    <div class="footer">
                        <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                        <p>© 2025 Nhà hàng Phương Nam - Vĩnh Long</p>
                        <p>📍 Địa chỉ: 123 Đường ABC, Phường XYZ, TP. Vĩnh Long</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email xác nhận thanh toán đặt bàn đã gửi:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Lỗi gửi email xác nhận thanh toán đặt bàn:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendOrderConfirmationEmail,
    sendReservationConfirmationEmail,
    sendReservationPaymentSuccessEmail
};
