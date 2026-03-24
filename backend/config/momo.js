// MoMo Payment Configuration
require('dotenv').config();

module.exports = {
    partnerCode: process.env.MOMO_PARTNER_CODE || 'YOUR_PARTNER_CODE',
    accessKey: process.env.MOMO_ACCESS_KEY || 'YOUR_ACCESS_KEY',
    secretKey: process.env.MOMO_SECRET_KEY || 'YOUR_SECRET_KEY',
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
    redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/api/payment/momo-return',
    ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:3000/api/payment/momo-ipn',
    requestType: 'payWithMethod', // Cho phép chọn nhiều phương thức: ví MoMo, ATM, thẻ tín dụng
    lang: 'vi'
};
