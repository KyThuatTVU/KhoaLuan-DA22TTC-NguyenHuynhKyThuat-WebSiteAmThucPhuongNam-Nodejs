/**
 * admin-pos.js - Logic chung cho màn hình Bán hàng tích hợp trong Dashboard Admin
 */

// API_URL đã được định nghĩa trong admin-layout.js, nếu mâu thuẫn sẽ dùng API_BASE
const BASE_URL = 'http://localhost:3000/api';

let adminUser = null;
let currentTable = null;
let orderItems = [];
let menuItems = [];
let categories = [];
let originalOrderJson = '[]';
let currentOrderId = null;
let orderStartTime = null;

document.addEventListener('DOMContentLoaded', () => {
    // Chờ admin-layout loadSession xong
    setTimeout(initPOS, 800);
});

async function initPOS() {
    // admin-layout đã lấy session tại server, lưu kết quả hoặc check nếu role tồn tại
    // Vì admin-layout.js loadAdminInfo trả về avatar/name nhưng không công khai object đầy đủ cho các scripts khác dễ dàng,
    // ta gọi lại /check-session để lấy role đầy đủ phục vụ phân quyền frontend POS:
    try {
        const res = await fetch(`${BASE_URL}/admin-auth/check-session`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.isAuthenticated && data.data) {
            adminUser = data.data; // { ma_admin, email, ten_hien_thi, role... }
            
            // Xử lý Role UI
            if(document.getElementById('user-role-badge')) {
                const roleName = adminUser.role === 'admin' ? 'Quản trị viên' : 
                                 adminUser.role === 'manager' ? 'Quản lý' : 'Nhân viên';
                document.getElementById('user-role-badge').innerHTML = `<i class="fas fa-id-badge mr-1"></i>${roleName}`;
            }

            // Gọi hàm init tùy theo trang hiện tại
            if (window.location.pathname.includes('admin-pos-order.html')) {
                initOrderScreen();
            }
        } else {
            // Nếu dùng chung login với POS login thì đã xử lý ở dang-nhap-admin.html
            // Mặc định ném ra login nếu không có session
            window.location.href = 'dang-nhap-admin.html';
        }
    } catch (err) {
        console.error("Lỗi xác thực POS:", err);
    }
}

// ============================================
// LOGIC MÀN HÌNH ORDER (admin-pos-order.html)
// ============================================

function initOrderScreen() {
    // Lấy thông tin bàn từ Storage / URL
    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get('table');
    
    try {
        currentTable = JSON.parse(localStorage.getItem('selected_table') || 'null');
    } catch (e) { currentTable = null; }
    
    if (!currentTable || currentTable.id != tableId) {
        alert('Không tìm thấy thông tin bàn!');
        window.location.href = 'admin-pos-tables.html';
        return;
    }

    document.getElementById('tableName').textContent = currentTable.name;

    // Timer
    orderStartTime = new Date();
    updateTimer();
    setInterval(updateTimer, 1000);

    // Load data
    loadCategories();
    loadMenu();
    loadExistingOrder();

    // Event listener cho search
    const searchInput = document.getElementById('searchMenu');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            loadMenu(null, e.target.value);
        });
    }
}

