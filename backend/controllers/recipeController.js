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

        await connection.commit();
        res.json({ success: true, message: 'Cập nhật công thức thành công' });
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
