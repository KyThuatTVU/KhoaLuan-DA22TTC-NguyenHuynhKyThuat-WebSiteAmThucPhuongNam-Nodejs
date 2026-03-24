// Countdown Timer Component
ComponentManager.register('countdown', (data = {}) => {
    const {
        endDate = new Date(Date.now() + 24 * 60 * 60 * 1000),
        title = 'Khuyến Mãi Kết Thúc Sau',
        color = 'orange'
    } = data;
    
    return `
        <div class="countdown-container text-center">
            ${title ? `<h3 class="text-2xl font-bold mb-6 text-gray-800">${title}</h3>` : ''}
            <div class="flex justify-center space-x-4" id="countdown-timer" data-end="${endDate}">
                <div class="countdown-item bg-${color}-600 text-white rounded-lg p-4 min-w-[80px]">
                    <div class="text-3xl font-bold" id="days">00</div>
                    <div class="text-sm">Ngày</div>
                </div>
                <div class="countdown-item bg-${color}-600 text-white rounded-lg p-4 min-w-[80px]">
                    <div class="text-3xl font-bold" id="hours">00</div>
                    <div class="text-sm">Giờ</div>
                </div>
                <div class="countdown-item bg-${color}-600 text-white rounded-lg p-4 min-w-[80px]">
                    <div class="text-3xl font-bold" id="minutes">00</div>
                    <div class="text-sm">Phút</div>
                </div>
                <div class="countdown-item bg-${color}-600 text-white rounded-lg p-4 min-w-[80px]">
                    <div class="text-3xl font-bold" id="seconds">00</div>
                    <div class="text-sm">Giây</div>
                </div>
            </div>
        </div>
    `;
});

// Social Share Component
ComponentManager.register('socialShare', (data = {}) => {
    const {
        url = window.location.href,
        title = document.title,
        description = ''
    } = data;
    
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDesc = encodeURIComponent(description);
    
    return `
        <div class="flex items-center space-x-3">
            <span class="text-gray-600 font-medium">Chia sẻ:</span>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" 
               target="_blank"
               class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition">
                <i class="fab fa-facebook-f"></i>
            </a>
            <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" 
               target="_blank"
               class="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition">
                <i class="fab fa-twitter"></i>
            </a>
            <a href="https://www.linkedin.com/shareArticle?url=${encodedUrl}&title=${encodedTitle}" 
               target="_blank"
               class="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center hover:bg-blue-800 transition">
                <i class="fab fa-linkedin-in"></i>
            </a>
            <button onclick="copyToClipboard('${url}')"
                    class="w-10 h-10 rounded-full bg-gray-600 text-white flex items-center justify-center hover:bg-gray-700 transition">
                <i class="fas fa-link"></i>
            </button>
        </div>
    `;
});

// Rating Component
ComponentManager.register('rating', (data = {}) => {
    const {
        rating = 0,
        maxRating = 5,
        size = 'text-xl',
        color = 'text-yellow-400',
        interactive = false,
        onChange = ''
    } = data;
    
    const stars = [];
    for (let i = 1; i <= maxRating; i++) {
        const filled = i <= rating;
        const half = i - 0.5 === rating;
        
        stars.push(`
            <i class="fas ${half ? 'fa-star-half-alt' : filled ? 'fa-star' : 'far fa-star'} 
                      ${size} ${filled || half ? color : 'text-gray-300'} 
                      ${interactive ? 'cursor-pointer hover:scale-110' : ''} transition"
               ${interactive ? `onclick="${onChange}(${i})"` : ''}></i>
        `);
    }
    
    return `<div class="rating-component inline-flex space-x-1">${stars.join('')}</div>`;
});

// Price Display Component
ComponentManager.register('priceDisplay', (data = {}) => {
    const {
        price = 0,
        oldPrice = null,
        currency = 'VND',
        size = 'text-2xl',
        showDiscount = true
    } = data;
    
    const formatPrice = (p) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(p);
    };
    
    const discount = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
    
    return `
        <div class="price-display flex items-center space-x-3">
            <span class="${size} font-bold text-orange-600">${formatPrice(price)}</span>
            ${oldPrice ? `
                <span class="text-gray-400 line-through text-lg">${formatPrice(oldPrice)}</span>
                ${showDiscount && discount > 0 ? `
                    <span class="bg-red-500 text-white px-2 py-1 rounded text-sm font-medium">-${discount}%</span>
                ` : ''}
            ` : ''}
        </div>
    `;
});

