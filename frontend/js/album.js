// Album API Configuration
const ALBUM_API_URL = 'http://localhost:3000/api/albums';

// Mapping loại ảnh sang category filter
const CATEGORY_MAP = {
    'mon_an': 'dishes',
    'khong_gian': 'restaurant',
    'su_kien': 'events',
    'khach_hang': 'customers',
    'khong_ro': 'all'
};

// Reverse mapping cho filter
const FILTER_MAP = {
    'all': null,
    'dishes': 'mon_an',
    'restaurant': 'khong_gian',
    'events': 'su_kien',
    'customers': 'khach_hang'
};

let currentPage = 1;
let currentFilter = 'all';
const itemsPerPage = 12;

// Load album từ API
async function loadAlbums(filter = 'all', page = 1) {
    try {
        const galleryContainer = document.getElementById('gallery');
        
        // Show loading - use LoadingManager if available
        if (typeof LoadingManager !== 'undefined') {
            LoadingManager.showSectionLoading(galleryContainer, 'Đang tải album...');
        } else {
            galleryContainer.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-spinner fa-spin text-4xl text-orange-600"></i>
                    <p class="mt-4 text-gray-600">Đang tải album...</p>
                </div>
            `;
        }

        let url;
        if (filter === 'all' || !FILTER_MAP[filter]) {
            url = `${ALBUM_API_URL}?page=${page}&limit=${itemsPerPage}`;
        } else {
            const loaiAnh = FILTER_MAP[filter];
            url = `${ALBUM_API_URL}/category/${loaiAnh}?page=${page}&limit=${itemsPerPage}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Không thể tải album');
        }

        displayAlbums(result.data);
        displayPagination(result.pagination);

    } catch (error) {
        console.error('Lỗi load album:', error);
        const galleryContainer = document.getElementById('gallery');
        galleryContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-circle text-4xl text-red-500"></i>
                <p class="mt-4 text-gray-600">Không thể tải album ảnh</p>
                <p class="text-sm text-gray-500">${error.message}</p>
            </div>
        `;
    }
}

// Hiển thị danh sách album
function displayAlbums(albums) {
    const galleryContainer = document.getElementById('gallery');

    if (!albums || albums.length === 0) {
        galleryContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-images text-4xl text-gray-400"></i>
                <p class="mt-4 text-gray-600">Chưa có ảnh trong album này</p>
            </div>
        `;
        return;
    }

    const categoryName = getCategoryName(currentFilter);
    
    galleryContainer.innerHTML = albums.map(album => {
        // Xử lý đường dẫn ảnh - ảnh được lưu trong /images/ không phải /images/albums/
        let imagePath;
        if (album.duong_dan_anh.startsWith('http')) {
            imagePath = album.duong_dan_anh;
        } else if (album.duong_dan_anh.startsWith('/images/') || album.duong_dan_anh.startsWith('images/')) {
            imagePath = `http://localhost:3000/${album.duong_dan_anh.replace(/^\//, '')}`;
        } else {
            // Chỉ có tên file
            imagePath = `http://localhost:3000/images/${album.duong_dan_anh}`;
        }
        
        const category = CATEGORY_MAP[album.loai_anh] || 'all';
        
        return `
            <div class="gallery-item rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300" 
                 data-category="${category}"
                 data-id="${album.ma_album}">
                <div class="relative overflow-hidden">
                    <img src="${imagePath}" 
                         alt="${album.mo_ta || 'Album ảnh'}"
                         class="w-full h-64 object-cover"
                         onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600'">
                    <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                        <button onclick="viewFullImage('${imagePath}', '${album.mo_ta || 'Album ảnh'}')" 
                                class="bg-white text-orange-600 px-4 py-2 rounded-full font-medium hover:bg-orange-600 hover:text-white transition">
                            <i class="fas fa-search-plus mr-2"></i>Xem chi tiết
                        </button>
                    </div>
                </div>
                <div class="p-4 bg-white">
                    <h3 class="font-medium text-lg line-clamp-1">${album.mo_ta || 'Ảnh album'}</h3>
                    <p class="text-gray-600 text-sm mt-1">
                        <i class="far fa-calendar mr-1"></i>
                        ${formatDate(album.ngay_tao)}
                    </p>
                </div>
            </div>
        `;
    }).join('');

    // Reinitialize GSAP animations if exists
    if (typeof initAlbumAnimations === 'function') {
        setTimeout(initAlbumAnimations, 100);
    }
}

