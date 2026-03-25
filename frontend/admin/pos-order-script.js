// POS Order Script - KiotViet Style
const API_URL = 'http://localhost:3000/api';
let currentTable = null;
let categories = [];
let menuItems = [];
let orderItems = [];
let currentUser = null;
let orderStartTime = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    currentUser = JSON.parse(localStorage.getItem('pos_user') || 'null');
    if (!currentUser) {
        window.location.href = 'pos-login.html';
        return;
    }
    
    // Get table info
    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get('table');
    
    currentTable = JSON.parse(localStorage.getItem('selected_table') || 'null');
    
    if (!currentTable || currentTable.id != tableId) {
        alert('Không tìm thấy thông tin bàn!');
        window.location.href = 'pos-tables.html';
        return;
    }
    
    // Display info
    document.getElementById('tableName').textContent = currentTable.name;
    document.getElementById('userName').textContent = currentUser.fullName || currentUser.username;
    
    // Start timer
    orderStartTime = new Date();
    updateTimer();
    setInterval(updateTimer, 1000);
    
    // Load data
    loadCategories();
    loadMenu();
    loadExistingOrder();
    
    // Setup search
    document.getElementById('searchMenu').addEventListener('input', (e) => {
        filterMenu(e.target.value);
    });
});

// Update Timer
function updateTimer() {
    if (!orderStartTime) return;
    
    const now = new Date();
    const diff = Math.floor((now - orderStartTime) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    document.getElementById('orderTime').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Load Categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const data = await response.json();
        
        if (data.success) {
            categories = data.data || [];
            renderCategories();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategories() {
    const tabs = document.getElementById('categoryTabs');
    tabs.innerHTML = `
        <button class="category-tab active" data-category="all" onclick="filterByCategory('all')">
            Tất cả
        </button>
        ${categories.map(cat => `
            <button class="category-tab" data-category="${cat.ma_danh_muc}" onclick="filterByCategory(${cat.ma_danh_muc})">
                ${cat.ten_danh_muc}
            </button>
        `).join('')}
    `;
}

// Load Menu
async function loadMenu(categoryId = null, search = '') {
    try {
        let url = `${API_URL}/menu?showAll=true`;
        if (categoryId) url += `&category=${categoryId}`;
        if (search) url += `&search=${search}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            menuItems = data.data || [];
            renderMenu();
        }
    } catch (error) {
        console.error('Error loading menu:', error);
    }
}

function renderMenu() {
    const list = document.getElementById('menuList');
    
    if (menuItems.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 40px; color: #9ca3af;">Không có món nào</div>';
        return;
    }
    
    list.innerHTML = menuItems.map(item => `
        <div class="menu-item ${item.so_luong_ton <= 0 ? 'out-of-stock' : ''}" 
             onclick="addToOrder(${item.ma_mon})">
            <img src="${API_URL.replace('/api', '')}${item.anh_mon || '/images/default.jpg'}" 
                 alt="${item.ten_mon}" class="menu-item-image">
            <div class="menu-item-info">
                <div class="menu-item-name">${item.ten_mon}</div>
                <div class="menu-item-price">${formatCurrency(item.gia_tien)}</div>
                <div class="menu-item-stock">Còn: ${item.so_luong_ton}</div>
            </div>
        </div>
    `).join('');
}

// Filter Menu
function filterByCategory(categoryId) {
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadMenu(categoryId === 'all' ? null : categoryId);
}

function filterMenu(search) {
    loadMenu(null, search);
}

// Add to Order
function addToOrder(itemId) {
    const menuItem = menuItems.find(m => m.ma_mon === itemId);
    if (!menuItem || menuItem.so_luong_ton <= 0) {
        alert('Món này hiện đã hết hàng!');
        return;
    }
    
    const existingItem = orderItems.find(i => i.ma_mon === itemId);
    
    if (existingItem) {
        if (existingItem.so_luong < menuItem.so_luong_ton) {
            existingItem.so_luong++;
        } else {
            alert('Không đủ số lượng trong kho!');
            return;
        }
    } else {
        orderItems.push({
            ma_mon: menuItem.ma_mon,
            ten_mon: menuItem.ten_mon,
            anh_mon: menuItem.anh_mon,
            gia: menuItem.gia_tien,
            so_luong: 1,
            ghi_chu: '',
            so_luong_ton: menuItem.so_luong_ton
        });
    }
    
    renderOrder();
}

// Update Quantity
function updateQuantity(itemId, change) {
    const item = orderItems.find(i => i.ma_mon === itemId);
    if (!item) return;
    
    item.so_luong += change;
    
    if (item.so_luong <= 0) {
        removeFromOrder(itemId);
    } else if (item.so_luong > item.so_luong_ton) {
        alert('Không đủ số lượng trong kho!');
        item.so_luong = item.so_luong_ton;
    }
    
    renderOrder();
}

// Remove from Order
function removeFromOrder(itemId) {
    if (confirm('Xóa món này khỏi order?')) {
        orderItems = orderItems.filter(i => i.ma_mon !== itemId);
        renderOrder();
    }
}

// Update Note
function updateNote(itemId, note) {
    const item = orderItems.find(i => i.ma_mon === itemId);
    if (item) {
        item.ghi_chu = note;
    }
}

// Render Order
function renderOrder() {
    const content = document.getElementById('orderContent');
    const btnSend = document.getElementById('btnSendKitchen');
    const btnNotify = document.getElementById('btnNotify');
    
    if (orderItems.length === 0) {
        content.innerHTML = `
            <div class="empty-order">
                <i class="fas fa-utensils"></i>
                <p>Chưa có món nào</p>
                <p style="font-size: 13px; margin-top: 8px;">Chọn món từ danh sách bên trái</p>
            </div>
        `;
        btnSend.disabled = true;
        btnNotify.style.display = 'none';
        updateSummary();
        return;
    }
    
    btnSend.disabled = false;
    btnNotify.style.display = 'flex';
    
    content.innerHTML = orderItems.map((item, index) => `
        <div class="order-item">
            <div class="order-item-row">
                <div class="order-item-name">${index + 1}. ${item.ten_mon}</div>
                <button class="order-item-delete" onclick="removeFromOrder(${item.ma_mon})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="order-item-controls">
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQuantity(${item.ma_mon}, -1)">−</button>
                    <span class="qty-value">${item.so_luong}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.ma_mon}, 1)">+</button>
                </div>
                <div class="order-item-price">${formatCurrency(item.gia * item.so_luong)}</div>
            </div>
            <div class="order-item-note">
                <input type="text" 
                       placeholder="Ghi chú (VD: Ít cay, không hành...)" 
                       value="${item.ghi_chu}"
                       onchange="updateNote(${item.ma_mon}, this.value)">
            </div>
        </div>
    `).join('');
    
    updateSummary();
}

// Update Summary
function updateSummary() {
    const itemCount = orderItems.reduce((sum, item) => sum + item.so_luong, 0);
    const total = orderItems.reduce((sum, item) => sum + (item.gia * item.so_luong), 0);
    
    document.getElementById('itemCount').textContent = itemCount;
    document.getElementById('totalAmount').textContent = formatCurrency(total);
}

// Load Existing Order
async function loadExistingOrder() {
    try {
        const response = await fetch(`${API_URL}/pos/table-order/${currentTable.id}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            orderItems = data.data.items.map(item => ({
                ma_mon: item.ma_mon,
                ten_mon: item.ten_mon,
                anh_mon: item.anh_mon,
                gia: item.gia,
                so_luong: item.so_luong,
                ghi_chu: item.ghi_chu || '',
                so_luong_ton: item.so_luong_ton || 999
            }));
            renderOrder();
        }
    } catch (error) {
        console.error('Error loading existing order:', error);
    }
}

