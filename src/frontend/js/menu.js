// API Configuration
if (typeof window.API_URL === 'undefined') {
    window.API_URL = 'http://localhost:3000/api';
}

// State
let menuProducts = [];
let allProducts = []; // Store all products for filtering
let categories = [];
let selectedCategory = null;
let selectedPriceRange = null;
let selectedRating = null;
let sortBy = 'default'; // default, newest, price-asc, price-desc, popular
let currentPage = 1;
let itemsPerPage = 9;
let searchQuery = '';
let recommendedProducts = []; // Cá nhân hóa sở thích người dùng

// Fetch categories from API
async function fetchCategories() {
    try {
        const response = await fetch(`${window.API_URL}/categories`);
        const result = await response.json();
        if (result.success) {
            categories = result.data;
            renderCategoryFilters();
        }
    } catch (error) {
        console.error('Lỗi khi tải danh mục:', error);
    }
}

// Fetch menu products from API
async function fetchMenuProducts(categoryId = null) {
    try {
        showLoading();
        
        let url = `${window.API_URL}/products?limit=1000`; // Get more for client-side pagination
        if (categoryId && categoryId !== 'recommended') {
            url += `&category=${categoryId}`;
        }
        if (sortBy && sortBy !== 'default') {
            url += `&sort=${sortBy}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            allProducts = result.data;
            
            // Debug: Log rating data
            console.log('📊 Menu products loaded:', allProducts.length);
            if (allProducts.length > 0) {
                console.log('Sample product:', allProducts[0]);
            }
            
            applyFiltersAndSort();
            
            // Simulate loading for smooth transition
            setTimeout(() => {
                renderMenuProducts();
                updateProductCount();
                renderPagination();
            }, 300);
        }
    } catch (error) {
        console.error('Lỗi khi tải món ăn:', error);
        showError();
    }
}

// Apply all filters and sorting
function applyFiltersAndSort() {
    let filtered = [...allProducts];
    
    // Filter by search query
    if (searchQuery) {
        filtered = filtered.filter(product => 
            product.ten_mon.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (product.mo_ta_chi_tiet && product.mo_ta_chi_tiet.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }
    
    // Lọc theo mục Gợi ý cho bạn
    if (selectedCategory === 'recommended') {
        const recIds = new Set(recommendedProducts.filter(r => r.score >= 70).map(r => r.ma_mon));
        filtered = filtered.filter(product => recIds.has(product.ma_mon));
    }
    
    // Filter by price range
    if (selectedPriceRange) {
        filtered = filtered.filter(product => {
            const price = parseFloat(product.gia_tien) || 0;
            if (isNaN(price)) return false;
            switch(selectedPriceRange) {
                case 'under-100k':
                    return price < 100000;
                case '100k-200k':
                    return price >= 100000 && price <= 200000;
                case '200k-500k':
                    return price >= 200000 && price <= 500000;
                case 'over-500k':
                    return price > 500000;
                default:
                    return true;
            }
        });
    }
    
    // ✨ ƯU TIÊN HIỂN THỊ MÓN THEO SỞ THÍCH (áp dụng trước khi sắp xếp)
    // Nếu có gợi ý cá nhân hóa và không đang lọc "Gợi ý cho bạn"
    if (recommendedProducts.length > 0 && selectedCategory !== 'recommended') {
        const personalizedRecs = recommendedProducts.filter(r => r.score >= 70);
        
        if (personalizedRecs.length > 0) {
            const recIds = new Set(personalizedRecs.map(r => r.ma_mon));
            const recMap = new Map(personalizedRecs.map(r => [r.ma_mon, r.score || 1]));
            
            // Tách món thành 2 nhóm: Gợi ý và Không gợi ý
            const recommendedItems = filtered.filter(p => recIds.has(p.ma_mon));
            const otherItems = filtered.filter(p => !recIds.has(p.ma_mon));
            
            // Sắp xếp món gợi ý theo điểm số (score cao nhất lên đầu)
            recommendedItems.sort((a, b) => {
                const scoreA = recMap.get(a.ma_mon) || 0;
                const scoreB = recMap.get(b.ma_mon) || 0;
                return scoreB - scoreA;
            });
            
            // Ghép lại: Món gợi ý trước, món khác sau
            filtered = [...recommendedItems, ...otherItems];
        }
    }
    
    // Sort products (chỉ áp dụng thủ công nếu server chưa sort, ví dụ lọc Gợi ý cho bạn)
    if (sortBy !== 'default') {
        switch(sortBy) {
            case 'price_asc':
            case 'price-asc':
                filtered.sort((a, b) => (parseFloat(a.gia_tien) || 0) - (parseFloat(b.gia_tien) || 0));
                break;
            case 'price_desc':
            case 'price-desc':
                filtered.sort((a, b) => (parseFloat(b.gia_tien) || 0) - (parseFloat(a.gia_tien) || 0));
                break;
            case 'rating':
                filtered.sort((a, b) => (parseFloat(b.avg_rating) || 0) - (parseFloat(a.avg_rating) || 0));
                break;
            case 'clicks':
                filtered.sort((a, b) => (parseInt(b.click_count) || 0) - (parseInt(a.click_count) || 0));
                break;
            case 'views':
                filtered.sort((a, b) => (parseInt(b.view_count) || 0) - (parseInt(a.view_count) || 0));
                break;
            case 'orders':
                filtered.sort((a, b) => (parseInt(b.order_count) || 0) - (parseInt(a.order_count) || 0));
                break;
            case 'likes':
                filtered.sort((a, b) => (parseInt(b.like_count) || 0) - (parseInt(a.like_count) || 0));
                break;
            case 'popular':
                // Popularity score order
                filtered.sort((a, b) => {
                    const scoreA = (parseInt(a.order_count) || 0) * 30 + (parseInt(a.click_count) || 0) * 20 + (parseInt(a.view_count) || 0) * 15 + (parseInt(a.like_count) || 0) * 15 + (parseFloat(a.avg_rating) || 0) * 4;
                    const scoreB = (parseInt(b.order_count) || 0) * 30 + (parseInt(b.click_count) || 0) * 20 + (parseInt(b.view_count) || 0) * 15 + (parseInt(b.like_count) || 0) * 15 + (parseFloat(b.avg_rating) || 0) * 4;
                    return scoreB - scoreA;
                });
                break;
        }
    }
    
    menuProducts = filtered;
    currentPage = 1; // Reset to first page
}

// Get paginated products
function getPaginatedProducts() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return menuProducts.slice(startIndex, endIndex);
}

// Render category filters
function renderCategoryFilters() {
    const categoryContainer = document.querySelector('.space-y-2');
    if (!categoryContainer) return;

    let categoryHTML = `
        <label class="flex items-center cursor-pointer">
            <input type="radio" name="category" class="w-4 h-4 text-orange-600 category-filter" 
                   data-category="all" ${!selectedCategory ? 'checked' : ''}>
            <span class="ml-2 text-gray-700">Tất cả</span>
        </label>
    `;
    
    if (recommendedProducts.length > 0) {
        categoryHTML += `
            <label class="flex items-center cursor-pointer font-medium text-purple-600">
                <input type="radio" name="category" class="w-4 h-4 text-purple-600 category-filter" 
                       data-category="recommended" ${selectedCategory === 'recommended' ? 'checked' : ''}>
                <span class="ml-2 flex items-center gap-1.5">
                    <i class="fas fa-sparkles text-xs animate-pulse"></i> Gợi ý cho bạn
                </span>
            </label>
        `;
    }
    
    categoryHTML += categories.map(cat => `
        <label class="flex items-center cursor-pointer">
            <input type="radio" name="category" class="w-4 h-4 text-orange-600 category-filter" 
                   data-category="${cat.ma_danh_muc}" 
                   ${selectedCategory === cat.ma_danh_muc ? 'checked' : ''}>
            <span class="ml-2 text-gray-700">${cat.ten_danh_muc}</span>
        </label>
    `).join('');
    
    categoryContainer.innerHTML = categoryHTML;

    // Add event listeners
    document.querySelectorAll('.category-filter').forEach(radio => {
        radio.addEventListener('change', function() {
            const category = this.dataset.category;
            if (category === 'recommended') {
                selectedCategory = 'recommended';
                applyFiltersAndSort();
                renderMenuProducts();
                updateProductCount();
                renderPagination();
            } else {
                selectedCategory = category === 'all' ? null : parseInt(category);
                fetchMenuProducts(selectedCategory);
            }
            
            // Smooth scroll to products
            if (typeof window.smoothScrollToProducts === 'function') {
                window.smoothScrollToProducts();
            }
        });
    });
}

// Render products
function renderMenuProducts() {
    const container = document.getElementById('menu-products');
    if (!container) return;

    const paginatedProducts = getPaginatedProducts();

    if (paginatedProducts.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-utensils text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg">Không tìm thấy món ăn nào</p>
            </div>
        `;
        return;
    }

    container.innerHTML = paginatedProducts.map(product => {
        // Xử lý đường dẫn ảnh - đảm bảo có /images/ prefix
        let imagePath = product.anh_mon || '/images/placeholder.jpg';
        if (imagePath && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
            imagePath = '/images/' + imagePath;
        }
        
        // Kiểm tra xem món ăn này có trong gợi ý cá nhân hóa không
        const recItem = recommendedProducts.find(r => r.ma_mon === product.ma_mon && r.score >= 70);
        let preferredBadgeHTML = '';
        
        if (recItem) {
            if (recItem.recommendation_type === 'collaborative') {
                // Badge cho lọc cộng tác - màu xanh dương
                preferredBadgeHTML = `
                    <span class="category-badge text-blue-600 border-blue-200 bg-blue-50 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                        <i class="fas fa-users mr-1"></i>Khách cùng khẩu vị đã mua
                    </span>
                `;
            } else {
                // Badge cho sở thích cá nhân - màu hồng
                preferredBadgeHTML = `
                    <span class="category-badge text-pink-600 border-pink-200 bg-pink-50 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                        <i class="fas fa-heart mr-1"></i>Phù hợp sở thích
                    </span>
                `;
            }
        }
        
        return `
        <div class="dish-card flex flex-col bg-white rounded-2xl overflow-hidden shadow-md h-full">
            <!-- Image Container -->
            <a href="chitietmonan.html?id=${product.ma_mon}" class="block">
                <div class="dish-image-container">
                <img src="http://localhost:3000${imagePath}" 
                     alt="${product.ten_mon}" 
                     class="dish-image"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='images/placeholder.svg'; this.style.objectFit='contain';">
                
                <!-- Overlay -->
                <div class="image-overlay"></div>
                
                <!-- Badges -->
                <div class="absolute top-3 left-3 flex flex-col gap-2">
                    ${product.trang_thai === 0 || product.so_luong_ton === 0 
                        ? `<span class="badge-status text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                            <i class="fas fa-times-circle mr-1"></i>Hết hàng
                           </span>` 
                        : ''}
                    ${product.ten_danh_muc 
                        ? `<span class="category-badge text-orange-600 px-3 py-1.5 rounded-full text-xs font-semibold">
                            <i class="fas fa-tag mr-1"></i>${product.ten_danh_muc}
                           </span>`
                        : ''}
                    ${preferredBadgeHTML}
                </div>
                
                <!-- Favorite Button -->
                <button onclick="event.preventDefault(); toggleLike(${product.ma_mon}, this)" class="favorite-btn absolute top-3 right-3 bg-white w-11 h-11 rounded-full flex items-center justify-center text-gray-600 shadow-lg hover:shadow-xl z-10 transition">
                    <i class="far fa-heart text-lg"></i>
                </button>
            </div>
            </a>
            
            <!-- Content -->
            <div class="p-5 flex flex-col flex-1">
                <!-- Title -->
                <a href="chitietmonan.html?id=${product.ma_mon}" class="block">
                    <h3 class="font-bold text-lg mb-2 text-gray-800 line-clamp-1 hover:text-orange-600 transition cursor-pointer">
                        ${product.ten_mon}
                    </h3>
                </a>
                
                <!-- Description -->
                <p class="text-gray-500 text-sm mb-3 line-clamp-2 leading-relaxed">
                    ${product.mo_ta_chi_tiet || 'Món ăn đặc sắc, hương vị đậm đà'}
                </p>
                
                <!-- Rating & Stats -->
                <div class="flex flex-wrap items-center gap-y-1 gap-x-2 text-[11px] text-gray-500 mb-3 font-medium">
                    <div class="flex items-center">
                        <div class="text-yellow-400 text-xs flex mr-1">
                            ${generateStars(Number(product.avg_rating) || 0)}
                        </div>
                        <span class="text-gray-700 font-bold">${Number(product.avg_rating || 0).toFixed(1)}</span>
                    </div>
                </div>
                
                <!-- Spacer to push Price & Action to bottom -->
                <div class="mt-auto"></div>
                
                <!-- Price & Action -->
                <div class="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
                    <div class="flex flex-col">
                        <span class="price-tag text-lg sm:text-xl font-bold text-orange-600">
                            ${formatPrice(parseFloat(product.gia_tien))}
                        </span>
                        <span class="text-[10px] text-gray-400 mt-0.5">
                            <i class="fas fa-shipping-fast mr-1"></i>Miễn phí ship
                        </span>
                    </div>
                    <div class="flex items-center space-x-1 sm:space-x-2 shrink-0">
                        <!-- Mua ngay (Primary Call-to-action) -->
                        <button onclick="addToCart(${product.ma_mon}); setTimeout(() => window.location.href='gio-hang.html', 300)" 
                                ${product.trang_thai === 0 || product.so_luong_ton === 0 ? 'disabled' : ''}
                                class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-xs sm:text-sm">
                            Mua ngay
                        </button>
                        
                        <!-- Thêm giỏ hàng (Secondary) -->
                        <button onclick="addToCart(${product.ma_mon})" 
                                ${product.trang_thai === 0 || product.so_luong_ton === 0 ? 'disabled' : ''}
                                class="bg-orange-50 text-orange-600 border border-orange-200 w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-orange-100 hover:text-orange-700 transition-colors flex flex-shrink-0 items-center justify-center active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            <i class="fas fa-cart-plus text-xs sm:text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// Show loading skeleton
function showLoading() {
    const container = document.getElementById('menu-products');
    if (!container) return;
    
    // Use LoadingManager if available
    if (typeof LoadingManager !== 'undefined') {
        LoadingManager.showSkeletonLoading(container, 6, 'card');
    } else {
        // Fallback skeleton
        const skeletonHTML = Array(6).fill(0).map(() => `
            <div class="bg-white rounded-2xl overflow-hidden shadow-md">
                <div class="skeleton h-64 w-full"></div>
                <div class="p-5">
                    <div class="skeleton h-6 w-3/4 mb-3 rounded"></div>
                    <div class="skeleton h-4 w-full mb-2 rounded"></div>
                    <div class="skeleton h-4 w-2/3 mb-4 rounded"></div>
                    <div class="flex justify-between items-center">
                        <div class="skeleton h-8 w-24 rounded"></div>
                        <div class="skeleton h-12 w-12 rounded-full"></div>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = skeletonHTML;
    }
}

// Show error message
function showError() {
    const container = document.getElementById('menu-products');
    if (!container) return;
    
    container.innerHTML = `
        <div class="col-span-full text-center py-16">
            <div class="inline-block p-8 bg-red-50 rounded-2xl">
                <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
                <p class="text-gray-700 text-lg font-medium mb-2">Không thể tải dữ liệu</p>
                <p class="text-gray-500 text-sm mb-4">Vui lòng kiểm tra kết nối và thử lại</p>
                <button onclick="fetchMenuProducts()" class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition shadow-lg">
                    <i class="fas fa-redo mr-2"></i>Thử lại
                </button>
            </div>
        </div>
    `;
}

// Update product count
function updateProductCount() {
    const count = menuProducts.length;
    
    // Desktop count
    const countElement = document.getElementById('product-count');
    if (countElement) {
        countElement.textContent = count;
    }
    
    // Mobile count
    const countMobile = document.getElementById('product-count-mobile');
    if (countMobile) {
        countMobile.textContent = count;
    }
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(menuProducts.length / itemsPerPage);
    const paginationContainer = document.getElementById('pagination-container');
    
    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    const isMobile = window.innerWidth < 640;
    
    let paginationHTML = `
        <button onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}
                class="px-3 sm:px-4 py-2 border rounded-lg hover:bg-orange-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Show page numbers (fewer on mobile)
    const maxVisiblePages = isMobile ? 3 : 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page
    if (startPage > 1) {
        paginationHTML += `
            <button onclick="changePage(1)" 
                    class="px-3 sm:px-4 py-2 border rounded-lg hover:bg-orange-600 hover:text-white transition text-sm sm:text-base">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="px-1 sm:px-2 py-2 text-sm sm:text-base">...</span>`;
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" 
                    class="px-3 sm:px-4 py-2 border rounded-lg transition text-sm sm:text-base ${i === currentPage ? 'bg-orange-600 text-white' : 'hover:bg-orange-600 hover:text-white'}">
                ${i}
            </button>
        `;
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="px-1 sm:px-2 py-2 text-sm sm:text-base">...</span>`;
        }
        paginationHTML += `
            <button onclick="changePage(${totalPages})" 
                    class="px-3 sm:px-4 py-2 border rounded-lg hover:bg-orange-600 hover:text-white transition text-sm sm:text-base">
                ${totalPages}
            </button>
        `;
    }
    
    paginationHTML += `
        <button onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}
                class="px-3 sm:px-4 py-2 border rounded-lg hover:bg-orange-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(menuProducts.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderMenuProducts();
    renderPagination();
    
    // Scroll to top of products
    document.getElementById('menu-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Setup price filters
function setupPriceFilters() {
    const priceRadios = document.querySelectorAll('input[name="price"]');
    priceRadios.forEach((radio, index) => {
        const ranges = ['under-100k', '100k-200k', '200k-500k', 'over-500k'];
        radio.dataset.range = ranges[index];
        
        radio.addEventListener('change', function() {
            if (this.checked) {
                selectedPriceRange = this.dataset.range;
                applyFiltersAndSort();
                renderMenuProducts();
                updateProductCount();
                renderPagination();
            }
        });
    });
}

// Setup Sort Select
function setupSortSelect() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortBy = this.value;
            fetchMenuProducts(selectedCategory);
        });
    }
}

