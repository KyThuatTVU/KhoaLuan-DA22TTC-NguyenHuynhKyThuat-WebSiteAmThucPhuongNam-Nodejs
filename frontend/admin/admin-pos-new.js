/**
 * admin-pos-new.js - Unified POS Logic
 */

const BASE_URL = 'http://localhost:3000/api';
let allTables = [];
let menuItems = [];
let categories = [];
let currentTable = null;
let orderItems = [];
let activeOrderId = null;
let adminUser = null;

function toggleSidebar_local() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('-translate-x-full');
        sidebar.classList.toggle('w-0');
        sidebar.classList.toggle('w-72');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    updateClock();
    setInterval(updateClock, 1000);
    
    // Auth & Init
    await initAuth();
    await loadInitialData();
    
    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F3') { e.preventDefault(); switchTab('search'); }
        if (e.key === 'F9') { e.preventDefault(); openCheckout(); }
        if (e.key === 'F10') { e.preventDefault(); saveOrder(); }
    });
});

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
    const timeEl = document.getElementById('current-time');
    if (timeEl) timeEl.textContent = timeStr;
}

async function initAuth() {
    try {
        const res = await fetch(`${BASE_URL}/admin-auth/check-session`, { credentials: 'include' });
        const data = await res.json();
        if (data.isAuthenticated) {
            adminUser = data.data;
            document.getElementById('admin-name-display').textContent = adminUser.ten_hien_thi || adminUser.ho_ten;
        } else {
            window.location.href = 'dang-nhap-admin.html';
        }
    } catch (e) {
        console.error("Auth error", e);
    }
}

async function loadInitialData() {
    try {
        // Load Tables
        const resTables = await fetch(`${BASE_URL}/pos/tables`, { credentials: 'include' });
        const dataTables = await resTables.json();
        if (dataTables.success) allTables = dataTables.data;

        // Load Categories
        const resCats = await fetch(`${BASE_URL}/categories`, { credentials: 'include' });
        const dataCats = await resCats.json();
        if (dataCats.success) categories = dataCats.data;

        // Load Menu
        const resMenu = await fetch(`${BASE_URL}/menu?showAll=true`, { credentials: 'include' });
        const dataMenu = await resMenu.json();
        if (dataMenu.success) menuItems = dataMenu.data;

        renderAreas();
        renderTables();
        renderCategories();
        renderMenu();

        // Restore saved state
        const savedTab = localStorage.getItem('pos_current_tab') || 'tables';
        const savedTableId = localStorage.getItem('pos_current_table_id');
        
        if (savedTableId) {
            await selectTable(Number(savedTableId), false);
        }
        switchTab(savedTab);
    } catch (e) {
        console.error("Data load error", e);
    }
}

