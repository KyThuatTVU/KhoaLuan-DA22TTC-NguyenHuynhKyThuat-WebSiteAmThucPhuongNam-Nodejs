// API Configuration
if (typeof window.API_URL === 'undefined') {
    window.API_URL = 'http://localhost:3000/api';
}

// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

let currentProduct = null;
let relatedProducts = [];

// Format price - xử lý an toàn tránh NaN
function formatPrice(price) {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numPrice);
}

// Fetch product detail
async function fetchProductDetail() {
    if (!productId) {
        console.warn('⚠️ Không có product ID, chuyển về trang thực đơn');
        window.location.href = 'thuc-don.html';
        return;
    }

    try {
        console.log('🔍 Đang tải chi tiết món ăn ID:', productId);
        showLoading();
        
        const url = `${window.API_URL}/menu/${productId}`;
        console.log('📡 API URL:', url);
        
        const response = await fetch(url);
        const result = await response.json();
        
        console.log('📦 Dữ liệu nhận được:', result);
        
        if (result.success) {
            currentProduct = result.data;
            console.log('✅ Món ăn:', currentProduct.ten_mon);
            console.log('💰 Giá:', currentProduct.gia_tien);
            console.log('🖼️ Ảnh:', currentProduct.anh_mon);
            console.log('📦 Tồn kho:', currentProduct.so_luong_ton, currentProduct.don_vi_tinh);
            
            renderProductDetail();
            fetchRelatedProducts(currentProduct.ma_danh_muc);
            fetchProductImages();
            fetchReviews();
            checkCanReview();
        } else {
            console.error('❌ API trả về lỗi:', result);
            showError();
        }
    } catch (error) {
        console.error('❌ Lỗi khi tải chi tiết món ăn:', error);
        showError();
    }
}

// Fetch product images
async function fetchProductImages() {
    try {
        console.log('🔍 Đang tải ảnh món ăn ID:', productId);
        
        const response = await fetch(`${window.API_URL}/albums/product/${productId}`);
        const result = await response.json();
        
        console.log('📦 Ảnh món ăn:', result);
        
        if (result.success && result.data.length > 0) {
            console.log('✅ Số lượng ảnh:', result.data.length);
            renderThumbnails(result.data);
        } else {
            console.log('ℹ️ Không có ảnh bổ sung, dùng ảnh chính');
            // Use main image only
            renderThumbnails([{ duong_dan_anh: currentProduct.anh_mon }]);
        }
    } catch (error) {
        console.error('❌ Lỗi khi tải ảnh:', error);
        renderThumbnails([{ duong_dan_anh: currentProduct.anh_mon }]);
    }
}

// Fetch related products using ML-based recommendation
async function fetchRelatedProducts(categoryId) {
    try {
        console.log('🤖 Đang tải gợi ý món ăn thông minh cho món ID:', productId);
        
        // Sử dụng API gợi ý mới (Collaborative Filtering)
        const response = await fetch(`${window.API_URL}/menu/related/${productId}?limit=4`);
        const result = await response.json();
        
        console.log('📦 Gợi ý món ăn:', result);
        
        if (result.success && result.data.length > 0) {
            relatedProducts = result.data;
            
            // Log recommendation types
            if (result.meta) {
                console.log('📊 Loại gợi ý:', result.meta.types);
                console.log('   - Mua cùng nhau:', result.meta.types.bought_together);
                console.log('   - Cùng danh mục:', result.meta.types.same_category);
                console.log('   - Bán chạy:', result.meta.types.top_selling);
            }
            
            console.log('✅ Số món gợi ý:', relatedProducts.length);
            renderRelatedProducts();
        } else {
            // Fallback: lấy theo danh mục nếu API mới không có dữ liệu
            console.log('⚠️ Không có gợi ý, fallback về danh mục');
            const fallbackResponse = await fetch(`${window.API_URL}/menu/category/${categoryId}`);
            const fallbackResult = await fallbackResponse.json();
            
            if (fallbackResult.success) {
                relatedProducts = fallbackResult.data
                    .filter(p => p.ma_mon !== parseInt(productId))
                    .slice(0, 4);
                renderRelatedProducts();
            }
        }
    } catch (error) {
        console.error('❌ Lỗi khi tải món ăn liên quan:', error);
        // Fallback to category-based
        try {
            const fallbackResponse = await fetch(`${window.API_URL}/menu/category/${categoryId}`);
            const fallbackResult = await fallbackResponse.json();
            if (fallbackResult.success) {
                relatedProducts = fallbackResult.data
                    .filter(p => p.ma_mon !== parseInt(productId))
                    .slice(0, 4);
                renderRelatedProducts();
            }
        } catch (e) {
            console.error('❌ Fallback cũng lỗi:', e);
        }
    }
}

