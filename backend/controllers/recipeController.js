const db = require('../config/database');

// Lấy danh sách nguyên liệu theo món ăn
const getRecipeByDish = async (req, res) => {
    try {
        const { id } = req.params;
        const [recipe] = await db.query(
            `SELECT c.*, nl.ten_nguyen_lieu, nl.don_vi_tinh, nl.so_luong_ton 
             FROM cong_thuc c 
             JOIN nguyen_lieu nl ON c.ma_nguyen_lieu = nl.ma_nguyen_lieu 
             WHERE c.ma_mon = ?`,
            [id]
        );
        res.json({ success: true, data: recipe });
    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Cập nhật/Khai báo công thức cho một món
const updateRecipe = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // ma_mon
        const { ingredients } = req.body; // [{ ma_nguyen_lieu, so_luong_can }]

        // Xóa công thức cũ
        await connection.query('DELETE FROM cong_thuc WHERE ma_mon = ?', [id]);

        // Thêm công thức mới
        for (const item of ingredients) {
            await connection.query(
                'INSERT INTO cong_thuc (ma_mon, ma_nguyen_lieu, so_luong_can) VALUES (?, ?, ?)',
                [id, item.ma_nguyen_lieu, item.so_luong_can]
            );
        }

        // Cập nhật lại số lượng tồn của món ăn dựa trên nguyên liệu
        if (ingredients && ingredients.length > 0) {
            let maxPortions = Infinity;
            for (const item of ingredients) {
                const [nlRows] = await connection.query('SELECT so_luong_ton FROM nguyen_lieu WHERE ma_nguyen_lieu = ?', [item.ma_nguyen_lieu]);
                if (nlRows.length > 0) {
                    const slt = parseFloat(nlRows[0].so_luong_ton) || 0;
                    const can = parseFloat(item.so_luong_can) || 1;
                    const portions = Math.floor(slt / can);
                    if (portions < maxPortions) {
                        maxPortions = portions;
                    }
                }
            }
            if (maxPortions === Infinity || maxPortions < 0) maxPortions = 0;
            await connection.query('UPDATE mon_an SET so_luong_ton = ? WHERE ma_mon = ?', [maxPortions, id]);
        } else {
            await connection.query('UPDATE mon_an SET so_luong_ton = 0 WHERE ma_mon = ?', [id]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Cập nhật công thức và tính lại số lượng món thành công' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating recipe:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật công thức' });
    } finally {
        connection.release();
    }
};

module.exports = {
    getRecipeByDish,
    updateRecipe
};
