// Button Components
ComponentManager.register('button', (data = {}) => {
    const {
        text = 'Button',
        type = 'primary', // primary, secondary, outline, danger, success
        size = 'md', // sm, md, lg
        icon = '',
        iconPosition = 'left', // left, right
        link = '#',
        fullWidth = false,
        disabled = false,
        onClick = ''
    } = data;
    
    const typeClasses = {
        primary: 'bg-orange-600 text-white hover:bg-orange-700',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700',
        outline: 'border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        success: 'bg-green-600 text-white hover:bg-green-700'
    };
    
    const sizeClasses = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg'
    };
    
    const iconHtml = icon ? `<i class="fas ${icon} ${iconPosition === 'right' ? 'ml-2' : 'mr-2'}"></i>` : '';
    
    return `
        <a href="${link}" 
           class="${typeClasses[type]} ${sizeClasses[size]} ${fullWidth ? 'w-full block text-center' : 'inline-block'} 
                  rounded-lg font-medium transition duration-300 transform hover:scale-105 
                  ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}"
           ${onClick ? `onclick="${onClick}"` : ''}>
            ${iconPosition === 'left' ? iconHtml : ''}
            ${text}
            ${iconPosition === 'right' ? iconHtml : ''}
        </a>
    `;
});

// Form Input Component
ComponentManager.register('formInput', (data = {}) => {
    const {
        type = 'text',
        name = '',
        label = '',
        placeholder = '',
        required = false,
        icon = '',
        helperText = '',
        error = ''
    } = data;
    
    return `
        <div class="mb-4">
            ${label ? `<label class="block text-sm font-medium mb-2 text-gray-700">${label} ${required ? '<span class="text-red-500">*</span>' : ''}</label>` : ''}
            <div class="relative">
                ${icon ? `
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fas ${icon} text-gray-400"></i>
                    </div>
                ` : ''}
                <input type="${type}" 
                       name="${name}"
                       placeholder="${placeholder}"
                       ${required ? 'required' : ''}
                       class="w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 border rounded-lg 
                              focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200
                              ${error ? 'border-red-500' : 'border-gray-300'}">
            </div>
            ${helperText ? `<p class="text-sm text-gray-500 mt-1">${helperText}</p>` : ''}
            ${error ? `<p class="text-sm text-red-500 mt-1">${error}</p>` : ''}
        </div>
    `;
});

// Form Textarea Component
ComponentManager.register('formTextarea', (data = {}) => {
    const {
        name = '',
        label = '',
        placeholder = '',
        rows = 4,
        required = false,
        helperText = '',
        error = ''
    } = data;
    
    return `
        <div class="mb-4">
            ${label ? `<label class="block text-sm font-medium mb-2 text-gray-700">${label} ${required ? '<span class="text-red-500">*</span>' : ''}</label>` : ''}
            <textarea name="${name}"
                      rows="${rows}"
                      placeholder="${placeholder}"
                      ${required ? 'required' : ''}
                      class="w-full px-4 py-3 border rounded-lg 
                             focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200
                             ${error ? 'border-red-500' : 'border-gray-300'}"></textarea>
            ${helperText ? `<p class="text-sm text-gray-500 mt-1">${helperText}</p>` : ''}
            ${error ? `<p class="text-sm text-red-500 mt-1">${error}</p>` : ''}
        </div>
    `;
});

// Form Select Component
ComponentManager.register('formSelect', (data = {}) => {
    const {
        name = '',
        label = '',
        options = [],
        required = false,
        icon = '',
        helperText = '',
        error = ''
    } = data;
    
    return `
        <div class="mb-4">
            ${label ? `<label class="block text-sm font-medium mb-2 text-gray-700">${label} ${required ? '<span class="text-red-500">*</span>' : ''}</label>` : ''}
            <div class="relative">
                ${icon ? `
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fas ${icon} text-gray-400"></i>
                    </div>
                ` : ''}
                <select name="${name}"
                        ${required ? 'required' : ''}
                        class="w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 border rounded-lg 
                               focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200
                               ${error ? 'border-red-500' : 'border-gray-300'}">
                    ${options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                </select>
            </div>
            ${helperText ? `<p class="text-sm text-gray-500 mt-1">${helperText}</p>` : ''}
            ${error ? `<p class="text-sm text-red-500 mt-1">${error}</p>` : ''}
        </div>
    `;
});

// Card Component
ComponentManager.register('card', (data = {}) => {
    const {
        title = '',
        subtitle = '',
        content = '',
        image = '',
        footer = '',
        badge = '',
        link = '#',
        hoverable = true
    } = data;
    
    return `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden ${hoverable ? 'hover:shadow-lg transition duration-300' : ''}">
            ${image ? `
                <div class="relative">
                    <img src="${image}" alt="${title}" class="w-full h-48 object-cover">
                    ${badge ? `<span class="absolute top-3 left-3 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium">${badge}</span>` : ''}
                </div>
            ` : ''}
            <div class="p-6">
                ${title ? `<h3 class="text-xl font-bold mb-2 text-gray-800">${title}</h3>` : ''}
                ${subtitle ? `<p class="text-gray-500 text-sm mb-3">${subtitle}</p>` : ''}
                ${content ? `<div class="text-gray-600 mb-4">${content}</div>` : ''}
                ${link !== '#' ? `
                    <a href="${link}" class="text-orange-600 hover:text-orange-700 font-medium">
                        Xem thêm <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                ` : ''}
            </div>
            ${footer ? `
                <div class="border-t px-6 py-4 bg-gray-50">
                    ${footer}
                </div>
            ` : ''}
        </div>
    `;
});

