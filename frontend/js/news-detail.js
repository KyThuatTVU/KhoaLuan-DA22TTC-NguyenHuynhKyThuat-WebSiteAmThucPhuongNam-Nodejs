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

// Load news detail from API
async function loadNewsDetail() {
    try {
        // Get news ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const newsId = urlParams.get('id');

        if (!newsId) {
            showError('Không tìm thấy tin tức');
            return;
        }

        showLoading();

        // Fetch news detail from API
        const response = await fetch(`${API_URL}/${newsId}`);
        const result = await response.json();

        if (result.success && result.data) {
            displayNewsDetail(result.data);
            displayRelatedNews(result.data.related || []);
            // Load comments and reactions
            loadComments(newsId);
            loadReactions(newsId);
            // Load recent posts for sidebar
            loadRecentPosts(newsId);
            // Load contact info from settings
            loadContactInfo();
        } else {
            showError('Không tìm thấy tin tức');
        }

    } catch (error) {
        console.error('Lỗi tải tin tức:', error);
        showError('Không thể kết nối đến server');
    } finally {
        hideLoading();
    }
}

// Display news detail
function displayNewsDetail(news) {
    // Update page title
    document.title = `${news.tieu_de} - Nhà hàng Phương Nam Vĩnh Long`;

    // Update breadcrumb
    const breadcrumb = document.querySelector('.breadcrumb-current');
    if (breadcrumb) {
        breadcrumb.textContent = news.tieu_de;
    }

    // Update article header
    const articleHeader = document.querySelector('article .p-8.pb-6');
    if (articleHeader) {
        articleHeader.innerHTML = `
            <div class="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                <span><i class="far fa-calendar mr-2"></i> ${formatDate(news.ngay_dang)}</span>
                <span><i class="far fa-user mr-2"></i> ${news.tac_gia || 'Admin'}</span>
                <span><i class="far fa-eye mr-2"></i> ${formatViews(news.luot_xem)} lượt xem</span>
            </div>
            <h1 class="font-dancing text-4xl font-bold mb-6 text-gray-800">
                ${news.tieu_de}
            </h1>
        `;
    }

    // Update featured image
    const featuredImage = document.querySelector('article img');
    if (featuredImage && news.anh_dai_dien) {
        featuredImage.src = `http://localhost:3000/${news.anh_dai_dien}`;
        featuredImage.alt = news.tieu_de;
    }

    // Update article content
    const contentDiv = document.querySelector('.news-content');
    if (contentDiv) {
        // Format content - convert plain text to HTML if needed
        let formattedContent = news.noi_dung || '';
        
        // If content doesn't contain HTML tags, format it
        if (formattedContent && !formattedContent.includes('<p>') && !formattedContent.includes('<div>')) {
            formattedContent = formatPlainTextToHtml(formattedContent);
        }
        
        if (formattedContent) {
            contentDiv.innerHTML = `
                <div class="prose max-w-none mb-8">
                    ${news.tom_tat ? `<p class="text-xl text-gray-600 leading-relaxed mb-8 font-medium border-l-4 border-orange-500 pl-4 italic">${news.tom_tat}</p>` : ''}
                    ${formattedContent}
                </div>
            `;
        } else {
            contentDiv.innerHTML = `
                <div class="prose max-w-none mb-8">
                    <p class="text-lg text-gray-700 leading-relaxed mb-6">
                        ${news.tom_tat || 'Nội dung đang được cập nhật...'}
                    </p>
                </div>
            `;
        }
    }
}