// --- TABS & NAVIGATION ---
function switchTab(tabId) {
    document.querySelectorAll('.pos-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
    
    // Save current tab
    localStorage.setItem('pos_current_tab', tabId);
    
    const activeBtn = document.querySelector(`.pos-tab-btn[onclick="switchTab('${tabId}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    const activePane = document.getElementById(`tab-${tabId}`);
    if (activePane) activePane.classList.remove('hidden');

    if (tabId === 'search') {
        setTimeout(() => document.getElementById('global-search').focus(), 100);
    }
}

// --- TABLE LOGIC ---
function renderAreas() {
    const filterContainer = document.getElementById('area-filters');
    const areas = [...new Set(allTables.map(t => t.vi_tri || 'Mặc định'))];
    
    filterContainer.innerHTML = `<span class="cat-pill active" onclick="filterTablesByArea('all', this)">Tất cả</span>` + 
        areas.map(area => `<span class="cat-pill" onclick="filterTablesByArea('${area}', this)">${area}</span>`).join('');
}

function filterTablesByArea(area, el) {
    document.querySelectorAll('#area-filters .cat-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    renderTables(area === 'all' ? null : area);
}

function renderTables(areaFilter = null) {
    const container = document.getElementById('tables-container');
    container.innerHTML = '';
    
    const areas = areaFilter ? [areaFilter] : [...new Set(allTables.map(t => t.vi_tri || 'Mặc định'))];
    
    areas.forEach(area => {
        const areaTables = allTables.filter(t => (t.vi_tri || 'Mặc định') === area);
        if (areaTables.length === 0) return;

        const areaDiv = document.createElement('div');
        areaDiv.className = 'area-section';
        areaDiv.innerHTML = `
            <h3 class="area-title">${area}</h3>
            <div class="table-grid">
                ${areaTables.map(table => `
                    <div class="pos-table-card ${table.trang_thai} ${currentTable && currentTable.ma_ban === table.ma_ban ? 'active' : ''}" 
                         onclick="selectTable(${table.ma_ban})">
                        <div class="status-indicator ${table.trang_thai}"></div>
                        <div class="font-bold text-lg mb-1">${table.ten_ban}</div>
                        <div class="text-xs text-slate-500">${table.so_cho} chỗ</div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(areaDiv);
    });
}

async function selectTable(tableId, autoSwitch = true) {
    const table = allTables.find(t => t.ma_ban === tableId);
    if (!table) return;

    currentTable = table;
    localStorage.setItem('pos_current_table_id', tableId);
    document.getElementById('active-table-title').textContent = table.ten_ban.toUpperCase();
    document.getElementById('selected-table-name').textContent = table.ten_ban;
    
    showOrderPanel(true); // Show order panel, hide placeholder
    renderTables(); // Re-render to show active state
    
    // Load existing order for this table
    await loadTableOrder(tableId, autoSwitch);
}

async function loadTableOrder(tableId, autoSwitch = true) {
    try {
        orderItems = [];
        activeOrderId = null;
        updateOrderUI();

        const res = await fetch(`${BASE_URL}/pos/table-order/${tableId}`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.success && data.data) {
            activeOrderId = data.data.orderId;
            orderItems = data.data.items.map(i => ({
                ma_mon: i.ma_mon,
                ten_mon: i.ten_mon,
                gia: i.gia,
                so_luong: i.so_luong,
                ghi_chu: i.ghi_chu || ''
            }));
            
            localStorage.removeItem(`draft_pos_${tableId}`);
            document.getElementById('order-status-badge').textContent = 'ĐANG PHỤC VỤ';
            document.getElementById('order-status-badge').className = 'px-2 py-0.5 rounded-full text-[10px] bg-orange-100 text-orange-700 font-bold';
            // Switch to menu tab for convenience after selecting table
            if (activeOrderId && autoSwitch) switchTab('menu');
        } else {
            const draft = localStorage.getItem(`draft_pos_${tableId}`);
            if (draft) {
                try {
                    orderItems = JSON.parse(draft);
                } catch(e){}
            }
            document.getElementById('order-status-badge').textContent = 'CHƯA CÓ ĐƠN';
            document.getElementById('order-status-badge').className = 'px-2 py-0.5 rounded-full text-[10px] bg-slate-100 font-bold';
            if (autoSwitch) switchTab('menu');
        }
        updateOrderUI();
    } catch (e) {
        console.error("Load order error", e);
    }
}

// --- MENU LOGIC ---
function renderCategories() {
    const filterContainer = document.getElementById('category-filters');
    filterContainer.innerHTML = `<span class="cat-pill active" onclick="filterMenuByCategory('all', this)">Tất cả</span>` + 
        categories.map(cat => `<span class="cat-pill" onclick="filterMenuByCategory(${cat.ma_danh_muc}, this)">${cat.ten_danh_muc}</span>`).join('');
}

function filterMenuByCategory(catId, el) {
    document.querySelectorAll('#category-filters .cat-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    renderMenu(catId === 'all' ? null : catId);
}

function renderMenu(catId = null, search = '') {
    const container = document.getElementById('menu-container');
    let filtered = menuItems;
    
    if (catId) filtered = filtered.filter(i => i.ma_danh_muc === catId);
    if (search) filtered = filtered.filter(i => i.ten_mon.toLowerCase().includes(search.toLowerCase()));
    
    container.innerHTML = filtered.map(item => {
        let imagePath = item.anh_mon || item.anh_dai_dien || '/images/default.jpg';
        const imageUrl = imagePath.startsWith('http') ? imagePath : `http://localhost:3000${imagePath}`;
        
        return `
            <div class="pos-menu-card" onclick="addToOrder(${item.ma_mon})">
                <img src="${imageUrl}" class="menu-card-img" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                <div class="menu-card-info">
                    <div class="menu-card-name" title="${item.ten_mon}">${item.ten_mon}</div>
                    <div class="menu-card-price">${formatCurrency(item.gia_tien || item.gia)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function handleGlobalSearch(val) {
    const container = document.getElementById('search-results');
    if (!val) { container.innerHTML = ''; return; }
    
    const filtered = menuItems.filter(i => i.ten_mon.toLowerCase().includes(val.toLowerCase()) || i.ma_mon.toString() === val);
    container.innerHTML = filtered.map(item => `
        <div class="pos-menu-card" onclick="addToOrder(${item.ma_mon})">
            <div class="p-3">
                <div class="font-bold text-sm">${item.ten_mon}</div>
                <div class="text-blue-600 font-bold">${formatCurrency(item.gia_tien || item.gia)}</div>
            </div>
        </div>
    `).join('');
}

// --- ORDER LOGIC ---
function addToOrder(itemId) {
    if (!currentTable) {
        alert('Vui lòng chọn bàn trước!');
        switchTab('tables');
        return;
    }
    
    const menuItem = menuItems.find(m => m.ma_mon === itemId);
    if (!menuItem) return;

    const existing = orderItems.find(i => i.ma_mon === itemId);
    if (existing) {
        existing.so_luong++;
    } else {
        orderItems.push({
            ma_mon: menuItem.ma_mon,
            ten_mon: menuItem.ten_mon,
            gia: menuItem.gia_tien || menuItem.gia,
            so_luong: 1,
            ghi_chu: ''
        });
    }
    updateOrderUI();
}

function updateQuantity(itemId, change) {
    const item = orderItems.find(i => i.ma_mon === itemId);
    if (!item) return;
    
    item.so_luong += change;
    if (item.so_luong <= 0) {
        orderItems = orderItems.filter(i => i.ma_mon !== itemId);
    }
    updateOrderUI();
}

function updateOrderUI() {
    if (currentTable) {
        if (!activeOrderId && orderItems.length > 0) {
            localStorage.setItem(`draft_pos_${currentTable.ma_ban}`, JSON.stringify(orderItems));
        } else if (!activeOrderId && orderItems.length === 0) {
            localStorage.removeItem(`draft_pos_${currentTable.ma_ban}`);
        }
    }

    const container = document.getElementById('order-items');
    if (orderItems.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full opacity-30"><i class="fas fa-shopping-basket text-6xl mb-4"></i><p class="font-bold">Đơn hàng trống</p></div>`;
        document.getElementById('total-amount').textContent = '0đ';
        return;
    }
    
    container.innerHTML = orderItems.map(item => `
        <div class="order-item-row">
            <div class="order-item-info">
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="order-item-name flex-1">${item.ten_mon}</div>
                    <button onclick="removeItem(${item.ma_mon})" title="Xóa món" class="text-red-400 hover:text-red-600 transition flex-shrink-0 mt-0.5">
                        <i class="fas fa-trash-alt text-sm"></i>
                    </button>
                </div>
                <div class="order-item-meta">
                    <div class="order-qty-control">
                        <button class="qty-btn" onclick="updateQuantity(${item.ma_mon}, -1)">-</button>
                        <span class="font-bold">${item.so_luong}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.ma_mon}, 1)">+</button>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-700">${formatCurrency(item.gia * item.so_luong)}</span>
                        <button onclick="editItemPrice(${item.ma_mon})" title="Chỉnh giá" class="text-blue-400 hover:text-blue-600 transition">
                            <i class="fas fa-pen text-xs"></i>
                        </button>
                    </div>
                </div>
                <input type="text" placeholder="Ghi chú..." value="${item.ghi_chu}" 
                       onchange="updateItemNote(${item.ma_mon}, this.value)"
                       class="w-full text-xs mt-2 border-none bg-slate-50 p-1 rounded italic outline-none">
            </div>
        </div>
    `).join('');
    
    const total = orderItems.reduce((sum, i) => sum + (i.gia * i.so_luong), 0);
    document.getElementById('total-amount').textContent = formatCurrency(total);
}

function updateItemNote(itemId, note) {
    const item = orderItems.find(i => i.ma_mon === itemId);
    if (item) item.ghi_chu = note;
}

function removeItem(itemId) {
    if (!confirm('Xóa món này khỏi đơn hàng?')) return;
    orderItems = orderItems.filter(i => i.ma_mon !== itemId);
    updateOrderUI();
}

function editItemPrice(itemId) {
    const item = orderItems.find(i => i.ma_mon === itemId);
    if (!item) return;
    const currentPrice = item.gia;
    const input = prompt(`Chỉnh giá cho "${item.ten_mon}":\n(Giá gốc: ${formatCurrency(currentPrice)})`, currentPrice);
    if (input === null) return;
    const newPrice = parseInt(input.replace(/[^\d]/g, ''));
    if (isNaN(newPrice) || newPrice < 0) {
        alert('Giá không hợp lệ!');
        return;
    }
    item.gia = newPrice;
    updateOrderUI();
}

async function saveOrder() {
    if (!currentTable) return alert('Chưa chọn bàn');
    if (orderItems.length === 0) return alert('Đơn hàng trống');
    
    try {
        const payload = {
            tableId: currentTable.ma_ban,
            tableName: currentTable.ten_ban,
            items: orderItems,
            staffName: adminUser ? adminUser.ten_hien_thi : 'POS System'
        };
        
        const res = await fetch(`${BASE_URL}/pos/send-to-kitchen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (data.success) {
            activeOrderId = data.data.orderId;
            localStorage.removeItem(`draft_pos_${currentTable.ma_ban}`);
            showKitchenTicket(); // Trigger printing ticket
            await loadInitialData(); // Refresh table status
            await loadTableOrder(currentTable.ma_ban);
        } else {
            alert('Lỗi: ' + data.message);
        }
    } catch (e) { console.error(e); }
}

function showKitchenTicket() {
    const content = document.getElementById('kitchen-ticket-content');
    const now = new Date().toLocaleTimeString('vi-VN');
    
    content.innerHTML = `
        <div class="text-center border-b-2 border-black pb-2 mb-2 font-bold uppercase">
            PHIẾU CHẾ BIẾN (KITCHEN)
        </div>
        <div class="flex justify-between mb-2">
            <span>BÀN: <b>${currentTable.ten_ban}</b></span>
            <span>${now}</span>
        </div>
        <div class="border-b border-black mb-2"></div>
        <table class="w-full">
            <thead>
                <tr class="text-left">
                    <th class="border-b border-black">Tên món</th>
                    <th class="border-b border-black text-right">SL</th>
                </tr>
            </thead>
            <tbody>
                ${orderItems.map(i => `
                    <tr>
                        <td class="py-1">${i.ten_mon}</td>
                        <td class="py-1 text-right font-bold text-xl">${i.so_luong}</td>
                    </tr>
                    ${i.ghi_chu ? `<tr><td colspan="2" class="text-xs italic pl-4">- ${i.ghi_chu}</td></tr>` : ''}
                `).join('')}
            </tbody>
        </table>
        <div class="border-t border-black mt-4 pt-2 text-center text-xs">
            --- Vui lòng đưa món sớm cho khách ---
        </div>
    `;
    
    document.getElementById('kitchenModal').classList.add('flex');
    document.getElementById('kitchenModal').classList.remove('hidden');
    
    // Auto print if needed, but user might want to see first
    // window.print();
}

function closeKitchenTicket() {
    document.getElementById('kitchenModal').classList.add('hidden');
    document.getElementById('kitchenModal').classList.remove('flex');
}

function openCheckout() {
    if (!activeOrderId) return alert('Vui lòng lưu đơn hàng (Gửi bếp) trước khi thanh toán');
    
    const total = orderItems.reduce((sum, i) => sum + (i.gia * i.so_luong), 0);
    document.getElementById('checkout-total').textContent = formatCurrency(total);
    document.getElementById('checkoutModal').classList.add('flex');
    document.getElementById('checkoutModal').classList.remove('hidden');
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.add('hidden');
    document.getElementById('checkoutModal').classList.remove('flex');
}

async function confirmPayment() {
    const paymentMethod = document.getElementById('payment-method').value;
    
    try {
        const res = await fetch(`${BASE_URL}/pos/table-orders/${activeOrderId}/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ paymentMethod })
        });
        
        const data = await res.json();
        if (data.success) {
            closeCheckout();
            showBill(paymentMethod);
        } else {
            alert('Lỗi thanh toán: ' + data.message);
        }
    } catch (e) { console.error(e); }
}

