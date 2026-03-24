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
        
        const url = categoryId 
            ? `${window.API_URL}/menu/category/${categoryId}`
            : `${window.API_URL}/menu`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            allProducts = result.data;
            
            // Debug: Log rating data
            console.log('📊 Menu products with ratings:');
            allProducts.slice(0, 5).forEach(p => {
                console.log(`  - ${p.ten_mon}: avg_rating=${p.avg_rating}, total_reviews=${p.total_reviews}`);
            });
            
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
    
    // Sort products
    switch(sortBy) {
        case 'newest':
            filtered.sort((a, b) => b.ma_mon - a.ma_mon);
            break;
        case 'price-asc':
            filtered.sort((a, b) => (parseFloat(a.gia_tien) || 0) - (parseFloat(b.gia_tien) || 0));
            break;
        case 'price-desc':
            filtered.sort((a, b) => (parseFloat(b.gia_tien) || 0) - (parseFloat(a.gia_tien) || 0));
            break;
        case 'popular':
            // Sort by stock quantity (assuming popular items have lower stock)
            filtered.sort((a, b) => a.so_luong_ton - b.so_luong_ton);
            break;
        default:
            // Keep original order
            break;
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

    const categoryHTML = `
        <label class="flex items-center cursor-pointer">
            <input type="radio" name="category" class="w-4 h-4 text-orange-600 category-filter" 
                   data-category="all" ${!selectedCategory ? 'checked' : ''}>
            <span class="ml-2 text-gray-700">Tất cả</span>
        </label>
        ${categories.map(cat => `
            <label class="flex items-center cursor-pointer">
                <input type="radio" name="category" class="w-4 h-4 text-orange-600 category-filter" 
                       data-category="${cat.ma_danh_muc}" 
                       ${selectedCategory === cat.ma_danh_muc ? 'checked' : ''}>
                <span class="ml-2 text-gray-700">${cat.ten_danh_muc}</span>
            </label>
        `).join('')}
    `;
    
    categoryContainer.innerHTML = categoryHTML;

    // Add event listeners
    document.querySelectorAll('.category-filter').forEach(radio => {
        radio.addEventListener('change', function() {
            const category = this.dataset.category;
            selectedCategory = category === 'all' ? null : parseInt(category);
            fetchMenuProducts(selectedCategory);
            
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
        
        return `
        <div class="dish-card bg-white rounded-2xl overflow-hidden shadow-md">
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
                </div>
                
                <!-- Favorite Button -->
                <button class="favorite-btn absolute top-3 right-3 bg-white w-11 h-11 rounded-full flex items-center justify-center text-gray-600 shadow-lg hover:shadow-xl">
                    <i class="far fa-heart text-lg"></i>
                </button>
            </div>
            </a>
            
            <!-- Content -->
            <div class="p-5">
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
                
                <!-- Rating -->
                <div class="flex items-center mb-3">
                    <div class="text-yellow-400 text-sm">
                        ${generateStars(Number(product.avg_rating) || 0)}
                    </div>
                    <span class="text-gray-500 text-sm ml-2 font-medium">(${Number(product.total_reviews) || 0})</span>
                </div>
                
                <!-- Price & Action -->
                <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div class="flex flex-col">
                        <span class="price-tag text-2xl font-bold">
                            ${formatPrice(parseFloat(product.gia_tien))}
                        </span>
                        <span class="text-xs text-gray-400 mt-0.5">
                            <i class="fas fa-shipping-fast mr-1"></i>Miễn phí ship
                        </span>
                    </div>
                    <button onclick="addToCart(${product.ma_mon})" 
                            ${product.trang_thai === 0 || product.so_luong_ton === 0 ? 'disabled' : ''}
                            class="add-to-cart-btn bg-gradient-to-r from-orange-500 to-red-500 text-white w-12 h-12 rounded-full hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center">
                        <i class="fas fa-shopping-cart text-lg"></i>
                    </button>
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

// Setup sort buttons
function setupSortButtons() {
    const sortButtons = document.querySelectorAll('[data-sort]');
    
    sortButtons.forEach((button) => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            sortButtons.forEach(btn => btn.classList.remove('bg-orange-600', 'text-white', 'border-orange-600'));
            
            // Add active class to clicked button
            this.classList.add('bg-orange-600', 'text-white', 'border-orange-600');
            
            sortBy = this.dataset.sort;
            applyFiltersAndSort();
            renderMenuProducts();
            renderPagination();
            
            // Update mobile dropdown
            const mobileSort = document.getElementById('mobile-sort');
            if (mobileSort) {
                mobileSort.value = sortBy;
            }
        });
    });
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchCategories();
    fetchMenuProducts();
    setupPriceFilters();
    setupSortButtons();
    setupApplyFilterButton();
    setupSearch();
    setupMobileFilter();
    setupMobileSort();
});