// Format plain text to HTML with proper styling
function formatPlainTextToHtml(text) {
    if (!text) return '';
    
    // Split by double newlines to get paragraphs
    const lines = text.split(/\n/);
    let html = '';
    let inList = false;
    
    lines.forEach((line, index) => {
        line = line.trim();
        if (!line) {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            return;
        }
        
        // Check if line is a heading (ends with : or starts with specific keywords)
        const headingKeywords = ['Thông tin', 'Ưu đãi', 'Đặc biệt', 'Lưu ý', 'Chi tiết', 'Liên hệ', 'Địa chỉ', 'Thời gian', 'Giờ'];
        const isHeading = headingKeywords.some(kw => line.startsWith(kw)) || 
                         (line.endsWith(':') && line.length < 50);
        
        // Check if line is a list item (starts with -, •, *, or number.)
        const isListItem = /^[-•*]\s/.test(line) || /^\d+[.)]\s/.test(line);
        
        // Check if line contains key-value (has : in middle)
        const isKeyValue = line.includes(':') && !line.endsWith(':') && line.indexOf(':') < line.length / 2;
        
        if (isHeading) {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<h3>${line}</h3>`;
        } else if (isListItem) {
            if (!inList) {
                html += '<ul class="space-y-2 my-4">';
                inList = true;
            }
            const itemText = line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '');
            html += `<li class="flex items-start gap-2"><i class="fas fa-check-circle text-orange-500 mt-1 flex-shrink-0"></i><span>${itemText}</span></li>`;
        } else if (isKeyValue) {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();
            html += `<p class="mb-2"><strong class="text-gray-800">${key}:</strong> ${value}</p>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<p>${line}</p>`;
        }
    });
    
    if (inList) {
        html += '</ul>';
    }
    
    return html;
}

// Display related news
function displayRelatedNews(relatedNews) {
    const relatedContainer = document.getElementById('related-news-container');
    const relatedSection = document.getElementById('related-news-section');
    
    if (!relatedContainer) {
        return;
    }

    if (relatedNews.length === 0) {
        // Hide related section if no related news
        if (relatedSection) {
            relatedSection.style.display = 'none';
        }
        return;
    }

    relatedContainer.innerHTML = relatedNews.map(news => `
        <a href="tin-tuc-chi-tiet.html?id=${news.ma_tin_tuc}" class="group">
            <img src="${news.anh_dai_dien ? `http://localhost:3000/${news.anh_dai_dien}` : 'images/default-news.jpg'}"
                 alt="${news.tieu_de}"
                 class="w-full h-48 object-cover rounded-lg mb-3 group-hover:opacity-90 transition">
            <h4 class="font-bold text-lg group-hover:text-orange-600 transition line-clamp-2">
                ${news.tieu_de}
            </h4>
            <p class="text-sm text-gray-500 mt-2">${formatDate(news.ngay_dang)}</p>
        </a>
    `).join('');
}

// Load contact info from settings
async function loadContactInfo() {
    try {
        const response = await fetch('http://localhost:3000/api/settings');
        const result = await response.json();

        if (result.success && result.data) {
            const hotline = result.data.hotline || result.data.phone || result.data.so_dien_thoai;
            if (hotline) {
                const hotlineEl = document.getElementById('contact-hotline');
                if (hotlineEl) {
                    hotlineEl.href = `tel:${hotline.replace(/\s/g, '')}`;
                    hotlineEl.textContent = hotline;
                }
            }
        }
    } catch (error) {
        console.error('Lỗi tải thông tin liên hệ:', error);
    }
}

// Load recent posts for sidebar
async function loadRecentPosts(currentNewsId) {
    const container = document.getElementById('recent-posts-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}?limit=5`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            // Filter out current news and take first 3
            const recentNews = result.data
                .filter(news => news.ma_tin_tuc != currentNewsId)
                .slice(0, 3);

            if (recentNews.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-sm">Chưa có bài viết nào khác</p>';
                return;
            }

            container.innerHTML = recentNews.map(news => `
                <div class="flex space-x-3">
                    <img src="${news.anh_dai_dien ? `http://localhost:3000/${news.anh_dai_dien}` : 'images/default-news.jpg'}" 
                         alt="${news.tieu_de}"
                         class="w-20 h-20 rounded-lg object-cover"
                         onerror="this.src='images/default-news.jpg'">
                    <div class="flex-1">
                        <a href="tin-tuc-chi-tiet.html?id=${news.ma_tin_tuc}" class="font-medium hover:text-orange-600 line-clamp-2">
                            ${news.tieu_de}
                        </a>
                        <p class="text-sm text-gray-500 mt-1">${formatDate(news.ngay_dang)}</p>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-sm">Chưa có bài viết nào</p>';
        }
    } catch (error) {
        console.error('Lỗi tải bài viết gần đây:', error);
        container.innerHTML = '<p class="text-gray-500 text-sm">Không thể tải bài viết</p>';
    }
}

// Share functions
function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${title}`, '_blank', 'width=600,height=400');
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Đã sao chép link vào clipboard!');
    }).catch(err => {
        console.error('Lỗi sao chép:', err);
    });
}

// Loading helpers
function showLoading() {
    const contentDiv = document.querySelector('.news-content');
    if (contentDiv) {
        // Use LoadingManager if available
        if (typeof LoadingManager !== 'undefined') {
            LoadingManager.showSectionLoading(contentDiv, 'Đang tải tin tức...');
        } else {
            contentDiv.innerHTML = `
                <div class="text-center py-12">
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
    const contentDiv = document.querySelector('.news-content');
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <p class="text-gray-600 text-lg mb-4">${message}</p>
                <a href="tin-tuc.html" class="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition">
                    <i class="fas fa-arrow-left mr-2"></i>Quay lại trang tin tức
                </a>
            </div>
        `;
    }

    // Also update title
    const articleHeader = document.querySelector('article .p-8.pb-6');
    if (articleHeader) {
        articleHeader.innerHTML = `
            <h1 class="font-dancing text-4xl font-bold mb-6 text-gray-800">
                ${message}
            </h1>
        `;
    }
}

// Load comments for news
async function loadComments(newsId) {
    try {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/${newsId}/comments`, {
            headers: headers,
            credentials: 'include'
        });
        const result = await response.json();

        if (result.success) {
            displayComments(result.data, result.total);
        }
    } catch (error) {
        console.error('Lỗi tải bình luận:', error);
    }
}