// Hiển thị phân trang
function displayPagination(pagination) {
    if (!pagination || pagination.totalPages <= 1) return;

    const gallerySection = document.querySelector('#gallery').parentElement;
    
    // Remove old pagination
    const oldPagination = gallerySection.querySelector('.pagination-container');
    if (oldPagination) oldPagination.remove();

    const paginationHTML = `
        <div class="pagination-container mt-8 flex justify-center gap-2">
            ${pagination.page > 1 ? `
                <button onclick="changePage(${pagination.page - 1})" 
                        class="px-4 py-2 border rounded-lg hover:bg-orange-50">
                    <i class="fas fa-chevron-left"></i>
                </button>
            ` : ''}
            
            ${Array.from({length: pagination.totalPages}, (_, i) => i + 1).map(page => `
                <button onclick="changePage(${page})" 
                        class="px-4 py-2 border rounded-lg ${page === pagination.page ? 'bg-orange-600 text-white' : 'hover:bg-orange-50'}">
                    ${page}
                </button>
            `).join('')}
            
            ${pagination.page < pagination.totalPages ? `
                <button onclick="changePage(${pagination.page + 1})" 
                        class="px-4 py-2 border rounded-lg hover:bg-orange-50">
                    <i class="fas fa-chevron-right"></i>
                </button>
            ` : ''}
        </div>
    `;

    gallerySection.insertAdjacentHTML('beforeend', paginationHTML);
}

// Change page
function changePage(page) {
    currentPage = page;
    loadAlbums(currentFilter, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// View full image in modal
function viewFullImage(imageSrc, description) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="relative max-w-5xl w-full">
            <button onclick="this.closest('.fixed').remove()" 
                    class="absolute top-4 right-4 text-white text-3xl hover:text-orange-400 transition z-10">
                <i class="fas fa-times"></i>
            </button>
            <img src="${imageSrc}" alt="${description}" class="w-full h-auto max-h-[90vh] object-contain rounded-lg">
            ${description ? `
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 rounded-b-lg">
                    <p class="text-white text-lg">${description}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Get category name in Vietnamese
function getCategoryName(filter) {
    const names = {
        'all': 'Tất cả',
        'dishes': 'Món ăn',
        'restaurant': 'Nhà hàng',
        'events': 'Sự kiện',
        'customers': 'Khách hàng'
    };
    return names[filter] || 'Tất cả';
}

// Format date - hiển thị ngày tháng từ server (đã đúng timezone VN)
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    // dateString từ server đã ở dạng "YYYY-MM-DD HH:mm:ss" theo timezone VN
    // Chỉ cần parse và format lại
    const parts = dateString.split(' ')[0].split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    
    // Fallback nếu format khác
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Setup filter buttons
function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => {
                b.classList.remove('active', 'bg-orange-600', 'text-white');
                b.classList.add('bg-gray-100', 'text-gray-700');
            });
            btn.classList.add('active', 'bg-orange-600', 'text-white');
            btn.classList.remove('bg-gray-100', 'text-gray-700');

            // Load filtered albums
            const filter = btn.getAttribute('data-filter');
            currentFilter = filter;
            currentPage = 1;
            loadAlbums(filter, 1);
        });
    });

    // Set initial active state
    const activeBtn = document.querySelector('.filter-btn.active');
    if (activeBtn) {
        activeBtn.classList.add('bg-orange-600', 'text-white');
        activeBtn.classList.remove('bg-gray-100', 'text-gray-700');
    }
    
    filterBtns.forEach(btn => {
        if (!btn.classList.contains('active')) {
            btn.classList.add('bg-gray-100', 'text-gray-700');
        }
    });
}

// Load categories dynamically
async function loadCategories() {
    try {
        const response = await fetch(`${ALBUM_API_URL}/categories/list`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            // Update filter buttons with actual counts
            result.data.forEach(cat => {
                const filterKey = CATEGORY_MAP[cat.loai_anh];
                const btn = document.querySelector(`[data-filter="${filterKey}"]`);
                if (btn) {
                    btn.innerHTML = `${btn.textContent.trim()} <span class="text-xs ml-1">(${cat.so_luong})</span>`;
                }
            });
        }
    } catch (error) {
        console.error('Lỗi load categories:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupFilterButtons();
    loadCategories();
    loadAlbums('all', 1);
});
