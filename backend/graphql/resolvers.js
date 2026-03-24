const db = require('../config/database');

// ==================== HELPER FUNCTIONS ====================

// Phân tích intent từ tin nhắn người dùng
function analyzeUserIntent(message) {
    const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const originalMsg = message.toLowerCase();

    const intent = {
        hoi_mon_an: false,
        hoi_gia: false,
        hoi_danh_muc: false,
        hoi_thuc_don: false,
        hoi_khuyen_mai: false,
        hoi_thong_tin: false,
        hoi_dat_ban: false,
        hoi_giao_hang: false,
        hoi_top_ban_chay: false,
        hoi_goi_y: false,
        // === MỚI: Intent đặt hàng ===
        muon_dat_hang: false,
        muon_them_gio_hang: false,
        muon_xem_gio_hang: false,
        muon_xem_don_hang: false,
        muon_dat_hang_nhanh: false,
        mon_an_dat_hang: [], // [{ten_mon, so_luong}]
        tu_khoa_mon_an: [],
        tu_khoa_danh_muc: [],
        khoang_gia: null,
    };

    // Detect hỏi về món ăn cụ thể
    const monAnKeywords = [
        'mon', 'an', 'do an', 'thuc an', 'com', 'pho', 'bun', 'mi', 'canh', 'lau',
        'nuong', 'chien', 'xao', 'hap', 'kho', 'goi', 'nem', 'cha', 'banh',
        'ga', 'bo', 'heo', 'ca', 'tom', 'muc', 'cua', 'oc', 'vit',
        'rau', 'salad', 'sup', 'chao', 'hu tieu', 'banh mi', 'che',
        'tra', 'nuoc', 'sinh to', 'cafe', 'kem', 'trang mieng',
        'hai san', 'thit', 'dau hu', 'trung', 'nam'
    ];

    const danhMucKeywords = {
        'khai vi': ['khai vi', 'mon khai vi', 'appetizer', 'an choi'],
        'mon chinh': ['mon chinh', 'main', 'chinh'],
        'lau': ['lau', 'hotpot', 'nau lau'],
        'nuong': ['nuong', 'bbq', 'do nuong'],
        'hai san': ['hai san', 'seafood', 'tom', 'cua', 'muc', 'ca'],
        'com': ['com', 'rice', 'com trang', 'com chien'],
        'trang mieng': ['trang mieng', 'dessert', 'che', 'kem', 'banh ngot'],
        'do uong': ['do uong', 'nuoc uong', 'tra', 'cafe', 'sinh to', 'nuoc ep', 'bia', 'ruou'],
        'an vat': ['an vat', 'snack'],
    };

    // Check food intent
    for (const kw of monAnKeywords) {
        if (msg.includes(kw)) {
            intent.hoi_mon_an = true;
            intent.tu_khoa_mon_an.push(kw);
        }
    }

    // Check category intent
    for (const [cat, keywords] of Object.entries(danhMucKeywords)) {
        for (const kw of keywords) {
            if (msg.includes(kw)) {
                intent.hoi_danh_muc = true;
                intent.tu_khoa_danh_muc.push(cat);
            }
        }
    }

    // Detect hỏi thực đơn tổng quát
    if (msg.includes('thuc don') || msg.includes('menu') || msg.includes('co gi an') || msg.includes('co mon gi')
        || msg.includes('danh sach mon') || msg.includes('xem mon')) {
        intent.hoi_thuc_don = true;
    }

    // Detect hỏi giá
    if (msg.includes('gia') || msg.includes('bao nhieu') || msg.includes('bao nhieu tien')
        || msg.includes('phi') || msg.includes('cost') || msg.includes('tien')) {
        intent.hoi_gia = true;
    }

    // Detect khoảng giá
    const giaMatch = originalMsg.match(/(\d+)\s*(k|nghin|nghìn|ngan|ngàn|đ|dong|đồng)?/g);
    if (giaMatch && intent.hoi_gia) {
        const prices = giaMatch.map(m => {
            let num = parseInt(m.replace(/[^\d]/g, ''));
            if (m.includes('k') || m.includes('nghin') || m.includes('nghìn') || m.includes('ngan') || m.includes('ngàn')) {
                num *= 1000;
            }
            return num;
        });
        if (prices.length >= 2) {
            intent.khoang_gia = { min: Math.min(...prices), max: Math.max(...prices) };
        } else if (prices.length === 1) {
            // Dưới X hoặc tầm X
            if (msg.includes('duoi') || msg.includes('dưới') || msg.includes('re') || msg.includes('rẻ')) {
                intent.khoang_gia = { min: 0, max: prices[0] };
            } else {
                intent.khoang_gia = { min: 0, max: prices[0] * 1.3 }; // +30% margin
            }
        }
    }

    // Detect top/bán chạy
    if (msg.includes('ban chay') || msg.includes('pho bien') || msg.includes('nhieu nguoi') 
        || msg.includes('best seller') || msg.includes('top') || msg.includes('noi bat')
        || msg.includes('dac biet') || msg.includes('dac san') || msg.includes('nen an gi')
        || msg.includes('goi y') || msg.includes('gioi thieu') || msg.includes('de xuat')) {
        intent.hoi_top_ban_chay = true;
        intent.hoi_goi_y = true;
    }

    // Detect thông tin nhà hàng
    if (msg.includes('dia chi') || msg.includes('o dau') || msg.includes('gio mo cua')
        || msg.includes('may gio') || msg.includes('mo cua') || msg.includes('dong cua')
        || msg.includes('dien thoai') || msg.includes('lien he') || msg.includes('email')
        || msg.includes('hotline') || msg.includes('sdt') || msg.includes('so dien thoai')) {
        intent.hoi_thong_tin = true;
    }

    // Detect đặt bàn
    if (msg.includes('dat ban') || msg.includes('dat cho') || msg.includes('booking') || msg.includes('reservation')) {
        intent.hoi_dat_ban = true;
    }

    // Detect giao hàng
    if (msg.includes('giao hang') || msg.includes('delivery') || msg.includes('ship') || msg.includes('van chuyen')
        || msg.includes('phi giao') || msg.includes('mien phi giao')) {
        intent.hoi_giao_hang = true;
    }

    // Detect khuyến mãi
    if (msg.includes('khuyen mai') || msg.includes('giam gia') || msg.includes('uu dai') || msg.includes('voucher')
        || msg.includes('sale') || msg.includes('promotion') || msg.includes('combo')) {
        intent.hoi_khuyen_mai = true;
    }

    // ==================== DETECT ĐẶT HÀNG / GIỎ HÀNG ====================
    
    // Detect muốn đặt hàng
    if (msg.includes('dat hang') || msg.includes('dat mon') || msg.includes('order') 
        || msg.includes('mua') || msg.includes('thanh toan') || msg.includes('checkout')
        || msg.includes('dat ngay') || msg.includes('goi mon') || msg.includes('len don')
        || msg.includes('tao don') || msg.includes('dat do an') || msg.includes('muon dat')) {
        intent.muon_dat_hang = true;
        intent.hoi_mon_an = true;
    }

    // Detect thêm vào giỏ hàng
    if (msg.includes('them vao gio') || msg.includes('them gio hang') || msg.includes('bo vao gio')
        || msg.includes('add to cart') || msg.includes('them mon') || msg.includes('cho vao gio')
        || msg.includes('them  gio') || msg.includes('bo gio')) {
        intent.muon_them_gio_hang = true;
        intent.hoi_mon_an = true;
    }

    // Detect xem giỏ hàng
    if (msg.includes('xem gio hang') || msg.includes('gio hang') || msg.includes('cart')
        || msg.includes('xem gio') || msg.includes('trong gio') || msg.includes('gio cua toi')) {
        intent.muon_xem_gio_hang = true;
    }

    // Detect xem đơn hàng
    if (msg.includes('don hang cua toi') || msg.includes('xem don hang') || msg.includes('trang thai don')
        || msg.includes('theo doi don') || msg.includes('kiem tra don') || msg.includes('my orders')) {
        intent.muon_xem_don_hang = true;
    }

    // Detect đặt hàng nhanh (đặt luôn không qua giỏ)
    if ((msg.includes('dat ngay') || msg.includes('dat luon') || msg.includes('goi ngay')
        || msg.includes('mua ngay') || msg.includes('order ngay')) 
        && (intent.muon_dat_hang || intent.hoi_mon_an)) {
        intent.muon_dat_hang_nhanh = true;
    }

    // Trích xuất món ăn + số lượng khi đặt hàng
    if (intent.muon_dat_hang || intent.muon_them_gio_hang || intent.muon_dat_hang_nhanh) {
        intent.mon_an_dat_hang = extractOrderItems(originalMsg);
    }

    return intent;
}