// Display comments with reactions and replies
function displayComments(comments, totalCount) {
    const commentsContainer = document.querySelector('.comments-list');
    const commentsCount = document.querySelector('.comments-count');
    
    if (!commentsContainer) return;

    if (commentsCount) {
        commentsCount.textContent = totalCount || comments.length;
    }

    if (comments.length === 0) {
        commentsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="far fa-comments text-4xl mb-3"></i>
                <p>Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
            </div>
        `;
        return;
    }

    commentsContainer.innerHTML = comments.map(comment => renderComment(comment)).join('');
}

// Render single comment with reactions and replies
function renderComment(comment, isReply = false) {
    const avatar = getAvatarUrl(comment.anh_dai_dien, comment.ten_nguoi_binh_luan);
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.ten_nguoi_binh_luan)}&size=50&background=f97316&color=fff`;
    const timeAgo = getTimeAgo(comment.ngay_binh_luan);
    
    // Check if this is an admin reply
    const isAdminReply = comment.email_nguoi_binh_luan === 'admin@phuongnam.vn' || 
                         comment.ten_nguoi_binh_luan === 'Admin' ||
                         comment.ten_nguoi_binh_luan === 'Quản trị viên';
    
    // Reaction icons
    const reactionIcons = { like: '👍', love: '❤️', haha: '😄', wow: '😮', sad: '😢', angry: '😠' };
    
    // Tính tổng reactions
    const totalReactions = comment.reactions ? 
        Object.values(comment.reactions).reduce((a, b) => a + b, 0) : 0;
    
    // Hiển thị reactions summary
    let reactionsSummary = '';
    if (totalReactions > 0) {
        const topReactions = Object.entries(comment.reactions || {})
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        reactionsSummary = topReactions.map(([type, _]) => reactionIcons[type]).join('') + ` ${totalReactions}`;
    }

    // Separate admin replies and user replies
    const adminReplies = (comment.replies || []).filter(r => 
        r.email_nguoi_binh_luan === 'admin@phuongnam.vn' || 
        r.ten_nguoi_binh_luan === 'Admin' ||
        r.ten_nguoi_binh_luan === 'Quản trị viên'
    );
    const userReplies = (comment.replies || []).filter(r => 
        r.email_nguoi_binh_luan !== 'admin@phuongnam.vn' && 
        r.ten_nguoi_binh_luan !== 'Admin' &&
        r.ten_nguoi_binh_luan !== 'Quản trị viên'
    );

    // Render admin replies section (hiển thị ngay dưới comment, trong box riêng)
    let adminRepliesHtml = '';
    if (adminReplies.length > 0 && !isReply) {
        adminRepliesHtml = `
            <div class="mt-3 ml-4 border-l-4 border-green-500 bg-green-50 rounded-r-lg p-4">
                <div class="flex items-center gap-2 mb-3">
                    <i class="fas fa-store text-green-600"></i>
                    <span class="font-semibold text-green-700 text-sm">Phản hồi từ Nhà hàng Phương Nam</span>
                </div>
                <div class="space-y-3">
                    ${adminReplies.map(reply => `
                        <div class="bg-white rounded-lg p-3 shadow-sm">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <img src="https://ui-avatars.com/api/?name=Admin&size=32&background=22c55e&color=fff" 
                                         class="w-8 h-8 rounded-full">
                                    <span class="font-semibold text-green-700 text-sm">Admin</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-gray-400 italic">Tác giả: ${reply.ten_nguoi_binh_luan}</span>
                                    <span class="text-xs text-gray-500">${getTimeAgo(reply.ngay_binh_luan)}</span>
                                </div>
                            </div>
                            <p class="text-gray-700 text-sm">${escapeHtml(reply.noi_dung)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Render user replies
    const userRepliesHtml = userReplies.length > 0 
        ? `<div class="ml-8 mt-4 space-y-4">${userReplies.map(reply => renderComment(reply, true)).join('')}</div>`
        : '';

    // Admin reply styling
    const adminBadge = isAdminReply ? `<span class="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Admin</span>` : '';
    const bgColor = isAdminReply ? 'bg-green-50 border border-green-200' : 'bg-gray-50';
    const adminAvatar = isAdminReply ? 'https://ui-avatars.com/api/?name=Admin&size=50&background=22c55e&color=fff' : avatar;

    return `
        <div class="comment-item ${isReply ? 'ml-8' : ''} mb-6" data-comment-id="${comment.ma_binh_luan}">
            <div class="flex space-x-4">
                <img src="${isAdminReply ? adminAvatar : avatar}" alt="${comment.ten_nguoi_binh_luan}"
                    class="${isReply ? 'w-10 h-10' : 'w-12 h-12'} rounded-full flex-shrink-0 object-cover ${isAdminReply ? 'ring-2 ring-green-400' : ''}"
                    onerror="this.onerror=null; this.src='${fallbackAvatar}'">
                <div class="flex-1">
                    <div class="${bgColor} rounded-lg p-4">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center">
                                <h4 class="font-bold ${isAdminReply ? 'text-green-700' : 'text-gray-800'} ${isReply ? 'text-sm' : ''}">${comment.ten_nguoi_binh_luan}</h4>
                                ${adminBadge}
                            </div>
                            <span class="text-sm text-gray-500">${timeAgo}</span>
                        </div>
                        <p class="text-gray-700">${escapeHtml(comment.noi_dung)}</p>
                    </div>
                    
                    ${!isAdminReply ? `
                    <!-- Actions: Reactions & Reply (chỉ hiện cho comment của user) -->
                    <div class="flex items-center gap-4 mt-2 text-sm">
                        <!-- Reaction button with picker -->
                        <div class="relative reaction-wrapper">
                            <button class="reaction-btn-trigger text-gray-500 hover:text-orange-600 flex items-center gap-1"
                                data-comment-id="${comment.ma_binh_luan}"
                                data-current-reaction="${comment.userReaction || ''}">
                                <span class="reaction-icon ${comment.userReaction ? 'text-orange-600' : ''}">${comment.userReaction ? reactionIcons[comment.userReaction] : '👍'}</span>
                                <span class="reaction-text">${comment.userReaction ? getReactionLabel(comment.userReaction) : 'Thích'}</span>
                            </button>
                            <!-- Reaction picker - hiện khi hover/hold -->
                            <div class="reaction-picker-popup absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl p-2 flex gap-1 z-20 opacity-0 invisible transition-all duration-200">
                                ${Object.entries(reactionIcons).map(([type, icon]) => `
                                    <button class="reaction-option hover:scale-125 transition-transform text-2xl p-1 rounded-full hover:bg-gray-100 ${comment.userReaction === type ? 'bg-orange-100' : ''}"
                                        data-reaction-type="${type}"
                                        data-comment-id="${comment.ma_binh_luan}"
                                        title="${getReactionLabel(type)}">
                                        ${icon}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Reply button -->
                        <button onclick="showReplyForm(${comment.ma_binh_luan})" 
                            class="text-gray-500 hover:text-orange-600 flex items-center gap-1">
                            <i class="far fa-comment"></i>
                            <span>Trả lời</span>
                        </button>
                        
                        <!-- Reactions summary -->
                        ${reactionsSummary ? `<span class="text-gray-500">${reactionsSummary}</span>` : ''}
                    </div>
                    
                    <!-- Reply form (hidden by default) -->
                    <div id="reply-form-${comment.ma_binh_luan}" class="hidden mt-3">
                        <div class="flex gap-2">
                            <input type="text" placeholder="Viết trả lời..." 
                                class="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
                                id="reply-input-${comment.ma_binh_luan}"
                                onkeypress="if(event.key==='Enter') submitReply(${comment.ma_binh_luan})">
                            <button onclick="submitReply(${comment.ma_binh_luan})" 
                                class="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700">
                                Gửi
                            </button>
                            <button onclick="hideReplyForm(${comment.ma_binh_luan})" 
                                class="text-gray-500 px-2 hover:text-gray-700">
                                ✕
                            </button>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${adminRepliesHtml}
                </div>
            </div>
            ${userRepliesHtml}
        </div>
    `;
}

// Get avatar URL helper
function getAvatarUrl(anh_dai_dien, ten) {
    if (anh_dai_dien) {
        if (anh_dai_dien.startsWith('http')) return anh_dai_dien;
        if (anh_dai_dien.startsWith('/')) return `http://localhost:3000${anh_dai_dien}`;
        return `http://localhost:3000/${anh_dai_dien}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(ten)}&size=50&background=f97316&color=fff`;
}

// Show reply form
function showReplyForm(commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) {
        form.classList.remove('hidden');
        document.getElementById(`reply-input-${commentId}`).focus();
    }
}

// Hide reply form
function hideReplyForm(commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) form.classList.add('hidden');
}

// Submit reply
async function submitReply(commentId) {
    const input = document.getElementById(`reply-input-${commentId}`);
    const noi_dung = input.value.trim();
    
    if (!noi_dung) {
        alert('Vui lòng nhập nội dung trả lời');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Vui lòng đăng nhập để trả lời');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/comments/${commentId}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({ noi_dung })
        });

        const result = await response.json();
        if (result.success) {
            input.value = '';
            hideReplyForm(commentId);
            // Reload comments
            const urlParams = new URLSearchParams(window.location.search);
            loadComments(urlParams.get('id'));
        } else {
            alert(result.message || 'Không thể gửi trả lời');
        }
    } catch (error) {
        console.error('Lỗi gửi trả lời:', error);
        alert('Không thể gửi trả lời');
    }
}

// React to comment
async function reactToComment(commentId, reactionType) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Vui lòng đăng nhập để thả cảm xúc');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/comments/${commentId}/reactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({ loai_cam_xuc: reactionType })
        });

        const result = await response.json();
        if (result.success) {
            // Reload comments
            const urlParams = new URLSearchParams(window.location.search);
            loadComments(urlParams.get('id'));
        } else {
            alert(result.message || 'Không thể thả cảm xúc');
        }
    } catch (error) {
        console.error('Lỗi thả cảm xúc:', error);
    }
}