// Render product detail
function renderProductDetail() {
    if (!currentProduct) return;

    // Update page title
    document.title = `${currentProduct.ten_mon} - Nhà hàng Phương Nam`;
    
    // Breadcrumb
    const breadcrumbName = document.getElementById('breadcrumb-name');
    if (breadcrumbName) {
        breadcrumbName.textContent = currentProduct.ten_mon;
    }
    
    // Main image - xử lý đường dẫn ảnh
    const mainImage = document.getElementById('main-image');
    if (mainImage) {
        let imagePath = currentProduct.anh_mon || '/images/placeholder.jpg';
        if (imagePath && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
            imagePath = '/images/' + imagePath;
        }
        mainImage.src = `http://localhost:3000${imagePath}`;
        mainImage.alt = currentProduct.ten_mon;
        mainImage.onerror = function() {
            this.src = 'images/placeholder.svg';
        };
    }
    
    // Badges
    const badgesContainer = document.getElementById('image-badges');
    let badges = '';
    
    // Chỉ hiển thị badge "Hết hàng", ẩn badge "Sắp hết" với người dùng
    if (currentProduct.trang_thai === 0 || currentProduct.so_luong_ton === 0) {
        badges += `<span class="badge-tag bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-semibold">
            <i class="fas fa-times-circle mr-1"></i>Hết hàng
        </span>`;
    }
    
    badgesContainer.innerHTML = badges;
    
    // Category badge
    const categoryBadge = document.getElementById('category-badge');
    if (categoryBadge && currentProduct.ten_danh_muc) {
        categoryBadge.innerHTML = `<i class="fas fa-tag mr-1"></i>${currentProduct.ten_danh_muc}`;
    }
    
    // Product name
    const productName = document.getElementById('product-name');
    if (productName) {
        productName.textContent = currentProduct.ten_mon;
    }
    
    // Price - xử lý an toàn tránh NaN
    const productPrice = document.getElementById('product-price');
    if (productPrice) {
        const price = currentProduct.gia_tien ? parseFloat(currentProduct.gia_tien) : 0;
        productPrice.textContent = !isNaN(price) ? formatPrice(price) : 'Liên hệ';
    }
    
    // Stock - Ẩn với người dùng, chỉ dùng nội bộ để kiểm tra
    // const stockQuantity = document.getElementById('stock-quantity');
    // const stockUnit = document.getElementById('stock-unit');
    // if (stockQuantity) stockQuantity.textContent = currentProduct.so_luong_ton;
    // if (stockUnit) stockUnit.textContent = currentProduct.don_vi_tinh;
    
    // Description
    const description = currentProduct.mo_ta_chi_tiet || 'Món ăn đặc sắc với hương vị đậm đà, được chế biến từ nguyên liệu tươi ngon, đảm bảo vệ sinh an toàn thực phẩm.';
    const productDesc = document.getElementById('product-description');
    if (productDesc) {
        productDesc.textContent = description;
    }
    
    // Update quantity max
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        quantityInput.max = currentProduct.so_luong_ton;
    }
    
    // Trigger animations
    if (typeof window.animateProductDetail === 'function') {
        setTimeout(() => window.animateProductDetail(), 100);
    }
}

