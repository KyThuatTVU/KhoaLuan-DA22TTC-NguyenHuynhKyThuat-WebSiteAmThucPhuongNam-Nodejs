const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.admin) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

// Lay khuyen mai dang hoat dong
router.get('/active', async (req, res) => {
  try {
    const [promotions] = await db.query(`
      SELECT * FROM khuyen_mai
      WHERE trang_thai = 1
        AND ngay_bat_dau <= NOW()
        AND ngay_ket_thuc >= NOW()
        AND (so_luong_gioi_han IS NULL OR so_luong_da_dung < so_luong_gioi_han)
      ORDER BY ngay_bat_dau DESC
    `);
    res.json({ success: true, data: promotions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ap dung ma khuyen mai
router.post('/apply', async (req, res) => {
  try {
    const { ma_code, tong_tien } = req.body;
    
    if (!ma_code) {
      return res.status(400).json({ success: false, message: 'Vui long nhap ma' });
    }

    const [promotions] = await db.query(
      'SELECT * FROM khuyen_mai WHERE ma_code = ? AND trang_thai = 1',
      [ma_code.toUpperCase()]
    );

    if (promotions.length === 0) {
      return res.status(404).json({ success: false, message: 'Ma khong ton tai' });
    }

    const promo = promotions[0];
    const now = new Date();

    if (new Date(promo.ngay_bat_dau) > now) {
      return res.status(400).json({ success: false, message: 'Ma chua hieu luc' });
    }

    if (new Date(promo.ngay_ket_thuc) < now) {
      return res.status(400).json({ success: false, message: 'Ma da het han' });
    }

    if (promo.so_luong_gioi_han && promo.so_luong_da_dung >= promo.so_luong_gioi_han) {
      return res.status(400).json({ success: false, message: 'Ma da het luot' });
    }

    if (promo.don_hang_toi_thieu > 0 && tong_tien < promo.don_hang_toi_thieu) {
      return res.status(400).json({ success: false, message: 'Don hang chua dat gia tri toi thieu' });
    }

    let tien_giam = 0;
    if (promo.loai_giam_gia === 'percentage') {
      tien_giam = Math.round((tong_tien * promo.gia_tri) / 100);
      if (promo.giam_toi_da && tien_giam > promo.giam_toi_da) {
        tien_giam = Number(promo.giam_toi_da);
      }
    } else {
      tien_giam = Number(promo.gia_tri);
    }

    res.json({
      success: true,
      data: {
        ma_khuyen_mai: promo.ma_khuyen_mai,
        ma_code: promo.ma_code,
        loai_giam_gia: promo.loai_giam_gia,
        gia_tri: promo.gia_tri,
        tien_giam: tien_giam,
        mo_ta: promo.mo_ta
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// Su dung ma khuyen mai
router.post('/use', async (req, res) => {
  try {
    const { ma_khuyen_mai } = req.body;
    await db.query(
      'UPDATE khuyen_mai SET so_luong_da_dung = so_luong_da_dung + 1 WHERE ma_khuyen_mai = ?',
      [ma_khuyen_mai]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Lay tat ca khuyen mai
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [promotions] = await db.query('SELECT * FROM khuyen_mai ORDER BY ma_khuyen_mai DESC');
    res.json({ success: true, data: promotions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Lay chi tiet khuyen mai
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const [promotions] = await db.query('SELECT * FROM khuyen_mai WHERE ma_khuyen_mai = ?', [req.params.id]);
    if (promotions.length === 0) {
      return res.status(404).json({ success: false, message: 'Khong tim thay' });
    }
    res.json({ success: true, data: promotions[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Tao moi khuyen mai
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { ma_code, mo_ta, loai_giam_gia, gia_tri, don_hang_toi_thieu, ngay_bat_dau, ngay_ket_thuc, so_luong_gioi_han, trang_thai } = req.body;

    const [existing] = await db.query('SELECT ma_khuyen_mai FROM khuyen_mai WHERE ma_code = ?', [ma_code.toUpperCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Ma da ton tai' });
    }

    const [result] = await db.query(
      `INSERT INTO khuyen_mai (ma_code, mo_ta, loai_giam_gia, gia_tri, don_hang_toi_thieu, ngay_bat_dau, ngay_ket_thuc, so_luong_gioi_han, trang_thai)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ma_code.toUpperCase(), mo_ta, loai_giam_gia, gia_tri || 0, don_hang_toi_thieu, ngay_bat_dau, ngay_ket_thuc, so_luong_gioi_han, trang_thai !== undefined ? trang_thai : 1]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Cap nhat khuyen mai
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { ma_code, mo_ta, loai_giam_gia, gia_tri, don_hang_toi_thieu, ngay_bat_dau, ngay_ket_thuc, so_luong_gioi_han, trang_thai } = req.body;

    await db.query(
      `UPDATE khuyen_mai SET ma_code=?, mo_ta=?, loai_giam_gia=?, gia_tri=?, don_hang_toi_thieu=?, ngay_bat_dau=?, ngay_ket_thuc=?, so_luong_gioi_han=?, trang_thai=? WHERE ma_khuyen_mai=?`,
      [ma_code.toUpperCase(), mo_ta, loai_giam_gia, gia_tri, don_hang_toi_thieu, ngay_bat_dau, ngay_ket_thuc, so_luong_gioi_han, trang_thai, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Xoa khuyen mai
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM khuyen_mai WHERE ma_khuyen_mai = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