// Get reaction label in Vietnamese
function getReactionLabel(type) {
    const labels = {
        like: 'Thích',
        love: 'Yêu thích', 
        haha: 'Haha',
        wow: 'Wow',
        sad: 'Buồn',
        angry: 'Phẫn nộ'
    };
    return labels[type] || 'Thích';
}

// Make functions global
window.showReplyForm = showReplyForm;
window.hideReplyForm = hideReplyForm;
window.submitReply = submitReply;
window.reactToComment = reactToComment;
window.getReactionLabel = getReactionLabel;

// Setup reaction interactions (click nhanh = like, hover = show picker)
function setupReactionInteractions() {
    let holdTimer = null;
    let isHolding = false;

    document.addEventListener('mousedown', (e) => {
        const trigger = e.target.closest('.reaction-btn-trigger');
        if (!trigger) return;

        isHolding = false;
        holdTimer = setTimeout(() => {
            isHolding = true;
            // Show picker on hold
            const picker = trigger.parentElement.querySelector('.reaction-picker-popup');
            if (picker) {
                picker.classList.remove('opacity-0', 'invisible');
                picker.classList.add('opacity-100', 'visible');
            }
        }, 300); // 300ms hold để hiện picker
    });

    document.addEventListener('mouseup', (e) => {
        const trigger = e.target.closest('.reaction-btn-trigger');
        
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }

        // Nếu không hold (click nhanh) -> toggle like
        if (trigger && !isHolding) {
            const commentId = trigger.dataset.commentId;
            const currentReaction = trigger.dataset.currentReaction;
            
            if (currentReaction) {
                // Đã có reaction -> bỏ reaction (click lại cùng loại)
                reactToComment(commentId, currentReaction);
            } else {
                // Chưa có -> like
                reactToComment(commentId, 'like');
            }
        }

        isHolding = false;
    });

    // Click vào reaction option
    document.addEventListener('click', (e) => {
        const option = e.target.closest('.reaction-option');
        if (option) {
            e.preventDefault();
            e.stopPropagation();
            const commentId = option.dataset.commentId;
            const reactionType = option.dataset.reactionType;
            reactToComment(commentId, reactionType);
            
            // Hide picker
            const picker = option.closest('.reaction-picker-popup');
            if (picker) {
                picker.classList.add('opacity-0', 'invisible');
                picker.classList.remove('opacity-100', 'visible');
            }
        }
    });

    // Hide picker khi mouse leave
    document.addEventListener('mouseleave', (e) => {
        if (e.target && e.target.closest && e.target.closest('.reaction-wrapper')) {
            setTimeout(() => {
                const wrapper = e.target.closest('.reaction-wrapper');
                if (wrapper && !wrapper.matches(':hover')) {
                    const picker = wrapper.querySelector('.reaction-picker-popup');
                    if (picker) {
                        picker.classList.add('opacity-0', 'invisible');
                        picker.classList.remove('opacity-100', 'visible');
                    }
                }
            }, 300);
        }
    }, true);

    // Show picker on hover (sau 500ms)
    document.addEventListener('mouseenter', (e) => {
        if (!e.target || !e.target.closest) return;
        const wrapper = e.target.closest('.reaction-wrapper');
        if (wrapper) {
            setTimeout(() => {
                if (wrapper.matches(':hover')) {
                    const picker = wrapper.querySelector('.reaction-picker-popup');
                    if (picker) {
                        picker.classList.remove('opacity-0', 'invisible');
                        picker.classList.add('opacity-100', 'visible');
                    }
                }
            }, 500);
        }
    }, true);
}

