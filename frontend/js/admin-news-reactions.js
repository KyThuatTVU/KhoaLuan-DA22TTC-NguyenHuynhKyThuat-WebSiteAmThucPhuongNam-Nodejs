// Admin News Reactions Management - Updated for new UI
const REACTIONS_API_URL = 'http://localhost:3000/api';

let allReactions = [];
let allNews = [];
let selectedIds = new Set();
let currentPage = 1;
const itemsPerPage = 15;

const reactionIcons = {
    like: '👍',
    love: '❤️',
    haha: '😄',
    wow: '😮',
    sad: '😢',
    angry: '😠'
};

const reactionLabels = {
    like: 'Thích',
    love: 'Yêu thích',
    haha: 'Haha',
    wow: 'Wow',
    sad: 'Buồn',
    angry: 'Phẫn nộ'
};

// Load all data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadReactions();
    loadNewsList();
    
    // Search on enter
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
});

// Load all reactions
async function loadReactions() {
    try {
        console.log('🔄 Loading reactions...');
        const response = await fetch(`${REACTIONS_API_URL}/news/admin/reactions/all`, {
            credentials: 'include'
        });
        
        console.log('📊 Response status:', response.status);
        const result = await response.json();
        console.log('📦 Result:', result);

        if (result.success) {
            allReactions = result.data || [];
            console.log('✅ Loaded', allReactions.length, 'reactions');
            updateStats();
            renderReactionsTable();
            renderNewsSummary();
        } else {
            console.error('❌ API error:', result.message);
            showTableError(result.message || 'Lỗi tải dữ liệu');
        }
    } catch (error) {
        console.error('❌ Lỗi tải reactions:', error);
        showTableError('Không thể kết nối đến server');
    }
}

function showTableError(message) {
    const tbody = document.getElementById('reactions-table-body');
    const summaryBody = document.getElementById('news-summary-body');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-red-500"><i class="fas fa-exclamation-circle text-2xl mb-2"></i><p>${message}</p></td></tr>`;
    }
    if (summaryBody) {
        summaryBody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-red-500">${message}</td></tr>`;
    }
}

