// Global cart variable
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Update cart badge
function updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
    }
}

// Add to cart function
function addToCart(productId) {
    // Sample product data - in real app, fetch from database
    const products = {
        1: { id: 1, name: 'Cá Lóc Nướng Trui', price: 200000, image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400' },
        2: { id: 2, name: 'Lẩu Mắm Miền Tây', price: 350000, image: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=400' },
        3: { id: 3, name: 'Gỏi Cuốn Tôm Thịt', price: 85000, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400' },
        4: { id: 4, name: 'Bánh Xèo Miền Tây', price: 120000, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' }
    };

    const product = products[productId];
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    
    // Show notification
    showNotification('Đã thêm vào giỏ hàng!', 'success');
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas fa-check-circle text-xl"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        });
    }

    // Chatbot toggle
    const chatbotBtn = document.getElementById('chatbot-btn');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChatbot = document.getElementById('close-chatbot');
    
    if (chatbotBtn && chatbotWindow) {
        chatbotBtn.addEventListener('click', () => {
            chatbotWindow.classList.toggle('hidden');
        });
    }
    
    if (closeChatbot && chatbotWindow) {
        closeChatbot.addEventListener('click', () => {
            chatbotWindow.classList.add('hidden');
        });
    }

    // Chatbot send message
    const sendMessageBtn = document.getElementById('send-message');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotMessages = document.getElementById('chatbot-messages');
    
    function sendMessage() {
        const message = chatbotInput.value.trim();
        if (!message) return;
        
        // Add user message
        const userMessage = document.createElement('div');
        userMessage.className = 'bg-orange-600 text-white rounded-lg p-3 mb-3 ml-12 shadow-sm';
        userMessage.innerHTML = `<p class="text-sm">${message}</p>`;
        chatbotMessages.appendChild(userMessage);
        
        chatbotInput.value = '';
        
        // Simulate bot response
        setTimeout(() => {
            const botMessage = document.createElement('div');
            botMessage.className = 'bg-white rounded-lg p-3 mb-3 mr-12 shadow-sm';
            botMessage.innerHTML = `<p class="text-sm text-gray-700">Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.</p>`;
            chatbotMessages.appendChild(botMessage);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }, 1000);
        
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    
    if (chatbotInput) {
        chatbotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Update cart badge on load
    updateCartBadge();
});

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    if (typeof renderCart === 'function') {
        renderCart();
    }
}

// Update quantity
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            localStorage.setItem('cart', JSON.stringify(cart));
            if (typeof renderCart === 'function') {
                renderCart();
            }
        }
    }
    updateCartBadge();
}
