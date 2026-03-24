// Loading Component
ComponentManager.register('loading', () => {
    return `
        <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
    `;
});

// Empty State Component
ComponentManager.register('emptyState', (data = {}) => {
    const { 
        icon = 'fa-box-open',
        title = 'Không có dữ liệu',
        message = 'Không tìm thấy nội dung nào',
        actionText = 'Quay lại',
        actionLink = 'index.html'
    } = data;
    
    return `
        <div class="text-center py-12">
            <i class="fas ${icon} text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-bold text-gray-700 mb-2">${title}</h3>
            <p class="text-gray-500 mb-6">${message}</p>
            <a href="${actionLink}" class="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition">
                ${actionText}
            </a>
        </div>
    `;
});

// Alert/Notification Component
ComponentManager.register('alert', (data = {}) => {
    const { type = 'info', message = '', dismissible = true } = data;
    
    const colors = {
        success: 'bg-green-100 text-green-800 border-green-300',
        error: 'bg-red-100 text-red-800 border-red-300',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        info: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    return `
        <div class="border-l-4 p-4 ${colors[type]} rounded" role="alert">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <i class="fas ${icons[type]} mr-3"></i>
                    <p>${message}</p>
                </div>
                ${dismissible ? '<button onclick="this.parentElement.parentElement.remove()" class="text-gray-600 hover:text-gray-800"><i class="fas fa-times"></i></button>' : ''}
            </div>
        </div>
    `;
});

// Breadcrumb Component
ComponentManager.register('breadcrumb', (items = []) => {
    return `
        <nav class="flex mb-6" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 md:space-x-3">
                <li class="inline-flex items-center">
                    <a href="index.html" class="text-gray-700 hover:text-orange-600 inline-flex items-center">
                        <i class="fas fa-home mr-2"></i>
                        Trang chủ
                    </a>
                </li>
                ${items.map((item, index) => `
                    <li>
                        <div class="flex items-center">
                            <i class="fas fa-chevron-right text-gray-400 mx-2"></i>
                            ${index === items.length - 1 
                                ? `<span class="text-gray-500">${item.name}</span>`
                                : `<a href="${item.url}" class="text-gray-700 hover:text-orange-600">${item.name}</a>`
                            }
                        </div>
                    </li>
                `).join('')}
            </ol>
        </nav>
    `;
});

// Modal Component
ComponentManager.register('modal', (data = {}) => {
    const { id = 'modal', title = '', content = '', size = 'md' } = data;
    
    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl'
    };
    
    return `
        <div id="${id}" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center">
            <div class="bg-white rounded-xl ${sizes[size]} w-full mx-4 max-h-screen overflow-y-auto">
                <div class="flex items-center justify-between p-6 border-b">
                    <h3 class="text-2xl font-bold">${title}</h3>
                    <button onclick="closeModal('${id}')" class="text-gray-600 hover:text-gray-800">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div class="p-6">
                    ${content}
                </div>
            </div>
        </div>
    `;
});

// Pagination Component
ComponentManager.register('pagination', (data = {}) => {
    const { currentPage = 1, totalPages = 1, onPageChange = 'changePage' } = data;
    
    let pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }
    
    return `
        <div class="flex justify-center space-x-2">
            <button 
                onclick="${onPageChange}(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}
                class="px-4 py-2 border rounded-lg hover:bg-orange-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="fas fa-chevron-left"></i>
            </button>
            ${pages.map(page => {
                if (page === '...') {
                    return '<span class="px-4 py-2">...</span>';
                }
                return `
                    <button 
                        onclick="${onPageChange}(${page})"
                        class="px-4 py-2 border rounded-lg ${page === currentPage ? 'bg-orange-600 text-white' : 'hover:bg-orange-600 hover:text-white'} transition">
                        ${page}
                    </button>
                `;
            }).join('')}
            <button 
                onclick="${onPageChange}(${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}
                class="px-4 py-2 border rounded-lg hover:bg-orange-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
});

// Utilities
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};
