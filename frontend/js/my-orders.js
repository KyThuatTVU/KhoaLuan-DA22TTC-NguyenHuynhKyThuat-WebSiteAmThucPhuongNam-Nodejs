// API Configuration
const API_URL = window.API_URL || 'http://localhost:3000/api';

// State
let allOrders = [];
let currentFilter = 'all';
let cancelOrderId = null;

// Get token
function getToken() {
    return (localStorage.getItem('token') || sessionStorage.getItem('token')) || sessionStorage.getItem('token');
}

// Check authentication
function checkAuth() {
    if (!getToken()) {
        showNotification('Vui lòng đăng nhập để xem đơn hàng', 'warning');
        setTimeout(() => {
            window.location.href = 'dang-nhap.html?redirect=don-hang-cua-toi.html';
        }, 1500);
        return false;
    }
    return true;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Format date
function formatDate(dateString) {
    if (!dateString) {
        return 'Chưa cập nhật';
    }
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Chưa cập nhật';
        }
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Chưa cập nhật';
    }
}

// Format address - remove empty parts and extra commas
function formatAddress(dia_chi, phuong_xa, quan_huyen, tinh_thanh) {
    const parts = [dia_chi, phuong_xa, quan_huyen, tinh_thanh]
        .filter(part => part && part.trim() !== '');
    return parts.join(', ') || 'Chưa có địa chỉ';
}

// Get status info
function getStatusInfo(status) {
    const statusMap = {
        // Frontend status values
        'cho_xac_nhan': {
            label: 'Chờ xác nhận',
            class: 'bg-yellow-100 text-yellow-800',
            icon: 'clock'
        },
        'da_xac_nhan': {
            label: 'Đã xác nhận',
            class: 'bg-blue-100 text-blue-800',
            icon: 'check-circle'
        },
        'dang_chuan_bi': {
            label: 'Đang chuẩn bị',
            class: 'bg-purple-100 text-purple-800',
            icon: 'fire'
        },
        'dang_giao': {
            label: 'Đang giao',
            class: 'bg-indigo-100 text-indigo-800',
            icon: 'shipping-fast'
        },
        'hoan_thanh': {
            label: 'Hoàn thành',
            class: 'bg-green-100 text-green-800',
            icon: 'check-double'
        },
        'da_huy': {
            label: 'Đã hủy',
            class: 'bg-red-100 text-red-800',
            icon: 'times-circle'
        },
        // Database status values (fallback)
        'pending': {
            label: 'Chờ xác nhận',
            class: 'bg-yellow-100 text-yellow-800',
            icon: 'clock'
        },
        'confirmed': {
            label: 'Đã xác nhận',
            class: 'bg-blue-100 text-blue-800',
            icon: 'check-circle'
        },
        'preparing': {
            label: 'Đang chuẩn bị',
            class: 'bg-purple-100 text-purple-800',
            icon: 'fire'
        },
        'delivered': {
            label: 'Hoàn thành',
            class: 'bg-green-100 text-green-800',
            icon: 'check-double'
        },
        'cancelled': {
            label: 'Đã hủy',
            class: 'bg-red-100 text-red-800',
            icon: 'times-circle'
        }
    };
    
    // Nếu không tìm thấy, trả về status gốc với style mặc định
    if (!statusMap[status]) {
        console.warn('⚠️ Unknown status:', status);
        return {
            label: status || 'Không xác định',
            class: 'bg-gray-100 text-gray-800',
            icon: 'info-circle'
        };
    }
    
    return statusMap[status];
}

// Get payment method label
function getPaymentMethodLabel(method) {
    const methodMap = {
        'cod': 'Thanh toán khi nhận hàng (COD)',
        'bank': 'Chuyển khoản ngân hàng',
        'qr': 'Quét mã QR',
        'card': 'Thẻ tín dụng/ghi nợ'
    };
    return methodMap[method] || method;
}