// Trích xuất danh sách món ăn + số lượng từ tin nhắn đặt hàng
function extractOrderItems(message) {
    const msg = message.toLowerCase();
    const items = [];

    // Pattern: "X phần/đĩa/ly/tô Y", "X Y", "Y x X"
    const patterns = [
        /(\d+)\s*(?:phần|phan|dia|dĩa|ly|to|tô|chai|lon|cốc|coc|suất|suat|cái|cai)?\s+(.+?)(?:\s*,|\s+và\s+|\s+va\s+|\s*$)/g,
        /(.+?)\s*(?:x|×|nhân)\s*(\d+)/g,
        /(?:đặt|dat|gọi|goi|thêm|them|mua|lấy|lay|cho)\s+(\d+)?\s*(?:phần|phan|dia|dĩa|ly|to|tô)?\s*(.+?)(?:\s*,|\s+và\s+|\s+va\s+|\s*$)/g,
    ];

    // Thử pattern 1: "2 phần phở bò, 1 cơm tấm"
    const regex1 = /(\d+)\s*(?:phần|phan|dia|dĩa|ly|to|tô|chai|lon|cốc|coc|suất|suat|cái|cai)?\s+([^,;]+?)(?:\s*[,;]\s*|\s+và\s+|\s+va\s+|$)/g;
    let match;
    while ((match = regex1.exec(msg)) !== null) {
        const soLuong = parseInt(match[1]) || 1;
        let tenMon = match[2].trim();
        // Loại bỏ các từ không cần thiết ở cuối
        tenMon = tenMon.replace(/\s*(ạ|nhé|nha|đi|nào|cho\s*em|cho\s*tôi|cho\s*mình|giúp|giùm|dùm)\s*$/g, '').trim();
        if (tenMon.length >= 2 && tenMon.length <= 50) {
            items.push({ ten_mon: tenMon, so_luong: soLuong });
        }
    }

    // Nếu không match, thử pattern khác: "đặt phở bò, cơm tấm"
    if (items.length === 0) {
        const regex2 = /(?:đặt|dat|gọi|goi|thêm|them|mua|lấy|lay|cho\s+(?:em|tôi|mình|tui))\s+(.+)/;
        const match2 = msg.match(regex2);
        if (match2) {
            const foodPart = match2[1];
            const parts = foodPart.split(/\s*[,;]\s*|\s+và\s+|\s+va\s+/);
            for (const part of parts) {
                let trimmed = part.trim().replace(/\s*(ạ|nhé|nha|đi|nào|giúp|giùm|dùm)\s*$/g, '').trim();
                // Kiểm tra có số lượng phía trước không
                const qtyMatch = trimmed.match(/^(\d+)\s*(?:phần|phan|dia|dĩa|ly|to|tô)?\s+(.+)/);
                if (qtyMatch) {
                    items.push({ ten_mon: qtyMatch[2].trim(), so_luong: parseInt(qtyMatch[1]) || 1 });
                } else if (trimmed.length >= 2 && trimmed.length <= 50) {
                    items.push({ ten_mon: trimmed, so_luong: 1 });
                }
            }
        }
    }

    return items;
}

// ==================== RESOLVERS ====================

