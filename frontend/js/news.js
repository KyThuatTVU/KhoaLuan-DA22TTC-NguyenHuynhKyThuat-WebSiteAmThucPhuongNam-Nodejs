// API Configuration
const API_URL = 'http://localhost:3000/api/news';

// Format date to Vietnamese
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Format views count
function formatViews(views) {
    if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
    }
    return views;
}

// Load all news with pagination
async function loadNews(page = 1, limit = 9) {
    try {
        showLoading();
        
        const response = await fetch(`${API_URL}?page=${page}&limit=${limit}`);
        const result = await response.json();

        if (result.success) {
            displayNews(result.data);
            displayPagination(result.pagination);
        } else {
            showError('Không thể tải tin tức');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        showError('Không thể kết nối đến server');
    } finally {
        hideLoading();
    }
}

// Load featured news
async function loadFeaturedNews(limit = 1) {
    try {
        const response = await fetch(`${API_URL}/featured?limit=${limit}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            displayFeaturedNews(result.data[0]);
        }
    } catch (error) {
        console.error('Lỗi tải tin nổi bật:', error);
    }
}

// Load popular news (sidebar)
async function loadPopularNews(limit = 5) {
    try {
        const response = await fetch(`${API_URL}/popular?limit=${limit}`);
        const result = await response.json();

        if (result.success) {
            displayPopularNews(result.data);
        }
    } catch (error) {
        console.error('Lỗi tải tin phổ biến:', error);
    }
}

// Get image URL with server prefix
function getImageUrl(imagePath) {
    if (!imagePath) return 'images/default-news.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) return `http://localhost:3000${imagePath}`;
    return `http://localhost:3000/${imagePath}`;
}

// Display featured news
function displayFeaturedNews(news) {
    const container = document.getElementById('featured-news');
    if (!container) return;

    container.innerHTML = `
        <article class="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition duration-300">
            <a href="tin-tuc-chi-tiet.html?id=${news.ma_tin_tuc}">
                <img src="${getImageUrl(news.anh_dai_dien)}" 
                     alt="${news.tieu_de}" 
                     class="w-full h-48 sm:h-56 md:h-64 object-cover"
                     onerror="this.src='images/default-news.jpg'">
            </a>
            <div class="p-4 sm:p-6">
                <div class="flex items-center text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 space-x-3 sm:space-x-4">
                    <span class="flex items-center">
                        <i class="fas fa-calendar mr-1 sm:mr-2"></i>
                        ${formatDate(news.ngay_dang)}
                    </span>
                    <span class="flex items-center">
                        <i class="fas fa-user mr-1 sm:mr-2"></i>
                        ${news.tac_gia || 'Admin'}
                    </span>
                    <span class="flex items-center">
                        <i class="fas fa-eye mr-1 sm:mr-2"></i>
                        ${formatViews(news.luot_xem)}
                    </span>
                </div>
                <h2 class="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 line-clamp-2 hover:text-orange-600 transition">
                    <a href="tin-tuc-chi-tiet.html?id=${news.ma_tin_tuc}">${news.tieu_de}</a>
                </h2>
                <p class="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-3">
                    ${news.tom_tat || ''}
                </p>
                <a href="tin-tuc-chi-tiet.html?id=${news.ma_tin_tuc}" 
                   class="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm sm:text-base">
                    Đọc thêm 
                    <i class="fas fa-arrow-right ml-2"></i>
                </a>
            </div>
        </article>
    `;
}

// Display regular news list
function displayNews(newsList) {
    const container = document.getElementById('news-list');
    if (!container) return;

    if (newsList.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-newspaper text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg">Chưa có tin tức nào</p>
            </div>
        `;
        return;
    }

    container.innerHTML = newsList.map(news => `
        <article class="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition duration-300">
            <a href="tin-tuc-chi-tiet.html?id=${news.ma_tin_tuc}">
                <img src="${getImageUrl(news.anh_dai_dien)}" 
                     alt="${news.tieu_de}" 
                     class="w-full h-40 sm:h-48 object-cover"
                     onerror="this.src='images/default-news.jpg'">
            </a>
            <div class="p-4 sm:p-5">
                <div class="flex items-center text-xs text-gray-600 mb-2 space-x-2 sm:space-x-3">
                    <span class="flex items-center">
                        <i class="fas fa-calendar mr-1"></i>
                        ${formatDate(news.ngay_dang)}
                    </span>
                    <span class="flex items-center">
                        <i class="fas fa-eye mr-1"></i>
                        ${formatViews(news.luot_xem)}
                    </span>
                </div>
                <h3 class="text-base sm:text-lg font-bold mb-2 line-clamp-2 hover:text-orange-600 transition">
                    <a href="tin-tuc-chi-tiet.html?id=${news.ma_tin_tuc}">${news.tieu_de}</a>
                </h3>
                <p class="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
                    ${news.tom_tat || ''}
                </p>
                <a href="tin-tuc-chi-tiet.html?id=${news.ma_tin_tuc}" 
                   class="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-xs sm:text-sm">
                    Đọc thêm 
                    <i class="fas fa-arrow-right ml-1 sm:ml-2 text-xs"></i>
                </a>
            </div>
        </article>
    `).join('');
}

// Display popular news (sidebar)
function displayPopularNews(newsList) {
    const container = document.getElementById('popular-news');
    if (!container) return;

    container.innerHTML = newsList.map((news, index) => `
        <article class="flex gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-orange-50 rounded-lg transition">
            <div class="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                <img src="${getImageUrl(news.anh_dai_dien)}" 
                     alt="${news.tieu_de}" 
                     class="w-full h-full object-cover rounded-lg"
                     onerror="this.src='images/default-news.jpg'">
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 hover:text-orange-600">
                    <a href="tin-tuc-chi-tiet.html?id=${news.ma_tin_tuc}">${news.tieu_de}</a>
                </h4>
                <div class="flex items-center text-xs text-gray-500 space-x-2">
                    <span><i class="fas fa-calendar mr-1"></i>${formatDate(news.ngay_dang)}</span>
                    <span><i class="fas fa-eye mr-1"></i>${formatViews(news.luot_xem)}</span>
                </div>
            </div>
        </article>
    `).join('');
}

// Display pagination
function displayPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;

    const { page, totalPages } = pagination;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex justify-center items-center space-x-2 flex-wrap gap-2">';

    // Previous button
    if (page > 1) {
        paginationHTML += `
            <button onclick="loadNews(${page - 1})" 
                    class="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-orange-50 transition text-sm sm:text-base">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === page) {
            paginationHTML += `
                <button class="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg font-medium text-sm sm:text-base">
                    ${i}
                </button>
            `;
        } else if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
            paginationHTML += `
                <button onclick="loadNews(${i})" 
                        class="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-orange-50 transition text-sm sm:text-base">
                    ${i}
                </button>
            `;
        } else if (Math.abs(i - page) === 2) {
            paginationHTML += `<span class="px-2">...</span>`;
        }
    }

    // Next button
    if (page < totalPages) {
        paginationHTML += `
            <button onclick="loadNews(${page + 1})" 
                    class="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-orange-50 transition text-sm sm:text-base">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }

    paginationHTML += '</div>';
    container.innerHTML = paginationHTML;
}

// Search news
async function searchNews(query) {
    if (!query || query.trim() === '') {
        loadNews();
        return;
    }

    try {
        showLoading();
        
        const response = await fetch(`${API_URL}/search/query?q=${encodeURIComponent(query)}`);
        const result = await response.json();

        if (result.success) {
            displayNews(result.data);
            document.getElementById('pagination').innerHTML = '';
            
            if (result.data.length === 0) {
                showNotification('Không tìm thấy tin tức phù hợp', 'info');
            }
        }
    } catch (error) {
        console.error('Lỗi tìm kiếm:', error);
        showError('Không thể tìm kiếm');
    } finally {
        hideLoading();
    }
}

// Loading helpers
function showLoading() {
    const container = document.getElementById('news-list');
    if (container) {
        // Use LoadingManager if available
        if (typeof LoadingManager !== 'undefined') {
            LoadingManager.showSectionLoading(container, 'Đang tải tin tức...');
        } else {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-orange-600 mb-4"></i>
                    <p class="text-gray-600">Đang tải tin tức...</p>
                </div>
            `;
        }
    }
}

function hideLoading() {
    // Loading will be replaced by content
}

function showError(message) {
    const container = document.getElementById('news-list');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <p class="text-gray-600">${message}</p>
            </div>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load news for main page
    if (document.getElementById('news-list')) {
        loadFeaturedNews(1);
        loadNews(1, 9);
        loadPopularNews(5);
    }

    // Search functionality
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    
    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            searchNews(searchInput.value);
        });
    }
});