function showBill(method) {
    const content = document.getElementById('bill-content');
    const total = orderItems.reduce((sum, i) => sum + (i.gia * i.so_luong), 0);
    const now = new Date().toLocaleString('vi-VN');
    const methodText = method === 'cash' ? '💵 Tiền mặt' : method === 'transfer' ? '🏦 Chuyển khoản' : '💳 Quẹt thẻ';

    // VietQR dynamic URL: Vietcombank - 1052053578 - NGUYEN HUYNH KY THUAT
    const qrDesc = encodeURIComponent(`Thanh toan ${currentTable.ten_ban}`);
    const qrUrl = `https://img.vietqr.io/image/VCB-1052053578-compact2.png?amount=${total}&addInfo=${qrDesc}&accountName=NGUYEN%20HUYNH%20KY%20THUAT`;

    content.innerHTML = `
        <!-- Header compact -->
        <div style="display:flex; align-items:center; gap:10px; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:10px;">
            <img src="../images/Green Simple Clean Vegan Food Logo.png"
                 style="width:52px; height:52px; object-fit:contain; border-radius:12px; background:#f0f9f0; padding:4px; flex-shrink:0;">
            <div>
                <div style="font-size:15px; font-weight:800; color:#1e3a5f;">ẨM THỰC PHƯƠNG NAM</div>
                <div style="font-size:10px; color:#64748b;">Hương vị miền Tây sông nước</div>
                <div style="font-size:10px; color:#94a3b8;">📍 Long Đức, Tp. Vĩnh Long &nbsp;|&nbsp; 📞 0123.456.789</div>
            </div>
        </div>

        <!-- Info -->
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:10px; background:#f8fafc; padding:6px 10px; border-radius:8px;">
            <span><b>Bàn:</b> ${currentTable.ten_ban}</span>
            <span><b>Giờ:</b> ${now}</span>
        </div>

        <!-- Danh sách món -->
        <table style="width:100%; font-size:11px; border-collapse:collapse;">
            <thead>
                <tr style="border-bottom:2px solid #1e3a5f;">
                    <th style="text-align:left; padding:5px 0; color:#1e3a5f;">Món ăn</th>
                    <th style="text-align:center; padding:5px 3px; color:#1e3a5f;">SL</th>
                    <th style="text-align:right; padding:5px 0; color:#1e3a5f;">Đ.Giá</th>
                    <th style="text-align:right; padding:5px 0; color:#1e3a5f;">T.Tiền</th>
                </tr>
            </thead>
            <tbody>
                ${orderItems.map((i, idx) => `
                    <tr style="border-bottom:1px solid #f1f5f9; background:${idx%2===0?'#fff':'#f8fafc'}">
                        <td style="padding:5px 0;">${i.ten_mon}${i.ghi_chu ? `<br><span style="font-size:9px;color:#94a3b8;font-style:italic;">${i.ghi_chu}</span>` : ''}</td>
                        <td style="text-align:center; font-weight:700;">${i.so_luong}</td>
                        <td style="text-align:right; color:#64748b;">${formatCurrency(i.gia)}</td>
                        <td style="text-align:right; font-weight:600;">${formatCurrency(i.gia * i.so_luong)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Tổng + Phương thức (2 cột) -->
        <div style="margin-top:10px; padding:10px 12px; background:#1e3a5f; border-radius:10px; display:flex; justify-content:space-between; align-items:center; color:white;">
            <span style="font-size:12px; font-weight:600;">TỔNG CỘNG</span>
            <span style="font-size:18px; font-weight:800;">${formatCurrency(total)}</span>
        </div>
        <div style="text-align:center; margin-top:6px; font-size:10px; color:#64748b;">Phương thức: <b>${methodText}</b></div>

        <!-- QR + Thông tin TK (2 cột cạnh nhau) -->
        <div style="margin-top:10px; border:2px dashed #93c5fd; border-radius:12px; padding:10px; background:#eff6ff; display:flex; align-items:center; gap:12px;">
            <img src="${qrUrl}" alt="QR" style="width:120px; height:120px; border-radius:8px; border:2px solid #bfdbfe; flex-shrink:0;">
            <div style="flex:1;">
                <div style="font-size:10px; font-weight:700; color:#1e40af; margin-bottom:4px;">QUÉT MÃ CHUYỂN KHOẢN</div>
                <div style="font-size:11px; font-weight:700; color:#1e40af;">🏦 Vietcombank</div>
                <div style="font-size:14px; font-weight:800; color:#1e3a5f; letter-spacing:1px;">1052053578</div>
                <div style="font-size:10px; color:#64748b;">NGUYEN HUYNH KY THUAT</div>
                <div style="font-size:9px; color:#94a3b8; margin-top:3px; font-style:italic;">Số tiền: ${formatCurrency(total)}</div>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center; margin-top:10px; padding-top:8px; border-top:1px dashed #e2e8f0; font-size:10px; color:#94a3b8;">
            🙏 Cảm ơn Quý khách! Hẹn gặp lại tại Ẩm Thực Phương Nam
        </div>
    `;
    
    document.getElementById('billModal').classList.add('flex');
    document.getElementById('billModal').classList.remove('hidden');
}

function closeBill() {
    document.getElementById('billModal').classList.add('hidden');
    document.getElementById('billModal').classList.remove('flex');
    // Reset state after checkout
    if (currentTable) {
        localStorage.removeItem(`draft_pos_${currentTable.ma_ban}`);
        localStorage.removeItem('pos_current_table_id');
    }
    currentTable = null;
    orderItems = [];
    activeOrderId = null;
    document.getElementById('active-table-title').textContent = 'CHƯA CHỌN BÀN';
    document.getElementById('selected-table-name').textContent = '-';
    showOrderPanel(false); // Back to placeholder
    updateOrderUI();
    loadInitialData(); // Refresh table statuses
    switchTab('tables');
}

function showOrderPanel(show) {
    const placeholder = document.getElementById('no-table-placeholder');
    const panel = document.getElementById('order-panel-content');
    if (show) {
        placeholder.classList.add('hidden');
        panel.classList.remove('hidden');
        panel.classList.add('flex');
    } else {
        placeholder.classList.remove('hidden');
        panel.classList.add('hidden');
        panel.classList.remove('flex');
    }
}

// --- UTILS ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function logout() {
    window.location.href = 'dang-nhap-admin.html';
}
