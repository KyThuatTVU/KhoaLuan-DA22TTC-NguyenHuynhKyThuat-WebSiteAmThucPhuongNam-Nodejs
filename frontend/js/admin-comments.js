// Admin Comments Management - Updated for new UI
const COMMENTS_API_URL = 'http://localhost:3000/api/news';

let allComments = [];
let allNews = [];

// Load on page ready
document.addEventListener('DOMContentLoaded', () => {
    loadComments();
    loadNewsList();
});

// Load all comments
async function loadComments() {
    try {
        console.log('🔄 Loading comments...');
        const response = await fetch(`${COMMENTS_API_URL}/admin/comments/all`, {
            credentials: 'include'
        });
        
        console.log('📊 Response status:', response.status);
        const result = await response.json();
        console.log('📦 Result:', result);
        
        if (result.success) {
            allComments = result.data || [];
            console.log('✅ Loaded', allComments.length, 'comments');
            updateStats();
            displayComments(allComments);
        } else {
            console.error('❌ API error:', result.message);
            showError(result.message || 'Không thể tải bình luận');
        }
    } catch (error) {
        console.error('❌ Lỗi:', error);
        showError('Không thể kết nối đến server');
    }
}

// Load news list for filter
async function loadNewsList() {
    try {
        const response = await fetch(`${COMMENTS_API_URL}/admin/all`, {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            allNews = result.data;
            const select = document.getElementById('news-filter');
            if (select) {
                result.data.forEach(news => {
                    const option = document.createElement('option');
                    option.value = news.ma_tin_tuc;
                    option.textContent = news.tieu_de.substring(0, 40) + (news.tieu_de.length > 40 ? '...' : '');
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Lỗi tải tin tức:', error);
    }
}

// Update statistics - chỉ đếm comment gốc của user, không đếm replies của admin
function updateStats() {
    // Chỉ đếm comment gốc (không phải reply)
    const parentComments = allComments.filter(c => !c.ma_binh_luan_cha);
    
    const total = parentComments.length;
    const approved = parentComments.filter(c => c.trang_thai === 'approved').length;
    const pending = parentComments.filter(c => c.trang_thai === 'pending').length;
    const rejected = parentComments.filter(c => c.trang_thai === 'rejected').length;
    
    const statTotal = document.getElementById('stat-total');
    const statApproved = document.getElementById('stat-approved');
    const statPending = document.getElementById('stat-pending');
    const statRejected = document.getElementById('stat-rejected');
    
    if (statTotal) statTotal.textContent = total;
    if (statApproved) statApproved.textContent = approved;
    if (statPending) statPending.textContent = pending;
    if (statRejected) statRejected.textContent = rejected;
}

// Display comments with inline replies section
function displayComments(comments) {
    const tbody = document.getElementById('comments-table');
    if (!tbody) return;
    
    if (comments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-500">Không có bình luận nào</td></tr>`;
        return;
    }
    
    // Lọc chỉ lấy comment cha (không phải reply) - QUAN TRỌNG: loại bỏ cả replies của admin
    const parentComments = comments.filter(c => !c.ma_binh_luan_cha);
    
    // Lấy replies cho mỗi comment (bao gồm cả admin replies)
    const repliesMap = {};
    comments.forEach(c => {
        if (c.ma_binh_luan_cha) {
            if (!repliesMap[c.ma_binh_luan_cha]) {
                repliesMap[c.ma_binh_luan_cha] = [];
            }
            repliesMap[c.ma_binh_luan_cha].push(c);
        }
    });
    
    console.log('📊 Parent comments:', parentComments.length);
    console.log('📊 Replies map:', repliesMap);
    
    tbody.innerHTML = parentComments.map(comment => {
        const replies = repliesMap[comment.ma_binh_luan] || [];
        const hasReplies = replies.length > 0;
        const replyBadge = hasReplies ? 
            `<span class="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                <i class="fas fa-reply mr-1"></i>${replies.length} trả lời
            </span>` : '';
        
        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 ${hasReplies ? 'bg-green-50/30' : ''}">
            <td class="py-4 px-4">
                <div class="flex items-center space-x-3">
                    <img src="${getAvatarUrl(comment.anh_dai_dien, comment.ten_nguoi_binh_luan)}" 
                         class="w-10 h-10 rounded-full object-cover"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(comment.ten_nguoi_binh_luan)}&background=3b82f6&color=fff'">
                    <div>
                        <p class="font-medium text-slate-800">${comment.ten_nguoi_binh_luan}</p>
                        <p class="text-xs text-slate-500">${comment.email_nguoi_binh_luan || ''}</p>
                    </div>
                </div>
            </td>
            <td class="py-4 px-4">
                <p class="text-sm text-slate-700 max-w-xs truncate">${escapeHtml(comment.noi_dung)}</p>
                ${replyBadge}
            </td>
            <td class="py-4 px-4">
                <p class="text-sm text-slate-600 max-w-[150px] truncate">${comment.tieu_de_tin_tuc || 'N/A'}</p>
            </td>
            <td class="py-4 px-4">
                <div class="flex flex-wrap gap-1">
                    <button type="button" onclick="updateStatus(${comment.ma_binh_luan}, 'pending', event); return false;" 
                        class="px-2 py-1 rounded-lg text-xs font-medium transition-all ${comment.trang_thai === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}" 
                        title="Chờ duyệt">
                        <i class="fas fa-clock"></i>
                    </button>
                    <button type="button" onclick="updateStatus(${comment.ma_binh_luan}, 'approved', event); return false;" 
                        class="px-2 py-1 rounded-lg text-xs font-medium transition-all ${comment.trang_thai === 'approved' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}" 
                        title="Đã duyệt">
                        <i class="fas fa-check"></i>
                    </button>
                    <button type="button" onclick="updateStatus(${comment.ma_binh_luan}, 'rejected', event); return false;" 
                        class="px-2 py-1 rounded-lg text-xs font-medium transition-all ${comment.trang_thai === 'rejected' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}" 
                        title="Từ chối">
                        <i class="fas fa-ban"></i>
                    </button>
                </div>
            </td>
            <td class="py-4 px-4 text-sm text-slate-500">
                ${formatDate(comment.ngay_binh_luan)}
            </td>
            <td class="py-4 px-4 text-center">
                <div class="flex justify-center gap-2">
                    <button type="button" onclick="toggleRepliesSection(${comment.ma_binh_luan}, event); return false;" 
                        class="p-2 ${hasReplies ? 'text-blue-600 hover:bg-blue-50' : 'text-green-600 hover:bg-green-50'} rounded-lg" 
                        title="${hasReplies ? 'Xem & trả lời' : 'Trả lời'}">
                        <i class="fas ${hasReplies ? 'fa-comments' : 'fa-reply'}"></i>
                    </button>
                    <button type="button" onclick="deleteComment(${comment.ma_binh_luan}, event); return false;" 
                        class="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        <!-- Replies Section (inline) -->
        <tr id="replies-section-${comment.ma_binh_luan}" class="hidden bg-green-50/50">
            <td colspan="6" class="px-4 py-4">
                <div class="bg-white rounded-lg border-2 border-green-200 p-4 ml-8">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="font-semibold text-slate-700">
                            <i class="fas fa-reply text-green-600 mr-2"></i>
                            Trả lời cho bình luận của ${comment.ten_nguoi_binh_luan}
                        </h4>
                        <button type="button" onclick="toggleRepliesSection(${comment.ma_binh_luan}, event); return false;" 
                                class="text-slate-400 hover:text-slate-600">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Existing Replies -->
                    <div id="replies-list-${comment.ma_binh_luan}" class="space-y-3 mb-4">
                        ${hasReplies ? replies.map(reply => `
                            <div class="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-3">
                                <div class="flex items-start justify-between mb-2">
                                    <div class="flex items-center space-x-2">
                                        <i class="fas fa-user-shield text-green-600"></i>
                                        <p class="font-semibold text-green-800 text-sm">Admin</p>
                                        <span class="text-xs text-slate-400 italic">Tác giả: ${reply.ten_nguoi_binh_luan}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <p class="text-xs text-slate-500">${formatDate(reply.ngay_binh_luan)}</p>
                                        <button type="button" onclick="deleteComment(${reply.ma_binh_luan}, event); return false;" 
                                                class="text-red-600 hover:text-red-800 text-sm">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <p class="text-slate-700 text-sm">${escapeHtml(reply.noi_dung)}</p>
                            </div>
                        `).join('') : `
                            <div class="text-center py-4 text-slate-400 text-sm">
                                <i class="fas fa-comment-slash text-2xl mb-2"></i>
                                <p>Chưa có trả lời nào. Hãy là người đầu tiên trả lời!</p>
                            </div>
                        `}
                    </div>
                    
                    <!-- Reply Form -->
                    <div class="border-t pt-4">
                        <textarea id="reply-input-${comment.ma_binh_luan}" 
                                  class="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" 
                                  rows="3" 
                                  placeholder="Nhập nội dung trả lời..."></textarea>
                        <div class="flex justify-end gap-2 mt-2">
                            <button type="button" onclick="submitReplyInline(${comment.ma_binh_luan}, event); return false;" 
                                    class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                                <i class="fas fa-paper-plane mr-1"></i>Gửi trả lời
                            </button>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

// Toggle replies section
function toggleRepliesSection(commentId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const repliesSection = document.getElementById(`replies-section-${commentId}`);
    if (repliesSection) {
        repliesSection.classList.toggle('hidden');
    }
    return false;
}

// Submit reply inline
async function submitReplyInline(commentId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const textarea = document.getElementById(`reply-input-${commentId}`);
    if (!textarea) return false;
    
    const content = textarea.value.trim();
    
    if (!content) {
        alert('Vui lòng nhập nội dung trả lời');
        return false;
    }

    try {
        const response = await fetch(`${COMMENTS_API_URL}/comments/${commentId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ noi_dung: content })
        });

        const data = await response.json();
        
        if (data.success) {
            textarea.value = ''; // Clear input
            alert('✅ Gửi trả lời thành công!');
            loadComments(); // Reload danh sách
        } else {
            alert('❌ Lỗi: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Có lỗi xảy ra khi gửi trả lời');
    }
    return false;
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        approved: '<span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Đã duyệt</span>',
        pending: '<span class="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Chờ duyệt</span>',
        rejected: '<span class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Từ chối</span>'
    };
    return badges[status] || badges.pending;
}

// Update comment status
async function updateStatus(id, status, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    try {
        const response = await fetch(`${COMMENTS_API_URL}/admin/comments/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ trang_thai: status })
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadComments();
        } else {
            alert(result.message || 'Lỗi cập nhật');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Không thể kết nối đến server');
    }
    return false;
}

// Delete comment
async function deleteComment(id, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return false;
    
    try {
        const response = await fetch(`${COMMENTS_API_URL}/admin/comments/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadComments();
        } else {
            alert(result.message || 'Lỗi xóa');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Không thể kết nối đến server');
    }
    return false;
}

// Apply filters - giữ nguyên cả replies để hiển thị trong hộp thoại
function applyFilters() {
    const search = document.getElementById('search')?.value.toLowerCase() || '';
    const status = document.getElementById('status-filter')?.value || '';
    const newsId = document.getElementById('news-filter')?.value || '';
    
    // Lọc comment gốc theo điều kiện
    const filteredParents = allComments.filter(c => {
        // Bỏ qua replies khi filter
        if (c.ma_binh_luan_cha) return false;
        
        const matchSearch = !search || 
            c.ten_nguoi_binh_luan.toLowerCase().includes(search) ||
            c.noi_dung.toLowerCase().includes(search);
        const matchStatus = !status || c.trang_thai === status;
        const matchNews = !newsId || c.ma_tin_tuc == newsId;
        return matchSearch && matchStatus && matchNews;
    });
    
    // Lấy ID của các comment gốc đã lọc
    const parentIds = filteredParents.map(c => c.ma_binh_luan);
    
    // Lấy tất cả replies của các comment gốc đã lọc
    const relatedReplies = allComments.filter(c => 
        c.ma_binh_luan_cha && parentIds.includes(c.ma_binh_luan_cha)
    );
    
    // Kết hợp comment gốc và replies
    const filtered = [...filteredParents, ...relatedReplies];
    
    displayComments(filtered);
}

// Helpers
function getAvatarUrl(anh_dai_dien, ten) {
    if (anh_dai_dien) {
        if (anh_dai_dien.startsWith('http')) return anh_dai_dien;
        if (anh_dai_dien.startsWith('/')) return `http://localhost:3000${anh_dai_dien}`;
        return `http://localhost:3000/${anh_dai_dien}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(ten || 'U')}&background=3b82f6&color=fff`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const tbody = document.getElementById('comments-table');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-red-500"><i class="fas fa-exclamation-circle text-2xl mb-2"></i><p>${message}</p></td></tr>`;
    }
}

// Reply functions
let currentCommentId = null;

async function openReplyModal(commentId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    currentCommentId = commentId;
    const modal = document.getElementById('reply-modal');
    const textarea = document.getElementById('reply-content');
    const modalTitle = document.querySelector('#reply-modal h3');
    
    if (!modal || !textarea) return false;
    
    // Tìm reply hiện tại nếu có
    const existingReply = allComments.find(c => 
        c.ma_binh_luan_cha === commentId && 
        c.email_nguoi_binh_luan === 'admin@phuongnam.vn'
    );
    
    if (existingReply) {
        // Có reply rồi, hiển thị để edit
        textarea.value = existingReply.noi_dung;
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-edit mr-2"></i>Chỉnh sửa trả lời';
        }
    } else {
        // Chưa có reply, tạo mới
        textarea.value = '';
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-reply mr-2"></i>Trả lời bình luận';
        }
    }
    
    modal.classList.remove('hidden');
    return false;
}

function viewCommentWithReplies(commentId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const comment = allComments.find(c => c.ma_binh_luan === commentId);
    if (!comment) return false;
    
    // Lấy tất cả replies của comment này
    const replies = allComments.filter(c => c.ma_binh_luan_cha === commentId);
    
    // Hiển thị modal chi tiết
    const modal = document.getElementById('detail-modal');
    const detailContent = document.getElementById('detail-content');
    
    if (!modal || !detailContent) return;
    
    const avatar = getAvatarUrl(comment.anh_dai_dien, comment.ten_nguoi_binh_luan);
    
    detailContent.innerHTML = `
        <div class="space-y-4">
            <!-- Comment gốc -->
            <div class="bg-slate-50 rounded-lg p-4">
                <div class="flex items-start space-x-3 mb-3">
                    <img src="${avatar}" class="w-12 h-12 rounded-full object-cover">
                    <div class="flex-1">
                        <p class="font-semibold text-slate-800">${comment.ten_nguoi_binh_luan}</p>
                        <p class="text-xs text-slate-500">${comment.email_nguoi_binh_luan || ''}</p>
                        <p class="text-xs text-slate-400 mt-1">${formatDate(comment.ngay_binh_luan)}</p>
                    </div>
                    ${getStatusBadge(comment.trang_thai)}
                </div>
                <p class="text-slate-700">${escapeHtml(comment.noi_dung)}</p>
                <p class="text-xs text-slate-500 mt-2">
                    <i class="fas fa-newspaper mr-1"></i>${comment.tieu_de_tin_tuc || 'N/A'}
                </p>
            </div>
            
            <!-- Replies của admin -->
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <h4 class="font-semibold text-slate-700">
                        <i class="fas fa-reply text-green-600 mr-2"></i>
                        Trả lời của Admin
                    </h4>
                    <button type="button" onclick="openReplyModalFromDetail(${commentId}, event); return false;" 
                            class="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                        <i class="fas ${replies.length > 0 ? 'fa-edit' : 'fa-reply'} mr-1"></i>${replies.length > 0 ? 'Chỉnh sửa' : 'Trả lời'}
                    </button>
                </div>
                
                ${replies.length > 0 ? replies.map(reply => `
                    <div class="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex items-center space-x-2">
                                <i class="fas fa-user-shield text-green-600"></i>
                                <p class="font-semibold text-green-800">Admin</p>
                                <span class="text-xs text-slate-400 italic">Tác giả: ${reply.ten_nguoi_binh_luan}</span>
                            </div>
                            <button type="button" onclick="deleteComment(${reply.ma_binh_luan}, event); return false;" 
                                    class="text-red-600 hover:text-red-800 text-sm">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <p class="text-slate-700">${escapeHtml(reply.noi_dung)}</p>
                        <p class="text-xs text-slate-500 mt-2">${formatDate(reply.ngay_binh_luan)}</p>
                    </div>
                `).join('') : `
                    <div class="text-center py-8 text-slate-400">
                        <i class="fas fa-comment-slash text-3xl mb-2"></i>
                        <p>Chưa có trả lời nào</p>
                    </div>
                `}
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    return false;
}

function openReplyModalFromDetail(commentId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    closeDetailModal();
    openReplyModal(commentId);
    return false;
}

function closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function closeReplyModal() {
    const modal = document.getElementById('reply-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentCommentId = null;
}

async function submitReply() {
    const textarea = document.getElementById('reply-content');
    if (!textarea) return;
    
    const content = textarea.value.trim();
    
    if (!content) {
        alert('Vui lòng nhập nội dung trả lời');
        return;
    }

    try {
        const response = await fetch(`${COMMENTS_API_URL}/comments/${currentCommentId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ noi_dung: content })
        });

        const data = await response.json();
        
        if (data.success) {
            const message = data.data.is_update ? 
                '✅ Cập nhật trả lời thành công!' : 
                '✅ Trả lời bình luận thành công!';
            alert(message);
            closeReplyModal();
            loadComments(); // Reload danh sách
        } else {
            alert('❌ Lỗi: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Có lỗi xảy ra khi gửi trả lời');
    }
}

// Search on enter
document.getElementById('search')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyFilters();
});