// Load orders from API
async function loadOrders() {
    if (!checkAuth()) return;

    const container = document.getElementById('orders-container');
    const emptyState = document.getElementById('empty-state');

    // Use LoadingManager if available
    if (typeof LoadingManager !== 'undefined') {
        LoadingManager.showSectionLoading(container, 'Đang tải đơn hàng...');
    } else {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-4xl text-orange-600 mb-4"></i>
                <p class="text-gray-600">Đang tải đơn hàng...</p>
            </div>
        `;
    }

    try {
        const token = getToken();
        console.log('🔑 Token:', token ? 'Found' : 'Not found');
        
        const url = `${API_URL}/orders/my-orders`;
        console.log('📡 Fetching:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('📥 Response status:', response.status);
        
        const result = await response.json();
        console.log('📦 Orders response:', result);

        if (response.ok && result.success) {
            allOrders = result.data || [];
            console.log('✅ Orders count:', allOrders.length);

            if (allOrders.length === 0) {
                container.classList.add('hidden');
                emptyState.classList.remove('hidden');
            } else {
                container.classList.remove('hidden');
                emptyState.classList.add('hidden');
                renderOrders(allOrders);
            }
        } else {
            console.error('❌ API error:', {
                status: response.status,
                success: result.success,
                message: result.message,
                error: result.error
            });
            throw new Error(result.message || 'Không thể tải đơn hàng');
        }
    } catch (error) {
        console.error('❌ Error loading orders:', error);
        container.innerHTML = `
            <div class="bg-white rounded-xl p-12 text-center">
                <i class="fas fa-exclamation-triangle text-4xl text-red-600 mb-4"></i>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Lỗi tải đơn hàng</h3>
                <p class="text-gray-600 mb-4">${error.message}</p>
                <button onclick="loadOrders()" class="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition">
                    <i class="fas fa-sync-alt mr-2"></i>
                    Thử lại
                </button>
            </div>
        `;
    }
}

// Render orders
function renderOrders(orders) {
    const container = document.getElementById('orders-container');

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="bg-white rounded-xl p-12 text-center">
                <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Không tìm thấy đơn hàng</h3>
                <p class="text-gray-600">Không có đơn hàng nào phù hợp với bộ lọc</p>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => {
        const statusInfo = getStatusInfo(order.trang_thai);
        const canCancel = ['cho_xac_nhan', 'da_xac_nhan'].includes(order.trang_thai);

        return `
            <div class="order-card bg-white rounded-xl shadow-sm overflow-hidden" data-status="${order.trang_thai}">
                <div class="p-6">
                    <!-- Order Header -->
                    <div class="flex flex-wrap items-center justify-between mb-4 pb-4 border-b">
                        <div class="flex items-center gap-4 mb-2 sm:mb-0">
                            <div>
                                <p class="text-sm text-gray-500">Mã đơn hàng</p>
                                <p class="font-bold text-lg text-orange-600">${order.ma_don_hang}</p>
                            </div>
                            <div>
                                <span class="status-badge ${statusInfo.class}">
                                    <i class="fas fa-${statusInfo.icon} mr-1"></i>
                                    ${statusInfo.label}
                                </span>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-sm text-gray-500">Ngày đặt</p>
                            <p class="font-medium">${formatDate(order.ngay_dat)}</p>
                        </div>
                    </div>

                    <!-- Order Items Summary -->
                    <div class="mb-4">
                        <p class="text-sm text-gray-600 mb-2">
                            <i class="fas fa-shopping-bag mr-2"></i>
                            ${order.so_luong_mon || 'N/A'} món
                        </p>
                        ${order.items && order.items.length > 0 ? `
                            <div class="flex flex-wrap gap-2">
                                ${order.items.slice(0, 3).map(item => `
                                    <div class="bg-orange-50 px-3 py-1 rounded-lg text-sm">
                                        ${item.ten_mon} x${item.so_luong}
                                    </div>
                                `).join('')}
                                ${order.items.length > 3 ? `
                                    <div class="bg-gray-100 px-3 py-1 rounded-lg text-sm text-gray-600">
                                        +${order.items.length - 3} món khác
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Order Info -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">
                                <i class="fas fa-map-marker-alt mr-2"></i>
                                Địa chỉ giao hàng
                            </p>
                            <p class="text-sm font-medium">${formatAddress(order.dia_chi, order.phuong_xa, order.quan_huyen, order.tinh_thanh)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500 mb-1">
                                <i class="fas fa-credit-card mr-2"></i>
                                Thanh toán
                            </p>
                            <p class="text-sm font-medium">${getPaymentMethodLabel(order.phuong_thuc_thanh_toan)}</p>
                        </div>
                    </div>

                    <!-- Order Total -->
                    <div class="flex items-center justify-between pt-4 border-t">
                        <div>
                            <p class="text-sm text-gray-500">Tổng thanh toán</p>
                            <p class="text-2xl font-bold text-orange-600">${formatCurrency(order.tong_thanh_toan)}</p>
                            ${order.can_thanh_toan_lai ? `
                                <p class="text-xs text-red-600 mt-1">
                                    <i class="fas fa-exclamation-circle mr-1"></i>
                                    ${order.trang_thai_thanh_toan === 'failed' ? 'Thanh toán thất bại' : 'Chưa thanh toán'}
                                </p>
                            ` : ''}
                        </div>
                        <div class="flex gap-2 flex-wrap">
                            ${order.can_thanh_toan_lai ? `
                                <button onclick="retryPayment(${order.id_don_hang})" class="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition">
                                    <i class="fas fa-credit-card mr-2"></i>
                                    ${order.trang_thai_thanh_toan === 'failed' ? 'Thanh toán lại' : 'Thanh toán ngay'}
                                </button>
                            ` : ''}
                            <button onclick="viewOrderDetail(${order.id_don_hang})" class="bg-orange-100 text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-200 transition">
                                <i class="fas fa-eye mr-2"></i>
                                Chi tiết
                            </button>
                            ${canCancel ? `
                                <button onclick="openCancelModal(${order.id_don_hang}, '${order.ma_don_hang}')" class="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition">
                                    <i class="fas fa-times mr-2"></i>
                                    Hủy đơn
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Animate nếu GSAP có sẵn
    if (typeof gsap !== 'undefined') {
        gsap.from('.order-card', {
            y: 20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power3.out',
            clearProps: 'opacity' // Chỉ xóa opacity, giữ các prop khác
        });
    } else {
        // Nếu GSAP chưa load, đảm bảo hiển thị bình thường
        document.querySelectorAll('.order-card').forEach(card => {
            card.style.opacity = '1';
        });
    }
}

// Filter orders
function filterOrders(status) {
    currentFilter = status;

    // Update button styles
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-orange-600', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-600');
    });

    const activeBtn = document.querySelector(`[data-status="${status}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-100', 'text-gray-600');
        activeBtn.classList.add('active', 'bg-orange-600', 'text-white');
    }

    // Filter and render
    let filteredOrders = allOrders;
    if (status !== 'all') {
        filteredOrders = allOrders.filter(order => order.trang_thai === status);
    }

    renderOrders(filteredOrders);
}

// View order detail
async function viewOrderDetail(orderId) {
    const modal = document.getElementById('order-detail-modal');
    const content = document.getElementById('order-detail-content');

    modal.classList.remove('hidden');
    
    // Use LoadingManager if available
    if (typeof LoadingManager !== 'undefined') {
        LoadingManager.showSectionLoading(content, 'Đang tải chi tiết...');
    } else {
        content.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-spinner fa-spin text-4xl text-orange-600 mb-4"></i>
                <p class="text-gray-600">Đang tải chi tiết...</p>
            </div>
        `;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        console.log('📋 Order detail loaded:', result);
        
        // Debug lịch sử trạng thái
        if (result.data && result.data.lich_su_trang_thai) {
            console.log('📜 Lịch sử trạng thái:', result.data.lich_su_trang_thai);
            result.data.lich_su_trang_thai.forEach((log, index) => {
                console.log(`  [${index}] Full log object:`, log);
                console.log(`  [${index}] trang_thai:`, log.trang_thai, '| trang_thai_moi:', log.trang_thai_moi, '| label:', getStatusInfo(log.trang_thai || log.trang_thai_moi).label);
            });
        }

        if (response.ok && result.success) {
            renderOrderDetail(result.data);
        } else {
            throw new Error(result.message || 'Không thể tải chi tiết đơn hàng');
        }
    } catch (error) {
        console.error('❌ Error loading order detail:', error);
        content.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-600 mb-4"></i>
                <p class="text-gray-600">${error.message}</p>
            </div>
        `;
    }
}

// Render order detail
function renderOrderDetail(order) {
    const content = document.getElementById('order-detail-content');
    const statusInfo = getStatusInfo(order.trang_thai);

    content.innerHTML = `
        <!-- Order Status -->
        <div class="bg-orange-50 rounded-lg p-4 mb-6 text-center">
            <span class="status-badge ${statusInfo.class} text-lg px-4 py-2">
                <i class="fas fa-${statusInfo.icon} mr-2"></i>
                ${statusInfo.label}
            </span>
            <p class="text-sm text-gray-600 mt-2">Mã đơn hàng: <span class="font-bold">${order.ma_don_hang}</span></p>
            <p class="text-sm text-gray-600">Ngày đặt: ${formatDate(order.ngay_dat)}</p>
        </div>

        <!-- Customer Info -->
        <div class="mb-6">
            <h4 class="font-bold text-lg mb-3">
                <i class="fas fa-user text-orange-600 mr-2"></i>
                Thông tin người nhận
            </h4>
            <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                <p><strong>Họ tên:</strong> ${order.ten_nguoi_nhan}</p>
                <p><strong>Số điện thoại:</strong> ${order.so_dien_thoai}</p>
                ${order.email ? `<p><strong>Email:</strong> ${order.email}</p>` : ''}
                <p><strong>Địa chỉ:</strong> ${formatAddress(order.dia_chi, order.phuong_xa, order.quan_huyen, order.tinh_thanh)}</p>
                ${order.ghi_chu ? `<p><strong>Ghi chú:</strong> ${order.ghi_chu}</p>` : ''}
            </div>
        </div>

        <!-- Order Items -->
        <div class="mb-6">
            <h4 class="font-bold text-lg mb-3">
                <i class="fas fa-shopping-bag text-orange-600 mr-2"></i>
                Món ăn đã đặt
            </h4>
            <div class="space-y-3">
                ${order.items && order.items.length > 0 ? order.items.map(item => `
                    <div class="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center gap-4 flex-1">
                            ${item.anh_mon ? `
                                <img src="${item.anh_mon.startsWith('http') ? item.anh_mon : 'http://localhost:3000' + (item.anh_mon.startsWith('/') ? item.anh_mon : '/images/' + item.anh_mon)}" 
                                     alt="${item.ten_mon}" 
                                     class="w-16 h-16 object-cover rounded"
                                     onerror="this.src='/images/default-dish.jpg'">
                            ` : ''}
                            <div class="flex-1">
                                <p class="font-medium">${item.ten_mon}</p>
                                <p class="text-sm text-gray-600">SL: ${item.so_luong} × ${formatCurrency(item.gia_tai_thoi_diem)}</p>
                            </div>
                        </div>
                        <p class="font-bold text-orange-600">${formatCurrency(item.thanh_tien)}</p>
                    </div>
                `).join('') : '<p class="text-gray-500">Không có thông tin món ăn</p>'}
            </div>
        </div>

        <!-- Payment Info -->
        <div class="mb-6">
            <h4 class="font-bold text-lg mb-3">
                <i class="fas fa-credit-card text-orange-600 mr-2"></i>
                Thanh toán
            </h4>
            <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                <div class="flex justify-between">
                    <span class="text-gray-600">Tạm tính</span>
                    <span class="font-medium">${formatCurrency(order.tong_tien_hang)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Phí vận chuyển</span>
                    <span class="font-medium">${order.phi_van_chuyen === 0 ? 'Miễn phí' : formatCurrency(order.phi_van_chuyen)}</span>
                </div>
                ${order.giam_gia > 0 ? `
                    <div class="flex justify-between text-green-600">
                        <span>Giảm giá</span>
                        <span class="font-medium">-${formatCurrency(order.giam_gia)}</span>
                    </div>
                ` : ''}
                <div class="border-t pt-3 flex justify-between text-lg">
                    <span class="font-bold">Tổng thanh toán</span>
                    <span class="font-bold text-orange-600 text-2xl">${formatCurrency(order.tong_thanh_toan)}</span>
                </div>
                <div class="pt-3 border-t">
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-wallet mr-2"></i>
                        Phương thức: <strong>${getPaymentMethodLabel(order.phuong_thuc_thanh_toan)}</strong>
                    </p>
                </div>
            </div>
        </div>

        <!-- Timeline -->
        ${order.lich_su_trang_thai && order.lich_su_trang_thai.length > 0 ? `
            <div>
                <h4 class="font-bold text-lg mb-3">
                    <i class="fas fa-history text-orange-600 mr-2"></i>
                    Lịch sử đơn hàng
                </h4>
                <div class="space-y-3">
                    ${order.lich_su_trang_thai.map(log => {
        // Fallback cho trạng thái
        const statusValue = log.trang_thai || log.trang_thai_moi || 'pending';
        const logStatus = getStatusInfo(statusValue);
        const timeField = log.thoi_gian_thay_doi || log.thoi_gian || log.created_at;
        const noteField = log.ghi_chu || log.mo_ta || '';
        return `
                            <div class="flex gap-3">
                                <div class="flex-shrink-0">
                                    <div class="w-10 h-10 bg-${logStatus.class.includes('green') ? 'green' : logStatus.class.includes('red') ? 'red' : 'orange'}-100 rounded-full flex items-center justify-center">
                                        <i class="fas fa-${logStatus.icon} text-${logStatus.class.includes('green') ? 'green' : logStatus.class.includes('red') ? 'red' : 'orange'}-600"></i>
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <p class="font-medium">${logStatus.label}</p>
                                    <p class="text-sm text-gray-500">${formatDate(timeField)}</p>
                                    ${noteField ? `<p class="text-sm text-gray-600 mt-1">${noteField}</p>` : ''}
                                </div>
                            </div>
                        `;
    }).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

// Close order detail modal
function closeOrderDetail() {
    document.getElementById('order-detail-modal').classList.add('hidden');
}

// Open cancel modal
function openCancelModal(orderId, orderCode) {
    cancelOrderId = orderId;
    document.getElementById('cancel-order-code').textContent = orderCode;
    document.getElementById('cancel-reason').value = '';
    document.getElementById('cancel-modal').classList.remove('hidden');
}

// Close cancel modal
function closeCancelModal() {
    cancelOrderId = null;
    document.getElementById('cancel-modal').classList.add('hidden');
}

// Confirm cancel order
async function confirmCancelOrder() {
    if (!cancelOrderId) return;

    const reason = document.getElementById('cancel-reason').value.trim();
    
    // Show loading
    if (typeof LoadingManager !== 'undefined') {
        LoadingManager.showToast('Đang hủy đơn hàng...');
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/orders/${cancelOrderId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ly_do_huy: reason })
        });

        const result = await response.json();
        console.log('🚫 Cancel result:', result);

        // Hide loading
        if (typeof LoadingManager !== 'undefined') {
            LoadingManager.hideToast();
        }

        if (response.ok && result.success) {
            showNotification('Hủy đơn hàng thành công', 'success');
            closeCancelModal();
            loadOrders(); // Reload orders
        } else {
            throw new Error(result.message || 'Không thể hủy đơn hàng');
        }
    } catch (error) {
        // Hide loading on error
        if (typeof LoadingManager !== 'undefined') {
            LoadingManager.hideToast();
        }
        console.error('❌ Error canceling order:', error);
        showNotification(error.message, 'error');
    }
}

// Thanh toán lại đơn hàng
async function retryPayment(orderId) {
    if (!confirm('Bạn có muốn thanh toán lại đơn hàng này qua MoMo không?')) {
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/payment/momo/retry-payment/${orderId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        console.log('🔄 Retry payment result:', result);

        if (response.ok && result.success) {
            // Redirect sang trang thanh toán MoMo
            window.location.href = result.data.paymentUrl;
        } else {
            throw new Error(result.message || 'Không thể tạo thanh toán');
        }
    } catch (error) {
        console.error('❌ Error retry payment:', error);
        showNotification(error.message, 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    if (window.authShowNotification && typeof window.authShowNotification === 'function') {
        window.authShowNotification(message, type);
        return;
    }

    const bgColor = type === 'success' ? 'bg-green-500' :
        type === 'info' ? 'bg-blue-500' :
            type === 'warning' ? 'bg-yellow-500' : 'bg-red-500';

    const notification = document.createElement('div');
    notification.className = `fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-lg ${bgColor} text-white`;
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas fa-${type === 'success' ? 'check' : 'info'}-circle text-xl"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Close modals on background click
document.addEventListener('click', function (e) {
    if (e.target.id === 'order-detail-modal') {
        closeOrderDetail();
    }
    if (e.target.id === 'cancel-modal') {
        closeCancelModal();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    if (checkAuth()) {
        const urlParams = new URLSearchParams(window.location.search);
        const failed = urlParams.get('payment_failed');
        const msg = urlParams.get('message');
        if (failed === 'true') {
            showNotification(msg || 'Thanh toán không thành công', 'error');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        loadOrders();
    }
});