// Setup apply filter button
function setupApplyFilterButton() {
    const applyButton = document.getElementById('apply-filter');
    const resetButton = document.getElementById('reset-filter');
    
    if (applyButton) {
        applyButton.addEventListener('click', () => {
            applyFiltersAndSort();
            renderMenuProducts();
            updateProductCount();
            renderPagination();
            
            // Close mobile filter
            if (window.innerWidth < 1024) {
                const closeBtn = document.getElementById('mobile-filter-close');
                if (closeBtn) closeBtn.click();
            }
            
            // Smooth scroll to products
            setTimeout(() => {
                document.getElementById('menu-products')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            // Reset all filters
            selectedCategory = null;
            selectedPriceRange = null;
            selectedRating = null;
            sortBy = 'default';
            searchQuery = '';
            currentPage = 1;
            
            // Uncheck all checkboxes and radios
            document.querySelectorAll('.category-filter').forEach(cb => {
                cb.checked = cb.dataset.category === 'all';
            });
            document.querySelectorAll('input[name="price"]').forEach(radio => {
                radio.checked = false;
            });
            document.querySelectorAll('input[type="checkbox"]:not(.category-filter)').forEach(cb => {
                cb.checked = false;
            });
            
            // Clear search
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = '';
                document.getElementById('clear-search')?.classList.add('hidden');
            }
            
            // Reset sort buttons
            document.querySelectorAll('.flex.items-center.space-x-4 button').forEach(btn => {
                btn.classList.remove('bg-orange-600', 'text-white', 'border-orange-600');
            });
            
            // Reload all products
            fetchMenuProducts();
        });
    }
}

// Generate stars
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Format price - xử lý an toàn tránh NaN
function formatPrice(price) {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numPrice);
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const clearButton = document.getElementById('clear-search');
    
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        
        // Show/hide clear button
        if (this.value) {
            clearButton?.classList.remove('hidden');
        } else {
            clearButton?.classList.add('hidden');
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            searchQuery = this.value.trim();
            applyFiltersAndSort();
            renderMenuProducts();
            updateProductCount();
            renderPagination();
        }, 300);
    });
    
    // Clear search
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearButton.classList.add('hidden');
            applyFiltersAndSort();
            renderMenuProducts();
            updateProductCount();
            renderPagination();
            searchInput.focus();
        });
    }
}