// Image Slider/Carousel Component
ComponentManager.register('carousel', (data = {}) => {
    const {
        images = [],
        autoplay = true,
        interval = 5000,
        height = 'h-96'
    } = data;
    
    return `
        <div class="carousel-container relative ${height} overflow-hidden rounded-xl" data-autoplay="${autoplay}" data-interval="${interval}">
            <div class="carousel-slides flex transition-transform duration-500 h-full" id="carousel-slides">
                ${images.map((img, index) => `
                    <div class="carousel-slide min-w-full h-full">
                        <img src="${img.url}" alt="${img.title || ''}" class="w-full h-full object-cover">
                        ${img.title || img.description ? `
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 text-white">
                                ${img.title ? `<h3 class="text-2xl font-bold mb-2">${img.title}</h3>` : ''}
                                ${img.description ? `<p class="text-sm">${img.description}</p>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <!-- Controls -->
            <button onclick="carouselPrev()" 
                    class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-100 w-12 h-12 rounded-full flex items-center justify-center transition">
                <i class="fas fa-chevron-left text-gray-800"></i>
            </button>
            <button onclick="carouselNext()" 
                    class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-100 w-12 h-12 rounded-full flex items-center justify-center transition">
                <i class="fas fa-chevron-right text-gray-800"></i>
            </button>
            
            <!-- Indicators -->
            <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                ${images.map((_, index) => `
                    <button onclick="carouselGoTo(${index})" 
                            class="carousel-indicator w-3 h-3 rounded-full bg-white ${index === 0 ? 'opacity-100' : 'opacity-50'} transition"></button>
                `).join('')}
            </div>
        </div>
    `;
});

// Video Player Component
ComponentManager.register('videoPlayer', (data = {}) => {
    const {
        videoUrl = '',
        thumbnail = '',
        title = '',
        autoplay = false,
        controls = true
    } = data;
    
    return `
        <div class="video-player relative rounded-xl overflow-hidden">
            <video class="w-full" 
                   ${controls ? 'controls' : ''} 
                   ${autoplay ? 'autoplay' : ''}
                   ${thumbnail ? `poster="${thumbnail}"` : ''}>
                <source src="${videoUrl}" type="video/mp4">
                Trình duyệt của bạn không hỗ trợ video.
            </video>
            ${title ? `
                <div class="p-4 bg-gray-50">
                    <h3 class="font-medium text-gray-800">${title}</h3>
                </div>
            ` : ''}
        </div>
    `;
});

// Search Bar Component
ComponentManager.register('searchBar', (data = {}) => {
    const {
        placeholder = 'Tìm kiếm...',
        size = 'md', // sm, md, lg
        onSubmit = 'handleSearch'
    } = data;
    
    const sizeClasses = {
        sm: 'py-2',
        md: 'py-3',
        lg: 'py-4'
    };
    
    return `
        <form onsubmit="${onSubmit}(event)" class="search-bar">
            <div class="relative">
                <input type="search" 
                       placeholder="${placeholder}"
                       class="w-full pl-12 pr-4 ${sizeClasses[size]} border rounded-full focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200">
                <button type="submit" class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-600">
                    <i class="fas fa-search"></i>
                </button>
            </div>
        </form>
    `;
});

// Utility Functions
let currentSlide = 0;
let carouselInterval;

window.carouselPrev = function() {
    const slides = document.getElementById('carousel-slides');
    const totalSlides = slides.children.length;
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateCarousel();
};

window.carouselNext = function() {
    const slides = document.getElementById('carousel-slides');
    const totalSlides = slides.children.length;
    currentSlide = (currentSlide + 1) % totalSlides;
    updateCarousel();
};

window.carouselGoTo = function(index) {
    currentSlide = index;
    updateCarousel();
};

function updateCarousel() {
    const slides = document.getElementById('carousel-slides');
    if (!slides) return;
    
    slides.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    // Update indicators
    const indicators = document.querySelectorAll('.carousel-indicator');
    indicators.forEach((ind, idx) => {
        ind.classList.toggle('opacity-100', idx === currentSlide);
        ind.classList.toggle('opacity-50', idx !== currentSlide);
    });
}

// Auto-play carousel
function initCarousel() {
    const container = document.querySelector('.carousel-container');
    if (!container) return;
    
    const autoplay = container.dataset.autoplay === 'true';
    const interval = parseInt(container.dataset.interval) || 5000;
    
    if (autoplay) {
        carouselInterval = setInterval(carouselNext, interval);
        
        // Pause on hover
        container.addEventListener('mouseenter', () => clearInterval(carouselInterval));
        container.addEventListener('mouseleave', () => {
            carouselInterval = setInterval(carouselNext, interval);
        });
    }
}

// Copy to clipboard
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Đã sao chép liên kết!', 'success');
    });
};

// Initialize countdown
function initCountdown() {
    const timer = document.getElementById('countdown-timer');
    if (!timer) return;
    
    const endDate = new Date(timer.dataset.end);
    
    setInterval(() => {
        const now = new Date();
        const diff = endDate - now;
        
        if (diff <= 0) {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('days').textContent = String(days).padStart(2, '0');
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    }, 1000);
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initCarousel();
        initCountdown();
    }, 100);
});
