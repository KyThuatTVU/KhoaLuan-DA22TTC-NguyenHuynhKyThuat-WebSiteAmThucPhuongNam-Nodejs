const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const OpenAI = require('openai');
const { analyzeUserIntent, extractFoodSearchTerms, getCartByUserId } = require('../graphql');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Khởi tạo Groq AI client
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

console.log('🤖 Chatbot using: Groq (Free) + GraphQL');
console.log('🔑 Groq API Key:', process.env.GROQ_API_KEY ? '✅ Configured (***' + process.env.GROQ_API_KEY.slice(-8) + ')' : '❌ NOT SET');

// Cache
let settingsCache = { data: null, lastUpdate: 0 };

// ==================== HELPER FUNCTIONS ====================

function getUserFromToken(req) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            return decoded.ma_nguoi_dung;
        }
    } catch (error) { }
    return null;
}

async function saveChatHistory(ma_nguoi_dung, session_id, nguoi_gui, noi_dung) {
    try {
        await db.query(
            `INSERT INTO lich_su_chatbot (ma_nguoi_dung, session_id, nguoi_gui, noi_dung) VALUES (?, ?, ?, ?)`,
            [ma_nguoi_dung, session_id, nguoi_gui, noi_dung]
        );
    } catch (error) {
        console.error('Error saving chat history:', error.message);
    }
}

async function getRestaurantSettings() {
    const now = Date.now();
    if (settingsCache.data && (now - settingsCache.lastUpdate) < 30000) {
        return settingsCache.data;
    }
    try {
        const [settings] = await db.query('SELECT * FROM cai_dat');
        const settingsObj = {};
        settings.forEach(item => { settingsObj[item.setting_key] = item.setting_value; });
        settingsCache = { data: settingsObj, lastUpdate: now };
        return settingsObj;
    } catch (error) {
        console.error('Error getting settings:', error.message);
        return {};
    }
}

// ==================== GRAPHQL-POWERED CONTEXT ====================

async function getChatbotContextForMessage(message) {
    const intent = analyzeUserIntent(message);
    const context = {
        mon_an_lien_quan: [],
        danh_muc_lien_quan: [],
        top_ban_chay: [],
        has_food_data: false,
        intent: intent,
        compact_menu: ''
    };

    try {
        // 1. Hỏi về món ăn cụ thể
        if (intent.hoi_mon_an || intent.hoi_thuc_don || intent.hoi_danh_muc || intent.hoi_gia) {
            const searchTerms = extractFoodSearchTerms(message);
            
            if (searchTerms.length > 0) {
                for (const term of searchTerms) {
                    const [dishes] = await db.query(`
                        SELECT m.ma_mon, m.ten_mon, m.mo_ta_chi_tiet, m.gia_tien, m.don_vi_tinh, 
                               m.anh_mon, d.ten_danh_muc,
                               COALESCE(AVG(dg.so_sao), 0) as diem_danh_gia,
                               COUNT(DISTINCT dg.ma_danh_gia) as luot_danh_gia
                        FROM mon_an m
                        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                        LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                        WHERE m.trang_thai = 1 AND (m.ten_mon LIKE ? OR m.mo_ta_chi_tiet LIKE ?)
                        GROUP BY m.ma_mon
                        ORDER BY CASE 
                            WHEN m.ten_mon LIKE ? THEN 1
                            WHEN m.ten_mon LIKE ? THEN 2
                            ELSE 3
                        END
                        LIMIT 6
                    `, [`%${term}%`, `%${term}%`, `${term}%`, `%${term}%`]);
                    
                    dishes.forEach(d => {
                        if (!context.mon_an_lien_quan.find(e => e.ma_mon === d.ma_mon)) {
                            context.mon_an_lien_quan.push({
                                ...d,
                                diem_danh_gia: parseFloat(d.diem_danh_gia) || 0,
                                luot_danh_gia: parseInt(d.luot_danh_gia) || 0
                            });
                        }
                    });
                }
            }

            // Tìm theo danh mục
            if (intent.hoi_danh_muc && intent.tu_khoa_danh_muc.length > 0) {
                for (const catKw of intent.tu_khoa_danh_muc) {
                    const [cats] = await db.query(
                        'SELECT * FROM danh_muc WHERE trang_thai = 1 AND ten_danh_muc LIKE ?',
                        [`%${catKw}%`]
                    );
                    for (const cat of cats) {
                        const [catDishes] = await db.query(`
                            SELECT m.ma_mon, m.ten_mon, m.gia_tien, m.don_vi_tinh, m.anh_mon, m.mo_ta_chi_tiet,
                                   d.ten_danh_muc
                            FROM mon_an m LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                            WHERE m.trang_thai = 1 AND m.ma_danh_muc = ?
                            LIMIT 8
                        `, [cat.ma_danh_muc]);
                        
                        context.danh_muc_lien_quan.push({ ...cat, mon_an: catDishes });
                        catDishes.forEach(d => {
                            if (!context.mon_an_lien_quan.find(e => e.ma_mon === d.ma_mon)) {
                                context.mon_an_lien_quan.push(d);
                            }
                        });
                    }
                }
            }

            // Thực đơn tổng quát
            if (intent.hoi_thuc_don && context.mon_an_lien_quan.length === 0) {
                const [allCats] = await db.query('SELECT * FROM danh_muc WHERE trang_thai = 1');
                for (const cat of allCats) {
                    const [catDishes] = await db.query(`
                        SELECT m.ma_mon, m.ten_mon, m.gia_tien, m.don_vi_tinh, m.anh_mon, d.ten_danh_muc
                        FROM mon_an m LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                        WHERE m.trang_thai = 1 AND m.ma_danh_muc = ?
                        ORDER BY RAND() LIMIT 3
                    `, [cat.ma_danh_muc]);
                    context.danh_muc_lien_quan.push({ ...cat, mon_an: catDishes });
                    catDishes.forEach(d => context.mon_an_lien_quan.push(d));
                }
            }
        }

        // 2. Khoảng giá
        if (intent.khoang_gia) {
            const [priceFiltered] = await db.query(`
                SELECT m.ma_mon, m.ten_mon, m.gia_tien, m.don_vi_tinh, m.anh_mon, m.mo_ta_chi_tiet, d.ten_danh_muc
                FROM mon_an m LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                WHERE m.trang_thai = 1 AND m.gia_tien BETWEEN ? AND ?
                ORDER BY m.gia_tien ASC LIMIT 8
            `, [intent.khoang_gia.min, intent.khoang_gia.max]);
            
            priceFiltered.forEach(d => {
                if (!context.mon_an_lien_quan.find(e => e.ma_mon === d.ma_mon)) {
                    context.mon_an_lien_quan.push(d);
                }
            });
        }

        // 3. Top bán chạy / Gợi ý
        if (intent.hoi_top_ban_chay || intent.hoi_goi_y) {
            const [topDishes] = await db.query(`
                SELECT m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien, m.don_vi_tinh, m.mo_ta_chi_tiet,
                       d.ten_danh_muc, SUM(ct.so_luong) as so_luong_ban
                FROM chi_tiet_don_hang ct
                JOIN mon_an m ON ct.ma_mon = m.ma_mon
                JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
                LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                WHERE dh.trang_thai = 'delivered' AND m.trang_thai = 1
                GROUP BY m.ma_mon
                ORDER BY so_luong_ban DESC LIMIT 6
            `);
            context.top_ban_chay = topDishes;
            topDishes.forEach(d => {
                if (!context.mon_an_lien_quan.find(e => e.ma_mon === d.ma_mon)) {
                    context.mon_an_lien_quan.push(d);
                }
            });
        }

        // Giới hạn
        context.mon_an_lien_quan = context.mon_an_lien_quan.slice(0, 8);
        context.has_food_data = context.mon_an_lien_quan.length > 0;

        // Compact menu cho AI
        if (context.has_food_data) {
            context.compact_menu = context.mon_an_lien_quan.map(m => {
                const price = new Intl.NumberFormat('vi-VN').format(m.gia_tien);
                return `- ${m.ten_mon}: ${price}d/${m.don_vi_tinh || 'phan'} (${m.ten_danh_muc || ''})${m.diem_danh_gia ? ' *' + parseFloat(m.diem_danh_gia).toFixed(1) : ''}`;
            }).join('\n');
        }

    } catch (error) {
        console.error('Error getting chatbot context:', error.message);
    }

    return context;
}