// Get time ago string
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
    
    return formatDate(dateString);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Submit comment (requires login)
async function submitComment(event) {
    event.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const newsId = urlParams.get('id');

    if (!newsId) return;

    const form = event.target;
    const noi_dung = form.querySelector('[name="comment"]').value.trim();

    if (!noi_dung) {
        alert('Vui lòng nhập nội dung bình luận');
        return;
    }

    try {
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang gửi...';

        // Lấy token từ localStorage
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/${newsId}/comments`, {
            method: 'POST',
            headers: headers,
            credentials: 'include', // Gửi cookie session
            body: JSON.stringify({ noi_dung })
        });

        const result = await response.json();

        if (result.success) {
            alert('Bình luận của bạn đã được gửi thành công!');
            form.reset();
            // Reload comments
            loadComments(newsId);
        } else {
            if (response.status === 401) {
                alert('Vui lòng đăng nhập để bình luận');
                window.location.href = 'dang-nhap.html?redirect=' + encodeURIComponent(window.location.href);
            } else {
                alert(result.message || 'Không thể gửi bình luận');
            }
        }
    } catch (error) {
        console.error('Lỗi gửi bình luận:', error);
        alert('Không thể gửi bình luận. Vui lòng thử lại sau.');
    } finally {
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="far fa-paper-plane mr-2"></i>Gửi bình luận';
    }
}

// Setup comment form based on login status
async function setupCommentForm() {
    try {
        console.log('🔍 Checking login status...');
        
        // Lấy token từ localStorage
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('http://localhost:3000/api/auth/check-session', {
            credentials: 'include',
            headers: headers
        });
        const data = await response.json();
        console.log('📊 Session check result:', data);
        const isLoggedIn = data.loggedIn;

        const commentForm = document.getElementById('comment-form');
        const loginMessage = document.getElementById('login-required-message');

        if (!isLoggedIn) {
            console.log('❌ User not logged in - hiding comment form');
            if (commentForm) commentForm.style.display = 'none';
            if (loginMessage) loginMessage.classList.remove('hidden');
        } else {
            console.log('✅ User logged in - showing comment form');
            if (commentForm) commentForm.style.display = 'block';
            if (loginMessage) loginMessage.classList.add('hidden');
        }
    } catch (error) {
        console.error('Lỗi kiểm tra đăng nhập:', error);
        // Nếu lỗi, ẩn form để an toàn
        const commentForm = document.getElementById('comment-form');
        const loginMessage = document.getElementById('login-required-message');
        if (commentForm) commentForm.style.display = 'none';
        if (loginMessage) loginMessage.classList.remove('hidden');
    }
}

// Load reactions for news
async function loadReactions(newsId) {
    console.log('🎭 Loading reactions for news:', newsId);
    try {
        const response = await fetch(`${API_URL}/${newsId}/reactions`);
        const result = await response.json();
        console.log('🎭 Reactions API response:', result);

        if (result.success) {
            displayReactions(result.data);
        } else {
            console.error('❌ Failed to load reactions:', result);
        }
    } catch (error) {
        console.error('❌ Error loading reactions:', error);
    }
}

// Display reactions - Facebook style
function displayReactions(data) {
    const reactionsContainer = document.querySelector('.reactions-container');
    if (!reactionsContainer) {
        console.warn('Reactions container not found');
        return;
    }

    const { reactions, total, userReaction } = data;
    console.log('📊 Displaying reactions:', { reactions, total, userReaction });

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

    const reactionColors = {
        like: 'text-blue-600',
        love: 'text-red-600',
        haha: 'text-yellow-600',
        wow: 'text-yellow-600',
        sad: 'text-yellow-600',
        angry: 'text-orange-600'
    };

    // Get user's reaction label and icon
    const userReactionLabel = userReaction ? reactionLabels[userReaction] : 'Thích';
    const userReactionIcon = userReaction ? reactionIcons[userReaction] : '👍';
    const userReactionColor = userReaction ? reactionColors[userReaction] : 'text-gray-600';

    reactionsContainer.innerHTML = `
        <div class="flex items-center justify-between py-3">
            <!-- Main reaction button with hover popup -->
            <div class="relative reaction-wrapper" onmouseenter="showReactionPicker()" onmouseleave="hideReactionPicker()">
                <button 
                    onclick="window.toggleReaction('like')"
                    class="reaction-main-btn flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition ${userReaction ? userReactionColor + ' font-semibold' : 'text-gray-600'}"
                    id="main-reaction-btn">
                    <span class="text-xl">${userReactionIcon}</span>
                    <span class="text-sm">${userReactionLabel}</span>
                </button>
                
                <!-- Reaction picker popup (Facebook style) -->
                <div id="reaction-picker" 
                     class="reaction-picker-popup absolute bottom-full left-0 mb-2 bg-white rounded-full px-2 py-2 shadow-xl border border-gray-200 hidden"
                     style="z-index: 1000;">
                    <div class="flex gap-1">
                        ${Object.keys(reactionIcons).map(type => `
                            <button 
                                onclick="window.selectReaction('${type}', event)"
                                class="reaction-option w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition transform hover:scale-125"
                                title="${reactionLabels[type]}"
                                data-reaction-type="${type}">
                                <span class="text-3xl pointer-events-none">${reactionIcons[type]}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Reaction counts summary -->
            ${total > 0 ? `
                <div class="flex items-center gap-2 text-sm text-gray-600">
                    <div class="flex -space-x-1">
                        ${Object.entries(reactions)
                            .filter(([_, count]) => count > 0)
                            .slice(0, 3)
                            .map(([type, _]) => `<span class="text-lg">${reactionIcons[type]}</span>`)
                            .join('')}
                    </div>
                    <span class="font-medium">${total}</span>
                </div>
            ` : ''}
        </div>
    `;
}

// Show reaction picker on hover
function showReactionPicker() {
    console.log('👆 Showing reaction picker');
    const picker = document.getElementById('reaction-picker');
    if (picker) {
        picker.classList.remove('hidden');
        picker.classList.add('visible');
    }
}

// Hide reaction picker
function hideReactionPicker() {
    console.log('👇 Hiding reaction picker');
    setTimeout(() => {
        const picker = document.getElementById('reaction-picker');
        if (picker) {
            picker.classList.add('hidden');
            picker.classList.remove('visible');
        }
    }, 300);
}

// Select reaction from picker
function selectReaction(reactionType, event) {
    console.log('🎯 selectReaction called with:', reactionType, 'event:', event);
    
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Validate reaction type trước khi gọi
    const validReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
    if (!reactionType || !validReactions.includes(reactionType)) {
        console.error('❌ Invalid reaction type in selectReaction:', reactionType);
        alert('Lỗi: Loại cảm xúc không hợp lệ - ' + reactionType);
        return;
    }
    
    console.log('✅ Calling toggleReaction with:', reactionType);
    hideReactionPicker();
    toggleReaction(reactionType);
}

// Make functions global
window.showReactionPicker = showReactionPicker;
window.hideReactionPicker = hideReactionPicker;
window.selectReaction = selectReaction;

console.log('✅ Reaction functions registered globally');
console.log('✅ selectReaction:', typeof window.selectReaction);
console.log('✅ toggleReaction:', typeof window.toggleReaction);

// Toggle reaction
async function toggleReaction(reactionType) {
    console.log('🎭 toggleReaction called with:', reactionType, 'type:', typeof reactionType);
    
    const urlParams = new URLSearchParams(window.location.search);
    const newsId = urlParams.get('id');

    if (!newsId) {
        console.error('❌ No newsId found');
        return;
    }

    // Validate reaction type
    const validReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
    if (!reactionType || typeof reactionType !== 'string' || !validReactions.includes(reactionType)) {
        console.error('❌ Invalid reaction type:', reactionType, 'type:', typeof reactionType);
        alert('Loại cảm xúc không hợp lệ: ' + reactionType);
        return;
    }

    console.log('🎭 Toggling reaction:', reactionType, 'for news:', newsId);

    try {
        // Lấy token từ localStorage
        const token = localStorage.getItem('token');
        console.log('🔑 Token:', token ? 'exists' : 'not found');
        
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const requestBody = { loai_cam_xuc: reactionType };
        console.log('📤 Sending request:', JSON.stringify(requestBody));
        console.log('📤 Headers:', JSON.stringify(headers));
        console.log('📤 URL:', `${API_URL}/${newsId}/reactions`);

        const response = await fetch(`${API_URL}/${newsId}/reactions`, {
            method: 'POST',
            headers: headers,
            credentials: 'include', // Gửi cookie session
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Reaction success:', result.action);
            // Reload reactions
            loadReactions(newsId);
            
            // Show notification
            const messages = {
                'added': 'Đã thả cảm xúc!',
                'removed': 'Đã bỏ cảm xúc',
                'updated': 'Đã thay đổi cảm xúc'
            };
            if (typeof showNotification === 'function') {
                showNotification(messages[result.action] || 'Thành công', 'success');
            }
        } else {
            if (response.status === 401) {
                if (typeof showNotification === 'function') {
                    showNotification('Vui lòng đăng nhập để thả cảm xúc', 'warning');
                }
                setTimeout(() => {
                    window.location.href = 'dang-nhap.html?redirect=' + encodeURIComponent(window.location.href);
                }, 1500);
            } else {
                if (typeof showNotification === 'function') {
                    showNotification(result.message || 'Không thể thả cảm xúc', 'error');
                } else {
                    alert(result.message || 'Không thể thả cảm xúc');
                }
            }
        }
    } catch (error) {
        console.error('Lỗi thả cảm xúc:', error);
        alert('Không thể thả cảm xúc. Vui lòng thử lại sau.');
    }
}

// Make toggleReaction global
window.toggleReaction = toggleReaction;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadNewsDetail();
    setupCommentForm();
    setupReactionInteractions(); // Setup reaction UX

    // Setup comment form
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', submitComment);
    }
});