// Setup mobile filter toggle
function setupMobileFilter() {
    const toggleBtn = document.getElementById('mobile-filter-toggle');
    const closeBtn = document.getElementById('mobile-filter-close');
    const filterSidebar = document.getElementById('filter-sidebar');
    const filterIcon = document.getElementById('filter-icon');
    let backdrop = null;
    
    function openFilter() {
        // Chỉ mở filter dạng popup trên mobile/tablet
        if (window.innerWidth >= 1024) return;
        
        // Create backdrop
        backdrop = document.createElement('div');
        backdrop.className = 'filter-backdrop';
        document.body.appendChild(backdrop);
        
        // Show filter
        filterSidebar.classList.add('mobile-open');
        filterSidebar.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Rotate icon
        if (filterIcon) {
            filterIcon.style.transform = 'rotate(180deg)';
        }
        
        // Close on backdrop click
        backdrop.addEventListener('click', closeFilter);
    }
    
    function closeFilter() {
        // Remove backdrop
        if (backdrop) {
            backdrop.remove();
            backdrop = null;
        }
        
        // Hide filter on mobile only
        if (window.innerWidth < 1024) {
            filterSidebar.classList.remove('mobile-open');
            filterSidebar.classList.add('hidden');
        }
        
        document.body.style.overflow = '';
        
        // Reset icon
        if (filterIcon) {
            filterIcon.style.transform = 'rotate(0deg)';
        }
    }
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', openFilter);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeFilter);
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            closeFilter();
            filterSidebar.classList.remove('hidden');
        } else {
            if (!filterSidebar.classList.contains('mobile-open')) {
                filterSidebar.classList.add('hidden');
            }
        }
    });
}

