// Reservation Payment Handler
const API_URL = window.API_URL || 'http://localhost:3000/api';

// Show payment QR modal for reservation
async function showReservationPaymentQR(maDatBan) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Vui lòng đăng nhập', 'error');
            return;
        }

        // Gọi API tạo QR code
        const response = await fetch(`${API_URL}/reservation-payment/create-payment-qr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ma_dat_ban: maDatBan })
        });

        const result = await response.json();

        if (result.success) {
            const { qrCodeUrl, bankInfo, amount, transferContent, expiryTime } = result.data;
            
            // Tạo modal
            const modal = document.createElement('div');
            modal.id = 'reservation-payment-modal';
            modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
            modal.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div class="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-center">
                        <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-qrcode text-white text-4xl"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-white">Thanh toán đặt bàn</h3>
                        <p class="text-white/90 mt-2">Quét mã QR để thanh toán</p>
                    </div>
                    <div class="p-6">
                        <!-- QR Code -->
                        <div class="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-4 mb-4">
                            <img src="${qrCodeUrl}" alt="QR Code" class="w-full max-w-xs mx-auto rounded-lg shadow-lg">
                        </div>

                        <!-- Bank Info -->
                        <div class="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Ngân hàng:</span>
                                <span class="font-bold">${bankInfo.bankName}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Số tài khoản:</span>
                                <span class="font-bold">${bankInfo.accountNumber}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Chủ tài khoản:</span>
                                <span class="font-bold">${bankInfo.accountName}</span>
                            </div>
                            <div class="flex justify-between border-t pt-2 mt-2">
                                <span class="text-gray-600">Số tiền:</span>
                                <span class="font-bold text-orange-600 text-xl">${formatPrice(amount)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Nội dung:</span>
                                <span class="font-bold text-blue-600">${transferContent}</span>
                            </div>
                        </div>

                        <!-- Timer -->
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-center">
                            <i class="fas fa-clock text-yellow-600 mr-2"></i>
                            <span class="text-sm text-yellow-800">Mã QR có hiệu lực trong: </span>
                            <span class="font-bold text-yellow-900 text-lg" id="reservation-qr-timer">5:00</span>
                        </div>

                        <!-- Instructions -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <p class="text-sm text-blue-800 font-medium mb-2">
                                <i class="fas fa-info-circle mr-1"></i> Hướng dẫn thanh toán:
                            </p>
                            <ol class="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
                                <li>Mở ứng dụng ngân hàng của bạn</li>
                                <li>Quét mã QR hoặc chuyển khoản thủ công</li>
                                <li>Nhập đúng nội dung chuyển khoản</li>
                                <li>Sau khi chuyển khoản, bấm "Đã thanh toán"</li>
                            </ol>
                        </div>

                        <!-- Actions -->
                        <div class="flex gap-3">
                            <button onclick="closeReservationPaymentModal()" 
                                    class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition">
                                <i class="fas fa-times mr-2"></i>Đóng
                            </button>
                            <button onclick="confirmReservationPayment(${maDatBan})" 
                                    class="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-medium hover:opacity-90 transition">
                                <i class="fas fa-check mr-2"></i>Đã thanh toán
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Start timer
            startReservationPaymentTimer(new Date(expiryTime), maDatBan);
        } else {
            showNotification(result.message || 'Không thể tạo mã QR', 'error');
        }
    } catch (error) {
        console.error('Error showing payment QR:', error);
        showNotification('Lỗi tạo mã QR thanh toán', 'error');
    }
}

// Start payment timer
let reservationPaymentTimer = null;
let currentPaymentMaDatBan = null;

function startReservationPaymentTimer(expiryTime, maDatBan) {
    if (reservationPaymentTimer) clearInterval(reservationPaymentTimer);
    currentPaymentMaDatBan = maDatBan;
    
    reservationPaymentTimer = setInterval(async () => {
        const now = new Date();
        const timeLeft = expiryTime - now;
        
        const timerElement = document.getElementById('reservation-qr-timer');
        if (!timerElement) {
            clearInterval(reservationPaymentTimer);
            return;
        }
        
        if (timeLeft <= 0) {
            clearInterval(reservationPaymentTimer);
            timerElement.textContent = '0:00';
            timerElement.classList.add('text-red-600');
            
            // Gọi API hủy thanh toán do hết hạn
            try {
                const token = localStorage.getItem('token');
                await fetch(`${API_URL}/reservation-payment/cancel-payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        ma_dat_ban: currentPaymentMaDatBan,
                        reason: 'expired'
                    })
                });
            } catch (e) {
                console.error('Error cancelling expired payment:', e);
            }
            
            showNotification('Mã QR đã hết hạn. Vui lòng tạo mã mới.', 'error');
            setTimeout(() => {
                closeReservationPaymentModal();
            }, 2000);
            return;
        }
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        timerElement.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
        
        // Đổi màu khi còn dưới 1 phút
        if (timeLeft < 60000) {
            timerElement.classList.add('text-red-600');
        }
    }, 1000);
}

// Confirm reservation payment
async function confirmReservationPayment(maDatBan) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reservation-payment/confirm-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ma_dat_ban: maDatBan })
        });

        const result = await response.json();

        if (result.success) {
            if (reservationPaymentTimer) clearInterval(reservationPaymentTimer);
            currentPaymentMaDatBan = null; // Reset để không gọi cancel khi đóng modal
            
            const modal = document.getElementById('reservation-payment-modal');
            if (modal) modal.remove();
            
            showNotification('Thanh toán thành công! Đặt bàn đã được xác nhận.', 'success');
            
            // Reload page sau 2 giây
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            showNotification(result.message || 'Xác nhận thanh toán thất bại', 'error');
        }
    } catch (error) {
        console.error('Error confirming payment:', error);
        showNotification('Lỗi xác nhận thanh toán', 'error');
    }
}

// Close payment modal
async function closeReservationPaymentModal() {
    if (reservationPaymentTimer) clearInterval(reservationPaymentTimer);
    
    // Gọi API hủy thanh toán nếu người dùng đóng modal
    if (currentPaymentMaDatBan) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/reservation-payment/cancel-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    ma_dat_ban: currentPaymentMaDatBan,
                    reason: 'cancelled'
                })
            });
        } catch (e) {
            console.error('Error cancelling payment:', e);
        }
        currentPaymentMaDatBan = null;
    }
    
    const modal = document.getElementById('reservation-payment-modal');
    if (modal) modal.remove();
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(price);
}

// Show notification (nếu chưa có)
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 
                    type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    
    notification.className = `fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-lg ${bgColor} text-white`;
    notification.innerHTML = `<i class="fas ${icon} mr-2"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}
