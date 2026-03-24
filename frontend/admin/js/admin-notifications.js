// Admin Notification Manager
const AdminNotificationManager = {
    API_URL: 'http://localhost:3000/api/admin/notifications',
    pollInterval: null,
    
    // Khởi tạo
    init() {
        console.log('🔔 Initializing Admin Notification Manager...');
        this.showNotificationUI();
        this.loadNotifications();
        this.setupEventListeners();
        this.startPolling();
    },
    
    // Hiển thị UI thông báo
    showNotificationUI() {
        const container = document.getElementById('admin-notification-container');
        if (container) {
            container.classList.remove('hidden');
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        console.log('🔔 Setting up admin notification event listeners...');
        
        // Desktop notification button
        const notifBtn = document.getElementById('admin-notification-btn');
        const dropdown = document.getElementById('admin-notification-dropdown');
        
        if (notifBtn && dropdown) {
            // Remove old listeners by cloning
            const newNotifBtn = notifBtn.cloneNode(true);
            notifBtn.parentNode.replaceChild(newNotifBtn, notifBtn);
            
            newNotifBtn.addEventListener('click', (e) => {
                console.log('🔔 Admin notification button clicked!');
                e.preventDefault();
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });
            
            console.log('✅ Admin notification button listener attached');
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const currentDropdown = document.getElementById('admin-notification-dropdown');
            if (currentDropdown && !currentDropdown.contains(e.target) && 
                !e.target.closest('#admin-notification-btn')) {
                currentDropdown.classList.add('hidden');
            }
        });
        
        // Mark all as read button
        const markAllBtn = document.getElementById('admin-mark-all-read-btn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllAsRead());
        }
    },
    
    // Load thông báo
    async loadNotifications() {
        try {
            const response = await fetch(`${this.API_URL}?limit=10`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                this.renderNotifications(result.data);
                this.updateBadge(result.unreadCount);
            }
        } catch (error) {
            console.error('Error loading admin notifications:', error);
        }
    },
    
    // Render danh sách thông báo
    renderNotifications(notifications) {
        const list = document.getElementById('admin-notification-list');
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
        list.querySelectorAll('.admin-notification-item').forEach(item => {
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
            <div class="admin-notification-item px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 ${unreadClass}" 
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
            new_order: { icon: 'fas fa-shopping-bag', bgColor: 'bg-green-100', textColor: 'text-green-600' },
            new_reservation: { icon: 'fas fa-calendar-check', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
            new_comment: { icon: 'fas fa-comment', bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
            new_review: { icon: 'fas fa-star', bgColor: 'bg-yellow-100', textColor: 'text-yellow-600' },
            new_user: { icon: 'fas fa-user-plus', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600' },
            contact_message: { icon: 'fas fa-envelope', bgColor: 'bg-pink-100', textColor: 'text-pink-600' },
            comment_like: { icon: 'fas fa-heart', bgColor: 'bg-red-100', textColor: 'text-red-600' },
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
        const badge = document.getElementById('admin-notification-badge');
        
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    },
    
    // Đánh dấu đã đọc
    async markAsRead(id, link) {
        console.log('🔔 markAsRead called with id:', id, 'link:', link);
        try {
            await fetch(`${this.API_URL}/${id}/read`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            // Reload notifications
            this.loadNotifications();
            
            // Navigate to link if exists
            if (link) {
                console.log('🔗 Navigating to:', link);
                // Check if link starts with ../ (relative to parent directory)
                if (link.startsWith('../')) {
                    // Remove ../ and navigate from root
                    const cleanLink = link.replace('../', '/');
                    console.log('🔗 Clean link (from ../): ', cleanLink);
                    window.location.href = cleanLink;
                } else if (link.startsWith('http')) {
                    // Absolute URL
                    console.log('🔗 Absolute URL');
                    window.location.href = link;
                } else {
                    // Relative link within admin folder
                    console.log('🔗 Relative link within admin folder');
                    window.location.href = link;
                }
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
                credentials: 'include'
            });
            
            this.loadNotifications();
            alert('Đã đánh dấu tất cả đã đọc');
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
                credentials: 'include'
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

// Export for global access
window.AdminNotificationManager = AdminNotificationManager;