// Send to Kitchen
async function sendToKitchen() {
    if (orderItems.length === 0) {
        alert('Chưa có món nào để gửi!');
        return;
    }
    
    if (!confirm('Xác nhận gửi order đến bếp?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/pos/send-to-kitchen`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({
                tableId: currentTable.id,
                tableName: currentTable.name,
                items: orderItems.map(item => ({
                    ma_mon: item.ma_mon,
                    ten_mon: item.ten_mon,
                    so_luong: item.so_luong,
                    gia: item.gia,
                    ghi_chu: item.ghi_chu
                })),
                staffName: currentUser.fullName || currentUser.username
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('successModal').classList.add('show');
        } else {
            alert(data.message || 'Có lỗi xảy ra!');
        }
    } catch (error) {
        console.error('Error sending to kitchen:', error);
        alert('Có lỗi xảy ra khi gửi order!');
    }
}

// Notify Kitchen
function notifyKitchen() {
    alert('Đã gửi thông báo nhắc nhở đến bếp!');
}

// Continue Order
function continueOrder() {
    document.getElementById('successModal').classList.remove('show');
    orderItems = [];
    renderOrder();
}

// Go Back
function goBack() {
    if (orderItems.length > 0) {
        if (!confirm('Bạn có chắc muốn quay lại? Order chưa gửi sẽ bị mất.')) {
            return;
        }
    }
    window.location.href = 'pos-tables.html';
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}