// Menu đầy đủ (fallback)
async function getCompactMenu() {
    try {
        const [categories] = await db.query('SELECT * FROM danh_muc WHERE trang_thai = 1 ORDER BY ma_danh_muc');
        const [dishes] = await db.query(`
            SELECT m.ten_mon, m.gia_tien, m.don_vi_tinh, d.ten_danh_muc, d.ma_danh_muc
            FROM mon_an m LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
            WHERE m.trang_thai = 1 ORDER BY d.ma_danh_muc, m.ten_mon
        `);

        let menuInfo = '';
        categories.forEach(cat => {
            const catDishes = dishes.filter(d => d.ma_danh_muc === cat.ma_danh_muc);
            if (catDishes.length > 0) {
                menuInfo += '\n' + cat.ten_danh_muc.toUpperCase() + ':\n';
                catDishes.forEach(dish => {
                    const price = new Intl.NumberFormat('vi-VN').format(dish.gia_tien);
                    menuInfo += '  - ' + dish.ten_mon + ': ' + price + 'd/' + (dish.don_vi_tinh || 'phan') + '\n';
                });
            }
        });
        return menuInfo;
    } catch (error) {
        console.error('Error getting compact menu:', error.message);
        return '';
    }
}

// ==================== CHATBOT ORDER AUTOMATION (GraphQL) ====================

// Tạo system prompt chuẩn cho AI
function systemPromptBase(tenNhaHang, diaChi, soDienThoai, email, website, gioMoCuaT2T6, gioMoCuaT7CN, phiGiaoHang, mienPhiGiaoHangTu) {
    return 'BẠN LÀ TRÀ MY - trợ lý ảo thông minh của ' + tenNhaHang + '.\n\n'
        + '=== DANH TÍNH ===\n'
        + '- Tên: TRÀ MY - tiếp viên ảo dễ thương, ngọt ngào\n'
        + '- Xưng "em", gọi khách là "anh/chị"\n'
        + '- Nói ngắn gọn (2-4 câu), trọng tâm, chính xác\n'
        + '- Emoji: 🌸 💕 😊 🍜 ✨ 🛒\n\n'
        + '=== THÔNG TIN NHÀ HÀNG ===\n'
        + '📍 ' + tenNhaHang + ' - "PHƯƠNG NAM – NGON NHƯ MẸ NẤU"\n'
        + '📍 Địa chỉ: ' + diaChi + '\n'
        + '📍 Hotline: ' + soDienThoai + ' | Email: ' + email + ' | Web: ' + website + '\n'
        + '📍 Giờ mở cửa: T2-T6: ' + gioMoCuaT2T6 + ' | T7-CN: ' + gioMoCuaT7CN + '\n'
        + '📍 Giao hàng: ' + new Intl.NumberFormat('vi-VN').format(phiGiaoHang) + 'đ | Miễn phí từ ' + new Intl.NumberFormat('vi-VN').format(mienPhiGiaoHangTu) + 'đ\n'
        + '📍 Miễn phí giao hàng cho đơn từ ' + new Intl.NumberFormat('vi-VN').format(mienPhiGiaoHangTu) + 'đ\n\n'
        + '=== CHỨC NĂNG ĐẶT HÀNG ===\n'
        + 'Bạn có thể giúp khách: thêm món vào giỏ hàng, xem giỏ hàng, đặt hàng, xem đơn hàng.\n'
        + 'Khi khách muốn đặt món, hãy xác nhận lại món và số lượng, rồi thêm vào giỏ hàng.\n'
        + 'Hướng dẫn khách: "Chỉ cần nói: đặt 2 phần phở bò, 1 cơm tấm"\n\n'
        + '=== ĐỘI NGŨ ===\n'
        + '👩‍💼 Chủ: Hoàng Thục Linh (10 năm KN)\n'
        + '👨‍🍳 Bếp trưởng: Nguyễn Nhật Trường (20 năm KN)\n'
        + '👨‍🍳 Phó bếp: Nguyễn Huỳnh Kỳ Thuật (12 năm KN)\n'
        + '👩‍💼 Quản lý: Hứa Thị Thảo Vy (8 năm KN)\n\n'
        + '=== QUY TẮC (BẮT BUỘC) ===\n'
        + '1. NGẮN GỌN, TRỌNG TÂM (2-4 câu), không lan man\n'
        + '2. Hỏi món ăn -> DÙNG tên và giá từ dữ liệu\n'
        + '3. Chào/hỏi tên -> "Em là Trà My, trợ lý ảo của ' + tenNhaHang + '"\n'
        + '4. "Trà My" là TÊN BẠN, KHÔNG phải đồ uống\n'
        + '5. Hỏi đội ngũ -> DÙNG tên, chức vụ\n'
        + '6. Hỏi liên hệ -> DÙNG SDT, địa chỉ, giờ\n'
        + '7. Không biết -> Gọi hotline ' + soDienThoai + '\n'
        + '8. KHÔNG bịa đặt. Liệt kê món: Tên - Giá rõ ràng\n'
        + '9. Khi khách đặt hàng -> xác nhận món, số lượng, tổng tiền\n'
        + '10. Sau khi thêm giỏ hàng -> hỏi muốn đặt thêm hay thanh toán\n'; 
}

