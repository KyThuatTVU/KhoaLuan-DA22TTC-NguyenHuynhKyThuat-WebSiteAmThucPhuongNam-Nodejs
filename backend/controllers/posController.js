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
        // Validate stock using centralized ingredients
        const ingredientRequirement = {};
        for (const item of items) {
            const [product] = await connection.query(
                'SELECT gia_tien, ten_mon FROM mon_an WHERE ma_mon = ?',
                [item.ma_mon]
            );
            
            if (product.length === 0) {
                throw new Error(`Món ăn ID ${item.ma_mon} không tồn tại`);
            }
            
            // Get recipe
            const [recipes] = await connection.query(
                'SELECT ma_nguyen_lieu, so_luong_can FROM cong_thuc WHERE ma_mon = ?',
                [item.ma_mon]
            );
            for (const r of recipes) {
                const totalNeeded = r.so_luong_can * item.so_luong;
                if (!ingredientRequirement[r.ma_nguyen_lieu]) {
                    ingredientRequirement[r.ma_nguyen_lieu] = { needed: 0, mon_ans: [] };
                }
                ingredientRequirement[r.ma_nguyen_lieu].needed += totalNeeded;
                ingredientRequirement[r.ma_nguyen_lieu].mon_ans.push(product[0].ten_mon);
            }
            
            subtotal += product[0].gia_tien * item.so_luong;
        }

        // Verify ingredient stock
        for (const ma_nglieu in ingredientRequirement) {
            const reqData = ingredientRequirement[ma_nglieu];
            const [inv] = await connection.query(
                'SELECT ten_nguyen_lieu, so_luong_ton FROM nguyen_lieu WHERE ma_nguyen_lieu = ?',
                [ma_nglieu]
            );
            if (inv.length === 0 || inv[0].so_luong_ton < reqData.needed) {
                throw new Error(`Không đủ nguyên liệu "${inv.length > 0 ? inv[0].ten_nguyen_lieu : ''}" cho món: ${[...new Set(reqData.mon_ans)].join(', ')}.`);
            }
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
                
                // Xóa bỏ logic cũ trừ thẳng vào bảng mon_an
                // await connection.query(
                //     'UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?',
                //     [item.so_luong, item.ma_mon]
                // );
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
                
                // Xóa bỏ logic cũ trừ thẳng vào bảng mon_an
                // await connection.query(
                //     'UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?',
                //     [item.so_luong, item.ma_mon]
                // );
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
                
                // Xóa bỏ logic cũ trừ thẳng vào bảng mon_an
                // await connection.query(
                //     'UPDATE mon_an SET so_luong_ton = so_luong_ton - ? WHERE ma_mon = ?',
                //     [item.so_luong, item.ma_mon]
                // );
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
        
        // Thực hiện trừ kho trung tâm cho toàn bộ đơn hàng
        for (const ma_nglieu in ingredientRequirement) {
            await connection.query(
                'UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton - ? WHERE ma_nguyen_lieu = ?',
                [ingredientRequirement[ma_nglieu].needed, ma_nglieu]
            );
        }
        const inventoryController = require('./inventoryController');
        await inventoryController.updateAllDishMaxPortions(connection);
        
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

// Gửi bếp (Thêm/cập nhật món cho bàn đang phục vụ)
const sendToKitchen = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { tableId, items, staffName } = req.body;
        
        let subtotal = 0;
        const ingredientRequirement = {};
        for (const item of items) {
            subtotal += item.gia * item.so_luong;
            const [recipes] = await connection.query('SELECT ma_nguyen_lieu, so_luong_can FROM cong_thuc WHERE ma_mon = ?', [item.ma_mon]);
            for (const r of recipes) {
                if (!ingredientRequirement[r.ma_nguyen_lieu]) ingredientRequirement[r.ma_nguyen_lieu] = { needed: 0 };
                ingredientRequirement[r.ma_nguyen_lieu].needed += r.so_luong_can * item.so_luong;
            }
        }

        // Kiểm tra bàn đang có order hay không
        const [existingOrder] = await connection.query(
            'SELECT ma_order FROM order_nha_hang WHERE ma_ban = ? AND trang_thai = "dang_phuc_vu"',
            [tableId]
        );

        // Validate items
        if (!items || items.length === 0) {
            if (existingOrder.length > 0) {
                // Hoàn lại kho nguyên liệu cho các món cũ
                const [oldItems] = await connection.query(
                    'SELECT ma_mon, so_luong FROM chi_tiet_order_nha_hang WHERE ma_order = ?',
                    [orderId]
                );
                const ingredientRefund = {};
                for (const oldItem of oldItems) {
                    const [recipes] = await connection.query('SELECT ma_nguyen_lieu, so_luong_can FROM cong_thuc WHERE ma_mon = ?', [oldItem.ma_mon]);
                    for (const r of recipes) {
                        if (!ingredientRefund[r.ma_nguyen_lieu]) ingredientRefund[r.ma_nguyen_lieu] = 0;
                        ingredientRefund[r.ma_nguyen_lieu] += r.so_luong_can * oldItem.so_luong;
                    }
                }
                for (const ma_nglieu in ingredientRefund) {
                    await connection.query('UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton + ? WHERE ma_nguyen_lieu = ?', [ingredientRefund[ma_nglieu], ma_nglieu]);
                }
                // Xóa chi tiết cũ & cập nhật trạng thái
                await connection.query('DELETE FROM chi_tiet_order_nha_hang WHERE ma_order = ?', [orderId]);
                await connection.query('UPDATE ban SET trang_thai = "trong" WHERE ma_ban = ?', [tableId]);
                await connection.query('UPDATE order_nha_hang SET trang_thai = "huy", tong_tien = 0 WHERE ma_order = ?', [orderId]);
                await connection.commit();
                return res.json({
                    success: true,
                    message: 'Đã hủy order thành công!',
                    data: { orderId: null }
                });
            } else {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Đơn hàng trống!' });
            }
        }


        let orderId;
        if (existingOrder.length > 0) {
            orderId = existingOrder[0].ma_order;
            
            // Hoàn lại kho nguyên liệu cho các món cũ
            const [oldItems] = await connection.query(
                'SELECT ma_mon, so_luong FROM chi_tiet_order_nha_hang WHERE ma_order = ?',
                [orderId]
            );
            const ingredientRefund = {};
            for (const oldItem of oldItems) {
                const [recipes] = await connection.query('SELECT ma_nguyen_lieu, so_luong_can FROM cong_thuc WHERE ma_mon = ?', [oldItem.ma_mon]);
                for (const r of recipes) {
                    if (!ingredientRefund[r.ma_nguyen_lieu]) ingredientRefund[r.ma_nguyen_lieu] = 0;
                    ingredientRefund[r.ma_nguyen_lieu] += r.so_luong_can * oldItem.so_luong;
                }
            }
            for (const ma_nglieu in ingredientRefund) {
                await connection.query('UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton + ? WHERE ma_nguyen_lieu = ?', [ingredientRefund[ma_nglieu], ma_nglieu]);
            }
            // Xóa chi tiết cũ
            await connection.query('DELETE FROM chi_tiet_order_nha_hang WHERE ma_order = ?', [orderId]);
            
            // Cập nhật tổng tiền
            await connection.query(
                'UPDATE order_nha_hang SET tong_tien = ? WHERE ma_order = ?',
                [subtotal, orderId]
            );
        } else {
            // Tạo mới order
            const [orderResult] = await connection.query(
                'INSERT INTO order_nha_hang (ma_ban, ma_nhan_vien, tong_tien, trang_thai) VALUES (?, NULL, ?, "dang_phuc_vu")',
                [tableId, subtotal]
            );
            orderId = orderResult.insertId;
        }

        // Luôn đảm bảo cập nhật trạng thái bàn thành đang phục vụ
        await connection.query(
            'UPDATE ban SET trang_thai = "dang_phuc_vu" WHERE ma_ban = ?',
            [tableId]
        );

        // Kiểm tra xem kho tổng có đủ nguyên liệu không
        for (const ma_nglieu in ingredientRequirement) {
            const reqData = ingredientRequirement[ma_nglieu];
            const [inv] = await connection.query('SELECT ten_nguyen_lieu, so_luong_ton FROM nguyen_lieu WHERE ma_nguyen_lieu = ?', [ma_nglieu]);
            if (inv.length === 0 || inv[0].so_luong_ton < reqData.needed) {
                throw new Error(`Không đủ nguyên liệu "${inv.length > 0 ? inv[0].ten_nguyen_lieu : ''}" để gửi món.`);
            }
        }

        // Chèn món mới
        for (const item of items) {
            await connection.query(
                'INSERT INTO chi_tiet_order_nha_hang (ma_order, ma_mon, so_luong, gia) VALUES (?, ?, ?, ?)',
                [orderId, item.ma_mon, item.so_luong, item.gia]
            );
        }

        // Trừ kho nguyên liệu tổng
        for (const ma_nglieu in ingredientRequirement) {
            await connection.query(
                'UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton - ? WHERE ma_nguyen_lieu = ?',
                [ingredientRequirement[ma_nglieu].needed, ma_nglieu]
            );
        }

        const inventoryController = require('./inventoryController');
        await inventoryController.updateAllDishMaxPortions(connection);

        await connection.commit();

        res.json({
            success: true,
            message: 'Đã gửi yêu cầu đến bếp thành công!',
            data: { orderId }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error send to kitchen:', error);
        res.status(500).json({ success: false, message: error.message });
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

// Lấy chi tiết đơn hàng đang phục vụ của một bàn cụ thể
const getTableOrderDetail = async (req, res) => {
    try {
        const { tableId } = req.params;
        
        const [order] = await db.query(
            'SELECT * FROM order_nha_hang WHERE ma_ban = ? AND trang_thai = "dang_phuc_vu"',
            [tableId]
        );
        
        if (order.length === 0) {
            return res.json({ success: true, data: null });
        }
        
        const [items] = await db.query(
            `SELECT ct.ma_mon, m.ten_mon, m.anh_mon, ct.gia, ct.so_luong, m.so_luong_ton, '' as ghi_chu 
             FROM chi_tiet_order_nha_hang ct
             JOIN mon_an m ON ct.ma_mon = m.ma_mon
             WHERE ct.ma_order = ?`,
            [order[0].ma_order]
        );
        
        res.json({
            success: true,
            data: {
                orderId: order[0].ma_order,
                items: items
            }
        });
    } catch (error) {
        console.error('Error fetching table order detail:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy đơn hàng đang phục vụ tại bàn (dashboard summary)
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
            'SELECT o.*, b.ten_ban FROM order_nha_hang o JOIN ban b ON o.ma_ban = b.ma_ban WHERE o.ma_order = ?',
            [orderId]
        );
        
        if (order.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });
        }

        if (order[0].trang_thai === 'da_thanh_toan') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Đơn hàng này đã được thanh toán!' });
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
        
        // Clone into don_hang for unified statistics and history
        const [insertDonHang] = await connection.query(`
            INSERT INTO don_hang (
                ten_khach_vang_lai,
                tong_tien,
                trang_thai,
                phuong_thuc_thanh_toan,
                ghi_chu,
                thoi_gian_tao
            ) VALUES (?, ?, 'delivered', ?, ?, ?)
        `, [
            order[0].ten_ban + " (Tại bàn)", 
            order[0].tong_tien, 
            paymentMethod || 'cash', 
            'Đơn hàng tại bàn POS',
            order[0].thoi_gian_tao
        ]);
        const newDonHangId = insertDonHang.insertId;

        // Insert items into chi_tiet_don_hang
        const [items] = await connection.query('SELECT * FROM chi_tiet_order_nha_hang WHERE ma_order = ?', [orderId]);
        for (const item of items) {
             await connection.query(
                'INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_mon, so_luong, gia_tai_thoi_diem) VALUES (?, ?, ?, ?)', 
                [newDonHangId, item.ma_mon, item.so_luong, item.gia]
             );
        }
        
        // Kiểm tra xem đã có record thanh toán chưa
        const [payment] = await connection.query('SELECT ma_thanh_toan FROM thanh_toan WHERE ma_order_nha_hang = ?', [orderId]);
        
        if (payment.length > 0) {
            await connection.query(
                `UPDATE thanh_toan 
                 SET trang_thai = 'success', phuong_thuc = ?, thoi_gian_thanh_toan = NOW(), ma_don_hang = ?
                 WHERE ma_order_nha_hang = ?`,
                [paymentMethod || 'cash', newDonHangId, orderId]
            );
        } else {
            await connection.query(
                `INSERT INTO thanh_toan (ma_order_nha_hang, ma_don_hang, phuong_thuc, so_tien, trang_thai, thoi_gian_thanh_toan) 
                 VALUES (?, ?, ?, ?, 'success', NOW())`,
                [orderId, newDonHangId, paymentMethod || 'cash', order[0].tong_tien]
            );
        }
        
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
    sendToKitchen,
    getTables,
    getTableOrderDetail,
    getTableOrders,
    completeTableOrder,
    getDailySalesStats,
    getAllOrders,
    getAllOrdersForManagement,
    getOrderDetail,
    updateOrderStatus
};
