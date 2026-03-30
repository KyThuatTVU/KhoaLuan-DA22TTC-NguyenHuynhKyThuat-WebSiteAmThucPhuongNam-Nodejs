const db = require('../config/database');

// Lấy danh sách tất cả loại nguyên liệu
const getAllCategories = async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM loai_nguyen_lieu ORDER BY ten_loai_nglieu ASC');
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching ingredient categories:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Thêm loại nguyên liệu mới
const createCategory = async (req, res) => {
    try {
        const { ten_loai_nglieu } = req.body;
        if (!ten_loai_nglieu) {
            return res.status(400).json({ success: false, message: 'Tên loại nguyên liệu là bắt buộc' });
        }

        const [result] = await db.query('INSERT INTO loai_nguyen_lieu (ten_loai_nglieu) VALUES (?)', [ten_loai_nglieu]);
        res.json({ 
            success: true, 
            message: 'Thêm loại nguyên liệu thành công',
            data: { ma_loai_nglieu: result.insertId, ten_loai_nglieu }
        });
    } catch (error) {
        console.error('Error creating ingredient category:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Cập nhật loại nguyên liệu
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_loai_nglieu } = req.body;
        
        await db.query('UPDATE loai_nguyen_lieu SET ten_loai_nglieu = ? WHERE ma_loai_nglieu = ?', [ten_loai_nglieu, id]);
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        console.error('Error updating ingredient category:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa loại nguyên liệu
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra xem có nguyên liệu nào đang thuộc loại này không
        const [ingredients] = await db.query('SELECT ma_nguyen_lieu FROM nguyen_lieu WHERE ma_loai_nglieu = ? LIMIT 1', [id]);
        if (ingredients.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể xóa loại này vì đang có nguyên liệu thuộc nhóm này. Hãy chuyển chúng sang nhóm khác trước!' 
            });
        }

        await db.query('DELETE FROM loai_nguyen_lieu WHERE ma_loai_nglieu = ?', [id]);
        res.json({ success: true, message: 'Xóa loại nguyên liệu thành công' });
    } catch (error) {
        console.error('Error deleting ingredient category:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
