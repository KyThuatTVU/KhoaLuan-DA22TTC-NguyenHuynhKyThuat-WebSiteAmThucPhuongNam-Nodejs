// Chatbot Component
ComponentManager.register('chatbot', () => {
    return `
        <!-- Chatbot Button -->
        <button id="chatbot-btn" class="fixed bottom-6 right-6 bg-orange-600 text-white w-16 h-16 rounded-full shadow-lg hover:bg-orange-700 transition flex items-center justify-center z-40">
            <i class="fas fa-comment-dots text-2xl"></i>
        </button>

        <!-- Chatbot Window -->
        <div id="chatbot-window" class="fixed bottom-24 right-6 w-96 bg-white rounded-lg shadow-2xl hidden z-40">
            <div class="bg-orange-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <i class="fas fa-robot text-orange-600"></i>
                    </div>
                    <div>
                        <h3 class="font-medium">Trợ lý ảo</h3>
                        <p class="text-xs opacity-90">Đang online</p>
                    </div>
                </div>
                <button id="close-chatbot" class="text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="chatbot-messages" class="h-96 overflow-y-auto p-4 bg-gray-50">
                <div class="bg-white rounded-lg p-3 mb-3 shadow-sm">
                    <p class="text-sm text-gray-700">Xin chào! Tôi là trợ lý ảo của Phương Nam. Tôi có thể giúp gì cho bạn?</p>
                </div>
                <div class="flex justify-center my-3">
                    <div class="flex flex-wrap gap-2 max-w-xs">
                        <button onclick="sendQuickReply('Xem thực đơn')" class="bg-orange-100 text-orange-600 px-3 py-2 rounded-full text-sm hover:bg-orange-200 transition">
                            🍽️ Xem thực đơn
                        </button>
                        <button onclick="sendQuickReply('Đặt bàn')" class="bg-orange-100 text-orange-600 px-3 py-2 rounded-full text-sm hover:bg-orange-200 transition">
                            📅 Đặt bàn
                        </button>
                        <button onclick="sendQuickReply('Khuyến mãi')" class="bg-orange-100 text-orange-600 px-3 py-2 rounded-full text-sm hover:bg-orange-200 transition">
                            🎁 Khuyến mãi
                        </button>
                    </div>
                </div>
            </div>
            <div class="p-4 border-t">
                <div class="flex space-x-2">
                    <input type="text" id="chatbot-input" placeholder="Nhập tin nhắn..." class="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-orange-600">
                    <button id="send-message" class="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
});

// Initialize chatbot functionality
function initChatbot() {
    const chatbotBtn = document.getElementById('chatbot-btn');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChatbot = document.getElementById('close-chatbot');
    const sendMessageBtn = document.getElementById('send-message');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotMessages = document.getElementById('chatbot-messages');
    
    if (chatbotBtn) {
        chatbotBtn.addEventListener('click', () => {
            chatbotWindow.classList.toggle('hidden');
        });
    }
    
    if (closeChatbot) {
        closeChatbot.addEventListener('click', () => {
            chatbotWindow.classList.add('hidden');
        });
    }
    
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
            const response = getBotResponse(message);
            const botMessage = document.createElement('div');
            botMessage.className = 'bg-white rounded-lg p-3 mb-3 mr-12 shadow-sm';
            botMessage.innerHTML = `<p class="text-sm text-gray-700">${response}</p>`;
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
}

// Bot responses
function getBotResponse(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('menu') || msg.includes('thực đơn') || msg.includes('món')) {
        return 'Bạn có thể xem thực đơn đầy đủ tại <a href="thuc-don.html" class="text-orange-600 underline">đây</a>. Chúng tôi có nhiều món đặc sản miền Tây như cá lóc nướng, lẩu mắm, bánh xèo...';
    } else if (msg.includes('đặt bàn') || msg.includes('booking') || msg.includes('book')) {
        return 'Bạn có thể đặt bàn trực tuyến tại <a href="dat-ban.html" class="text-orange-600 underline">đây</a> hoặc gọi hotline: 0123 456 789';
    } else if (msg.includes('giá') || msg.includes('price') || msg.includes('tiền')) {
        return 'Giá các món ăn dao động từ 50.000đ đến 500.000đ. Xem chi tiết tại trang thực đơn.';
    } else if (msg.includes('giờ') || msg.includes('mở cửa') || msg.includes('open')) {
        return 'Nhà hàng mở cửa từ 10:00 - 22:00 hàng ngày, kể cả cuối tuần và lễ tết.';
    } else if (msg.includes('địa chỉ') || msg.includes('address') || msg.includes('ở đâu')) {
        return 'Nhà hàng tại: 123 Đường ABC, Phường 1, TP. Vĩnh Long. <a href="lien-he.html" class="text-orange-600 underline">Xem bản đồ</a>';
    } else if (msg.includes('khuyến mãi') || msg.includes('giảm giá') || msg.includes('promotion')) {
        return 'Hiện tại chúng tôi có giảm giá 20% cho các món đặc sản vào cuối tuần. Xem thêm tại <a href="tin-tuc.html" class="text-orange-600 underline">trang tin tức</a>.';
    } else if (msg.includes('giao hàng') || msg.includes('delivery') || msg.includes('ship')) {
        return 'Chúng tôi có dịch vụ giao hàng miễn phí trong bán kính 5km. Phí ship ngoài khu vực là 30.000đ.';
    } else {
        return 'Cảm ơn bạn đã liên hệ! Bạn có thể hỏi tôi về thực đơn, đặt bàn, giờ mở cửa, địa chỉ, hoặc khuyến mãi.';
    }
}

// Quick reply function
window.sendQuickReply = function(message) {
    const chatbotInput = document.getElementById('chatbot-input');
    if (chatbotInput) {
        chatbotInput.value = message;
        document.getElementById('send-message').click();
    }
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initChatbot, 100);
});