const resolvers = {
    Query: {
        // Danh sách món ăn với filter
        danhSachMonAn: async (_, { ma_danh_muc, tu_khoa, gia_min, gia_max, sap_xep, gioi_han }) => {
            try {
                let query = `
                    SELECT m.*, d.ten_danh_muc,
                        COALESCE(AVG(dg.so_sao), 0) as diem_danh_gia,
                        COUNT(DISTINCT dg.ma_danh_gia) as luot_danh_gia,
                        COALESCE(SUM(ct.so_luong), 0) as luot_ban
                    FROM mon_an m
                    LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                    LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                    LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
                    LEFT JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang AND dh.trang_thai = 'delivered'
                    WHERE m.trang_thai = 1
                `;
                const params = [];

                if (ma_danh_muc) {
                    query += ' AND m.ma_danh_muc = ?';
                    params.push(ma_danh_muc);
                }
                if (tu_khoa) {
                    query += ' AND (m.ten_mon LIKE ? OR m.mo_ta_chi_tiet LIKE ?)';
                    params.push(`%${tu_khoa}%`, `%${tu_khoa}%`);
                }
                if (gia_min !== undefined) {
                    query += ' AND m.gia_tien >= ?';
                    params.push(gia_min);
                }
                if (gia_max !== undefined) {
                    query += ' AND m.gia_tien <= ?';
                    params.push(gia_max);
                }

                query += ' GROUP BY m.ma_mon';

                // Sắp xếp
                switch (sap_xep) {
                    case 'gia_tang': query += ' ORDER BY m.gia_tien ASC'; break;
                    case 'gia_giam': query += ' ORDER BY m.gia_tien DESC'; break;
                    case 'ban_chay': query += ' ORDER BY luot_ban DESC'; break;
                    case 'danh_gia': query += ' ORDER BY diem_danh_gia DESC'; break;
                    default: query += ' ORDER BY m.ma_mon DESC';
                }

                if (gioi_han) {
                    query += ' LIMIT ?';
                    params.push(gioi_han);
                }

                const [rows] = await db.query(query, params);
                return rows.map(r => ({
                    ...r,
                    diem_danh_gia: parseFloat(r.diem_danh_gia) || 0,
                    luot_danh_gia: parseInt(r.luot_danh_gia) || 0,
                    luot_ban: parseInt(r.luot_ban) || 0
                }));
            } catch (error) {
                console.error('GraphQL danhSachMonAn error:', error.message);
                return [];
            }
        },

        // Chi tiết món ăn
        chiTietMonAn: async (_, { ma_mon, ten_mon }) => {
            try {
                let query = `
                    SELECT m.*, d.ten_danh_muc,
                        COALESCE(AVG(dg.so_sao), 0) as diem_danh_gia,
                        COUNT(DISTINCT dg.ma_danh_gia) as luot_danh_gia,
                        COALESCE(SUM(ct.so_luong), 0) as luot_ban
                    FROM mon_an m
                    LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                    LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                    LEFT JOIN chi_tiet_don_hang ct ON m.ma_mon = ct.ma_mon
                    LEFT JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang AND dh.trang_thai = 'delivered'
                    WHERE m.trang_thai = 1
                `;
                const params = [];

                if (ma_mon) {
                    query += ' AND m.ma_mon = ?';
                    params.push(ma_mon);
                } else if (ten_mon) {
                    query += ' AND m.ten_mon LIKE ?';
                    params.push(`%${ten_mon}%`);
                }

                query += ' GROUP BY m.ma_mon LIMIT 1';

                const [rows] = await db.query(query, params);
                if (rows.length === 0) return null;
                return {
                    ...rows[0],
                    diem_danh_gia: parseFloat(rows[0].diem_danh_gia) || 0,
                    luot_danh_gia: parseInt(rows[0].luot_danh_gia) || 0,
                    luot_ban: parseInt(rows[0].luot_ban) || 0
                };
            } catch (error) {
                console.error('GraphQL chiTietMonAn error:', error.message);
                return null;
            }
        },

        // Tìm kiếm món ăn
        timKiemMonAn: async (_, { tu_khoa }) => {
            try {
                // Tìm món ăn
                const [monAn] = await db.query(`
                    SELECT m.*, d.ten_danh_muc,
                        COALESCE(AVG(dg.so_sao), 0) as diem_danh_gia,
                        COUNT(DISTINCT dg.ma_danh_gia) as luot_danh_gia
                    FROM mon_an m
                    LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                    LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                    WHERE m.trang_thai = 1 AND (m.ten_mon LIKE ? OR m.mo_ta_chi_tiet LIKE ? OR d.ten_danh_muc LIKE ?)
                    GROUP BY m.ma_mon
                    ORDER BY CASE 
                        WHEN m.ten_mon LIKE ? THEN 1
                        WHEN m.ten_mon LIKE ? THEN 2
                        ELSE 3
                    END
                    LIMIT 10
                `, [`%${tu_khoa}%`, `%${tu_khoa}%`, `%${tu_khoa}%`, `${tu_khoa}%`, `%${tu_khoa}%`]);

                // Tìm danh mục liên quan
                const [danhMuc] = await db.query(`
                    SELECT * FROM danh_muc 
                    WHERE trang_thai = 1 AND ten_danh_muc LIKE ?
                `, [`%${tu_khoa}%`]);

                return {
                    mon_an: monAn.map(r => ({
                        ...r,
                        diem_danh_gia: parseFloat(r.diem_danh_gia) || 0,
                        luot_danh_gia: parseInt(r.luot_danh_gia) || 0
                    })),
                    danh_muc: danhMuc,
                    tong_ket_qua: monAn.length + danhMuc.length,
                    tu_khoa
                };
            } catch (error) {
                console.error('GraphQL timKiemMonAn error:', error.message);
                return { mon_an: [], danh_muc: [], tong_ket_qua: 0, tu_khoa };
            }
        },

        // Danh sách danh mục
        danhSachDanhMuc: async () => {
            try {
                const [categories] = await db.query(`
                    SELECT d.*, COUNT(m.ma_mon) as so_mon
                    FROM danh_muc d
                    LEFT JOIN mon_an m ON d.ma_danh_muc = m.ma_danh_muc AND m.trang_thai = 1
                    WHERE d.trang_thai = 1
                    GROUP BY d.ma_danh_muc
                    ORDER BY d.ma_danh_muc
                `);
                return categories;
            } catch (error) {
                console.error('GraphQL danhSachDanhMuc error:', error.message);
                return [];
            }
        },

        // Top món bán chạy
        topMonBanChay: async (_, { gioi_han }) => {
            try {
                const limit = gioi_han || 5;
                const [rows] = await db.query(`
                    SELECT m.ten_mon, m.anh_mon, m.gia_tien, SUM(ct.so_luong) as so_luong_ban
                    FROM chi_tiet_don_hang ct
                    JOIN mon_an m ON ct.ma_mon = m.ma_mon
                    JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
                    WHERE dh.trang_thai = 'delivered' AND m.trang_thai = 1
                    GROUP BY m.ma_mon, m.ten_mon, m.anh_mon, m.gia_tien
                    ORDER BY so_luong_ban DESC
                    LIMIT ?
                `, [limit]);
                return rows;
            } catch (error) {
                console.error('GraphQL topMonBanChay error:', error.message);
                return [];
            }
        },

        // Thông tin nhà hàng
        thongTinNhaHang: async () => {
            try {
                const [settings] = await db.query('SELECT setting_key, setting_value FROM cai_dat');
                const obj = {};
                settings.forEach(s => { obj[s.setting_key] = s.setting_value; });
                return {
                    ten_nha_hang: obj.ten_nha_hang || 'Nhà hàng Ẩm thực Phương Nam',
                    dia_chi: obj.dia_chi || '123 Đường ABC, Phường 1, TP. Vĩnh Long',
                    so_dien_thoai: obj.so_dien_thoai || '0123 456 789',
                    email: obj.email || 'info@phuongnam.vn',
                    website: obj.website || 'phuongnam.vn',
                    gio_mo_cua_t2_t6: obj.gio_mo_cua_t2_t6 || '08:00-22:00',
                    gio_mo_cua_t7_cn: obj.gio_mo_cua_t7_cn || '07:00-23:00',
                    phi_giao_hang: obj.phi_giao_hang || '20000',
                    mien_phi_giao_hang_tu: obj.mien_phi_giao_hang_tu || '200000'
                };
            } catch (error) {
                console.error('GraphQL thongTinNhaHang error:', error.message);
                return {};
            }
        },

        // Cài đặt
        caiDat: async (_, { key }) => {
            try {
                if (key) {
                    const [rows] = await db.query('SELECT * FROM cai_dat WHERE setting_key = ?', [key]);
                    return rows;
                }
                const [rows] = await db.query('SELECT * FROM cai_dat');
                return rows;
            } catch (error) {
                console.error('GraphQL caiDat error:', error.message);
                return [];
            }
        },

        // Thống kê nhà hàng
        thongKeNhaHang: async () => {
            try {
                const currentDate = new Date();
                const currentMonth = currentDate.getMonth() + 1;
                const currentYear = currentDate.getFullYear();

                const [totalDishes] = await db.query('SELECT COUNT(*) as total FROM mon_an WHERE trang_thai = 1');
                const [totalCats] = await db.query('SELECT COUNT(*) as total FROM danh_muc WHERE trang_thai = 1');
                const [revenue] = await db.query(
                    `SELECT COALESCE(SUM(tong_tien), 0) as total FROM don_hang 
                     WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ? AND trang_thai = 'delivered'`,
                    [currentMonth, currentYear]
                );
                const [orders] = await db.query(
                    `SELECT COUNT(*) as total FROM don_hang WHERE MONTH(thoi_gian_tao) = ? AND YEAR(thoi_gian_tao) = ?`,
                    [currentMonth, currentYear]
                );
                const [customers] = await db.query(
                    `SELECT COUNT(*) as total FROM nguoi_dung WHERE MONTH(ngay_tao) = ? AND YEAR(ngay_tao) = ?`,
                    [currentMonth, currentYear]
                );
                const [reservations] = await db.query(
                    `SELECT COUNT(*) as total FROM dat_ban WHERE MONTH(ngay_dat) = ? AND YEAR(ngay_dat) = ?`,
                    [currentMonth, currentYear]
                );
                const [avgRating] = await db.query(
                    `SELECT AVG(so_sao) as avg_r, COUNT(*) as total FROM danh_gia_san_pham WHERE trang_thai = 'approved'`
                );

                return {
                    tong_mon_an: totalDishes[0].total,
                    tong_danh_muc: totalCats[0].total,
                    doanh_thu_thang: parseFloat(revenue[0].total) || 0,
                    don_hang_thang: orders[0].total,
                    khach_moi_thang: customers[0].total,
                    dat_ban_thang: reservations[0].total,
                    diem_danh_gia_tb: parseFloat(avgRating[0].avg_r) || 0,
                    tong_danh_gia: avgRating[0].total
                };
            } catch (error) {
                console.error('GraphQL thongKeNhaHang error:', error.message);
                return {};
            }
        },

        // Món ăn theo khoảng giá
        monAnTheoGia: async (_, { gia_min, gia_max }) => {
            try {
                const [rows] = await db.query(`
                    SELECT m.*, d.ten_danh_muc
                    FROM mon_an m
                    LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                    WHERE m.trang_thai = 1 AND m.gia_tien BETWEEN ? AND ?
                    ORDER BY m.gia_tien ASC
                    LIMIT 10
                `, [gia_min, gia_max]);
                return rows;
            } catch (error) {
                console.error('GraphQL monAnTheoGia error:', error.message);
                return [];
            }
        },

        // Gợi ý món ăn ngẫu nhiên
        goiYMonAn: async (_, { so_luong }) => {
            try {
                const limit = so_luong || 5;
                const [rows] = await db.query(`
                    SELECT m.*, d.ten_danh_muc,
                        COALESCE(AVG(dg.so_sao), 0) as diem_danh_gia
                    FROM mon_an m
                    LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                    LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                    WHERE m.trang_thai = 1
                    GROUP BY m.ma_mon
                    ORDER BY RAND()
                    LIMIT ?
                `, [limit]);
                return rows.map(r => ({ ...r, diem_danh_gia: parseFloat(r.diem_danh_gia) || 0 }));
            } catch (error) {
                console.error('GraphQL goiYMonAn error:', error.message);
                return [];
            }
        },

        // Chatbot context - phân tích tin nhắn và trả về dữ liệu liên quan
        chatbotContext: async (_, { message }) => {
            try {
                const intent = analyzeUserIntent(message);
                const context = {
                    thong_tin_nha_hang: null,
                    mon_an_lien_quan: [],
                    danh_muc_lien_quan: [],
                    thong_ke: null,
                    top_ban_chay: [],
                    khuyen_mai: []
                };

                // Luôn lấy thông tin nhà hàng
                const [settings] = await db.query('SELECT setting_key, setting_value FROM cai_dat');
                const settingsObj = {};
                settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
                context.thong_tin_nha_hang = {
                    ten_nha_hang: settingsObj.ten_nha_hang || 'Nhà hàng Ẩm thực Phương Nam',
                    dia_chi: settingsObj.dia_chi || '123 Đường ABC, Phường 1, TP. Vĩnh Long',
                    so_dien_thoai: settingsObj.so_dien_thoai || '0123 456 789',
                    email: settingsObj.email || 'info@phuongnam.vn',
                    website: settingsObj.website || 'phuongnam.vn',
                    gio_mo_cua_t2_t6: settingsObj.gio_mo_cua_t2_t6 || '08:00-22:00',
                    gio_mo_cua_t7_cn: settingsObj.gio_mo_cua_t7_cn || '07:00-23:00',
                    phi_giao_hang: settingsObj.phi_giao_hang || '20000',
                    mien_phi_giao_hang_tu: settingsObj.mien_phi_giao_hang_tu || '200000'
                };

                // Nếu hỏi về món ăn cụ thể - tìm kiếm chính xác
                if (intent.hoi_mon_an || intent.hoi_thuc_don || intent.hoi_danh_muc) {
                    // Tìm theo từ khóa trong tin nhắn gốc
                    const searchTerms = extractFoodSearchTerms(message);
                    
                    if (searchTerms.length > 0) {
                        for (const term of searchTerms) {
                            const [dishes] = await db.query(`
                                SELECT m.*, d.ten_danh_muc,
                                    COALESCE(AVG(dg.so_sao), 0) as diem_danh_gia,
                                    COUNT(DISTINCT dg.ma_danh_gia) as luot_danh_gia
                                FROM mon_an m
                                LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                                LEFT JOIN danh_gia_san_pham dg ON m.ma_mon = dg.ma_mon AND dg.trang_thai = 'approved'
                                WHERE m.trang_thai = 1 AND (m.ten_mon LIKE ? OR m.mo_ta_chi_tiet LIKE ?)
                                GROUP BY m.ma_mon
                                LIMIT 6
                            `, [`%${term}%`, `%${term}%`]);
                            
                            dishes.forEach(d => {
                                if (!context.mon_an_lien_quan.find(existing => existing.ma_mon === d.ma_mon)) {
                                    context.mon_an_lien_quan.push({
                                        ...d,
                                        diem_danh_gia: parseFloat(d.diem_danh_gia) || 0,
                                        luot_danh_gia: parseInt(d.luot_danh_gia) || 0
                                    });
                                }
                            });
                        }
                    }

                    // Nếu hỏi theo danh mục
                    if (intent.hoi_danh_muc && intent.tu_khoa_danh_muc.length > 0) {
                        for (const catKw of intent.tu_khoa_danh_muc) {
                            const [cats] = await db.query(`
                                SELECT * FROM danh_muc WHERE trang_thai = 1 AND ten_danh_muc LIKE ?
                            `, [`%${catKw}%`]);
                            
                            for (const cat of cats) {
                                if (!context.danh_muc_lien_quan.find(c => c.ma_danh_muc === cat.ma_danh_muc)) {
                                    // Lấy các món trong danh mục này
                                    const [catDishes] = await db.query(`
                                        SELECT m.*, d.ten_danh_muc
                                        FROM mon_an m
                                        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                                        WHERE m.trang_thai = 1 AND m.ma_danh_muc = ?
                                        LIMIT 8
                                    `, [cat.ma_danh_muc]);
                                    
                                    context.danh_muc_lien_quan.push({ ...cat, mon_an: catDishes });
                                    
                                    // Cũng thêm vào mon_an_lien_quan
                                    catDishes.forEach(d => {
                                        if (!context.mon_an_lien_quan.find(existing => existing.ma_mon === d.ma_mon)) {
                                            context.mon_an_lien_quan.push(d);
                                        }
                                    });
                                }
                            }
                        }
                    }

                    // Nếu hỏi thực đơn tổng quát - lấy một ít từ mỗi danh mục
                    if (intent.hoi_thuc_don && context.mon_an_lien_quan.length === 0) {
                        const [allCats] = await db.query('SELECT * FROM danh_muc WHERE trang_thai = 1');
                        for (const cat of allCats) {
                            const [catDishes] = await db.query(`
                                SELECT m.*, d.ten_danh_muc
                                FROM mon_an m
                                LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                                WHERE m.trang_thai = 1 AND m.ma_danh_muc = ?
                                ORDER BY RAND()
                                LIMIT 3
                            `, [cat.ma_danh_muc]);
                            context.danh_muc_lien_quan.push({ ...cat, mon_an: catDishes });
                            catDishes.forEach(d => context.mon_an_lien_quan.push(d));
                        }
                    }
                }

                // Nếu hỏi theo khoảng giá
                if (intent.khoang_gia) {
                    const [priceFiltered] = await db.query(`
                        SELECT m.*, d.ten_danh_muc
                        FROM mon_an m
                        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                        WHERE m.trang_thai = 1 AND m.gia_tien BETWEEN ? AND ?
                        ORDER BY m.gia_tien ASC
                        LIMIT 8
                    `, [intent.khoang_gia.min, intent.khoang_gia.max]);
                    
                    priceFiltered.forEach(d => {
                        if (!context.mon_an_lien_quan.find(existing => existing.ma_mon === d.ma_mon)) {
                            context.mon_an_lien_quan.push(d);
                        }
                    });
                }

                // Top bán chạy
                if (intent.hoi_top_ban_chay || intent.hoi_goi_y) {
                    const [topDishes] = await db.query(`
                        SELECT m.ten_mon, m.anh_mon, m.gia_tien, m.ma_mon, m.mo_ta_chi_tiet, 
                               d.ten_danh_muc, SUM(ct.so_luong) as so_luong_ban
                        FROM chi_tiet_don_hang ct
                        JOIN mon_an m ON ct.ma_mon = m.ma_mon
                        JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
                        LEFT JOIN danh_muc d ON m.ma_danh_muc = d.ma_danh_muc
                        WHERE dh.trang_thai = 'delivered' AND m.trang_thai = 1
                        GROUP BY m.ma_mon
                        ORDER BY so_luong_ban DESC
                        LIMIT 6
                    `);
                    context.top_ban_chay = topDishes;
                    
                    // Thêm vào mon_an_lien_quan nếu chưa có
                    topDishes.forEach(d => {
                        if (!context.mon_an_lien_quan.find(existing => existing.ma_mon === d.ma_mon)) {
                            context.mon_an_lien_quan.push(d);
                        }
                    });
                }

                // Thống kê
                if (intent.hoi_thong_tin) {
                    // Thông tin đã được lấy ở trên
                }

                // Giới hạn số lượng món ăn trả về
                context.mon_an_lien_quan = context.mon_an_lien_quan.slice(0, 8);

                return context;
            } catch (error) {
                console.error('GraphQL chatbotContext error:', error.message);
                return {
                    thong_tin_nha_hang: null,
                    mon_an_lien_quan: [],
                    danh_muc_lien_quan: [],
                    thong_ke: null,
                    top_ban_chay: [],
                    khuyen_mai: []
                };
            }
        },

        // Xem giỏ hàng của user
        xemGioHang: async (_, { ma_nguoi_dung }) => {
            return await getCartByUserId(ma_nguoi_dung);
        },

        // Danh sách đơn hàng
        danhSachDonHang: async (_, { ma_nguoi_dung, gioi_han }) => {
            try {
                const limit = gioi_han || 10;
                const [orders] = await db.query(`
                    SELECT dh.*, GROUP_CONCAT(m.ten_mon SEPARATOR ', ') as danh_sach_mon
                    FROM don_hang dh
                    LEFT JOIN chi_tiet_don_hang ct ON dh.ma_don_hang = ct.ma_don_hang
                    LEFT JOIN mon_an m ON ct.ma_mon = m.ma_mon
                    WHERE dh.ma_nguoi_dung = ?
                    GROUP BY dh.ma_don_hang
                    ORDER BY dh.thoi_gian_tao DESC
                    LIMIT ?
                `, [ma_nguoi_dung, limit]);

                return orders.map(o => ({
                    ...o,
                    thoi_gian_tao: o.thoi_gian_tao ? o.thoi_gian_tao.toISOString() : null
                }));
            } catch (error) {
                console.error('GraphQL danhSachDonHang error:', error.message);
                return [];
            }
        },

        // Chi tiết đơn hàng
        chiTietDonHang: async (_, { ma_don_hang }) => {
            try {
                const [orders] = await db.query('SELECT * FROM don_hang WHERE ma_don_hang = ?', [ma_don_hang]);
                if (orders.length === 0) return null;

                const [chiTiet] = await db.query(`
                    SELECT ct.ma_mon, ct.so_luong, ct.gia_tai_thoi_diem,
                           (ct.so_luong * ct.gia_tai_thoi_diem) as thanh_tien,
                           m.ten_mon, m.anh_mon
                    FROM chi_tiet_don_hang ct
                    JOIN mon_an m ON ct.ma_mon = m.ma_mon
                    WHERE ct.ma_don_hang = ?
                `, [ma_don_hang]);

                return {
                    ...orders[0],
                    thoi_gian_tao: orders[0].thoi_gian_tao ? orders[0].thoi_gian_tao.toISOString() : null,
                    chi_tiet: chiTiet
                };
            } catch (error) {
                console.error('GraphQL chiTietDonHang error:', error.message);
                return null;
            }
        }
    },

    // Resolve nested fields
    DanhMuc: {
        mon_an: async (parent) => {
            if (parent.mon_an) return parent.mon_an;
            try {
                const [rows] = await db.query(
                    'SELECT * FROM mon_an WHERE ma_danh_muc = ? AND trang_thai = 1',
                    [parent.ma_danh_muc]
                );
                return rows;
            } catch (error) {
                return [];
            }
        }
    },

    // ==================== MUTATION RESOLVERS ====================
    Mutation: {
        // Thêm 1 món vào giỏ hàng
        themVaoGioHang: async (_, { ma_nguoi_dung, ma_mon, so_luong = 1 }) => {
            try {
                // Kiểm tra món ăn tồn tại
                const [dishRows] = await db.query(
                    'SELECT * FROM mon_an WHERE ma_mon = ? AND trang_thai = 1',
                    [ma_mon]
                );
                if (dishRows.length === 0) {
                    return { success: false, message: 'Món ăn không tồn tại hoặc đã ngừng bán', gio_hang: null };
                }
                const dish = dishRows[0];

                if (dish.so_luong_ton < so_luong) {
                    return { success: false, message: `Không đủ số lượng tồn kho cho "${dish.ten_mon}" (còn ${dish.so_luong_ton})`, gio_hang: null };
                }

                // Lấy hoặc tạo giỏ hàng active
                let [cartRows] = await db.query(
                    'SELECT * FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"',
                    [ma_nguoi_dung]
                );
                let ma_gio_hang;
                if (cartRows.length === 0) {
                    const [result] = await db.query('INSERT INTO gio_hang (ma_nguoi_dung) VALUES (?)', [ma_nguoi_dung]);
                    ma_gio_hang = result.insertId;
                } else {
                    ma_gio_hang = cartRows[0].ma_gio_hang;
                }

                // Kiểm tra món đã có trong giỏ chưa
                const [existingItems] = await db.query(
                    'SELECT * FROM chi_tiet_gio_hang WHERE ma_gio_hang = ? AND ma_mon = ?',
                    [ma_gio_hang, ma_mon]
                );

                if (existingItems.length > 0) {
                    const newQty = existingItems[0].so_luong + so_luong;
                    if (newQty > 10) {
                        return { success: false, message: `Mỗi món chỉ được đặt tối đa 10 phần. Hiện tại đã có ${existingItems[0].so_luong} phần.`, gio_hang: null };
                    }
                    await db.query('UPDATE chi_tiet_gio_hang SET so_luong = ? WHERE ma_chi_tiet = ?', [newQty, existingItems[0].ma_chi_tiet]);
                } else {
                    await db.query(
                        'INSERT INTO chi_tiet_gio_hang (ma_gio_hang, ma_mon, so_luong, gia_tai_thoi_diem) VALUES (?, ?, ?, ?)',
                        [ma_gio_hang, ma_mon, so_luong, dish.gia_tien]
                    );
                }

                // Trả về giỏ hàng cập nhật
                const gioHang = await getCartByUserId(ma_nguoi_dung);
                return { success: true, message: `Đã thêm ${so_luong} "${dish.ten_mon}" vào giỏ hàng`, gio_hang: gioHang };
            } catch (error) {
                console.error('GraphQL themVaoGioHang error:', error.message);
                return { success: false, message: 'Lỗi thêm vào giỏ hàng: ' + error.message, gio_hang: null };
            }
        },

        // Thêm nhiều món cùng lúc
        themNhieuMonVaoGio: async (_, { ma_nguoi_dung, items }) => {
            try {
                const addedItems = [];
                const errors = [];

                for (const item of items) {
                    let ma_mon = item.ma_mon;

                    // Nếu không có ma_mon nhưng có ten_mon -> tìm theo tên
                    if (!ma_mon && item.ten_mon) {
                        const [found] = await db.query(
                            `SELECT ma_mon, ten_mon, gia_tien FROM mon_an WHERE trang_thai = 1 AND ten_mon LIKE ? ORDER BY CASE WHEN ten_mon LIKE ? THEN 1 ELSE 2 END LIMIT 1`,
                            [`%${item.ten_mon}%`, `${item.ten_mon}%`]
                        );
                        if (found.length > 0) {
                            ma_mon = found[0].ma_mon;
                        } else {
                            errors.push(`Không tìm thấy món "${item.ten_mon}"`);
                            continue;
                        }
                    }

                    if (!ma_mon) {
                        errors.push('Thiếu thông tin món ăn');
                        continue;
                    }

                    // Kiểm tra món ăn
                    const [dishRows] = await db.query('SELECT * FROM mon_an WHERE ma_mon = ? AND trang_thai = 1', [ma_mon]);
                    if (dishRows.length === 0) {
                        errors.push(`Món #${ma_mon} không tồn tại`);
                        continue;
                    }
                    const dish = dishRows[0];
                    const soLuong = item.so_luong || 1;

                    if (dish.so_luong_ton < soLuong) {
                        errors.push(`"${dish.ten_mon}" hết hàng (còn ${dish.so_luong_ton})`);
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

                    // Thêm/cập nhật
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
                    addedItems.push(`${soLuong}x ${dish.ten_mon}`);
                }

                const gioHang = await getCartByUserId(ma_nguoi_dung);
                let message = '';
                if (addedItems.length > 0) message += `Đã thêm: ${addedItems.join(', ')}`;
                if (errors.length > 0) message += (message ? '. ' : '') + `Lỗi: ${errors.join('; ')}`;

                return { success: addedItems.length > 0, message: message || 'Không thêm được món nào', gio_hang: gioHang };
            } catch (error) {
                console.error('GraphQL themNhieuMonVaoGio error:', error.message);
                return { success: false, message: 'Lỗi: ' + error.message, gio_hang: null };
            }
        },

        // Xóa món khỏi giỏ hàng
        xoaKhoiGioHang: async (_, { ma_nguoi_dung, ma_mon }) => {
            try {
                const [cartRows] = await db.query('SELECT * FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"', [ma_nguoi_dung]);
                if (cartRows.length === 0) return { success: false, message: 'Giỏ hàng trống', gio_hang: null };

                await db.query('DELETE FROM chi_tiet_gio_hang WHERE ma_gio_hang = ? AND ma_mon = ?', [cartRows[0].ma_gio_hang, ma_mon]);
                const gioHang = await getCartByUserId(ma_nguoi_dung);
                return { success: true, message: 'Đã xóa món khỏi giỏ hàng', gio_hang: gioHang };
            } catch (error) {
                return { success: false, message: 'Lỗi xóa: ' + error.message, gio_hang: null };
            }
        },

        // Xóa toàn bộ giỏ hàng
        xoaToanBoGioHang: async (_, { ma_nguoi_dung }) => {
            try {
                const [cartRows] = await db.query('SELECT * FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"', [ma_nguoi_dung]);
                if (cartRows.length > 0) {
                    await db.query('DELETE FROM chi_tiet_gio_hang WHERE ma_gio_hang = ?', [cartRows[0].ma_gio_hang]);
                }
                return { success: true, message: 'Đã xóa toàn bộ giỏ hàng', gio_hang: { ma_gio_hang: cartRows[0]?.ma_gio_hang, items: [], tong_tien: 0, so_luong: 0 } };
            } catch (error) {
                return { success: false, message: 'Lỗi: ' + error.message, gio_hang: null };
            }
        },

        // Đặt hàng từ giỏ hàng
        datHangTuGioHang: async (_, { ma_nguoi_dung, thong_tin }) => {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                // Lấy giỏ hàng
                const [cartRows] = await connection.query('SELECT * FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"', [ma_nguoi_dung]);
                if (cartRows.length === 0) {
                    await connection.rollback();
                    return { success: false, message: 'Giỏ hàng trống' };
                }

                const ma_gio_hang = cartRows[0].ma_gio_hang;
                const [cartItems] = await connection.query(`
                    SELECT ct.ma_mon, ct.so_luong, ct.gia_tai_thoi_diem,
                           (ct.so_luong * ct.gia_tai_thoi_diem) as thanh_tien,
                           m.ten_mon, m.anh_mon, m.so_luong_ton
                    FROM chi_tiet_gio_hang ct
                    JOIN mon_an m ON ct.ma_mon = m.ma_mon
                    WHERE ct.ma_gio_hang = ?
                `, [ma_gio_hang]);

                if (cartItems.length === 0) {
                    await connection.rollback();
                    return { success: false, message: 'Giỏ hàng trống' };
                }

                // Kiểm tra tồn kho
                for (const item of cartItems) {
                    if (item.so_luong_ton < item.so_luong) {
                        await connection.rollback();
                        return { success: false, message: `"${item.ten_mon}" không đủ số lượng (còn ${item.so_luong_ton})` };
                    }
                }

                const tong_tien_hang = cartItems.reduce((sum, item) => sum + parseFloat(item.thanh_tien), 0);
                const phi_giao_hang = tong_tien_hang >= 150000 ? 0 : 30000;
                const tong_tien = tong_tien_hang + phi_giao_hang;

                const dia_chi_day_du = [thong_tin.dia_chi, thong_tin.phuong_xa, thong_tin.quan_huyen, thong_tin.tinh_thanh].filter(Boolean).join(', ');

                // Tạo đơn hàng
                const [orderResult] = await connection.query(
                    `INSERT INTO don_hang (ma_nguoi_dung, ten_khach_vang_lai, so_dt_khach, dia_chi_giao, tong_tien, trang_thai, ghi_chu)
                     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
                    [ma_nguoi_dung, thong_tin.ten_nguoi_nhan, thong_tin.so_dien_thoai, dia_chi_day_du, tong_tien, thong_tin.ghi_chu || null]
                );
                const ma_don_hang = orderResult.insertId;

                // Chi tiết đơn hàng + giảm tồn kho
                for (const item of cartItems) {
                    await connection.query(
                        'INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_mon, so_luong, gia_tai_thoi_diem) VALUES (?, ?, ?, ?)',
                        [ma_don_hang, item.ma_mon, item.so_luong, item.gia_tai_thoi_diem]
                    );
                    await connection.query('UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?', [item.so_luong, item.ma_mon]);
                }

                // Tạo thanh toán
                const phuong_thuc = thong_tin.phuong_thuc_thanh_toan || 'cod';
                await connection.query(
                    'INSERT INTO thanh_toan (ma_don_hang, so_tien, phuong_thuc, trang_thai) VALUES (?, ?, ?, ?)',
                    [ma_don_hang, tong_tien, phuong_thuc, 'pending']
                );

                // Đánh dấu giỏ hàng đã đặt
                await connection.query('UPDATE gio_hang SET trang_thai = "ordered" WHERE ma_gio_hang = ?', [ma_gio_hang]);
                await connection.query('INSERT INTO gio_hang (ma_nguoi_dung, trang_thai) VALUES (?, "active")', [ma_nguoi_dung]);

                await connection.commit();

                return {
                    success: true,
                    message: `Đặt hàng thành công! Mã đơn: #${ma_don_hang}`,
                    ma_don_hang,
                    tong_tien,
                    phi_giao_hang,
                    tien_giam_gia: 0,
                    don_hang: {
                        ma_don_hang,
                        ma_nguoi_dung,
                        ten_khach_vang_lai: thong_tin.ten_nguoi_nhan,
                        so_dt_khach: thong_tin.so_dien_thoai,
                        dia_chi_giao: dia_chi_day_du,
                        tong_tien,
                        trang_thai: 'pending',
                        ghi_chu: thong_tin.ghi_chu,
                        chi_tiet: cartItems.map(i => ({
                            ma_mon: i.ma_mon,
                            ten_mon: i.ten_mon,
                            so_luong: i.so_luong,
                            gia_tai_thoi_diem: i.gia_tai_thoi_diem,
                            thanh_tien: i.thanh_tien,
                            anh_mon: i.anh_mon
                        }))
                    }
                };
            } catch (error) {
                await connection.rollback();
                console.error('GraphQL datHangTuGioHang error:', error.message);
                return { success: false, message: 'Lỗi đặt hàng: ' + error.message };
            } finally {
                connection.release();
            }
        },

        // Đặt hàng nhanh - chọn món và đặt luôn
        datHangNhanh: async (_, { ma_nguoi_dung, items, thong_tin }) => {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                const orderItems = [];
                for (const item of items) {
                    let ma_mon = item.ma_mon;

                    // Tìm theo tên nếu không có mã
                    if (!ma_mon && item.ten_mon) {
                        const [found] = await connection.query(
                            `SELECT ma_mon, ten_mon, gia_tien, so_luong_ton, anh_mon FROM mon_an WHERE trang_thai = 1 AND ten_mon LIKE ? ORDER BY CASE WHEN ten_mon LIKE ? THEN 1 ELSE 2 END LIMIT 1`,
                            [`%${item.ten_mon}%`, `${item.ten_mon}%`]
                        );
                        if (found.length === 0) {
                            await connection.rollback();
                            return { success: false, message: `Không tìm thấy món "${item.ten_mon}"` };
                        }
                        ma_mon = found[0].ma_mon;
                    }

                    const [dishRows] = await connection.query('SELECT * FROM mon_an WHERE ma_mon = ? AND trang_thai = 1', [ma_mon]);
                    if (dishRows.length === 0) {
                        await connection.rollback();
                        return { success: false, message: `Món #${ma_mon} không tồn tại` };
                    }

                    const dish = dishRows[0];
                    const soLuong = item.so_luong || 1;
                    if (dish.so_luong_ton < soLuong) {
                        await connection.rollback();
                        return { success: false, message: `"${dish.ten_mon}" không đủ hàng (còn ${dish.so_luong_ton})` };
                    }

                    orderItems.push({
                        ma_mon: dish.ma_mon,
                        ten_mon: dish.ten_mon,
                        so_luong: soLuong,
                        gia_tai_thoi_diem: dish.gia_tien,
                        thanh_tien: soLuong * dish.gia_tien,
                        anh_mon: dish.anh_mon
                    });
                }

                if (orderItems.length === 0) {
                    await connection.rollback();
                    return { success: false, message: 'Không có món nào hợp lệ' };
                }

                const tong_tien_hang = orderItems.reduce((sum, i) => sum + i.thanh_tien, 0);
                const phi_giao_hang = tong_tien_hang >= 150000 ? 0 : 30000;
                const tong_tien = tong_tien_hang + phi_giao_hang;

                const dia_chi_day_du = [thong_tin.dia_chi, thong_tin.phuong_xa, thong_tin.quan_huyen, thong_tin.tinh_thanh].filter(Boolean).join(', ');

                const [orderResult] = await connection.query(
                    `INSERT INTO don_hang (ma_nguoi_dung, ten_khach_vang_lai, so_dt_khach, dia_chi_giao, tong_tien, trang_thai, ghi_chu)
                     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
                    [ma_nguoi_dung, thong_tin.ten_nguoi_nhan, thong_tin.so_dien_thoai, dia_chi_day_du, tong_tien, thong_tin.ghi_chu || null]
                );
                const ma_don_hang = orderResult.insertId;

                for (const item of orderItems) {
                    await connection.query(
                        'INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_mon, so_luong, gia_tai_thoi_diem) VALUES (?, ?, ?, ?)',
                        [ma_don_hang, item.ma_mon, item.so_luong, item.gia_tai_thoi_diem]
                    );
                    await connection.query('UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?', [item.so_luong, item.ma_mon]);
                }

                const phuong_thuc = thong_tin.phuong_thuc_thanh_toan || 'cod';
                await connection.query(
                    'INSERT INTO thanh_toan (ma_don_hang, so_tien, phuong_thuc, trang_thai) VALUES (?, ?, ?, ?)',
                    [ma_don_hang, tong_tien, phuong_thuc, 'pending']
                );

                await connection.commit();

                return {
                    success: true,
                    message: `Đặt hàng nhanh thành công! Mã đơn: #${ma_don_hang}`,
                    ma_don_hang,
                    tong_tien,
                    phi_giao_hang,
                    tien_giam_gia: 0,
                    don_hang: {
                        ma_don_hang,
                        ma_nguoi_dung,
                        ten_khach_vang_lai: thong_tin.ten_nguoi_nhan,
                        so_dt_khach: thong_tin.so_dien_thoai,
                        dia_chi_giao: dia_chi_day_du,
                        tong_tien,
                        trang_thai: 'pending',
                        ghi_chu: thong_tin.ghi_chu,
                        chi_tiet: orderItems
                    }
                };
            } catch (error) {
                await connection.rollback();
                console.error('GraphQL datHangNhanh error:', error.message);
                return { success: false, message: 'Lỗi đặt hàng: ' + error.message };
            } finally {
                connection.release();
            }
        }
    }
};