function updateTimer() {
    if (!orderStartTime) return;
    const diff = Math.floor((new Date() - orderStartTime) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    const timeEl = document.getElementById('orderTime');
    if (timeEl) {
        timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${BASE_URL}/categories`, { credentials: 'include' });
        const data = await response.json();
        if (data.success) {
            categories = data.data || [];
            
            const tabs = document.getElementById('categoryTabs');
            if(tabs) {
                tabs.innerHTML = `
                    <button class="category-tab active" onclick="filterByCategory('all', this)">Tất cả</button>
                    ${categories.map(cat => `<button class="category-tab" onclick="filterByCategory(${cat.ma_danh_muc}, this)">${cat.ten_danh_muc}</button>`).join('')}
                `;
            }
        }
    } catch (e) {
        console.error('Error loading categories', e);
    }
}

function filterByCategory(catId, btnEl) {
    document.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    loadMenu(catId === 'all' ? null : catId);
}

async function loadMenu(categoryId = null, search = '') {
    try {
        let url = `${BASE_URL}/menu?showAll=true`;
        if (categoryId) url += `&category=${categoryId}`;
        if (search) url += `&search=${search}`;
        
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        
        if (data.success) {
            menuItems = data.data || [];
            renderMenuGrid();
        }
    } catch (e) {
        console.error('Lỗi load menu', e);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function renderMenuGrid() {
    const list = document.getElementById('menuList');
    if(!list) return;

    if (menuItems.length === 0) {
        list.innerHTML = `<div class="col-span-full py-10 text-center text-slate-400"><p>Không tìm thấy món ăn</p></div>`;
        return;
    }

    list.innerHTML = menuItems.map(item => {
        let imagePath = item.anh_mon || item.anh_dai_dien || '/images/default.jpg';
        if (!imagePath.startsWith('http') && !imagePath.startsWith('/images/')) imagePath = '/images/' + imagePath.replace(/^\/+/, '');
        const imageUrl = imagePath.startsWith('http') ? imagePath : `http://localhost:3000${imagePath}`;
        
        const isOutOfStock = item.so_luong_ton <= 0;
        
        return `
            <div class="menu-item ${isOutOfStock ? 'out-of-stock' : ''}" onclick="${isOutOfStock ? '' : `addToOrder(${item.ma_mon})`}">
                <img src="${imageUrl}" alt="${item.ten_mon}" class="item-img" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                <div class="item-info">
                    <div class="item-name" title="${item.ten_mon}">${item.ten_mon}</div>
                    <div class="flex justify-between items-end mt-2">
                        <span class="item-price">${formatCurrency(item.gia_tien || item.gia)}</span>
                        <span class="item-stock">Kho: ${item.so_luong_ton || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function addToOrder(itemId) {
    const menuItem = menuItems.find(m => m.ma_mon === itemId);
    if (!menuItem || menuItem.so_luong_ton <= 0) return;

    const existing = orderItems.find(i => i.ma_mon === itemId);
    if (existing) {
        const max = existing.max_quantity !== undefined ? existing.max_quantity : menuItem.so_luong_ton;
        if (existing.so_luong < max) existing.so_luong++;
        else alert('Không đủ số lượng trong kho!');
    } else {
        orderItems.push({
            ma_mon: menuItem.ma_mon,
            ten_mon: menuItem.ten_mon,
            gia: menuItem.gia_tien || menuItem.gia,
            so_luong: 1,
            ghi_chu: '',
            so_luong_ton: menuItem.so_luong_ton,
            max_quantity: menuItem.so_luong_ton
        });
    }
    renderCart();
}

function updateQuantity(itemId, change) {
    const item = orderItems.find(i => i.ma_mon === itemId);
    if (!item) return;

    item.so_luong += change;
    if (item.so_luong <= 0) {
        orderItems = orderItems.filter(i => i.ma_mon !== itemId);
    } else if (item.max_quantity !== undefined && item.so_luong > item.max_quantity) {
        alert('Không đủ số lượng trong kho!');
        item.so_luong = item.max_quantity;
    } else if (item.max_quantity === undefined && item.so_luong > item.so_luong_ton) {
        alert('Không đủ số lượng trong kho!');
        item.so_luong = item.so_luong_ton;
    }
    renderCart();

    // Tự động lưu thay đổi số lượng về DB nếu đang trong quá trình cập nhật
    if (currentOrderId) {
        // debounce a bit or just autoSave directly
        clearTimeout(window.updateTimerId);
        window.updateTimerId = setTimeout(() => {
            autoSaveOrder();
        }, 1000);
    }
}

function removeFromOrder(itemId) {
    if (confirm('Xóa món này khỏi order?')) {
        orderItems = orderItems.filter(i => i.ma_mon !== itemId);
        renderCart();
        // Tự động lưu nếu đã có bảng order (để F5 không bị mất)
        if (currentOrderId) {
            autoSaveOrder();
        }
    }
}

async function autoSaveOrder() {
    try {
        const payload = {
            tableId: currentTable.id,
            tableName: currentTable.name,
            items: orderItems.map(item => ({
                ma_mon: item.ma_mon,
                ten_mon: item.ten_mon,
                so_luong: item.so_luong,
                gia: item.gia,
                ghi_chu: item.ghi_chu
            })),
            staffName: adminUser ? adminUser.ten_hien_thi : 'Admin'
        };
        const response = await fetch(`${BASE_URL}/pos/send-to-kitchen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) {
            currentOrderId = data.data.orderId;
            originalOrderJson = JSON.stringify(orderItems);
            if (!currentOrderId) {
                alert('Giỏ hàng rỗng, đơn hàng đã tự động bị hủy!');
                window.location.href = 'admin-pos-tables.html';
            }
        } else {
            console.error('Lỗi auto-save:', data.message);
            alert('Lưu tự động thất bại: ' + (data.message || 'Lỗi không xác định'));
            // Tải lại để đồng bộ với DB
            window.location.reload();
        }
    } catch (e) {
        console.error('Auto save error:', e);
        alert('Lỗi mạng, không thể tự động lưu!');
    }
}

