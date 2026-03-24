// Dashboard data loader with proper authentication and error handling

// Load dashboard data with authentication
async function loadDashboardDataWithAuth() {
    try {
        const API_URL = 'http://localhost:3000/api';

        // First check if user is authenticated
        console.log('1. Checking authentication...');
        const authResponse = await fetch('http://localhost:3000/api/admin-auth/check-session', {
            credentials: 'include'
        });

        if (!authResponse.ok) {
            console.error('Authentication check failed with status:', authResponse.status);
            window.location.href = '/admin/dang-nhap-admin.html?error=session_expired';
            return;
        }

        const authResult = await authResponse.json();
        console.log('2. Auth result:', authResult);

        if (!authResult.isAuthenticated) {
            console.error('Not authenticated, redirecting to login...');
            window.location.href = '/admin/dang-nhap-admin.html?error=session_expired';
            return;
        }

        // Now fetch dashboard data
        console.log('3. Fetching dashboard data...');
        const response = await fetch(`${API_URL}/stats/dashboard`, {
            credentials: 'include'
        });

        console.log('4. Dashboard response status:', response.status);

        // Check if response is OK (status 200-299)
        if (!response.ok) {
            if (response.status === 401) {
                console.error('Unauthorized, redirecting to login...');
                window.location.href = '/admin/dang-nhap-admin.html?error=unauthorized';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        console.log('5. Response content-type:', contentType);

        if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            console.error('Response is not JSON, received:', textResponse.substring(0, 200));
            throw new Error('Server returned non-JSON response');
        }

        const result = await response.json();
        console.log('6. Dashboard data received:', result);

        if (result.success && result.data) {
            const data = result.data;

            // Update Stats Cards
            document.getElementById('revenue-today').textContent = new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(data.stats.revenueToday || 0);

            document.getElementById('orders-count').textContent = data.stats.ordersToday || 0;
            document.getElementById('reservations-count').textContent = data.stats.reservationsToday || 0;
            document.getElementById('customers-count').textContent = data.stats.newCustomersMonth || 0;

            console.log('7. Stats updated successfully');

            // Load recent orders with real data
            if (data.recentOrders && data.recentOrders.length > 0) {
                loadRecentOrdersWithRealData(data.recentOrders);
            }

            //Load top products with real data
            if (data.topProducts && data.topProducts.length > 0) {
                loadTopProductsWithRealData(data.topProducts);
            }

            // Initialize charts with real data
            if (data.charts) {
                initChartsWithRealData(data.charts);
            }

            console.log('✅ Dashboard loaded successfully!');
        } else {
            throw new Error(result.message || 'Failed to load dashboard data');
        }
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        // Show user-friendly error
        const errorMsg = 'Không thể tải dữ liệu dashboard. Vui lòng thử đăng nhập lại!';

        // Display error in the orders table
        const tbody = document.getElementById('recent-orders');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>${errorMsg}</p>
            </td></tr>`;
        }

        // Optionally show alert
        // alert(errorMsg);
    }
}

// Helper function to load orders with real data
function loadRecentOrdersWithRealData(orders) {
    const tbody = document.getElementById('recent-orders');
    if (!tbody) return;

    tbody.innerHTML = orders.map(order => {
        const statusColors = {
            'pending': 'bg-yellow-100 text-yellow-700',
            'confirmed': 'bg-blue-100 text-blue-700',
            'preparing': 'bg-purple-100 text-purple-700',
            'delivered': 'bg-green-100 text-green-700',
            'cancelled': 'bg-red-100 text-red-700'
        };

        const statusTexts = {
            'pending': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'preparing': 'Đang chuẩn bị',
            'delivered': 'Đã giao',
            'cancelled': 'Đã hủy'
        };

        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3 text-sm">#${order.ma_don_hang}</td>
                <td class="py-3 text-sm">${order.ten_khach || 'Khách vãng lai'}</td>
                <td class="py-3 text-sm font-medium">${new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(order.tong_tien)}</td>
                <td class="py-3">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.trang_thai] || 'bg-gray-100 text-gray-700'}">
                        ${statusTexts[order.trang_thai] || order.trang_thai}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Helper function to load top products with real data
function loadTopProductsWithRealData(products) {
    const container = document.getElementById('top-products');
    if (!container) return;

    container.innerHTML = products.map(product => {
        // Xử lý đường dẫn ảnh - nếu đã có /images thì không thêm nữa
        let imagePath = product.anh_mon || '';
        if (imagePath && !imagePath.startsWith('http')) {
            imagePath = imagePath.startsWith('/images') 
                ? `http://localhost:3000${imagePath}` 
                : `http://localhost:3000/images/${imagePath}`;
        }
        
        return `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center space-x-3">
                <img src="${imagePath || 'https://via.placeholder.com/150'}" 
                     alt="${product.ten_mon}" class="w-14 h-14 rounded-lg object-cover"
                     onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
                <div>
                    <p class="font-medium text-sm">${product.ten_mon}</p>
                    <p class="text-xs text-gray-500">${product.da_ban} đã bán</p>
                </div>
            </div>
            <p class="font-bold text-orange-600">${new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(product.gia_tien)}</p>
        </div>
    `;
    }).join('');
}