// Xử lý thêm món vào giỏ hàng qua chatbot
async function chatbotAddToCart(ma_nguoi_dung, items) {
    const results = { added: [], errors: [], gio_hang: null };

    for (const item of items) {
        try {
            let ma_mon = null;
            let dish = null;

            // Tìm món theo tên
            if (item.ten_mon) {
                const [found] = await db.query(`
                    SELECT ma_mon, ten_mon, gia_tien, so_luong_ton, anh_mon, don_vi_tinh
                    FROM mon_an WHERE trang_thai = 1 AND ten_mon LIKE ?
                    ORDER BY CASE WHEN ten_mon LIKE ? THEN 1 WHEN ten_mon LIKE ? THEN 2 ELSE 3 END
                    LIMIT 1
                `, [`%${item.ten_mon}%`, `${item.ten_mon}`, `${item.ten_mon}%`]);

                if (found.length > 0) {
                    dish = found[0];
                    ma_mon = dish.ma_mon;
                } else {
                    results.errors.push(`Không tìm thấy "${item.ten_mon}"`);
                    continue;
                }
            } else if (item.ma_mon) {
                const [found] = await db.query('SELECT * FROM mon_an WHERE ma_mon = ? AND trang_thai = 1', [item.ma_mon]);
                if (found.length > 0) {
                    dish = found[0];
                    ma_mon = dish.ma_mon;
                } else {
                    results.errors.push(`Món #${item.ma_mon} không tồn tại`);
                    continue;
                }
            }

            if (!dish) continue;

            const soLuong = item.so_luong || 1;
            if (dish.so_luong_ton < soLuong) {
                results.errors.push(`"${dish.ten_mon}" hết hàng`);
                continue;
            }

            // Lấy/tạo giỏ hàng
            let [cartRows] = await db.query('SELECT * FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"', [ma_nguoi_dung]);
            let ma_gio_hang;
            if (cartRows.length === 0) {
                const [result] = await db.query('INSERT INTO gio_hang (ma_nguoi_dung) VALUES (?)', [ma_nguoi_dung]);
                ma_gio_hang = result.insertId;
            } else {
                ma_gio_hang = cartRows[0].ma_gio_hang;
            }

            // Kiểm tra đã có trong giỏ chưa
            const [existing] = await db.query('SELECT * FROM chi_tiet_gio_hang WHERE ma_gio_hang = ? AND ma_mon = ?', [ma_gio_hang, ma_mon]);
            if (existing.length > 0) {
                const newQty = Math.min(existing[0].so_luong + soLuong, 10);
                await db.query('UPDATE chi_tiet_gio_hang SET so_luong = ? WHERE ma_chi_tiet = ?', [newQty, existing[0].ma_chi_tiet]);
            } else {
                await db.query(
                    'INSERT INTO chi_tiet_gio_hang (ma_gio_hang, ma_mon, so_luong, gia_tai_thoi_diem) VALUES (?, ?, ?, ?)',
                    [ma_gio_hang, ma_mon, Math.min(soLuong, 10), dish.gia_tien]
                );
            }

            const price = new Intl.NumberFormat('vi-VN').format(dish.gia_tien);
            results.added.push({ ten_mon: dish.ten_mon, so_luong: soLuong, gia_tien: dish.gia_tien, price_formatted: price, anh_mon: dish.anh_mon, ma_mon: dish.ma_mon });
        } catch (error) {
            console.error('chatbotAddToCart item error:', error.message);
            results.errors.push(`Lỗi thêm "${item.ten_mon || item.ma_mon}"`);
        }
    }

    // Lấy giỏ hàng cập nhật
    results.gio_hang = await getCartByUserId(ma_nguoi_dung);
    return results;
}

// Lấy thông tin giỏ hàng để chatbot hiển thị
async function chatbotGetCart(ma_nguoi_dung) {
    const gioHang = await getCartByUserId(ma_nguoi_dung);
    if (!gioHang || gioHang.items.length === 0) {
        return { has_items: false, summary: 'Giỏ hàng hiện đang trống.', gio_hang: gioHang };
    }

    const summary = gioHang.items.map(i => {
        const price = new Intl.NumberFormat('vi-VN').format(i.gia_tai_thoi_diem);
        return `- ${i.ten_mon}: ${i.so_luong} x ${price}đ = ${new Intl.NumberFormat('vi-VN').format(i.thanh_tien)}đ`;
    }).join('\n');

    const total = new Intl.NumberFormat('vi-VN').format(gioHang.tong_tien);
    return {
        has_items: true,
        summary: `GIỎ HÀNG HIỆN TẠI (${gioHang.so_luong} món):\n${summary}\n\nTổng cộng: ${total}đ`,
        gio_hang: gioHang
    };
}

// Lấy lịch sử đơn hàng cho chatbot
async function chatbotGetOrders(ma_nguoi_dung, limit = 5) {
    try {
        const [orders] = await db.query(`
            SELECT dh.ma_don_hang, dh.tong_tien, dh.trang_thai, dh.thoi_gian_tao,
                   GROUP_CONCAT(CONCAT(ct.so_luong, 'x ', m.ten_mon) SEPARATOR ', ') as danh_sach_mon
            FROM don_hang dh
            LEFT JOIN chi_tiet_don_hang ct ON dh.ma_don_hang = ct.ma_don_hang
            LEFT JOIN mon_an m ON ct.ma_mon = m.ma_mon
            WHERE dh.ma_nguoi_dung = ?
            GROUP BY dh.ma_don_hang
            ORDER BY dh.thoi_gian_tao DESC
            LIMIT ?
        `, [ma_nguoi_dung, limit]);

        if (orders.length === 0) return { has_orders: false, summary: 'Bạn chưa có đơn hàng nào.' };

        const statusMap = {
            'pending': 'Chờ xác nhận', 'confirmed': 'Đã xác nhận',
            'preparing': 'Đang chuẩn bị', 'delivered': 'Hoàn thành', 'cancelled': 'Đã hủy'
        };

        const summary = orders.map(o => {
            const total = new Intl.NumberFormat('vi-VN').format(o.tong_tien);
            const status = statusMap[o.trang_thai] || o.trang_thai;
            return `#${o.ma_don_hang} - ${status} - ${total}đ\n  Món: ${o.danh_sach_mon}`;
        }).join('\n\n');

        return { has_orders: true, summary: `ĐƠN HÀNG GẦN ĐÂY:\n\n${summary}`, orders };
    } catch (error) {
        console.error('chatbotGetOrders error:', error.message);
        return { has_orders: false, summary: 'Không thể lấy thông tin đơn hàng.' };
    }
}