// ==================== HELPER: Lấy giỏ hàng theo user ====================
async function getCartByUserId(ma_nguoi_dung) {
    try {
        const [cartRows] = await db.query('SELECT * FROM gio_hang WHERE ma_nguoi_dung = ? AND trang_thai = "active"', [ma_nguoi_dung]);
        if (cartRows.length === 0) return { ma_gio_hang: null, items: [], tong_tien: 0, so_luong: 0 };

        const [items] = await db.query(`
            SELECT ct.ma_chi_tiet, ct.ma_mon, ct.so_luong, ct.gia_tai_thoi_diem,
                   (ct.so_luong * ct.gia_tai_thoi_diem) as thanh_tien,
                   m.ten_mon, m.anh_mon, m.don_vi_tinh
            FROM chi_tiet_gio_hang ct
            JOIN mon_an m ON ct.ma_mon = m.ma_mon
            WHERE ct.ma_gio_hang = ?
        `, [cartRows[0].ma_gio_hang]);

        const tong_tien = items.reduce((sum, i) => sum + parseFloat(i.thanh_tien), 0);
        const so_luong = items.reduce((sum, i) => sum + i.so_luong, 0);

        return { ma_gio_hang: cartRows[0].ma_gio_hang, items, tong_tien, so_luong };
    } catch (error) {
        console.error('getCartByUserId error:', error.message);
        return { ma_gio_hang: null, items: [], tong_tien: 0, so_luong: 0 };
    }
}

