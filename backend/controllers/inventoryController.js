const db = require('../config/database');

// Lấy danh sách tất cả nguyên liệu trong kho
const getAllIngredients = async (req, res) => {
    try {
        const [ingredients] = await db.query(
            'SELECT * FROM nguyen_lieu ORDER BY ten_nguyen_lieu ASC'
        );
        res.json({ success: true, data: ingredients });
    } catch (error) {
        console.error('Error fetching ingredients:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Thêm nguyên liệu mới
const createIngredient = async (req, res) => {
    try {
        const { ten_nguyen_lieu, so_luong_ton, don_vi_tinh, muc_canh_bao, don_vi_nhap, ti_le_chuyen_doi } = req.body;
        
        if (!ten_nguyen_lieu || !don_vi_tinh) {
            return res.status(400).json({ success: false, message: 'Tên và đơn vị tính là bắt buộc' });
        }

        const importUnit = don_vi_nhap || don_vi_tinh;
        const conversionRate = ti_le_chuyen_doi || 1;

        const [result] = await db.query(
            'INSERT INTO nguyen_lieu (ten_nguyen_lieu, so_luong_ton, don_vi_tinh, muc_canh_bao, don_vi_nhap, ti_le_chuyen_doi) VALUES (?, ?, ?, ?, ?, ?)',
            [ten_nguyen_lieu, so_luong_ton || 0, don_vi_tinh, muc_canh_bao || 1000, importUnit, conversionRate]
        );
        
        res.json({ 
            success: true, 
            message: 'Thêm nguyên liệu thành công',
            data: { ma_nguyen_lieu: result.insertId, ten_nguyen_lieu, so_luong_ton, don_vi_tinh }
        });
    } catch (error) {
        console.error('Error creating ingredient:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Cập nhật thông tin/nhập tồn kho nguyên liệu (Nhập kho inbound)
const updateIngredient = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_nguyen_lieu, so_luong_ton, don_vi_tinh, muc_canh_bao, trang_thai, don_vi_nhap, ti_le_chuyen_doi } = req.body;
        
        const importUnit = don_vi_nhap || don_vi_tinh;
        const conversionRate = ti_le_chuyen_doi || 1;

        await db.query(
            `UPDATE nguyen_lieu 
             SET ten_nguyen_lieu = ?, so_luong_ton = ?, don_vi_tinh = ?, muc_canh_bao = ?, trang_thai = ?, don_vi_nhap = ?, ti_le_chuyen_doi = ?
             WHERE ma_nguyen_lieu = ?`,
            [ten_nguyen_lieu, so_luong_ton, don_vi_tinh, muc_canh_bao, trang_thai, importUnit, conversionRate, id]
        );
        
        // Sau khi update số lượng kho, cập nhật số lượng tồn tối đa của các món ăn
        await updateAllDishMaxPortions();

        res.json({ success: true, message: 'Cập nhật nguyên liệu thành công' });
    } catch (error) {
        console.error('Error updating ingredient:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Hàm cập nhật số lượng phần tối đa có thể phục vụ của từng món ăn dựa vào nguyên liệu
const updateAllDishMaxPortions = async (conn = null) => {
    const queryRunner = conn || db; // Dùng connection đang mở nếu có, không thì dùng pool
    try {
        // Lấy tất cả công thức và nguyên liệu
        const [recipes] = await queryRunner.query(`
            SELECT c.ma_mon, c.ma_nguyen_lieu, c.so_luong_can, nl.so_luong_ton
            FROM cong_thuc c
            JOIN nguyen_lieu nl ON c.ma_nguyen_lieu = nl.ma_nguyen_lieu
        `);
        
        // Nhóm theo ma_mon
        const dishMap = {};
        for (const r of recipes) {
            if (!dishMap[r.ma_mon]) dishMap[r.ma_mon] = [];
            dishMap[r.ma_mon].push(r);
        }

        // Với mỗi món ăn, số lượng sinh ra tối đa là Min(kho(i) / lượng(i)) của mọi i
        for (const ma_mon in dishMap) {
            let maxPortions = Infinity;
            for (const item of dishMap[ma_mon]) {
                const portions = Math.floor(item.so_luong_ton / item.so_luong_can);
                if (portions < maxPortions) {
                    maxPortions = portions;
                }
            }
            if (maxPortions === Infinity) maxPortions = 0;
            
            // Cập nhật lên món ăn
            await queryRunner.query(
                'UPDATE mon_an SET so_luong_ton = ? WHERE ma_mon = ?',
                [maxPortions, ma_mon]
            );
        }

        // Cảnh báo nguyên liệu sắp hết
        const [lowStock] = await queryRunner.query(
            'SELECT ten_nguyen_lieu, so_luong_ton, don_vi_tinh, muc_canh_bao FROM nguyen_lieu WHERE so_luong_ton <= muc_canh_bao'
        );
        
        if (lowStock.length > 0) {
            const { createAdminNotification } = require('../routes/admin-notifications');
            for (const item of lowStock) {
                // Để tránh spam, lý tưởng nhất là có cờ da_canh_bao, nhưng hiện tại ta sẽ alert
                await createAdminNotification(
                    'system',
                    'Cảnh báo: Nguyên liệu sắp hết',
                    `Nguyên liệu "${item.ten_nguyen_lieu}" chỉ còn ${item.so_luong_ton} ${item.don_vi_tinh} (Mức cảnh báo: ${item.muc_canh_bao})`,
                    '/admin/inventory.html',
                    null
                ).catch(e => console.error('Alert error:', e));
            }
        }
    } catch (e) {
        console.error('Update dish portions error:', e);
    }
};

// Cập nhật tồn kho nhanh (khi nhập hàng thực tế)
const addStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Số lượng nhập không hợp lệ' });
        }

        // Fetch ingredient current conversion rate
        const [ing] = await db.query('SELECT ti_le_chuyen_doi FROM nguyen_lieu WHERE ma_nguyen_lieu = ?', [id]);
        if (!ing || ing.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy nguyên liệu' });

        const conversionRate = ing[0].ti_le_chuyen_doi || 1;
        const actualAddedAmount = amount * conversionRate;

        await db.query(
            'UPDATE nguyen_lieu SET so_luong_ton = so_luong_ton + ? WHERE ma_nguyen_lieu = ?',
            [actualAddedAmount, id]
        );

        await updateAllDishMaxPortions();

        res.json({ success: true, message: 'Nhập kho thành công', actual_amount_added: actualAddedAmount });
    } catch (error) {
        console.error('Error adding stock:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getAllIngredients,
    createIngredient,
    updateIngredient,
    addStock,
    updateAllDishMaxPortions
};
