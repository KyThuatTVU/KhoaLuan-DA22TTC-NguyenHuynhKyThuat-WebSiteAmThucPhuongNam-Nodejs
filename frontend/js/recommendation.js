/**
 * ML Recommendation System - Frontend
 * Hệ thống gợi ý món ăn sử dụng Machine Learning
 */

const RecommendationSystem = {
    API_BASE: 'http://localhost:3000/api/recommendations',
    
    // Lấy token từ localStorage
    getAuthHeader() {
        const token = localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },
    
    /**
     * Lấy gợi ý tổng hợp cho user
     */
    async getRecommendations(limit = 8) {
        try {
            const response = await fetch(`${this.API_BASE}?limit=${limit}`, {
                headers: this.getAuthHeader()
            });
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            return [];
        }
    },
    
    /**
     * Lấy gợi ý món kèm theo (cho giỏ hàng)
     */
    async getPairingRecommendations(dishIds) {
        try {
            const response = await fetch(`${this.API_BASE}/pairing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader()
                },
                body: JSON.stringify({ dish_ids: dishIds })
            });
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Error fetching pairing recommendations:', error);
            return [];
        }
    },
    
    /**
     * Lấy gợi ý từ tin nhắn chat
     */
    async getChatRecommendations(message) {
        try {
            const response = await fetch(`${this.API_BASE}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader()
                },
                body: JSON.stringify({ message })
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error fetching chat recommendations:', error);
            return { success: false, data: [] };
        }
    },
    
    /**
     * Lấy món trending
     */
    async getTrending(limit = 5) {
        try {
            const response = await fetch(`${this.API_BASE}/trending?limit=${limit}`);
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Error fetching trending:', error);
            return [];
        }
    },
    
    /**
     * Lấy món đánh giá cao
     */
    async getTopRated(limit = 5) {
        try {
            const response = await fetch(`${this.API_BASE}/top-rated?limit=${limit}`);
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Error fetching top rated:', error);
            return [];
        }
    },
    
    /**
     * Lấy profile sở thích user
     */
    async getUserProfile() {
        try {
            const response = await fetch(`${this.API_BASE}/user-profile`, {
                headers: this.getAuthHeader()
            });
            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },
    
    /**
     * Track user interaction
     */
    async trackInteraction(dishId, action) {
        try {
            await fetch(`${this.API_BASE}/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader()
                },
                body: JSON.stringify({ dish_id: dishId, action })
            });
        } catch (error) {
            // Silent fail for tracking
        }
    },
    
    /**
     * Render recommendation card
     */
    renderCard(dish) {
        let imagePath = dish.anh_mon || 'default-food.jpg';
        if (!imagePath.startsWith('http') && !imagePath.startsWith('/images/')) {
            imagePath = '/images/' + imagePath.replace(/^\/+/, '');
        }
        const imageUrl = imagePath.startsWith('http') ? imagePath : `http://localhost:3000${imagePath}`;
        
        // Xử lý giá an toàn - tránh NaN
        const priceValue = dish.gia_tien ? parseFloat(dish.gia_tien) : 0;
        const price = !isNaN(priceValue) ? new Intl.NumberFormat('vi-VN').format(priceValue) : 'Liên hệ';
        
        // Xử lý rating an toàn
        const ratingValue = dish.avg_rating ? parseFloat(dish.avg_rating) : 0;
        const rating = !isNaN(ratingValue) ? ratingValue.toFixed(1) : '0';
        
        // Badge theo loại recommendation
        let badge = '';
        switch (dish.recommendation_type) {
            case 'chat_based':
                badge = '<span class="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs">💬 Từ chat</span>';
                break;
            case 'collaborative':
                badge = '<span class="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs">👥 Gợi ý</span>';
                break;
            case 'content_based':
                badge = '<span class="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">❤️ Phù hợp</span>';
                break;
            case 'pairing':
                badge = '<span class="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs">🍽️ Kết hợp</span>';
                break;
            case 'trending':
                badge = '<span class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">🔥 Hot</span>';
                break;
            case 'top_rated':
                badge = '<span class="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs">⭐ Top</span>';
                break;
        }
        
        return `
            <div class="recommendation-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" 
                 onclick="RecommendationSystem.trackInteraction(${dish.ma_mon}, 'view')">
                <a href="chitietmonan.html?id=${dish.ma_mon}" class="block">
                    <div class="relative bg-gray-50">
                        <img src="${imageUrl}" alt="${dish.ten_mon}"
                            class="w-full h-40 object-cover"
                            onerror="this.src='images/default-food.jpg'">
                        ${badge}
                    </div>
                </a>
                <div class="p-3">
                    <a href="chitietmonan.html?id=${dish.ma_mon}">
                        <h3 class="font-medium text-sm mb-1 text-gray-800 hover:text-orange-600 transition line-clamp-1">${dish.ten_mon}</h3>
                    </a>
                    ${dish.reason ? `<p class="text-xs text-gray-500 mb-2 line-clamp-1">${dish.reason}</p>` : ''}
                    <div class="flex items-center justify-between">
                        <span class="text-orange-600 font-bold text-sm">${price}đ</span>
                        <button onclick="event.preventDefault(); event.stopPropagation(); addToCartFromRecommendation(${dish.ma_mon}, '${dish.ten_mon.replace(/'/g, "\\'")}', ${priceValue}, '${imageUrl}')"
                            class="bg-orange-500 text-white w-7 h-7 rounded-full hover:bg-orange-600 transition text-xs">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Render danh sách recommendations
     */
    renderList(dishes, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (dishes.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-4">Chưa có gợi ý</p>';
            return;
        }
        
        container.innerHTML = dishes.map(dish => this.renderCard(dish)).join('');
    },
    
    /**
     * Render gợi ý trong chatbot
     */
    renderChatRecommendations(dishes) {
        if (dishes.length === 0) return '';
        
        let html = '<div class="mt-3 space-y-2">';
        html += '<p class="text-xs text-gray-500 font-medium">🍽️ Gợi ý cho bạn:</p>';
        html += '<div class="flex gap-2 overflow-x-auto pb-2">';
        
        for (const dish of dishes.slice(0, 3)) {
            let imagePath = dish.anh_mon || 'default-food.jpg';
            if (!imagePath.startsWith('http') && !imagePath.startsWith('/images/')) {
                imagePath = '/images/' + imagePath.replace(/^\/+/, '');
            }
            const imageUrl = imagePath.startsWith('http') ? imagePath : `http://localhost:3000${imagePath}`;
            
            // Xử lý giá an toàn
            const priceValue = dish.gia_tien ? parseFloat(dish.gia_tien) : 0;
            const price = !isNaN(priceValue) ? new Intl.NumberFormat('vi-VN').format(priceValue) : 'Liên hệ';
            
            html += `
                <a href="chitietmonan.html?id=${dish.ma_mon}" 
                   class="flex-shrink-0 w-32 bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition">
                    <img src="${imageUrl}" alt="${dish.ten_mon}" class="w-full h-20 object-cover" onerror="this.src='images/default-food.jpg'">
                    <div class="p-2">
                        <p class="text-xs font-medium text-gray-800 line-clamp-1">${dish.ten_mon}</p>
                        <p class="text-xs text-orange-600 font-bold">${price}đ</p>
                    </div>
                </a>
            `;
        }
        
        html += '</div></div>';
        return html;
    }
};

// Helper function để thêm vào giỏ hàng từ recommendation
function addToCartFromRecommendation(id, name, price, image) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Track interaction
    RecommendationSystem.trackInteraction(id, 'add_cart');
    
    // Update cart badge
    if (typeof updateCartBadge === 'function') {
        updateCartBadge();
    }
    
    // Show notification
    if (typeof showNotification === 'function') {
        showNotification('Đã thêm vào giỏ hàng!', 'success');
    }
}

// Export for use in other files
window.RecommendationSystem = RecommendationSystem;