// Render thumbnails
function renderThumbnails(images) {
    const container = document.getElementById('thumbnails');
    
    // Helper function để xử lý đường dẫn ảnh
    function getImagePath(path) {
        if (!path) return '/images/placeholder.jpg';
        if (path.startsWith('http')) return path;
        if (path.startsWith('/')) return path;
        return '/images/' + path;
    }
    
    // Add main image first
    const allImages = [
        { duong_dan_anh: currentProduct.anh_mon },
        ...images.filter(img => img.duong_dan_anh !== currentProduct.anh_mon)
    ];
    
    container.innerHTML = allImages.slice(0, 4).map((img, index) => {
        const imgPath = getImagePath(img.duong_dan_anh);
        return `
        <div class="thumbnail ${index === 0 ? 'thumbnail-active' : ''} rounded-lg overflow-hidden border-2 border-gray-200"
             onclick="changeMainImage('${imgPath}', this)">
            <img src="http://localhost:3000${imgPath}" 
                 alt="Ảnh ${index + 1}" 
                 class="w-full h-24 object-cover"
                 onerror="this.src='images/placeholder.svg'">
        </div>
    `}).join('');
    
    // Animate thumbnails after render
    if (typeof window.animateProductDetail === 'function') {
        setTimeout(() => {
            const thumbnails = document.querySelectorAll('#thumbnails > div');
            if (thumbnails.length > 0) {
                gsap.from(thumbnails, {
                    opacity: 0,
                    y: 20,
                    duration: 0.5,
                    stagger: 0.1,
                    ease: 'power2.out'
                });
            }
        }, 100);
    }
}

// Change main image
function changeMainImage(imagePath, element) {
    const mainImage = document.getElementById('main-image');
    // Xử lý đường dẫn ảnh
    let imgPath = imagePath || '/images/placeholder.jpg';
    if (!imgPath.startsWith('/') && !imgPath.startsWith('http')) {
        imgPath = '/images/' + imgPath;
    }
    mainImage.src = `http://localhost:3000${imgPath}`;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('thumbnail-active');
    });
    element.classList.add('thumbnail-active');
}

// Render related products
function renderRelatedProducts() {
    const container = document.getElementById('related-products');
    if (!container) return;
    
    if (relatedProducts.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500">Không có món ăn liên quan</p>';
        return;
    }
    
    container.innerHTML = relatedProducts.map(product => {
        // Xử lý đường dẫn ảnh
        let imagePath = product.anh_mon || 'default-food.jpg';
        if (!imagePath.startsWith('http') && !imagePath.startsWith('/images/')) {
            imagePath = '/images/' + imagePath.replace(/^\/+/, '');
        }
        const imageUrl = imagePath.startsWith('http') ? imagePath : `http://localhost:3000${imagePath}`;
        
        // Badge dựa trên loại gợi ý
        let recommendBadge = '';
        if (product.recommendation_type === 'bought_together') {
            recommendBadge = '<span class="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium"><i class="fas fa-users mr-1"></i>Hay mua cùng</span>';
        } else if (product.recommendation_type === 'same_category') {
            recommendBadge = '<span class="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium"><i class="fas fa-tag mr-1"></i>Cùng loại</span>';
        } else if (product.recommendation_type === 'top_selling') {
            recommendBadge = '<span class="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium"><i class="fas fa-fire mr-1"></i>Bán chạy</span>';
        }
        
        // Badge hết hàng
        const outOfStockBadge = (product.trang_thai === 0 || product.so_luong_ton === 0)
            ? '<span class="absolute top-2 right-2 bg-gray-800 bg-opacity-90 text-white px-2 py-1 rounded-full text-xs font-medium">Hết hàng</span>'
            : '';
        
        // Xử lý giá an toàn - tránh NaN
        const price = product.gia_tien ? parseFloat(product.gia_tien) : 0;
        const formattedPrice = !isNaN(price) ? formatPrice(price) : 'Liên hệ';
        
        // Xử lý rating an toàn
        const rating = product.avg_rating ? parseFloat(product.avg_rating) : 0;
        const formattedRating = !isNaN(rating) ? rating.toFixed(1) : '0';
        
        return `
            <a href="chitietmonan.html?id=${product.ma_mon}" class="related-card block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div class="relative bg-gray-50">
                    <img src="${imageUrl}" 
                         alt="${product.ten_mon}" 
                         class="w-full h-40 sm:h-48 md:h-52 object-cover"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='images/placeholder.svg';">
                    ${recommendBadge}
                    ${outOfStockBadge}
                </div>
                <div class="p-3 md:p-4">
                    <h3 class="font-semibold text-sm md:text-base mb-2 text-gray-800 line-clamp-2 hover:text-orange-600 transition">${product.ten_mon}</h3>
                    <div class="flex items-center justify-between">
                        <span class="text-orange-600 font-bold text-base md:text-lg">${formattedPrice}</span>
                        <span class="text-yellow-400 text-sm flex items-center gap-1">
                            <i class="fas fa-star"></i>
                            <span class="text-gray-600 font-medium">${formattedRating}</span>
                        </span>
                    </div>
                </div>
            </a>
        `;
    }).join('');
    
    console.log('✅ Rendered', relatedProducts.length, 'related products');
    
    // Animate related products
    if (typeof window.animateRelatedProducts === 'function') {
        setTimeout(() => {
            console.log('🎬 Animating related products...');
            window.animateRelatedProducts();
        }, 100);
    }
    
    // Debug: Check opacity after render
    setTimeout(() => {
        const cards = document.querySelectorAll('#related-products > a');
        cards.forEach((card, i) => {
            const styles = window.getComputedStyle(card);
            console.log(`Card ${i} opacity:`, styles.opacity);
        });
    }, 500);
}