// Load news list for filter
async function loadNewsList() {
    try {
        const response = await fetch(`${REACTIONS_API_URL}/news/admin/all`, {
            credentials: 'include'
        });
        const result = await response.json();

        if (result.success) {
            allNews = result.data;
            const select = document.getElementById('filter-news');
            result.data.forEach(news => {
                const option = document.createElement('option');
                option.value = news.ma_tin_tuc;
                option.textContent = news.tieu_de.substring(0, 50) + (news.tieu_de.length > 50 ? '...' : '');
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Lỗi tải danh sách tin tức:', error);
    }
}

// Update statistics
function updateStats() {
    document.getElementById('total-reactions').textContent = allReactions.length;
    
    // Unique news with reactions
    const uniqueNews = new Set(allReactions.map(r => r.ma_tin_tuc));
    document.getElementById('news-with-reactions').textContent = uniqueNews.size;
    
    // Most popular reaction
    const reactionCounts = {};
    allReactions.forEach(r => {
        reactionCounts[r.loai_cam_xuc] = (reactionCounts[r.loai_cam_xuc] || 0) + 1;
    });
    const popular = Object.entries(reactionCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('popular-reaction').textContent = popular ? reactionIcons[popular[0]] : '-';
    
    // Unique users
    const uniqueUsers = new Set(allReactions.map(r => r.ma_nguoi_dung));
    document.getElementById('unique-users').textContent = uniqueUsers.size;
}

// Render reactions table
function renderReactionsTable() {
    const tbody = document.getElementById('reactions-table-body');
    const filtered = getFilteredReactions();
    
    // Pagination
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filtered.slice(start, end);
    
    document.getElementById('showing-count').textContent = paginated.length;
    document.getElementById('total-count').textContent = filtered.length;
    
    if (!tbody) {
        console.error('❌ Không tìm thấy reactions-table-body');
        return;
    }
    
    if (paginated.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-12 text-slate-500"><i class="fas fa-inbox text-4xl mb-3 block"></i>Chưa có reactions nào</td></tr>';
        return;
    }

    tbody.innerHTML = paginated.map(reaction => `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="py-4 px-4">
                <input type="checkbox" class="reaction-checkbox" value="${reaction.ma_cam_xuc}" 
                    ${selectedIds.has(reaction.ma_cam_xuc) ? 'checked' : ''} onchange="toggleSelect(${reaction.ma_cam_xuc})">
            </td>
            <td class="py-4 px-4">
                <p class="font-medium text-slate-800 max-w-[200px] truncate">${reaction.tieu_de || 'N/A'}</p>
                <p class="text-xs text-slate-500">ID: ${reaction.ma_tin_tuc}</p>
            </td>
            <td class="py-4 px-4">
                <div class="flex items-center space-x-3">
                    <img src="${getAvatarUrl(reaction.anh_dai_dien, reaction.ten_nguoi_dung)}" 
                        class="w-9 h-9 rounded-full object-cover" 
                        onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(reaction.ten_nguoi_dung || 'U')}&background=3b82f6&color=fff'">
                    <div>
                        <p class="font-medium text-slate-800">${reaction.ten_nguoi_dung || 'Ẩn danh'}</p>
                        <p class="text-xs text-slate-500">${reaction.email || ''}</p>
                    </div>
                </div>
            </td>
            <td class="py-4 px-4">
                <span class="reaction-badge">
                    <span class="text-lg">${reactionIcons[reaction.loai_cam_xuc]}</span>
                    <span class="text-slate-700">${reactionLabels[reaction.loai_cam_xuc]}</span>
                </span>
            </td>
            <td class="py-4 px-4 text-sm text-slate-500">
                ${formatDate(reaction.ngay_tao)}
            </td>
            <td class="py-4 px-4 text-center">
                <div class="flex justify-center gap-2">
                    <button onclick="editReaction(${reaction.ma_cam_xuc}, '${reaction.loai_cam_xuc}')" 
                        class="text-blue-600 hover:text-blue-800" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteReaction(${reaction.ma_cam_xuc})" 
                        class="text-red-600 hover:text-red-800" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    renderPagination(filtered.length);
}

// Render news summary
function renderNewsSummary() {
    const tbody = document.getElementById('news-summary-body');
    
    // Group reactions by news
    const newsReactions = {};
    allReactions.forEach(r => {
        if (!newsReactions[r.ma_tin_tuc]) {
            newsReactions[r.ma_tin_tuc] = {
                ma_tin_tuc: r.ma_tin_tuc,
                tieu_de: r.tieu_de,
                like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0
            };
        }
        newsReactions[r.ma_tin_tuc][r.loai_cam_xuc]++;
    });

    const summaryData = Object.values(newsReactions).sort((a, b) => {
        const totalA = a.like + a.love + a.haha + a.wow + a.sad + a.angry;
        const totalB = b.like + b.love + b.haha + b.wow + b.sad + b.angry;
        return totalB - totalA;
    });

    if (summaryData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-slate-500">Chưa có dữ liệu</td></tr>';
        return;
    }

    tbody.innerHTML = summaryData.map(news => {
        const total = news.like + news.love + news.haha + news.wow + news.sad + news.angry;
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="py-4 px-4">
                    <p class="font-medium text-slate-800 max-w-[250px] truncate">${news.tieu_de || 'N/A'}</p>
                </td>
                <td class="py-4 px-2 text-center text-slate-600">${news.like || '-'}</td>
                <td class="py-4 px-2 text-center text-slate-600">${news.love || '-'}</td>
                <td class="py-4 px-2 text-center text-slate-600">${news.haha || '-'}</td>
                <td class="py-4 px-2 text-center text-slate-600">${news.wow || '-'}</td>
                <td class="py-4 px-2 text-center text-slate-600">${news.sad || '-'}</td>
                <td class="py-4 px-2 text-center text-slate-600">${news.angry || '-'}</td>
                <td class="py-4 px-4 text-center font-bold text-blue-600">${total}</td>
                <td class="py-4 px-4 text-center">
                    <button onclick="deleteAllReactionsForNews(${news.ma_tin_tuc})" 
                        class="text-red-600 hover:text-red-800" title="Xóa tất cả reactions">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Get filtered reactions
function getFilteredReactions() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const reactionType = document.getElementById('filter-reaction').value;
    const newsId = document.getElementById('filter-news').value;

    return allReactions.filter(r => {
        const matchSearch = !search || 
            (r.tieu_de && r.tieu_de.toLowerCase().includes(search)) ||
            (r.ten_nguoi_dung && r.ten_nguoi_dung.toLowerCase().includes(search));
        const matchReaction = !reactionType || r.loai_cam_xuc === reactionType;
        const matchNews = !newsId || r.ma_tin_tuc == newsId;
        return matchSearch && matchReaction && matchNews;
    });
}

// Apply filters
function applyFilters() {
    currentPage = 1;
    renderReactionsTable();
}

// Pagination
function renderPagination(total) {
    const totalPages = Math.ceil(total / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (!pagination) return;
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="goToPage(${i})" 
            class="px-3 py-1.5 rounded-lg text-sm ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}">${i}</button>`;
    }
    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderReactionsTable();
}

// Selection
function toggleSelect(id) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
    } else {
        selectedIds.add(id);
    }
    updateSelectedCount();
}

function toggleSelectAll() {
    const checkAll = document.getElementById('select-all').checked;
    const checkboxes = document.querySelectorAll('.reaction-checkbox');
    
    if (checkAll) {
        checkboxes.forEach(cb => {
            selectedIds.add(parseInt(cb.value));
            cb.checked = true;
        });
    } else {
        selectedIds.clear();
        checkboxes.forEach(cb => cb.checked = false);
    }
    updateSelectedCount();
}

function updateSelectedCount() {
    document.getElementById('selected-count').textContent = selectedIds.size;
    document.getElementById('btn-delete-selected').disabled = selectedIds.size === 0;
}

// Edit reaction
function editReaction(id, currentType) {
    document.getElementById('edit-reaction-id').value = id;
    document.getElementById('edit-reaction-type').value = currentType;
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

async function saveReaction() {
    const id = document.getElementById('edit-reaction-id').value;
    const newType = document.getElementById('edit-reaction-type').value;

    try {
        const response = await fetch(`${REACTIONS_API_URL}/news/admin/reactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ loai_cam_xuc: newType })
        });

        const result = await response.json();
        if (result.success) {
            alert('Cập nhật thành công!');
            closeEditModal();
            loadReactions();
        } else {
            alert(result.message || 'Lỗi cập nhật');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Lỗi kết nối server');
    }
}

// Delete reaction
async function deleteReaction(id) {
    if (!confirm('Bạn có chắc muốn xóa reaction này?')) return;

    try {
        const response = await fetch(`${REACTIONS_API_URL}/news/admin/reactions/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();
        if (result.success) {
            alert('Xóa thành công!');
            loadReactions();
        } else {
            alert(result.message || 'Lỗi xóa');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Lỗi kết nối server');
    }
}

// Delete selected
async function deleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.size} reactions đã chọn?`)) return;

    try {
        const response = await fetch(`${REACTIONS_API_URL}/news/admin/reactions/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ids: Array.from(selectedIds) })
        });

        const result = await response.json();
        if (result.success) {
            alert('Xóa thành công!');
            selectedIds.clear();
            updateSelectedCount();
            loadReactions();
        } else {
            alert(result.message || 'Lỗi xóa');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Lỗi kết nối server');
    }
}