// Trích xuất từ khóa tìm món ăn từ tin nhắn
function extractFoodSearchTerms(message) {
    const msg = message.toLowerCase();
    const terms = [];
    
    // Các pattern phổ biến
    const patterns = [
        // "món X", "có X không"
        /(?:món|có|xem|gọi|đặt|muốn|thử|ăn|uống)\s+(.+?)(?:\s+(?:không|nào|đi|nhé|nha|ạ|à|gì|bao|giá|$))/g,
        // "X bao nhiêu tiền"
        /(.+?)\s+(?:bao nhiêu|giá|tiền)/g,
        // Trích xuất trực tiếp tên món phổ biến
    ];
    
    // Danh sách tên món phổ biến để match
    const commonDishes = [
        'phở', 'bún bò', 'bún riêu', 'cơm tấm', 'cơm chiên', 'cơm sườn',
        'bánh mì', 'bánh xèo', 'bánh cuốn', 'bánh canh',
        'gỏi cuốn', 'chả giò', 'nem rán', 'nem nướng',
        'lẩu', 'lẩu thái', 'lẩu hải sản', 'lẩu bò', 'lẩu gà',
        'gà nướng', 'gà chiên', 'gà kho', 'gà xào',
        'bò nướng', 'bò xào', 'bò kho', 'bò lúc lắc',
        'heo nướng', 'sườn nướng', 'sườn xào',
        'cá kho', 'cá chiên', 'cá nướng', 'cá lóc',
        'tôm nướng', 'tôm hấp', 'tôm chiên',
        'mực', 'cua', 'ốc', 'hải sản',
        'canh chua', 'canh khổ qua',
        'rau xào', 'rau muống',
        'chè', 'kem', 'trà sữa', 'nước mía', 'sinh tố',
        'trà đá', 'cà phê', 'nước ép',
        'hủ tiếu', 'mì xào', 'bún chả',
        'cháo', 'súp', 'xôi'
    ];
    
    for (const dish of commonDishes) {
        if (msg.includes(dish)) {
            terms.push(dish);
        }
    }
    
    // Nếu không match được tên món cụ thể, dùng regex
    if (terms.length === 0) {
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(msg)) !== null) {
                const term = match[1].trim();
                if (term.length >= 2 && term.length <= 30) {
                    terms.push(term);
                }
            }
        }
    }
    
    // Fallback: tách từ khóa quan trọng
    if (terms.length === 0) {
        const importantWords = msg.split(/\s+/).filter(w => 
            w.length >= 2 && 
            !['có', 'của', 'và', 'cho', 'hay', 'với', 'trong', 'này', 'đó', 'ạ', 'nhé', 'nha',
              'em', 'anh', 'chị', 'xin', 'hỏi', 'muốn', 'cần', 'được', 'không', 'bao', 'nhiêu',
              'giá', 'tiền', 'mình', 'tôi', 'tui', 'bạn', 'quá', 'lắm', 'rất', 'thì', 'là',
              'nhà', 'hàng', 'ơi', 'dạ', 'vâng', 'the', 'một', 'hai', 'ba', 'cái', 'phần'].includes(w)
        );
        if (importantWords.length > 0) {
            terms.push(importantWords.join(' '));
        }
    }
    
    return [...new Set(terms)]; // Remove duplicates
}

module.exports = { resolvers, analyzeUserIntent, extractFoodSearchTerms, getCartByUserId };