// Setup mobile sort dropdown
function setupMobileSort() {
    const mobileSort = document.getElementById('mobile-sort');
    
    if (mobileSort) {
        mobileSort.addEventListener('change', function() {
            sortBy = this.value;
            applyFiltersAndSort();
            renderMenuProducts();
            renderPagination();
            
            // Update desktop buttons
            const sortButtons = document.querySelectorAll('[data-sort]');
            sortButtons.forEach(btn => {
                btn.classList.remove('bg-orange-600', 'text-white', 'border-orange-600');
                if (btn.dataset.sort === sortBy) {
                    btn.classList.add('bg-orange-600', 'text-white', 'border-orange-600');
                }
            });
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchCategories();
    fetchMenuProducts();
    setupPriceFilters();
    setupApplyFilterButton();
    setupSearch();
    setupMobileFilter();
    // setupMobileSort();
    
    // Tải gợi ý cá nhân hóa
    loadRecommendedProducts();
});

// Tải danh sách gợi ý cá nhân hóa của người dùng đăng nhập
async function loadRecommendedProducts() {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (!token) return; // Bỏ qua nếu là khách vãng lai
    
    try {
        if (typeof window.RecommendationSystem !== 'undefined') {
            const recs = await window.RecommendationSystem.getRecommendations(100); // Lấy nhiều món hơn
            if (recs && recs.length > 0) {
                recommendedProducts = recs;
                console.log('✨ [Personalization] Loaded recommendations for menu:', recommendedProducts.length);
                
                // Render lại bộ lọc danh mục và món ăn để cập nhật badge/reason
                renderCategoryFilters();
                
                // Áp dụng sắp xếp theo sở thích ngay lập tức
                applyFiltersAndSort();
                renderMenuProducts();
                updateProductCount();
                renderPagination();
            }
        }
    } catch (err) {
        console.error('Lỗi tải gợi ý cá nhân hóa cho thực đơn:', err);
    }
}

// Add to cart function
function addToCart(ma_mon, so_luong = 1) {
    if (typeof cartManager !== 'undefined') {
        cartManager.addToCart(ma_mon, so_luong);
    } else {
        console.warn('CartManager not loaded yet');
        // Fallback notification
        alert('Giỏ hàng chưa sẵn sàng. Vui lòng thử lại sau.');
    }
}

// Toggle Like
async function toggleLike(dishId, btnElement) {
    try {
        const icon = btnElement.querySelector('i');
        const isLiked = icon.classList.contains('fas');
        
        // Cập nhật UI ngay lập tức
        if (isLiked) {
            icon.classList.remove('fas', 'text-red-500');
            icon.classList.add('far', 'text-gray-600');
            btnElement.classList.remove('bg-red-50');
        } else {
            icon.classList.remove('far', 'text-gray-600');
            icon.classList.add('fas', 'text-red-500');
            btnElement.classList.add('bg-red-50');
            
            // Animation
            icon.style.transform = 'scale(1.3)';
            setTimeout(() => icon.style.transform = 'scale(1)', 200);
            
            // Show toast
            if (typeof window.showToast === 'function') {
                window.showToast('Đã lưu vào danh sách yêu thích!', 'success');
            }
        }
        
        // Gọi API lưu hành vi
        await fetch(`${window.API_URL}/recommendations/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({
                dish_id: dishId,
                action: 'like'
            })
        });
        
    } catch (error) {
        console.error('Lỗi toggle like:', error);
    }
}