function updateNote(itemId, note) {
    const item = orderItems.find(i => i.ma_mon === itemId);
    if (item) item.ghi_chu = note;
}

function renderCart() {
    const content = document.getElementById('orderContent');
    const btnSend = document.getElementById('btnSendKitchen');
    const btnCheckout = document.getElementById('btnCheckout');
    
    // Auto-save draft items locally so it survives reloads if not sent to kitchen yet
    if (currentTable) {
        if (!currentOrderId && orderItems.length > 0) {
            localStorage.setItem(`draft_pos_${currentTable.id}`, JSON.stringify(orderItems));
        } else if (!currentOrderId && orderItems.length === 0) {
            localStorage.removeItem(`draft_pos_${currentTable.id}`);
        }
    }
    
    if(!content) return;

    if (orderItems.length === 0) {
        content.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-400 mt-10">
                <i class="fas fa-utensils text-5xl mb-3 opacity-50"></i>
                <p>Chưa có món nào</p>
                <p class="text-xs mt-1">Chọn món từ danh sách bên trái</p>
            </div>
        `;
        btnSend.disabled = currentOrderId ? false : true;
        btnSend.innerHTML = currentOrderId ? '<i class="fas fa-trash mr-1"></i> Huỷ Order' : '<i class="fas fa-paper-plane mr-1"></i> Gửi bếp';
        btnCheckout.classList.add('hidden');
        updateSummary();
        return;
    }
    
    btnSend.disabled = false;
    // Đổi hiển thị nút cho hợp ngữ cảnh
    if (currentOrderId && JSON.stringify(orderItems) !== originalOrderJson) {
        btnSend.innerHTML = '<i class="fas fa-sync mr-1"></i> Cập nhật Order';
    } else if (currentOrderId) {
        btnSend.innerHTML = '<i class="fas fa-check mr-1"></i> Đã Gửi Bếp';
        btnSend.disabled = true; // no changes to send
    } else {
        btnSend.innerHTML = '<i class="fas fa-paper-plane mr-1"></i> Gửi bếp';
    }
    
    // Check permission for Checkout (Managers and Admins usually can checkout, Staff just orders)
    // Assume if full Admin/Manager, can checkout
    if (adminUser && (adminUser.role === 'admin' || adminUser.role === 'manager') && currentOrderId) {
        btnCheckout.classList.remove('hidden');
    } else {
        btnCheckout.classList.add('hidden');
    }

    content.innerHTML = orderItems.map(item => `
        <div class="cart-item">
            <div class="cart-item-header">
                <div class="cart-item-name">${item.ten_mon}</div>
                <button class="cart-item-del" onclick="removeFromOrder(${item.ma_mon})"><i class="fas fa-times"></i></button>
            </div>
            <div class="cart-item-controls">
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQuantity(${item.ma_mon}, -1)">-</button>
                    <span class="qty-val">${item.so_luong}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.ma_mon}, 1)">+</button>
                </div>
                <div class="cart-item-price">${formatCurrency(item.gia * item.so_luong)}</div>
            </div>
            <input type="text" class="cart-item-note" placeholder="Ghi chú (Tùy chọn)" value="${item.ghi_chu}" onchange="updateNote(${item.ma_mon}, this.value)">
        </div>
    `).join('');
    
    updateSummary();
}

function updateSummary() {
    const count = orderItems.reduce((sum, item) => sum + item.so_luong, 0);
    const total = orderItems.reduce((sum, item) => sum + (item.gia * item.so_luong), 0);
    document.getElementById('itemCount').textContent = count;
    document.getElementById('totalAmount').textContent = formatCurrency(total);
}

// Logic gửi cho backend liên quan đến order
async function loadExistingOrder() {
    try {
        const response = await fetch(`${BASE_URL}/pos/table-order/${currentTable.id}`, { credentials: 'include' });
        const data = await response.json();
        
        if (data.success && data.data) {
            currentOrderId = data.data.orderId;
            orderItems = data.data.items.map(item => ({
                ma_mon: item.ma_mon,
                ten_mon: item.ten_mon,
                gia: item.gia,
                so_luong: item.so_luong,
                ghi_chu: item.ghi_chu || '',
                so_luong_ton: item.so_luong_ton || 999,
                max_quantity: item.so_luong + (item.so_luong_ton || 0)
            }));
            originalOrderJson = JSON.stringify(orderItems);
            localStorage.removeItem(`draft_pos_${currentTable.id}`);
            renderCart();
        } else {
            const draft = localStorage.getItem(`draft_pos_${currentTable.id}`);
            if (draft) {
                try {
                    orderItems = JSON.parse(draft);
                    renderCart();
                } catch(e){}
            }
        }
    } catch (e) { console.error('Lỗi load order:', e); }
}

async function sendToKitchen() {
    if (orderItems.length === 0 && !currentOrderId) return;
    if (orderItems.length === 0 && currentOrderId) {
        if (!confirm('Giỏ hàng trống. Xác nhận HỦY order này?')) return;
    } else {
        if (currentOrderId) {
            if (!confirm('Cập nhật thay đổi vào order?')) return;
        } else {
            if (!confirm('Xác nhận đặt món và gửi bếp?')) return;
        }
    }
    
    try {
        const payload = {
            tableId: currentTable.id,
            tableName: currentTable.name,
            items: orderItems.map(item => ({
                ma_mon: item.ma_mon,
                ten_mon: item.ten_mon,
                so_luong: item.so_luong,
                gia: item.gia,
                ghi_chu: item.ghi_chu
            })),
            staffName: adminUser ? adminUser.ten_hien_thi : 'Admin'
        };

        const response = await fetch(`${BASE_URL}/pos/send-to-kitchen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (data.success) {
            currentOrderId = data.data.orderId;
            originalOrderJson = JSON.stringify(orderItems);
            localStorage.removeItem(`draft_pos_${currentTable.id}`);
            renderCart();
            if(!currentOrderId) {
                alert('Đã hủy order thành công!');
                window.location.href = 'admin-pos-tables.html';
                return;
            }
            // Show modal instead of alert
            document.getElementById('successModal').classList.add('show');
            // Mock printing
            // printKitchenTicket(); // Bạn có thể thêm lại logic in phiếu nếu cần
        } else {
            alert(data.message || 'Lỗi gửi order');
        }
    } catch (error) {
        console.error('Error send to kitchen', error);
        alert('Có lỗi mạng khi gửi bếp');
    }
}

