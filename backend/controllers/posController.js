/**
 * POS Controller - Xử lý bán hàng tại quầy và đồng nhất dữ liệu
 */

const db = require('../config/database');

// Tạo đơn hàng từ POS (đồng nhất online/offline)
const createPOSOrder = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const {
            orderType, // 'offline', 'online', 'table'
            customerName,
            customerPhone,
            address,
            tableId,
            items,
            paymentMethod,
            discountCode,
            note
        } = req.body;
        
        // Validate items
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Đơn hàng trống!' });
        }
        
        // Calculate totals
        let subtotal = 0;
        let discountAmount = 0;
        
        // Validate stock and calculate subtotal
        for (const item of items) {
            const [product] = await connection.query(
                'SELECT so_luong_ton, gia_tien FROM mon_an WHERE ma_mon = ?',
                [item.ma_mon]
            );
            
            if (product.length === 0) {
                throw new Error(`Món ăn ID ${item.ma_mon} không tồn tại`);
            }
            
            if (product[0].so_luong_ton < item.so_luong) {
                throw new Error(`Món ăn ID ${item.ma_mon} không đủ số lượng trong kho`);
            }
            
            subtotal += product[0].gia_tien * item.so_luong;
        }
        
        // Apply discount
        if (discountCode) {
            const [discount] = await connection.query(
                `SELECT * FROM khuyen_mai 
                 WHERE ma_code = ? 
                 AND trang_thai = 1 
                 AND ngay_bat_dau <= NOW() 
                 AND ngay_ket_thuc >= NOW()
                 AND (so_luong_gioi_han IS NULL OR so_luong_da_dung < so_luong_gioi_han)`,
                [discountCode]
            );
            
            if (discount.length > 0) {
                const promo = discount[0];
                
                if (subtotal >= promo.don_hang_toi_thieu) {
                    if (promo.loai_giam_gia === 'percentage') {
                        discountAmount = subtotal * (promo.gia_tri / 100);
                        if (promo.giam_toi_da) {
                            discountAmount = Math.min(discountAmount, promo.giam_toi_da);
                        }
                    } else {
                        discountAmount = promo.gia_tri;
                    }
                    
                    // Update usage count
                    await connection.query(
                        'UPDATE khuyen_mai SET so_luong_da_dung = so_luong_da_dung + 1 WHERE ma_khuyen_mai = ?',
                        [promo.ma_khuyen_mai]
                    );
                }
            }
        }
        
        const totalAmount = subtotal - discountAmount;
        
        let orderId;
        
        // Create order based on type
        if (orderType === 'online') {
            // Đơn hàng giao đi - lưu vào bảng don_hang
            const [orderResult] = await connection.query(
                `INSERT INTO don_hang 
                (ten_khach_vang_lai, so_dt_khach, dia_chi_giao, tong_tien, tien_giam_gia, 
                 phuong_thuc_thanh_toan, trang_thai, ma_khuyen_mai, ghi_chu)
                VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
                [customerName, customerPhone, address, totalAmount, discountAmount, 
                 paymentMethod, discountCode, note]
            );
            
            orderId = orderResult.insertId;
            
            // Add order items
            for (const item of items) {
                await connection.query(
                    'INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_mon, so_luong, gia_tai_thoi_diem) VALUES (?, ?, ?, ?)',
                    [orderId, item.ma_mon, item.so_luong, item.gia]
                );
                
                // Update stock
                await connection.query(
                    'UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?',
                    [item.so_luong, item.ma_mon]
                );
            }
            
            // Create order status history
            await connection.query(
                `INSERT INTO lich_su_trang_thai_don_hang 
                (ma_don_hang, trang_thai_cu, trang_thai_moi, nguoi_thay_doi, ghi_chu)
                VALUES (?, NULL, 'confirmed', 'POS System', 'Đơn hàng được tạo từ POS')`,
                [orderId]
            );
            
        } else if (orderType === 'table') {
            // Đơn hàng tại bàn - lưu vào bảng order_nha_hang
            const [orderResult] = await connection.query(
                `INSERT INTO order_nha_hang (ma_ban, ma_nhan_vien, tong_tien, trang_thai)
                VALUES (?, NULL, ?, 'dang_phuc_vu')`,
                [tableId, totalAmount]
            );
            
            orderId = orderResult.insertId;
            
            // Add order items
            for (const item of items) {
                await connection.query(
                    'INSERT INTO chi_tiet_order_nha_hang (ma_order, ma_mon, so_luong, gia) VALUES (?, ?, ?, ?)',
                    [orderId, item.ma_mon, item.so_luong, item.gia]
                );
                
                // Update stock
                await connection.query(
                    'UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?',
                    [item.so_luong, item.ma_mon]
                );
            }
            
            // Update table status
            await connection.query(
                'UPDATE ban SET trang_thai = "dang_phuc_vu" WHERE ma_ban = ?',
                [tableId]
            );
            
        } else {
            // Đơn hàng tại quầy (offline) - lưu vào don_hang với địa chỉ NULL
            const [orderResult] = await connection.query(
                `INSERT INTO don_hang 
                (ten_khach_vang_lai, so_dt_khach, dia_chi_giao, tong_tien, tien_giam_gia, 
                 phuong_thuc_thanh_toan, trang_thai, ma_khuyen_mai, ghi_chu)
                VALUES (?, ?, NULL, ?, ?, ?, 'delivered', ?, ?)`,
                [customerName, customerPhone, totalAmount, discountAmount, 
                 paymentMethod, discountCode, note]
            );
            
            orderId = orderResult.insertId;
            
            // Add order items
            for (const item of items) {
                await connection.query(
                    'INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_mon, so_luong, gia_tai_thoi_diem) VALUES (?, ?, ?, ?)',
                    [orderId, item.ma_mon, item.so_luong, item.gia]
                );
                
                // Update stock
                await connection.query(
                    'UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?',
                    [item.so_luong, item.ma_mon]
                );
            }
        }
        
        // Create payment record
        const [paymentResult] = await connection.query(
            `INSERT INTO thanh_toan 
            (ma_don_hang, ma_order_nha_hang, so_tien, phuong_thuc, trang_thai, thoi_gian_thanh_toan)
            VALUES (?, ?, ?, ?, 'success', NOW())`,
            [orderType === 'table' ? null : orderId, 
             orderType === 'table' ? orderId : null,
             totalAmount, paymentMethod]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Tạo đơn hàng thành công!',
            data: {
                orderId: orderId,
                orderType: orderType,
                total: totalAmount,
                discount: discountAmount,
                paymentId: paymentResult.insertId
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error creating POS order:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Có lỗi xảy ra khi tạo đơn hàng!' 
        });
    } finally {
        connection.release();
    }
};

// Lấy danh sách bàn
const getTables = async (req, res) => {
    try {
        const [tables] = await db.query(
            'SELECT * FROM ban ORDER BY ten_ban'
        );
        
        res.json({ success: true, data: tables });
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy đơn hàng đang phục vụ tại bàn
const getTableOrders = async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT o.*, b.ten_ban, b.so_cho,
                    GROUP_CONCAT(
                        CONCAT(m.ten_mon, ' x', ct.so_luong) 
                        SEPARATOR ', '
                    ) as items
             FROM order_nha_hang o
             JOIN ban b ON o.ma_ban = b.ma_ban
             LEFT JOIN chi_tiet_order_nha_hang ct ON o.ma_order = ct.ma_order
             LEFT JOIN mon_an m ON ct.ma_mon = m.ma_mon
             WHERE o.trang_thai = 'dang_phuc_vu'
             GROUP BY o.ma_order
             ORDER BY o.thoi_gian_tao DESC`
        );
        
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Error fetching table orders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Thanh toán đơn tại bàn
const completeTableOrder = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { orderId } = req.params;
        const { paymentMethod } = req.body;
        
        // Get order info
        const [order] = await connection.query(
            'SELECT * FROM order_nha_hang WHERE ma_order = ?',
            [orderId]
        );
        
        if (order.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });
        }
        
        // Update order status
        await connection.query(
            'UPDATE order_nha_hang SET trang_thai = "da_thanh_toan" WHERE ma_order = ?',
            [orderId]
        );
        
        // Update table status
        await connection.query(
            'UPDATE ban SET trang_thai = "trong" WHERE ma_ban = ?',
            [order[0].ma_ban]
        );
        
        // Update payment record
        await connection.query(
            `UPDATE thanh_toan 
             SET trang_thai = 'success', phuong_thuc = ?, thoi_gian_thanh_toan = NOW()
             WHERE ma_order_nha_hang = ?`,
            [paymentMethod, orderId]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Thanh toán thành công!',
            data: { orderId }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error completing table order:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// Thống kê bán hàng theo ngày
const getDailySalesStats = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        // Tổng doanh thu từ đơn online
        const [onlineOrders] = await db.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(tong_tien), 0) as total
             FROM don_hang
             WHERE DATE(thoi_gian_tao) = ?`,
            [targetDate]
        );
        
        // Tổng doanh thu từ đơn tại bàn
        const [tableOrders] = await db.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(tong_tien), 0) as total
             FROM order_nha_hang
             WHERE DATE(thoi_gian_tao) = ? AND trang_thai = 'da_thanh_toan'`,
            [targetDate]
        );
        
        // Món bán chạy nhất
        const [topProducts] = await db.query(
            `SELECT m.ma_mon, m.ten_mon, SUM(ct.so_luong) as total_sold
             FROM chi_tiet_don_hang ct
             JOIN don_hang d ON ct.ma_don_hang = d.ma_don_hang
             JOIN mon_an m ON ct.ma_mon = m.ma_mon
             WHERE DATE(d.thoi_gian_tao) = ?
             GROUP BY m.ma_mon
             ORDER BY total_sold DESC
             LIMIT 5`,
            [targetDate]
        );
        
        const totalRevenue = parseFloat(onlineOrders[0].total) + parseFloat(tableOrders[0].total);
        const totalOrders = parseInt(onlineOrders[0].count) + parseInt(tableOrders[0].count);
        
        res.json({
            success: true,
            data: {
                date: targetDate,
                totalRevenue: totalRevenue,
                totalOrders: totalOrders,
                onlineOrders: {
                    count: onlineOrders[0].count,
                    revenue: parseFloat(onlineOrders[0].total)
                },
                tableOrders: {
                    count: tableOrders[0].count,
                    revenue: parseFloat(tableOrders[0].total)
                },
                topProducts: topProducts
            }
        });
        
    } catch (error) {
        console.error('Error fetching daily stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy lịch sử đơn hàng (tất cả loại)
const getAllOrders = async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;
        
        let onlineOrders = [];
        let tableOrders = [];
        
        if (!type || type === 'online') {
            let query = `
                SELECT 'online' as order_type, ma_don_hang as order_id, 
                       ten_khach_vang_lai as customer_name, so_dt_khach as phone,
                       tong_tien as total, trang_thai as status, thoi_gian_tao as created_at
                FROM don_hang
                WHERE 1=1
            `;
            const params = [];
            
            if (startDate) {
                query += ' AND DATE(thoi_gian_tao) >= ?';
                params.push(startDate);
            }
            if (endDate) {
                query += ' AND DATE(thoi_gian_tao) <= ?';
                params.push(endDate);
            }
            
            query += ' ORDER BY thoi_gian_tao DESC';
            
            [onlineOrders] = await db.query(query, params);
        }
        
        if (!type || type === 'table') {
            let query = `
                SELECT 'table' as order_type, o.ma_order as order_id,
                       b.ten_ban as customer_name, '' as phone,
                       o.tong_tien as total, o.trang_thai as status, o.thoi_gian_tao as created_at
                FROM order_nha_hang o
                JOIN ban b ON o.ma_ban = b.ma_ban
                WHERE 1=1
            `;
            const params = [];
            
            if (startDate) {
                query += ' AND DATE(o.thoi_gian_tao) >= ?';
                params.push(startDate);
            }
            if (endDate) {
                query += ' AND DATE(o.thoi_gian_tao) <= ?';
                params.push(endDate);
            }
            
            query += ' ORDER BY o.thoi_gian_tao DESC';
            
            [tableOrders] = await db.query(query, params);
        }
        
        const allOrders = [...onlineOrders, ...tableOrders].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        res.json({ success: true, data: allOrders });
        
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy tất cả đơn hàng (cho trang quản lý)
const getAllOrdersForManagement = async (req, res) => {
    try {
        // Lấy đơn online/offline
        const [onlineOrders] = await db.query(`
            SELECT 
                'online' as order_type,
                d.ma_don_hang as order_id,
                d.ten_khach_vang_lai as customer_name,
                d.so_dt_khach as phone,
                d.tong_tien as total,
                d.trang_thai as status,
                d.thoi_gian_tao as created_at
            FROM don_hang d
            ORDER BY d.thoi_gian_tao DESC
            LIMIT 100
        `);
        
        // Lấy đơn tại bàn
        const [tableOrders] = await db.query(`
            SELECT 
                'table' as order_type,
                o.ma_order as order_id,
                b.ten_ban as customer_name,
                '' as phone,
                o.tong_tien as total,
                o.trang_thai as status,
                o.thoi_gian_tao as created_at
            FROM order_nha_hang o
            JOIN ban b ON o.ma_ban = b.ma_ban
            ORDER BY o.thoi_gian_tao DESC
            LIMIT 100
        `);
        
        const allOrders = [...onlineOrders, ...tableOrders].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        res.json({ success: true, data: allOrders });
        
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy chi tiết đơn hàng
const getOrderDetail = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { type } = req.query;
        
        let orderDetail = null;
        
        if (type === 'table') {
            // Lấy đơn tại bàn
            const [order] = await db.query(`
                SELECT 
                    o.ma_order as order_id,
                    'table' as order_type,
                    b.ten_ban as table_name,
                    '' as customer_name,
                    '' as phone,
                    NULL as address,
                    o.tong_tien as total,
                    0 as discount,
                    o.tong_tien as subtotal,
                    'cash' as payment_method,
                    o.trang_thai as status,
                    o.thoi_gian_tao as created_at,
                    NULL as note
                FROM order_nha_hang o
                JOIN ban b ON o.ma_ban = b.ma_ban
                WHERE o.ma_order = ?
            `, [orderId]);
            
            if (order.length === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });
            }
            
            // Lấy chi tiết món
            const [items] = await db.query(`
                SELECT 
                    m.ma_mon,
                    m.ten_mon,
                    m.anh_mon,
                    ct.so_luong,
                    ct.gia
                FROM chi_tiet_order_nha_hang ct
                JOIN mon_an m ON ct.ma_mon = m.ma_mon
                WHERE ct.ma_order = ?
            `, [orderId]);
            
            orderDetail = {
                ...order[0],
                items: items
            };
            
        } else {
            // Lấy đơn online/offline
            const [order] = await db.query(`
                SELECT 
                    d.ma_don_hang as order_id,
                    CASE 
                        WHEN d.dia_chi_giao IS NULL THEN 'offline'
                        ELSE 'online'
                    END as order_type,
                    d.ten_khach_vang_lai as customer_name,
                    d.so_dt_khach as phone,
                    d.dia_chi_giao as address,
                    d.tong_tien as total,
                    d.tien_giam_gia as discount,
                    (d.tong_tien + d.tien_giam_gia) as subtotal,
                    d.phuong_thuc_thanh_toan as payment_method,
                    d.trang_thai as status,
                    d.thoi_gian_tao as created_at,
                    d.ghi_chu as note
                FROM don_hang d
                WHERE d.ma_don_hang = ?
            `, [orderId]);
            
            if (order.length === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });
            }
            
            // Lấy chi tiết món
            const [items] = await db.query(`
                SELECT 
                    m.ma_mon,
                    m.ten_mon,
                    m.anh_mon,
                    ct.so_luong,
                    ct.gia_tai_thoi_diem as gia
                FROM chi_tiet_don_hang ct
                JOIN mon_an m ON ct.ma_mon = m.ma_mon
                WHERE ct.ma_don_hang = ?
            `, [orderId]);
            
            // Lấy lịch sử thay đổi
            const [timeline] = await db.query(`
                SELECT 
                    CONCAT('Chuyển từ "', 
                        COALESCE(trang_thai_cu, 'Mới'), 
                        '" sang "', 
                        trang_thai_moi, '"'
                    ) as title,
                    thoi_gian_thay_doi as time
                FROM lich_su_trang_thai_don_hang
                WHERE ma_don_hang = ?
                ORDER BY thoi_gian_thay_doi DESC
            `, [orderId]);
            
            orderDetail = {
                ...order[0],
                items: items,
                timeline: timeline
            };
        }
        
        res.json({ success: true, data: orderDetail });
        
    } catch (error) {
        console.error('Error fetching order detail:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cập nhật trạng thái đơn hàng
const updateOrderStatus = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { orderId } = req.params;
        const { status, orderType } = req.body;
        
        if (orderType === 'table') {
            // Cập nhật đơn tại bàn
            const [order] = await connection.query(
                'SELECT ma_ban, trang_thai FROM order_nha_hang WHERE ma_order = ?',
                [orderId]
            );
            
            if (order.length === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });
            }
            
            const oldStatus = order[0].trang_thai;
            
            await connection.query(
                'UPDATE order_nha_hang SET trang_thai = ? WHERE ma_order = ?',
                [status, orderId]
            );
            
            // Nếu thanh toán xong, cập nhật trạng thái bàn
            if (status === 'da_thanh_toan') {
                await connection.query(
                    'UPDATE ban SET trang_thai = "trong" WHERE ma_ban = ?',
                    [order[0].ma_ban]
                );
            }
            
        } else {
            // Cập nhật đơn online/offline
            const [order] = await connection.query(
                'SELECT trang_thai FROM don_hang WHERE ma_don_hang = ?',
                [orderId]
            );
            
            if (order.length === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });
            }
            
            const oldStatus = order[0].trang_thai;
            
            await connection.query(
                'UPDATE don_hang SET trang_thai = ? WHERE ma_don_hang = ?',
                [status, orderId]
            );
            
            // Lưu lịch sử thay đổi
            await connection.query(
                `INSERT INTO lich_su_trang_thai_don_hang 
                (ma_don_hang, trang_thai_cu, trang_thai_moi, nguoi_thay_doi, ghi_chu)
                VALUES (?, ?, ?, 'Admin', 'Cập nhật từ trang quản lý đơn hàng')`,
                [orderId, oldStatus, status]
            );
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Cập nhật trạng thái thành công!'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    createPOSOrder,
    getTables,
    getTableOrders,
    completeTableOrder,
    getDailySalesStats,
    getAllOrders,
    getAllOrdersForManagement,
    getOrderDetail,
    updateOrderStatus
};