// ==================== API TEST ====================

router.get('/test-data', async (req, res) => {
    try {
        const [settings] = await db.query('SELECT * FROM cai_dat');
        const settingsObj = {};
        settings.forEach(item => { settingsObj[item.setting_key] = item.setting_value; });
        const [categories] = await db.query('SELECT * FROM danh_muc WHERE trang_thai = 1');
        const [dishes] = await db.query('SELECT ma_mon, ten_mon, gia_tien, anh_mon FROM mon_an WHERE trang_thai = 1 LIMIT 10');
        
        res.json({
            success: true,
            data: {
                groq_api_key: process.env.GROQ_API_KEY ? 'Configured' : 'NOT SET',
                graphql: 'Enabled',
                settings: settingsObj,
                categories: categories.map(c => c.ten_danh_muc),
                dishes_sample: dishes.slice(0, 5).map(d => ({ ten: d.ten_mon, gia: d.gia_tien, anh: d.anh_mon }))
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ==================== MAIN CHAT API (GraphQL-powered) ====================

router.post('/chat', async (req, res) => {
    try {
        const { message, session_id } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Vui long nhap tin nhan' });
        }
        if (!process.env.GROQ_API_KEY) {
            return res.json({ success: false, message: 'Chua cau hinh GROQ_API_KEY' });
        }

        const ma_nguoi_dung = getUserFromToken(req);
        const chatSessionId = session_id || 'guest_' + Date.now();

        await saveChatHistory(ma_nguoi_dung, chatSessionId, 'user', message.trim());

        // GraphQL: Lay context chinh xac
        console.log('GraphQL: Analyzing message...');
        const graphqlContext = await getChatbotContextForMessage(message);
        const settings = await getRestaurantSettings();

        const tenNhaHang = settings.ten_nha_hang || 'Nha hang Am thuc Phuong Nam';
        const diaChi = settings.dia_chi || '123 Duong ABC, Phuong 1, TP. Vinh Long';
        const soDienThoai = settings.so_dien_thoai || '0123 456 789';
        const email = settings.email || 'info@phuongnam.vn';
        const website = settings.website || 'phuongnam.vn';
        const gioMoCuaT2T6 = settings.gio_mo_cua_t2_t6 || '08:00-22:00';
        const gioMoCuaT7CN = settings.gio_mo_cua_t7_cn || '07:00-23:00';
        const phiGiaoHang = settings.phi_giao_hang || '20000';
        const mienPhiGiaoHangTu = settings.mien_phi_giao_hang_tu || '200000';

        console.log('Intent:', JSON.stringify({
            food: graphqlContext.intent.hoi_mon_an,
            menu: graphqlContext.intent.hoi_thuc_don,
            price: graphqlContext.intent.hoi_gia,
            top: graphqlContext.intent.hoi_top_ban_chay,
            info: graphqlContext.intent.hoi_thong_tin,
            dishes_found: graphqlContext.mon_an_lien_quan.length,
            order: graphqlContext.intent.muon_dat_hang,
            add_cart: graphqlContext.intent.muon_them_gio_hang,
            view_cart: graphqlContext.intent.muon_xem_gio_hang,
            view_orders: graphqlContext.intent.muon_xem_don_hang,
            order_items: graphqlContext.intent.mon_an_dat_hang
        }));

        // ==================== XỬ LÝ ĐẶT HÀNG QUA CHATBOT ====================
        
        // 1. Xem giỏ hàng
        if (graphqlContext.intent.muon_xem_gio_hang && ma_nguoi_dung) {
            const cartInfo = await chatbotGetCart(ma_nguoi_dung);
            
            const cartPrompt = cartInfo.has_items 
                ? `\n=== GIỎ HÀNG HIỆN TẠI ===\n${cartInfo.summary}\n\nHãy tóm tắt giỏ hàng cho khách và hỏi khách muốn đặt hàng hay thêm món gì khác.`
                : `\nGiỏ hàng của khách đang trống. Hãy gợi ý một vài món ăn ngon cho khách.`;
            
            const completion = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPromptBase(tenNhaHang, diaChi, soDienThoai, email, website, gioMoCuaT2T6, gioMoCuaT7CN, phiGiaoHang, mienPhiGiaoHangTu) + cartPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 500,
                temperature: 0.6
            });

            const botResponse = completion.choices[0]?.message?.content || 'Em không lấy được thông tin giỏ hàng ạ!';
            await saveChatHistory(ma_nguoi_dung, chatSessionId, 'bot', botResponse);

            return res.json({
                success: true,
                data: {
                    response: botResponse,
                    source: 'groq+graphql+cart',
                    action: 'view_cart',
                    gio_hang: cartInfo.gio_hang
                }
            });
        }

        // 2. Xem đơn hàng
        if (graphqlContext.intent.muon_xem_don_hang && ma_nguoi_dung) {
            const orderInfo = await chatbotGetOrders(ma_nguoi_dung);
            
            const orderPrompt = orderInfo.has_orders
                ? `\n=== ĐƠN HÀNG CỦA KHÁCH ===\n${orderInfo.summary}\n\nHãy tóm tắt các đơn hàng cho khách.`
                : `\nKhách chưa có đơn hàng nào. Gợi ý khách xem thực đơn và đặt hàng.`;

            const completion = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPromptBase(tenNhaHang, diaChi, soDienThoai, email, website, gioMoCuaT2T6, gioMoCuaT7CN, phiGiaoHang, mienPhiGiaoHangTu) + orderPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 500,
                temperature: 0.6
            });

            const botResponse = completion.choices[0]?.message?.content || 'Em không lấy được thông tin đơn hàng ạ!';
            await saveChatHistory(ma_nguoi_dung, chatSessionId, 'bot', botResponse);

            return res.json({
                success: true,
                data: {
                    response: botResponse,
                    source: 'groq+graphql+orders',
                    action: 'view_orders',
                    orders: orderInfo.orders || []
                }
            });
        }

        // 3. Thêm món vào giỏ hàng
        if ((graphqlContext.intent.muon_them_gio_hang || graphqlContext.intent.muon_dat_hang) 
            && graphqlContext.intent.mon_an_dat_hang.length > 0 && ma_nguoi_dung) {
            
            console.log('🛒 Chatbot: Adding to cart:', graphqlContext.intent.mon_an_dat_hang);
            const cartResult = await chatbotAddToCart(ma_nguoi_dung, graphqlContext.intent.mon_an_dat_hang);
            
            let actionPrompt = '';
            if (cartResult.added.length > 0) {
                const addedList = cartResult.added.map(a => `${a.so_luong}x ${a.ten_mon} (${a.price_formatted}đ)`).join(', ');
                actionPrompt += `\n=== ĐÃ THÊM VÀO GIỎ HÀNG ===\n${addedList}\n`;
            }
            if (cartResult.errors.length > 0) {
                actionPrompt += `\nLỗi: ${cartResult.errors.join(', ')}\n`;
            }
            if (cartResult.gio_hang && cartResult.gio_hang.items.length > 0) {
                const gioHangSummary = cartResult.gio_hang.items.map(i => `- ${i.ten_mon}: ${i.so_luong} phần`).join('\n');
                const total = new Intl.NumberFormat('vi-VN').format(cartResult.gio_hang.tong_tien);
                actionPrompt += `\nGIỎ HÀNG HIỆN TẠI:\n${gioHangSummary}\nTổng cộng: ${total}đ\n`;
            }
            actionPrompt += `\nHãy xác nhận đã thêm món vào giỏ hàng và hỏi khách muốn đặt hàng hay thêm món gì khác. Ngắn gọn, thân thiện.`;

            const completion = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPromptBase(tenNhaHang, diaChi, soDienThoai, email, website, gioMoCuaT2T6, gioMoCuaT7CN, phiGiaoHang, mienPhiGiaoHangTu) + actionPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 500,
                temperature: 0.6
            });

            const botResponse = completion.choices[0]?.message?.content || 'Em đã thêm món vào giỏ hàng rồi ạ! 🛒';
            await saveChatHistory(ma_nguoi_dung, chatSessionId, 'bot', botResponse);

            return res.json({
                success: true,
                data: {
                    response: botResponse,
                    source: 'groq+graphql+cart',
                    action: 'add_to_cart',
                    added_items: cartResult.added,
                    errors: cartResult.errors,
                    gio_hang: cartResult.gio_hang,
                    dishes: cartResult.added.map(a => ({
                        ma_mon: a.ma_mon,
                        ten_mon: a.ten_mon,
                        gia_tien: a.gia_tien,
                        anh_mon: a.anh_mon,
                        so_luong: a.so_luong
                    }))
                }
            });
        }

        // 4. Yêu cầu đặt hàng nhưng chưa chọn món (hướng dẫn)
        if ((graphqlContext.intent.muon_dat_hang || graphqlContext.intent.muon_them_gio_hang) 
            && graphqlContext.intent.mon_an_dat_hang.length === 0) {
            
            // Có thể user chưa đăng nhập
            if (!ma_nguoi_dung) {
                const botResponse = 'Anh/chị ơi, để đặt hàng qua chatbot, anh/chị cần đăng nhập trước ạ! 🌸 Sau khi đăng nhập, anh/chị chỉ cần nói: "Đặt 2 phần phở bò, 1 cơm tấm" là em xử lý ngay ạ! 💕';
                await saveChatHistory(ma_nguoi_dung, chatSessionId, 'bot', botResponse);
                return res.json({
                    success: true,
                    data: {
                        response: botResponse,
                        source: 'groq+graphql',
                        action: 'require_login'
                    }
                });
            }
            
            // Đã đăng nhập nhưng chưa chọn món -> gợi ý
            let suggestPrompt = '\nKhách muốn đặt hàng nhưng chưa chọn món cụ thể. Hãy hỏi khách muốn đặt món gì và gợi ý top món bán chạy.';
            if (graphqlContext.top_ban_chay.length > 0) {
                suggestPrompt += '\n=== GỢI Ý ===\n' + graphqlContext.top_ban_chay.map((p, i) => (i + 1) + '. ' + p.ten_mon + ' - ' + new Intl.NumberFormat('vi-VN').format(p.gia_tien) + 'đ').join('\n');
            }
            suggestPrompt += '\n\nHướng dẫn: "Chỉ cần nói: đặt 2 phần phở bò, 1 cơm tấm là em thêm vào giỏ hàng liền ạ!"';

            const completion = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPromptBase(tenNhaHang, diaChi, soDienThoai, email, website, gioMoCuaT2T6, gioMoCuaT7CN, phiGiaoHang, mienPhiGiaoHangTu) + suggestPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 500,
                temperature: 0.6
            });

            const botResponse = completion.choices[0]?.message?.content || 'Anh/chị muốn đặt món gì ạ? 🍜';
            await saveChatHistory(ma_nguoi_dung, chatSessionId, 'bot', botResponse);

            const responseData = {
                response: botResponse,
                source: 'groq+graphql',
                action: 'suggest_order'
            };
            if (graphqlContext.top_ban_chay.length > 0) {
                responseData.dishes = graphqlContext.top_ban_chay.map(m => ({
                    ma_mon: m.ma_mon, ten_mon: m.ten_mon, gia_tien: m.gia_tien,
                    anh_mon: m.anh_mon, ten_danh_muc: m.ten_danh_muc
                }));
            }

            return res.json({ success: true, data: responseData });
        }

        // ==================== XỬ LÝ BÌNH THƯỜNG (hỏi đáp) ====================

        // System Prompt toi uu
        let foodContextPrompt = '';
        
        if (graphqlContext.has_food_data) {
            foodContextPrompt = '\n=== MÓN ĂN LIÊN QUAN (GraphQL) ===\n' + graphqlContext.compact_menu + '\n\nQUA TRỌNG: Trả lời DỰA TRÊN dữ liệu trên, kèm giá chính xác. Ngắn gọn, trọng tâm.\n';
        } else if (graphqlContext.intent.hoi_mon_an || graphqlContext.intent.hoi_thuc_don) {
            const fullMenu = await getCompactMenu();
            foodContextPrompt = '\n=== THỰC ĐƠN ===\n' + fullMenu + '\n';
        }

        let topDishesPrompt = '';
        if (graphqlContext.top_ban_chay.length > 0) {
            topDishesPrompt = '\n=== TOP BÁN CHẠY ===\n' + graphqlContext.top_ban_chay.map((p, i) => (i + 1) + '. ' + p.ten_mon + ' - ' + new Intl.NumberFormat('vi-VN').format(p.gia_tien) + 'đ (' + p.so_luong_ban + ' phần)').join('\n') + '\n';
        }

        const systemPrompt = systemPromptBase(tenNhaHang, diaChi, soDienThoai, email, website, gioMoCuaT2T6, gioMoCuaT7CN, phiGiaoHang, mienPhiGiaoHangTu) + foodContextPrompt + topDishesPrompt;

        // Goi Groq AI
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            max_tokens: 400,
            temperature: 0.6
        });
        
        if (completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content) {
            const botResponse = completion.choices[0].message.content;
            await saveChatHistory(ma_nguoi_dung, chatSessionId, 'bot', botResponse);
            
            const responseData = {
                response: botResponse,
                source: 'groq+graphql'
            };

            // Gui kem du lieu mon an (co anh) tu GraphQL
            if (graphqlContext.has_food_data) {
                responseData.dishes = graphqlContext.mon_an_lien_quan.map(m => ({
                    ma_mon: m.ma_mon,
                    ten_mon: m.ten_mon,
                    gia_tien: m.gia_tien,
                    don_vi_tinh: m.don_vi_tinh || 'phan',
                    anh_mon: m.anh_mon,
                    ten_danh_muc: m.ten_danh_muc,
                    mo_ta: m.mo_ta_chi_tiet ? m.mo_ta_chi_tiet.substring(0, 80) : '',
                    diem_danh_gia: m.diem_danh_gia || 0
                }));
            }

            if (graphqlContext.top_ban_chay.length > 0 && !graphqlContext.has_food_data) {
                responseData.dishes = graphqlContext.top_ban_chay.map(m => ({
                    ma_mon: m.ma_mon,
                    ten_mon: m.ten_mon,
                    gia_tien: m.gia_tien,
                    don_vi_tinh: m.don_vi_tinh || 'phan',
                    anh_mon: m.anh_mon,
                    ten_danh_muc: m.ten_danh_muc,
                    so_luong_ban: m.so_luong_ban
                }));
            }
            
            return res.json({ success: true, data: responseData });
        }

        return res.json({ success: false, message: 'Không nhận được phản hồi từ AI' });

    } catch (error) {
        console.error('Chatbot error:', error.message);
        console.error('Chatbot error status:', error.status);
        console.error('Chatbot error stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
        if (error.error) console.error('Chatbot error body:', JSON.stringify(error.error));
        if (error.status === 401) return res.json({ success: false, message: 'API Key không hợp lệ' });
        if (error.status === 429) return res.json({ success: false, message: 'Vượt giới hạn API. Thử lại sau!' });
        return res.json({ success: false, message: 'Lỗi chatbot: ' + error.message });
    }
});