// Badge Component
ComponentManager.register('badge', (data = {}) => {
    const {
        text = '',
        type = 'default', // default, success, warning, danger, info
        size = 'md', // sm, md, lg
        icon = ''
    } = data;
    
    const typeClasses = {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        primary: 'bg-orange-100 text-orange-800'
    };
    
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-2 text-base'
    };
    
    return `
        <span class="${typeClasses[type]} ${sizeClasses[size]} rounded-full font-medium inline-flex items-center">
            ${icon ? `<i class="fas ${icon} mr-1"></i>` : ''}
            ${text}
        </span>
    `;
});

// Accordion Component
ComponentManager.register('accordion', (items = []) => {
    return `
        <div class="space-y-3">
            ${items.map((item, index) => `
                <div class="border rounded-lg overflow-hidden">
                    <button type="button" 
                            class="accordion-header w-full px-6 py-4 text-left bg-white hover:bg-gray-50 flex items-center justify-between"
                            onclick="toggleAccordion(${index})">
                        <span class="font-medium text-gray-800">${item.title}</span>
                        <i class="fas fa-chevron-down transition-transform duration-300" id="accordion-icon-${index}"></i>
                    </button>
                    <div class="accordion-content px-6 py-0 max-h-0 overflow-hidden transition-all duration-300" 
                         id="accordion-content-${index}">
                        <div class="pb-4 text-gray-600">
                            ${item.content}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
});

// Tab Component
ComponentManager.register('tabs', (data = {}) => {
    const { tabs = [], activeTab = 0 } = data;
    
    return `
        <div class="tabs-container">
            <div class="flex border-b mb-6 overflow-x-auto">
                ${tabs.map((tab, index) => `
                    <button type="button"
                            class="tab-button px-6 py-3 font-medium transition ${index === activeTab ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-600 hover:text-orange-600'}"
                            onclick="switchTab(${index})">
                        ${tab.icon ? `<i class="fas ${tab.icon} mr-2"></i>` : ''}
                        ${tab.title}
                    </button>
                `).join('')}
            </div>
            <div class="tab-contents">
                ${tabs.map((tab, index) => `
                    <div class="tab-content ${index === activeTab ? '' : 'hidden'}" id="tab-content-${index}">
                        ${tab.content}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
});

// Progress Bar Component
ComponentManager.register('progressBar', (data = {}) => {
    const {
        progress = 0,
        label = '',
        color = 'orange',
        height = 'h-2',
        showPercentage = true
    } = data;
    
    return `
        <div class="mb-4">
            ${label ? `
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700">${label}</span>
                    ${showPercentage ? `<span class="text-sm text-gray-500">${progress}%</span>` : ''}
                </div>
            ` : ''}
            <div class="w-full bg-gray-200 rounded-full ${height} overflow-hidden">
                <div class="bg-${color}-600 ${height} rounded-full transition-all duration-500" 
                     style="width: ${progress}%"></div>
            </div>
        </div>
    `;
});

// Toast Notification
ComponentManager.register('toast', (data = {}) => {
    const {
        message = '',
        type = 'info', // success, error, warning, info
        duration = 3000,
        position = 'top-right' // top-right, top-left, bottom-right, bottom-left
    } = data;
    
    const typeClasses = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const positionClasses = {
        'top-right': 'top-6 right-6',
        'top-left': 'top-6 left-6',
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6'
    };
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    return `
        <div class="fixed ${positionClasses[position]} z-50 ${typeClasses[type]} text-white px-6 py-4 rounded-lg shadow-lg 
                    transform transition-all duration-300 toast-notification">
            <div class="flex items-center space-x-3">
                <i class="fas ${icons[type]} text-xl"></i>
                <span>${message}</span>
            </div>
        </div>
    `;
});

// Utility functions
window.toggleAccordion = function(index) {
    const content = document.getElementById(`accordion-content-${index}`);
    const icon = document.getElementById(`accordion-icon-${index}`);
    
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.style.transform = 'rotate(180deg)';
    }
};

window.switchTab = function(index) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('text-orange-600', 'border-b-2', 'border-orange-600');
        button.classList.add('text-gray-600');
    });
    
    // Show selected tab
    document.getElementById(`tab-content-${index}`).classList.remove('hidden');
    
    // Activate selected button
    const buttons = document.querySelectorAll('.tab-button');
    buttons[index].classList.add('text-orange-600', 'border-b-2', 'border-orange-600');
    buttons[index].classList.remove('text-gray-600');
};

// Show toast
window.showToast = function(message, type = 'info', duration = 3000, position = 'top-right') {
    const toast = ComponentManager.render('toast', { message, type, duration, position });
    const div = document.createElement('div');
    div.innerHTML = toast;
    document.body.appendChild(div.firstElementChild);
    
    setTimeout(() => {
        const toastEl = document.querySelector('.toast-notification');
        if (toastEl) {
            toastEl.style.opacity = '0';
            setTimeout(() => toastEl.remove(), 300);
        }
    }, duration);
};