// Delete all reactions for a news
async function deleteAllReactionsForNews(newsId) {
    if (!confirm('Bạn có chắc muốn xóa TẤT CẢ reactions của tin tức này?')) return;

    try {
        const response = await fetch(`${REACTIONS_API_URL}/news/admin/reactions/news/${newsId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();
        if (result.success) {
            alert('Xóa thành công!');
            loadReactions();
        } else {
            alert(result.message || 'Lỗi xóa');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Lỗi kết nối server');
    }
}

// Export data
function exportData() {
    const filtered = getFilteredReactions();
    let csv = 'ID,Tin tức,Người dùng,Email,Reaction,Ngày tạo\n';
    filtered.forEach(r => {
        csv += `${r.ma_cam_xuc},"${r.tieu_de || ''}","${r.ten_nguoi_dung || ''}","${r.email || ''}",${r.loai_cam_xuc},${r.ngay_tao}\n`;
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// Helpers
function getAvatarUrl(anh_dai_dien, ten) {
    if (anh_dai_dien) {
        if (anh_dai_dien.startsWith('http')) return anh_dai_dien;
        if (anh_dai_dien.startsWith('/')) return `http://localhost:3000${anh_dai_dien}`;
        return `http://localhost:3000/${anh_dai_dien}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(ten || 'U')}&background=f97316&color=fff`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// Close edit modal
function closeEditModal() {
    document.getElementById('edit-modal')?.classList.add('hidden');
}