// Quantity controls
function increaseQuantity() {
    const input = document.getElementById('quantity');
    const max = parseInt(input.max);
    const current = parseInt(input.value);
    
    if (current < max) {
        input.value = current + 1;
    }
}

function decreaseQuantity() {
    const input = document.getElementById('quantity');
    const min = parseInt(input.min);
    const current = parseInt(input.value);
    
    if (current > min) {
        input.value = current - 1;
    }
}

// Add to cart
function addToCart() {
    const quantity = parseInt(document.getElementById('quantity').value);

    if (!currentProduct) {
        console.error('Không có thông tin món ăn');
        return;
    }

    // Use cartManager if available
    if (typeof cartManager !== 'undefined') {
        cartManager.addToCart(currentProduct.ma_mon, quantity);
    } else {
        console.warn('CartManager not loaded, using fallback');
        // Fallback to old localStorage method
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');

        const existingIndex = cart.findIndex(item => item.ma_mon === currentProduct.ma_mon);

        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push({
                ma_mon: currentProduct.ma_mon,
                ten_mon: currentProduct.ten_mon,
                gia_tien: currentProduct.gia_tien,
                anh_mon: currentProduct.anh_mon,
                quantity: quantity
            });
        }

        localStorage.setItem('cart', JSON.stringify(cart));

        if (typeof showNotification === 'function') {
            showNotification(`Đã thêm ${quantity} ${currentProduct.don_vi_tinh} ${currentProduct.ten_mon} vào giỏ hàng!`, 'success');
        }

        updateCartBadge();
    }
}

// Buy now
function buyNow() {
    addToCart();
    window.location.href = 'gio-hang.html';
}

// Update cart badge
function updateCartBadge() {
    // Use cartManager if available
    if (typeof cartManager !== 'undefined' && cartManager.updateCartBadge) {
        cartManager.updateCartBadge();
    } else {
        // Fallback to old method
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

        const badge = document.querySelector('.cart-badge');
        if (badge) {
            badge.textContent = totalItems;
        }
    }
}

// Show loading
function showLoading() {
    const productName = document.getElementById('product-name');
    const productPrice = document.getElementById('product-price');
    const productDesc = document.getElementById('product-description');
    
    // Use LoadingManager if available
    if (typeof LoadingManager !== 'undefined') {
        if (productName) productName.innerHTML = `<span class="pulse-loading">Đang tải...</span>`;
        if (productPrice) productPrice.innerHTML = `<span class="skeleton" style="display:inline-block;width:100px;height:24px;"></span>`;
        if (productDesc) productDesc.innerHTML = `<div class="skeleton skeleton-text mb-2"></div><div class="skeleton skeleton-text w-3/4"></div>`;
    } else {
        if (productName) productName.textContent = 'Đang tải...';
        if (productPrice) productPrice.textContent = '...';
        if (productDesc) productDesc.textContent = 'Đang tải thông tin món ăn...';
    }
}

// Show error
function showError() {
    document.querySelector('.container').innerHTML = `
        <div class="text-center py-20">
            <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy món ăn</h2>
            <p class="text-gray-600 mb-6">Món ăn bạn tìm kiếm không tồn tại hoặc đã bị xóa</p>
            <a href="thuc-don.html" class="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition">
                <i class="fas fa-arrow-left mr-2"></i>Quay lại thực đơn
            </a>
        </div>
    `;
}

// ==================== REVIEWS SECTION ====================

