/**
 * Quản lý lưu nháp dữ liệu biểu mẫu (Form Draft)
 * Giúp không mất dữ liệu khi vô tình tải lại trang hoặc mất mạng
 */
class FormDraftManager {
    constructor(formId, options = {}) {
        this.formId = formId;
        this.form = document.getElementById(formId);
        
        // Tạo key duy nhất cho lưu trữ: bao gồm đường dẫn và ID form
        this.baseStorageKey = `formDraft_${window.location.pathname}_${formId}`;
        this.storageKey = this.baseStorageKey;

        
        // Options
        this.options = {
            excludeTypes: ['password', 'file', 'submit', 'reset', 'button'], // Không lưu các trường nhạy cảm hoặc file
            excludeClasses: ['no-draft'], // Thêm class 'no-draft' vào input nào không muốn lưu
            autoRestore: true, // Tự động khôi phục khi khởi tạo
            ...options
        };

        if (this.form) {
            this.init();
        } else {
            console.warn(`[FormDraftManager] Không tìm thấy form với ID "${formId}"`);
        }
    }

    init() {
        // Lắng nghe sự kiện input để lưu dữ liệu
        this.form.addEventListener('input', this.debounce(() => this.save(), 500));
        this.form.addEventListener('change', () => this.save()); // Bắt thêm change cho select/checkbox/radio

        // Tự động khôi phục nếu được cấu hình
        if (this.options.autoRestore) {
            this.restore();
        }
    }

    // Lấy tất cả các elements hợp lệ để lưu
    getValidElements() {
        return Array.from(this.form.elements).filter(el => {
            if (!el.name && !el.id) return false; // Cần có name hoặc id
            if (this.options.excludeTypes.includes(el.type)) return false;
            if (this.options.excludeClasses.some(cls => el.classList.contains(cls))) return false;
            return true;
        });
    }

    // Lưu dữ liệu vào sessionStorage
    save() {
        const data = {};
        const elements = this.getValidElements();

        elements.forEach(el => {
            const key = el.name || el.id;
            if (el.type === 'checkbox' || el.type === 'radio') {
                if (el.checked) {
                    if (!data[key]) data[key] = [];
                    data[key].push(el.value || 'on');
                } else if (el.type === 'checkbox' && !data[key]) {
                    // Đảm bảo checkbox uncheck cũng không bị reset nếu trước đó check
                     data[key] = [];
                }
            } else {
                data[key] = el.value;
            }
        });

        sessionStorage.setItem(this.storageKey, JSON.stringify(data));
        console.log(`[FormDraftManager] Đã lưu nháp form "${this.formId}" (key: ${this.storageKey})`);
    }

    // Lấy trạng thái có nháp hay không
    hasDraft() {
        const savedDataStr = sessionStorage.getItem(this.storageKey);
        if (!savedDataStr) return false;
        try {
            const data = JSON.parse(savedDataStr);
            return Object.keys(data).length > 0;
        } catch {
            return false;
        }
    }

    // Thiết lập Context (Dành cho các form tái sử dụng nhiều lần như Modal thêm/sửa)
    setContext(contextId) {
        this.storageKey = contextId ? `${this.baseStorageKey}_${contextId}` : this.baseStorageKey;
    }

    // Khôi phục dữ liệu từ sessionStorage
    restore() {
        const savedDataStr = sessionStorage.getItem(this.storageKey);
        if (!savedDataStr) return;

        try {
            const data = JSON.parse(savedDataStr);
            const elements = this.getValidElements();

            elements.forEach(el => {
                const key = el.name || el.id;
                if (data[key] !== undefined) {
                    if (el.type === 'checkbox' || el.type === 'radio') {
                        const values = Array.isArray(data[key]) ? data[key] : [data[key]];
                        if (values.includes(el.value || 'on')) {
                            el.checked = true;
                        } else {
                            el.checked = false;
                        }
                    } else {
                        // Trigger event input change để các logic khác (như validate) nếu có lắng nghe sẽ hoạt động
                        el.value = data[key];
                    }
                }
            });
            console.log(`[FormDraftManager] Đã khôi phục dữ liệu form "${this.formId}"`);
        } catch (error) {
            console.error(`[FormDraftManager] Lỗi khi khôi phục dữ liệu form "${this.formId}":`, error);
        }
    }

    // Xóa dữ liệu nháp (thường gọi khi submit thành công)
    clear() {
        sessionStorage.removeItem(this.storageKey);
        console.log(`[FormDraftManager] Đã xóa nháp form "${this.formId}"`);
    }

    // Utility: Debounce để tránh lưu liên tục khi gõ
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
}

// Gắn vào window để dễ sử dụng
window.FormDraftManager = FormDraftManager;
