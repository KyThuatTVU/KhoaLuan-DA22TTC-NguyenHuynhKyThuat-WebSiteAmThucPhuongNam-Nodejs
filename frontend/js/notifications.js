// Notification Manager for User
const NotificationManager = {
    API_URL: 'http://localhost:3000/api/notifications',
    pollInterval: null,
    
    // Khởi tạo
    init() {
        console.log('🔔 NotificationManager.init() called');
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        console.log('🔔 Token exists:', !!token);
        
        if (!token) {
            console.log('🔔 No token, hiding notification UI');
            this.hideNotificationUI();
            return;
        }
        
        console.log('🔔 Token found, showing notification UI');
        this.showNotificationUI();
        this.loadNotifications();
        this.setupEventListeners();
        this.startPolling();
    },
    
    // Hiển thị UI thông báo
    showNotificationUI() {
        const container = document.getElementById('notification-container');
        const mobileBtn = document.getElementById('notification-btn-mobile');
        
        if (container) container.classList.remove('hidden');
        if (mobileBtn) mobileBtn.classList.remove('hidden');
    },
    
    // Ẩn UI thông báo
    hideNotificationUI() {
        const container = document.getElementById('notification-container');
        const mobileBtn = document.getElementById('notification-btn-mobile');
        
        if (container) container.classList.add('hidden');
        if (mobileBtn) mobileBtn.classList.add('hidden');
    },
    
    // Setup event listeners
    setupEventListeners() {
        console.log('🔔 Setting up notification event listeners...');
        
        // Desktop notification button
        const notifBtn = document.getElementById('notification-btn');
        const dropdown = document.getElementById('notification-dropdown');
        
        console.log('🔔 Desktop button:', notifBtn ? 'found' : 'not found');
        console.log('🔔 Dropdown:', dropdown ? 'found' : 'not found');
        
        if (notifBtn && dropdown) {
            // Remove old listeners by cloning
            const newNotifBtn = notifBtn.cloneNode(true);
            notifBtn.parentNode.replaceChild(newNotifBtn, notifBtn);
            
            newNotifBtn.addEventListener('click', (e) => {
                console.log('🔔 Desktop notification button clicked!');
                e.preventDefault();
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });
            
            console.log('✅ Desktop notification button listener attached');
        }
        
        // Mobile notification button
        const mobileBtn = document.getElementById('notification-btn-mobile');
        console.log('🔔 Mobile button:', mobileBtn ? 'found' : 'not found');
        
        if (mobileBtn && dropdown) {
            // Remove old listeners by cloning
            const newMobileBtn = mobileBtn.cloneNode(true);
            mobileBtn.parentNode.replaceChild(newMobileBtn, mobileBtn);
            
            newMobileBtn.addEventListener('click', (e) => {
                console.log('🔔 Mobile notification button clicked!');
                e.preventDefault();
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });
            
            console.log('✅ Mobile notification button listener attached');
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const currentDropdown = document.getElementById('notification-dropdown');
            const currentNotifBtn = document.getElementById('notification-btn');
            const currentMobileBtn = document.getElementById('notification-btn-mobile');
            
            if (currentDropdown && !currentDropdown.contains(e.target) && 
                !e.target.closest('#notification-btn') && 
                !e.target.closest('#notification-btn-mobile')) {
                currentDropdown.classList.add('hidden');
            }
        });
        
        // Mark all as read button
        const markAllBtn = document.getElementById('mark-all-read-btn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllAsRead());
        }
    },
    
    // Lấy headers với token
    getHeaders() {
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    },
    
    // Load thông báo
    async loadNotifications() {
        try {
            const response = await fetch(`${this.API_URL}?limit=10`, {
                headers: this.getHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.renderNotifications(result.data);
                this.updateBadge(result.unreadCount);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    },
    
    // Render danh sách thông báo
    renderNotifications(notifications) {
        const list = document.getElementById('notification-list');
        if (!list) return;
        
        if (!notifications || notifications.length === 0) {
            list.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-bell-slash text-3xl mb-2"></i>
                    <p class="text-sm">Chưa có thông báo</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = notifications.map(notif => this.renderNotificationItem(notif)).join('');
        
        // Add click handlers
        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const link = item.dataset.link;
                this.markAsRead(id, link);
            });
        });
    },
    
    // Render một item thông báo
    renderNotificationItem(notif) {
        const icon = this.getNotificationIcon(notif.loai);
        const timeAgo = this.getTimeAgo(notif.ngay_tao);
        const unreadClass = notif.da_doc ? '' : 'bg-orange-50';
        
        return `
            <div class="notification-item px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 ${unreadClass}" 
                 data-id="${notif.ma_thong_bao}" 
                 data-link="${notif.duong_dan || ''}">
                <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0 w-10 h-10 rounded-full ${icon.bgColor} flex items-center justify-center">
                        <i class="${icon.icon} ${icon.textColor}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-800 ${notif.da_doc ? '' : 'font-semibold'}">${notif.tieu_de}</p>
                        <p class="text-xs text-gray-500 mt-1 line-clamp-2">${notif.noi_dung || ''}</p>
                        <p class="text-xs text-gray-400 mt-1">${timeAgo}</p>
                    </div>
                    ${!notif.da_doc ? '<div class="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>' : ''}
                </div>
            </div>
        `;
    },
    
    // Lấy icon theo loại thông báo
    getNotificationIcon(type) {
        const icons = {
            news: { icon: 'fas fa-newspaper', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
            promo: { icon: 'fas fa-tag', bgColor: 'bg-green-100', textColor: 'text-green-600' },
            comment_reply: { icon: 'fas fa-reply', bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
            comment_like: { icon: 'fas fa-heart', bgColor: 'bg-red-100', textColor: 'text-red-600' },
            order_status: { icon: 'fas fa-shopping-bag', bgColor: 'bg-orange-100', textColor: 'text-orange-600' },
            system: { icon: 'fas fa-bell', bgColor: 'bg-gray-100', textColor: 'text-gray-600' }
        };
        return icons[type] || icons.system;
    },
    
    // Tính thời gian trước
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Vừa xong';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
        
        return date.toLocaleDateString('vi-VN');
    },
    
    // Cập nhật badge
    updateBadge(count) {
        const badge = document.getElementById('notification-badge');
        const badgeMobile = document.getElementById('notification-badge-mobile');
        
        [badge, badgeMobile].forEach(b => {
            if (b) {
                if (count > 0) {
                    b.textContent = count > 99 ? '99+' : count;
                    b.classList.remove('hidden');
                } else {
                    b.classList.add('hidden');
                }
            }
        });
    },
    
    // Đánh dấu đã đọc
    async markAsRead(id, link) {
        try {
            await fetch(`${this.API_URL}/${id}/read`, {
                method: 'PUT',
                headers: this.getHeaders()
            });
            
            // Reload notifications
            this.loadNotifications();
            
            // Navigate to link if exists
            if (link) {
                window.location.href = link;
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },
    
    // Đánh dấu tất cả đã đọc
    async markAllAsRead() {
        try {
            await fetch(`${this.API_URL}/read-all`, {
                method: 'PUT',
                headers: this.getHeaders()
            });
            
            this.loadNotifications();
            showNotification('Đã đánh dấu tất cả đã đọc', 'success');
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    },
    
    // Polling để cập nhật thông báo mới
    startPolling() {
        // Poll every 30 seconds
        this.pollInterval = setInterval(() => {
            this.checkNewNotifications();
        }, 30000);
    },
    
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    },
    
    // Kiểm tra thông báo mới
    async checkNewNotifications() {
        try {
            const response = await fetch(`${this.API_URL}/unread-count`, {
                headers: this.getHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.updateBadge(result.count);
            }
        } catch (error) {
            console.error('Error checking new notifications:', error);
        }
    }
};

// Re-initialize when user logs in
window.addEventListener('storage', (e) => {
    if (e.key === 'token') {
        if (e.newValue) {
            NotificationManager.init();
        } else {
            NotificationManager.hideNotificationUI();
            NotificationManager.stopPolling();
        }
    }
});

// Export for global access
window.NotificationManager = NotificationManager;