function continueOrder() {
    document.getElementById('successModal').classList.remove('show');
}

function goBack() {
    if (JSON.stringify(orderItems) !== originalOrderJson) {
        if (!confirm('Có thay đổi chưa gửi bếp, bạn có chắc chắn thoát?')) return;
    }
    window.location.href = 'admin-pos-tables.html';
}

function showCheckoutModal() {
    if (!currentOrderId) return;
    if (JSON.stringify(orderItems) !== originalOrderJson) {
        alert('Bạn đã thay đổi món (thêm, bớt, xóa). Vui lòng nhấn nút "Cập nhật Order" trước khi tiến hành thanh toán!');
        return;
    }
    const total = orderItems.reduce((sum, item) => sum + (item.gia * item.so_luong), 0);
    document.getElementById('checkoutTotalAmount').textContent = formatCurrency(total);
    document.getElementById('checkoutModal').classList.add('show');
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('show');
}

async function confirmCheckout() {
    if (!currentOrderId) return;
    const paymentMethod = document.getElementById('checkoutPaymentMethod').value;
    
    try {
        const response = await fetch(`${BASE_URL}/pos/table-orders/${currentOrderId}/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ paymentMethod })
        });
        const data = await response.json();
        if (data.success) {
            closeCheckoutModal();
            showBillModal(paymentMethod);
        } else alert(data.message || 'Lỗi thanh toán');
    } catch (e) { console.error(e); alert('Lỗi mạng thanh toán'); }
}

function showBillModal(paymentMethod) {
    // Table name
    document.getElementById('billTableName').textContent = currentTable.name || '---';
    
    // Bill code
    const billCode = 'HD' + String(currentOrderId).padStart(6, '0');
    document.getElementById('billCode').textContent = billCode;
    
    // Time
    const now = new Date();
    const timeOut = now.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.getElementById('billTimeOut').textContent = timeOut;
    
    // Time in (from orderTime element)
    const timeInEl = document.getElementById('orderTime');
    document.getElementById('billTimeIn').textContent = timeInEl ? timeInEl.textContent : '--:--';
    
    // Staff
    document.getElementById('billStaff').textContent = adminUser ? adminUser.ten_hien_thi : 'Admin';
    
    // Payment method
    const methodMap = { 'cash': 'Tiền mặt', 'transfer': 'Chuyển khoản', 'card': 'Quẹt thẻ' };
    document.getElementById('billPaymentMethod').textContent = methodMap[paymentMethod] || paymentMethod;
    
    // Items
    const tbody = document.getElementById('billItems');
    tbody.innerHTML = '';
    let subtotal = 0;
    
    orderItems.forEach(item => {
        const itemTotal = item.gia * item.so_luong;
        subtotal += itemTotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="bill-td-name">${item.ten_mon}</td>
            <td class="bill-td-price">${formatBillPrice(item.gia)}</td>
            <td class="bill-td-qty">x ${item.so_luong}</td>
            <td class="bill-td-total">${formatBillPrice(itemTotal)}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Summary
    document.getElementById('billSubtotal').textContent = formatBillPrice(subtotal);
    document.getElementById('billTotal').textContent = formatBillPrice(subtotal);
    
    // QR Code (VietQR API - Vietcombank)
    const billDesc = encodeURIComponent(`${currentTable.name} - HD${String(currentOrderId).padStart(6, '0')}`);
    const qrUrl = `https://img.vietqr.io/image/VCB-1052053578-compact2.png?amount=${subtotal}&addInfo=${billDesc}&accountName=NGUYEN%20HUYNH%20KY%20THUAT`;
    document.getElementById('billQRCode').src = qrUrl;
    
    // Show/Hide QR section based on payment method
    const qrSection = document.querySelector('.bill-qr-section');
    if (qrSection) {
        qrSection.style.display = paymentMethod === 'transfer' ? 'block' : 'block'; // Show always for convenience
    }
    
    // Show modal
    document.getElementById('billModal').classList.add('show');
}

function formatBillPrice(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function printBill() {
    window.print();
}

function closeBillAndRedirect() {
    if (currentTable) localStorage.removeItem(`draft_pos_${currentTable.id}`);
    document.getElementById('billModal').classList.remove('show');
    window.location.href = 'admin-pos-tables.html';
}