// ==================== GraphQL REST wrapper ====================

router.get('/graphql/search', async (req, res) => {
    try {
        const { q, category, min_price, max_price, sort, limit } = req.query;
        let query = 'SELECT m.ma_mon, m.ten_mon, m.mo_ta_chi_tiet, m.gia_tien, m.don_vi_tinh, m.anh_mon, d.ten_danh_muc, COALESCE(AVG(dg.so_sao), 0) as diem_danh_gia FROM mon_an m LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = \'approved\' WHERE m.trang_thai = 1';
        const params = [];

        if (q) { query += ' AND (m.ten_mon LIKE ? OR m.mo_ta_chi_tiet LIKE ?)'; params.push('%' + q + '%', '%' + q + '%'); }
        if (category) { query += ' AND d.ma_danh_muc = ?'; params.push(category); }
        if (min_price) { query += ' AND m.gia_tien >= ?'; params.push(parseFloat(min_price)); }
        if (max_price) { query += ' AND m.gia_tien <= ?'; params.push(parseFloat(max_price)); }

        query += ' GROUP BY m.ma_mon';
        switch (sort) {
            case 'price_asc': query += ' ORDER BY m.gia_tien ASC'; break;
            case 'price_desc': query += ' ORDER BY m.gia_tien DESC'; break;
            case 'rating': query += ' ORDER BY diem_danh_gia DESC'; break;
            default: query += ' ORDER BY m.ten_mon ASC';
        }
        query += ' LIMIT ' + (parseInt(limit) || 10);

        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows.map(r => ({ ...r, diem_danh_gia: parseFloat(r.diem_danh_gia) || 0 })) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== CHATBOT ORDER API (GraphQL-powered) ====================

// API: Thêm món vào giỏ hàng qua chatbot
router.post('/order/add-to-cart', async (req, res) => {
    try {
        const ma_nguoi_dung = getUserFromToken(req);
        if (!ma_nguoi_dung) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để đặt hàng' });
        }

        const { items } = req.body; // [{ten_mon, so_luong, ma_mon}]
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn món ăn' });
        }

        const result = await chatbotAddToCart(ma_nguoi_dung, items);
        
        res.json({
            success: result.added.length > 0,
            data: {
                added: result.added,
                errors: result.errors,
                gio_hang: result.gio_hang
            },
            message: result.added.length > 0 
                ? `Đã thêm ${result.added.length} món vào giỏ hàng`
                : 'Không thêm được món nào'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Xem giỏ hàng qua chatbot
router.get('/order/cart', async (req, res) => {
    try {
        const ma_nguoi_dung = getUserFromToken(req);
        if (!ma_nguoi_dung) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        }

        const cartInfo = await chatbotGetCart(ma_nguoi_dung);
        res.json({ success: true, data: cartInfo });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Đặt hàng từ giỏ hàng qua chatbot
router.post('/order/checkout', async (req, res) => {
    try {
        const ma_nguoi_dung = getUserFromToken(req);
        if (!ma_nguoi_dung) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để đặt hàng' });
        }

        const { ten_nguoi_nhan, so_dien_thoai, dia_chi, tinh_thanh, quan_huyen, phuong_xa, ghi_chu, phuong_thuc_thanh_toan } = req.body;

        if (!ten_nguoi_nhan || !so_dien_thoai || !dia_chi) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp thông tin giao hàng (tên, SĐT, địa chỉ)' });
        }

        // Lấy giỏ hàng
        const [cartRows] = await db.query('SELECT * FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"', [ma_nguoi_dung]);
        if (cartRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
        }

        const ma_gio_hang = cartRows[0].ma_gio_hang;
        const [cartItems] = await db.query(`
            SELECT ct.ma_mon, ct.so_luong, ct.gia_tai_thoi_diem,
                   (ct.so_luong * ct.gia_tai_thoi_diem) as thanh_tien,
                   m.ten_mon, m.anh_mon, m.so_luong_ton
            FROM chi_tiet_gio_hang ct
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            WHERE ct.ma_gio_hang = ?
        `, [ma_gio_hang]);

        if (cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
        }

        // Kiểm tra tồn kho
        for (const item of cartItems) {
            if (item.so_luong_ton < item.so_luong) {
                return res.status(400).json({ success: false, message: `"${item.ten_mon}" không đủ số lượng (còn ${item.so_luong_ton})` });
            }
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const tong_tien_hang = cartItems.reduce((sum, item) => sum + parseFloat(item.thanh_tien), 0);
            const phi_giao_hang = tong_tien_hang >= 150000 ? 0 : 30000;
            const tong_tien = tong_tien_hang + phi_giao_hang;
            const dia_chi_day_du = [dia_chi, phuong_xa, quan_huyen, tinh_thanh].filter(Boolean).join(', ');

            // Tạo đơn hàng
            const [orderResult] = await connection.query(
                `INSERT INTO don_hang (ma_nguoi_dung, ten_khach_vang_lai, so_dt_khach, dia_chi_giao, tong_tien, trang_thai, ghi_chu)
                 VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
                [ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai, dia_chi_day_du, tong_tien, ghi_chu || null]
            );
            const ma_don_hang = orderResult.insertId;

            // Chi tiết + giảm tồn kho
            for (const item of cartItems) {
                await connection.query(
                    'INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_mon, so_luong, gia_tai_thoi_diem) VALUES (?, ?, ?, ?)',
                    [ma_don_hang, item.ma_mon, item.so_luong, item.gia_tai_thoi_diem]
                );
                await connection.query('UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?', [item.so_luong, item.ma_mon]);
            }

            // Thanh toán
            await connection.query(
                'INSERT INTO thanh_toan (ma_don_hang, so_tien, phuong_thuc, trang_thai) VALUES (?, ?, ?, ?)',
                [ma_don_hang, tong_tien, phuong_thuc_thanh_toan || 'cod', 'pending']
            );

            // Đánh dấu giỏ hàng
            await connection.query('UPDATE gio_hang SET trang_thai = "ordered" WHERE ma_gio_hang = ?', [ma_gio_hang]);
            await connection.query('INSERT INTO gio_hang (ma_nguoi_dung, trang_thai) VALUES (?, "active")', [ma_nguoi_dung]);

            await connection.commit();

            res.json({
                success: true,
                message: `Đặt hàng thành công! Mã đơn: #${ma_don_hang}`,
                data: {
                    ma_don_hang,
                    tong_tien,
                    phi_giao_hang,
                    tong_tien_hang,
                    dia_chi_giao: dia_chi_day_du,
                    chi_tiet: cartItems.map(i => ({
                        ten_mon: i.ten_mon, so_luong: i.so_luong,
                        gia_tai_thoi_diem: i.gia_tai_thoi_diem, thanh_tien: i.thanh_tien
                    }))
                }
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Chatbot checkout error:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi đặt hàng: ' + error.message });
    }
});

// API: Đặt hàng nhanh (chọn món + đặt luôn không qua giỏ)
router.post('/order/quick', async (req, res) => {
    try {
        const ma_nguoi_dung = getUserFromToken(req);
        if (!ma_nguoi_dung) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để đặt hàng' });
        }

        const { items, ten_nguoi_nhan, so_dien_thoai, dia_chi, tinh_thanh, quan_huyen, phuong_xa, ghi_chu, phuong_thuc_thanh_toan } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Chưa chọn món' });
        if (!ten_nguoi_nhan || !so_dien_thoai || !dia_chi) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin giao hàng' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const orderItems = [];
            for (const item of items) {
                let ma_mon = item.ma_mon;
                if (!ma_mon && item.ten_mon) {
                    const [found] = await connection.query(
                        'SELECT ma_mon, ten_mon, gia_tien, so_luong_ton FROM mon_an WHERE trang_thai = 1 AND ten_mon LIKE ? LIMIT 1',
                        [`%${item.ten_mon}%`]
                    );
                    if (found.length === 0) {
                        await connection.rollback();
                        return res.status(400).json({ success: false, message: `Không tìm thấy "${item.ten_mon}"` });
                    }
                    ma_mon = found[0].ma_mon;
                }

                const [dish] = await connection.query('SELECT * FROM mon_an WHERE ma_mon = ? AND trang_thai = 1', [ma_mon]);
                if (dish.length === 0) {
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: `Món #${ma_mon} không tồn tại` });
                }

                const soLuong = item.so_luong || 1;
                if (dish[0].so_luong_ton < soLuong) {
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: `"${dish[0].ten_mon}" hết hàng` });
                }

                orderItems.push({
                    ma_mon: dish[0].ma_mon, ten_mon: dish[0].ten_mon,
                    so_luong: soLuong, gia_tai_thoi_diem: dish[0].gia_tien,
                    thanh_tien: soLuong * dish[0].gia_tien
                });
            }

            const tong_tien_hang = orderItems.reduce((sum, i) => sum + i.thanh_tien, 0);
            const phi_giao_hang = tong_tien_hang >= 150000 ? 0 : 30000;
            const tong_tien = tong_tien_hang + phi_giao_hang;
            const dia_chi_day_du = [dia_chi, phuong_xa, quan_huyen, tinh_thanh].filter(Boolean).join(', ');

            const [orderResult] = await connection.query(
                `INSERT INTO don_hang (ma_nguoi_dung, ten_khach_vang_lai, so_dt_khach, dia_chi_giao, tong_tien, trang_thai, ghi_chu)
                 VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
                [ma_nguoi_dung, ten_nguoi_nhan, so_dien_thoai, dia_chi_day_du, tong_tien, ghi_chu || null]
            );
            const ma_don_hang = orderResult.insertId;

            for (const item of orderItems) {
                await connection.query(
                    'INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_mon, so_luong, gia_tai_thoi_diem) VALUES (?, ?, ?, ?)',
                    [ma_don_hang, item.ma_mon, item.so_luong, item.gia_tai_thoi_diem]
                );
                await connection.query('UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?', [item.so_luong, item.ma_mon]);
            }

            await connection.query(
                'INSERT INTO thanh_toan (ma_don_hang, so_tien, phuong_thuc, trang_thai) VALUES (?, ?, ?, ?)',
                [ma_don_hang, tong_tien, phuong_thuc_thanh_toan || 'cod', 'pending']
            );

            await connection.commit();

            res.json({
                success: true,
                message: `Đặt hàng nhanh thành công! Mã đơn: #${ma_don_hang}`,
                data: {
                    ma_don_hang, tong_tien, phi_giao_hang, tong_tien_hang,
                    chi_tiet: orderItems
                }
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Chatbot quick order error:', error.message);
        res.status(500).json({ success: false, message: 'Lá»—i: ' + error.message });
    }
});

// API: Xem đơn hàng của user
router.get('/order/history', async (req, res) => {
    try {
        const ma_nguoi_dung = getUserFromToken(req);
        if (!ma_nguoi_dung) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        }

        const orderInfo = await chatbotGetOrders(ma_nguoi_dung, parseInt(req.query.limit) || 5);
        res.json({ success: true, data: orderInfo });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== SESSION & HISTORY ====================

router.get('/sessions', async (req, res) => {
    try {
        const ma_nguoi_dung = getUserFromToken(req);
        if (!ma_nguoi_dung) return res.status(401).json({ success: false, message: 'Vui long dang nhap' });

        const [sessions] = await db.query(
            'SELECT session_id, MIN(thoi_diem_chat) as thoi_diem_chat, COUNT(*) as message_count FROM lich_su_chatbot WHERE ma_nguoi_dung = ? AND session_id IS NOT NULL GROUP BY session_id ORDER BY MIN(thoi_diem_chat) DESC LIMIT 50',
            [ma_nguoi_dung]
        );

        for (let session of sessions) {
            const [firstMsg] = await db.query(
                'SELECT noi_dung FROM lich_su_chatbot WHERE session_id = ? AND nguoi_gui = \'user\' ORDER BY thoi_diem_chat ASC LIMIT 1',
                [session.session_id]
            );
            session.first_message = firstMsg.length > 0 ? firstMsg[0].noi_dung : 'Cuoc tro chuyen';
        }

        res.json({ success: true, data: sessions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Loi lay sessions' });
    }
});

router.get('/history', async (req, res) => {
    try {
        const ma_nguoi_dung = getUserFromToken(req);
        if (!ma_nguoi_dung) return res.status(401).json({ success: false, message: 'Vui long dang nhap' });

        const [history] = await db.query(
            'SELECT ma_tin_nhan, nguoi_gui, noi_dung, thoi_diem_chat FROM lich_su_chatbot WHERE ma_nguoi_dung = ? ORDER BY thoi_diem_chat DESC LIMIT 100',
            [ma_nguoi_dung]
        );
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Loi lay lich su' });
    }
});

router.get('/history/:session_id', async (req, res) => {
    try {
        const [history] = await db.query(
            'SELECT ma_tin_nhan, nguoi_gui, noi_dung, thoi_diem_chat FROM lich_su_chatbot WHERE session_id = ? ORDER BY thoi_diem_chat ASC',
            [req.params.session_id]
        );
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Loi' });
    }
});

// ==================== ADMIN ====================

router.get('/admin/stats', async (req, res) => {
    try {
        const [totalMsg] = await db.query('SELECT COUNT(*) as count FROM lich_su_chatbot');
        const [totalSessions] = await db.query('SELECT COUNT(DISTINCT session_id) as count FROM lich_su_chatbot WHERE session_id IS NOT NULL');
        const [loggedUsers] = await db.query('SELECT COUNT(DISTINCT ma_nguoi_dung) as count FROM lich_su_chatbot WHERE ma_nguoi_dung IS NOT NULL');
        const [guestSessions] = await db.query('SELECT COUNT(DISTINCT session_id) as count FROM lich_su_chatbot WHERE ma_nguoi_dung IS NULL AND session_id IS NOT NULL');
        const [userMessages] = await db.query("SELECT COUNT(*) as count FROM lich_su_chatbot WHERE nguoi_gui = 'user'");
        const [botMessages] = await db.query("SELECT COUNT(*) as count FROM lich_su_chatbot WHERE nguoi_gui = 'bot'");
        const [dailyStats] = await db.query('SELECT DATE(thoi_diem_chat) as ngay, COUNT(*) as so_tin_nhan FROM lich_su_chatbot WHERE thoi_diem_chat >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(thoi_diem_chat) ORDER BY ngay ASC');

        res.json({
            success: true,
            data: { total_messages: totalMsg[0].count, total_sessions: totalSessions[0].count, logged_users: loggedUsers[0].count, guest_sessions: guestSessions[0].count, user_messages: userMessages[0].count, bot_messages: botMessages[0].count, daily_stats: dailyStats }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Loi thong ke' });
    }
});

router.get('/admin/history', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { search, user_type, nguoi_gui } = req.query;

        let whereClause = '1=1';
        const params = [];
        if (search) { whereClause += ' AND l.noi_dung LIKE ?'; params.push('%' + search + '%'); }
        if (user_type === 'logged') whereClause += ' AND l.ma_nguoi_dung IS NOT NULL';
        else if (user_type === 'guest') whereClause += ' AND l.ma_nguoi_dung IS NULL';
        if (nguoi_gui) { whereClause += ' AND l.nguoi_gui = ?'; params.push(nguoi_gui); }

        const [countResult] = await db.query('SELECT COUNT(*) as total FROM lich_su_chatbot l WHERE ' + whereClause, params);
        const [history] = await db.query(
            'SELECT l.*, n.ten_nguoi_dung, n.email FROM lich_su_chatbot l LEFT JOIN nguoi_dung n ON l.ma_nguoi_dung = n.ma_nguoi_dung WHERE ' + whereClause + ' ORDER BY l.thoi_diem_chat DESC LIMIT ? OFFSET ?',
            [...params, limit, offset]
        );

        res.json({ success: true, data: history, pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Loi' });
    }
});

router.get('/admin/session/:session_id', async (req, res) => {
    try {
        const [messages] = await db.query(
            'SELECT l.*, n.ten_nguoi_dung, n.email FROM lich_su_chatbot l LEFT JOIN nguoi_dung n ON l.ma_nguoi_dung = n.ma_nguoi_dung WHERE l.session_id = ? ORDER BY l.thoi_diem_chat ASC',
            [req.params.session_id]
        );
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Loi' });
    }
});

// API cho user load lịch sử chat của session hiện tại (không cần admin)
router.get('/history/:session_id', async (req, res) => {
    try {
        const sessionId = req.params.session_id;
        
        // Lấy lịch sử chat của session này (giới hạn 50 tin nhắn gần nhất)
        const [messages] = await db.query(
            `SELECT ma_tin_nhan, session_id, nguoi_gui, noi_dung, thoi_diem_chat 
             FROM lich_su_chatbot 
             WHERE session_id = ? 
             ORDER BY thoi_diem_chat ASC 
             LIMIT 50`,
            [sessionId]
        );
        
        console.log(`📜 Loaded ${messages.length} messages for session: ${sessionId}`);
        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error loading chat history:', error);
        res.status(500).json({ success: false, message: 'Lỗi tải lịch sử chat' });
    }
});

router.delete('/admin/message/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM lich_su_chatbot WHERE ma_tin_nhan = ?', [req.params.id]);
        res.json({ success: true, message: 'Da xoa' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Loi xoa' });
    }
});

module.exports = router;