// Global chart instances
let revenueChartInstance = null;
let ordersChartInstance = null;

// Helper function to initialize charts with real data
function initChartsWithRealData(chartData) {
    if (!chartData) return;

    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        // Destroy existing chart if it exists
        if (revenueChartInstance) {
            revenueChartInstance.destroy();
            revenueChartInstance = null;
        }
        
        // Also check if Chart.js has a chart attached to this canvas
        const existingChart = Chart.getChart(revenueCtx);
        if (existingChart) {
            existingChart.destroy();
        }

        const ctx = revenueCtx.getContext('2d');
        const revenueLabels = chartData.revenue.map(item =>
            new Date(item.date).toLocaleDateString('vi-VN', { weekday: 'short' })
        );
        const revenueValues = chartData.revenue.map(item => item.total / 1000000); // Convert to millions

        revenueChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: revenueLabels,
                datasets: [{
                    label: 'Doanh thu (triệu đồng)',
                    data: revenueValues,
                    borderColor: '#ea580c',
                    backgroundColor: 'rgba(234, 88, 12, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Orders Chart
    const ordersCtx = document.getElementById('ordersChart');
    if (ordersCtx && chartData.orderStatus && chartData.orderStatus.length > 0) {
        // Destroy existing chart if it exists
        if (ordersChartInstance) {
            ordersChartInstance.destroy();
            ordersChartInstance = null;
        }
        
        // Also check if Chart.js has a chart attached to this canvas
        const existingChart = Chart.getChart(ordersCtx);
        if (existingChart) {
            existingChart.destroy();
        }

        const ctx = ordersCtx.getContext('2d');
        const statusTexts = {
            'pending': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'preparing': 'Đang chuẩn bị',
            'delivered': 'Đã giao',
            'cancelled': 'Đã hủy'
        };

        const statusColors = {
            'pending': '#f59e0b',
            'confirmed': '#3b82f6',
            'preparing': '#8b5cf6',
            'delivered': '#10b981',
            'cancelled': '#ef4444'
        };

        const statusLabels = chartData.orderStatus.map(item =>
            statusTexts[item.trang_thai] || item.trang_thai
        );
        const statusValues = chartData.orderStatus.map(item => item.count);
        const colors = chartData.orderStatus.map(item =>
            statusColors[item.trang_thai] || '#9ca3af'
        );

        ordersChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: statusLabels,
                datasets: [{
                    data: statusValues,
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
}

// Replace the original loadDashboardData function when the page loads
if (typeof loadDashboardData !== 'undefined') {
    // Override the existing function
    console.log('Overriding loadDashboardData with authenticated version');
    window.loadDashboardData = loadDashboardDataWithAuth;
}

// Auto-load on page ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('Dashboard loader script initialized');
    // Call after a short delay to ensure all other scripts are loaded
    setTimeout(() => {
        if (document.getElementById('revenue-today')) {
            console.log('Loading dashboard data...');
            loadDashboardDataWithAuth();
        }
    }, 500);
});