let selectedRating = 0;

// Fetch reviews for product
async function fetchReviews() {
    try {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${window.API_URL}/reviews/product/${productId}`, { headers });
        const result = await response.json();
        
        if (result.success) {
            renderReviews(result.data);
        }
    } catch (error) {
        console.error('Error fetching reviews:', error);
    }
}

// Render reviews
function renderReviews(data) {
    const { reviews, stats } = data;
    
    // Update average rating
    const avgRating = stats.averageRating.toFixed(1);
    document.getElementById('average-rating').textContent = avgRating;
    document.getElementById('total-reviews').textContent = `${stats.totalReviews} đánh giá`;
    
    // Update stars display
    const starsContainer = document.getElementById('average-stars');
    starsContainer.innerHTML = renderStars(stats.averageRating);
    
    // Update product info rating
    const productStars = document.getElementById('product-stars');
    const productRating = document.getElementById('product-rating');
    if (productStars) productStars.innerHTML = renderStars(stats.averageRating);
    if (productRating) productRating.textContent = `(${avgRating}/5)`;
    
    // Update rating distribution with new design
    const distContainer = document.getElementById('rating-distribution');
    distContainer.innerHTML = [5, 4, 3, 2, 1].map(star => {
        const count = stats.distribution[star] || 0;
        const percent = stats.totalReviews > 0 ? (count / stats.totalReviews * 100) : 0;
        return `
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-1 w-20">
                    <span class="text-sm font-medium text-gray-700">${star}</span>
                    <i class="fas fa-star text-yellow-400 text-sm"></i>
                </div>
                <div class="flex-1 rating-bar">
                    <div class="rating-bar-fill" style="width: ${percent}%"></div>
                </div>
                <span class="text-sm text-gray-500 w-12 text-right font-medium">${count}</span>
            </div>
        `;
    }).join('');
    
    // Update review count in product info
    const reviewCountEl = document.getElementById('review-count');
    if (reviewCountEl) {
        reviewCountEl.textContent = `${stats.totalReviews} đánh giá`;
    }
    
    // Render reviews list with new design
    const listContainer = document.getElementById('reviews-list');
    if (reviews.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-12 bg-white rounded-2xl">
                <i class="far fa-comment-dots text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg">Chưa có đánh giá nào cho món ăn này</p>
                <p class="text-gray-400 text-sm mt-2">Hãy là người đầu tiên đánh giá!</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = reviews.map(review => {
        // Xử lý avatar với design mới
        let avatarHtml = '';
        if (review.anh_dai_dien) {
            const avatarUrl = review.anh_dai_dien.startsWith('http') 
                ? review.anh_dai_dien 
                : `http://localhost:3000${review.anh_dai_dien.startsWith('/') ? '' : '/'}${review.anh_dai_dien}`;
            avatarHtml = `<img src="${avatarUrl}" alt="${review.ten_nguoi_dung}" class="review-avatar" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'review-avatar bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold text-lg\\'>${review.ten_nguoi_dung.charAt(0).toUpperCase()}</div>';">`;
        } else {
            avatarHtml = `<div class="review-avatar bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold text-lg">${review.ten_nguoi_dung.charAt(0).toUpperCase()}</div>`;
        }
        
        // Render admin replies với design mới
        let repliesHtml = '';
        if (review.replies && review.replies.length > 0) {
            repliesHtml = `
                <div class="admin-reply mt-4">
                    <div class="flex items-center gap-2 mb-3">
                        <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <i class="fas fa-store text-white text-sm"></i>
                        </div>
                        <span class="font-semibold text-green-700">Phản hồi từ Nhà hàng</span>
                    </div>
                    <div class="space-y-3">
                        ${review.replies.map(reply => `
                            <div class="bg-white rounded-xl p-4 shadow-sm">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-medium text-green-700">Admin</span>
                                    <span class="text-xs text-gray-400">${formatDate(reply.ngay_tra_loi)}</span>
                                </div>
                                <p class="text-gray-700">${reply.noi_dung}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        return `
        <div class="review-card" id="review-${review.ma_danh_gia}">
            <div class="flex items-start gap-4">
                ${avatarHtml}
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div class="flex flex-wrap items-center gap-3">
                            <span class="font-semibold text-gray-800">${review.ten_nguoi_dung}</span>
                            <div class="flex items-center bg-yellow-50 px-2 py-1 rounded-full">
                                <span class="text-yellow-500 text-sm">${renderStars(review.so_sao)}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-gray-400 text-sm"><i class="far fa-clock mr-1"></i>${formatDate(review.ngay_danh_gia)}</span>
                            ${review.is_owner ? `
                                <div class="flex gap-2">
                                    <button onclick="editReview(${review.ma_danh_gia}, ${review.so_sao}, '${(review.binh_luan || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}')" 
                                            class="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition" title="Sửa đánh giá">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteReview(${review.ma_danh_gia})" 
                                            class="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition" title="Xóa đánh giá">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    ${review.binh_luan ? `<p class="text-gray-600 leading-relaxed mb-3">${review.binh_luan}</p>` : ''}
                    ${review.images && review.images.length > 0 ? `
                        <div class="review-images flex flex-wrap gap-2 mb-3">
                            ${review.images.map((img, idx) => `
                                <img src="http://localhost:3000${img}" 
                                     alt="Ảnh đánh giá ${idx + 1}" 
                                     class="w-24 h-24 object-cover rounded-xl cursor-pointer hover:opacity-90 shadow-sm border border-gray-100"
                                     onclick="openImageModal('http://localhost:3000${img}')"
                                     onerror="this.style.display='none'">
                            `).join('')}
                        </div>
                    ` : ''}
                    ${repliesHtml}
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// Render star icons
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Check if user can review (chỉ cho phép khi đã mua sản phẩm)
async function checkCanReview() {
    try {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${window.API_URL}/reviews/check/${productId}`, {
            headers: headers
        });
        const result = await response.json();
        
        if (result.success && result.canReview) {
            // Đã mua sản phẩm -> hiển thị form bình luận
            document.getElementById('review-form-container').classList.remove('hidden');
            setupReviewForm();
            
            // Hiển thị số bình luận đã viết nếu có
            if (result.reviewCount > 0) {
                const countInfo = document.getElementById('user-review-count');
                if (countInfo) {
                    countInfo.textContent = `Bạn đã viết ${result.reviewCount} bình luận cho món này`;
                    countInfo.classList.remove('hidden');
                }
            }
        }
        // Không hiển thị gì nếu chưa đăng nhập hoặc chưa mua sản phẩm
        // Form và login prompt giữ nguyên trạng thái hidden
    } catch (error) {
        console.error('Error checking review status:', error);
    }
}

// Setup review form
function setupReviewForm() {
    const starBtns = document.querySelectorAll('.star-btn');
    
    starBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            selectedRating = parseInt(btn.dataset.rating);
            document.getElementById('selected-rating').value = selectedRating;
            
            // Update star display
            starBtns.forEach((b, index) => {
                if (index < selectedRating) {
                    b.classList.remove('text-gray-300');
                    b.classList.add('text-yellow-400');
                } else {
                    b.classList.remove('text-yellow-400');
                    b.classList.add('text-gray-300');
                }
            });
        });
    });
    
    // Form submit
    document.getElementById('review-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (selectedRating === 0) {
            alert('Vui lòng chọn số sao đánh giá');
            return;
        }
        
        const comment = document.getElementById('review-comment').value;
        const imageInput = document.getElementById('review-images');
        
        try {
            const token = localStorage.getItem('token');
            
            // Sử dụng FormData để gửi cả ảnh
            const formData = new FormData();
            formData.append('ma_mon', productId);
            formData.append('so_sao', selectedRating);
            formData.append('binh_luan', comment);
            
            // Thêm ảnh nếu có
            if (imageInput && imageInput.files) {
                for (let i = 0; i < imageInput.files.length; i++) {
                    formData.append('images', imageInput.files[i]);
                }
            }
            
            const response = await fetch(`${window.API_URL}/reviews`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Bình luận thành công!');
                // Reset form để có thể viết bình luận tiếp
                document.getElementById('review-comment').value = '';
                document.getElementById('review-images').value = '';
                document.getElementById('review-image-preview').innerHTML = '';
                selectedRating = 0;
                document.getElementById('selected-rating').value = 0;
                document.querySelectorAll('.star-btn').forEach(btn => {
                    btn.classList.remove('text-yellow-400');
                    btn.classList.add('text-gray-300');
                });
                fetchReviews(); // Reload reviews
            } else {
                alert(result.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Có lỗi xảy ra khi gửi bình luận');
        }
    });
}

// Edit review
function editReview(reviewId, currentRating, currentComment) {
    // Hiển thị modal hoặc form sửa
    const modal = document.createElement('div');
    modal.id = 'edit-review-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-bold mb-4">Sửa đánh giá</h3>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Đánh giá sao</label>
                <div class="flex gap-2" id="edit-star-rating">
                    ${[1,2,3,4,5].map(i => `
                        <button type="button" class="edit-star-btn text-3xl ${i <= currentRating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition" data-rating="${i}">
                            <i class="fas fa-star"></i>
                        </button>
                    `).join('')}
                </div>
                <input type="hidden" id="edit-selected-rating" value="${currentRating}">
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Bình luận</label>
                <textarea id="edit-review-comment" rows="3" class="w-full border rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500">${currentComment}</textarea>
            </div>
            <div class="flex gap-3 justify-end">
                <button onclick="closeEditModal()" class="px-4 py-2 border rounded-lg hover:bg-gray-100 transition">Hủy</button>
                <button onclick="submitEditReview(${reviewId})" class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">Lưu</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Setup star buttons
    const editStarBtns = modal.querySelectorAll('.edit-star-btn');
    editStarBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const rating = parseInt(btn.dataset.rating);
            document.getElementById('edit-selected-rating').value = rating;
            editStarBtns.forEach((b, index) => {
                if (index < rating) {
                    b.classList.remove('text-gray-300');
                    b.classList.add('text-yellow-400');
                } else {
                    b.classList.remove('text-yellow-400');
                    b.classList.add('text-gray-300');
                }
            });
        });
    });
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('edit-review-modal');
    if (modal) modal.remove();
}

// Submit edit review
async function submitEditReview(reviewId) {
    const rating = parseInt(document.getElementById('edit-selected-rating').value);
    const comment = document.getElementById('edit-review-comment').value;
    
    if (rating < 1 || rating > 5) {
        alert('Vui lòng chọn số sao');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.API_URL}/reviews/${reviewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ so_sao: rating, binh_luan: comment })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Cập nhật đánh giá thành công!');
            closeEditModal();
            fetchReviews();
        } else {
            alert(result.message || 'Có lỗi xảy ra');
        }
    } catch (error) {
        console.error('Error updating review:', error);
        alert('Có lỗi xảy ra khi cập nhật đánh giá');
    }
}

// Delete review
async function deleteReview(reviewId) {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.API_URL}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Xóa bình luận thành công!');
            fetchReviews();
        } else {
            alert(result.message || 'Có lỗi xảy ra');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        alert('Có lỗi xảy ra khi xóa bình luận');
    }
}

// Preview review images before upload
function previewReviewImages(input) {
    const previewContainer = document.getElementById('review-image-preview');
    previewContainer.innerHTML = '';
    
    if (input.files && input.files.length > 0) {
        if (input.files.length > 5) {
            alert('Chỉ được chọn tối đa 5 ảnh');
            input.value = '';
            return;
        }
        
        Array.from(input.files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const div = document.createElement('div');
                div.className = 'relative';
                div.innerHTML = `
                    <img src="${e.target.result}" class="w-20 h-20 object-cover rounded-lg">
                    <button type="button" onclick="removePreviewImage(${index})" 
                            class="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs hover:bg-red-600">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                previewContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }
}

// Remove preview image (reset all for simplicity)
function removePreviewImage(index) {
    const input = document.getElementById('review-images');
    input.value = '';
    document.getElementById('review-image-preview').innerHTML = '';
}

// Open image modal for full view
function openImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50';
    modal.onclick = function(e) {
        if (e.target === modal) closeImageModal();
    };
    modal.innerHTML = `
        <div class="relative max-w-4xl max-h-[90vh] mx-4">
            <img src="${imageUrl}" class="max-w-full max-h-[85vh] object-contain rounded-lg">
            <button onclick="closeImageModal()" 
                    class="absolute -top-3 -right-3 bg-white text-gray-800 w-10 h-10 rounded-full shadow-lg hover:bg-gray-100 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

// Close image modal
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchProductDetail();
    updateCartBadge();
});
