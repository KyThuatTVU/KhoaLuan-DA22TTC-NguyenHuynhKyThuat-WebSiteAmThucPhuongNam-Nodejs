const { gql } = require('graphql-tag');

const typeDefs = gql`
  # ==================== TYPES ====================

  type MonAn {
    ma_mon: Int!
    ten_mon: String!
    mo_ta_chi_tiet: String
    gia_tien: Float!
    so_luong_ton: Int
    don_vi_tinh: String
    anh_mon: String
    ma_danh_muc: Int!
    ten_danh_muc: String
    trang_thai: Int
    diem_danh_gia: Float
    luot_danh_gia: Int
    luot_ban: Int
  }

  type DanhMuc {
    ma_danh_muc: Int!
    ten_danh_muc: String!
    mo_ta: String
    trang_thai: Int
    mon_an: [MonAn]
  }

  type CaiDat {
    setting_key: String!
    setting_value: String
    mo_ta: String
  }

  type ThongKeNhaHang {
    tong_mon_an: Int
    tong_danh_muc: Int
    doanh_thu_thang: Float
    don_hang_thang: Int
    khach_moi_thang: Int
    dat_ban_thang: Int
    diem_danh_gia_tb: Float
    tong_danh_gia: Int
  }

  type TopMonBanChay {
    ten_mon: String!
    anh_mon: String
    so_luong_ban: Int!
    gia_tien: Float
  }

  type KetQuaTimKiem {
    mon_an: [MonAn]
    danh_muc: [DanhMuc]
    tong_ket_qua: Int
    tu_khoa: String
  }

  type ThongTinNhaHang {
    ten_nha_hang: String
    dia_chi: String
    so_dien_thoai: String
    email: String
    website: String
    gio_mo_cua_t2_t6: String
    gio_mo_cua_t7_cn: String
    phi_giao_hang: String
    mien_phi_giao_hang_tu: String
  }

  type ChatbotContext {
    thong_tin_nha_hang: ThongTinNhaHang
    mon_an_lien_quan: [MonAn]
    danh_muc_lien_quan: [DanhMuc]
    thong_ke: ThongKeNhaHang
    top_ban_chay: [TopMonBanChay]
    khuyen_mai: [MonAn]
  }

  type ChatResponse {
    success: Boolean!
    response: String
    context: ChatbotContext
    source: String
  }

  type KhuyenMai {
    ma_khuyen_mai: Int
    ten_khuyen_mai: String
    mo_ta: String
    loai: String
    gia_tri: Float
    ngay_bat_dau: String
    ngay_ket_thuc: String
    trang_thai: Int
  }

  # ==================== QUERIES ====================

  # ==================== CHATBOT ORDER TYPES ====================

  type ChiTietGioHang {
    ma_chi_tiet: Int
    ma_mon: Int
    ten_mon: String
    so_luong: Int
    gia_tai_thoi_diem: Float
    thanh_tien: Float
    anh_mon: String
    don_vi_tinh: String
  }

  type GioHang {
    ma_gio_hang: Int
    items: [ChiTietGioHang]
    tong_tien: Float
    so_luong: Int
  }

  type DonHang {
    ma_don_hang: Int!
    ma_nguoi_dung: Int
    ten_khach_vang_lai: String
    so_dt_khach: String
    dia_chi_giao: String
    tong_tien: Float
    trang_thai: String
    ghi_chu: String
    thoi_gian_tao: String
    chi_tiet: [ChiTietDonHang]
  }

  type ChiTietDonHang {
    ma_mon: Int
    ten_mon: String
    so_luong: Int
    gia_tai_thoi_diem: Float
    thanh_tien: Float
    anh_mon: String
  }

  type KetQuaDatHang {
    success: Boolean!
    message: String
    ma_don_hang: Int
    don_hang: DonHang
    tong_tien: Float
    phi_giao_hang: Float
    tien_giam_gia: Float
  }

  type KetQuaGioHang {
    success: Boolean!
    message: String
    gio_hang: GioHang
  }

  input MonAnInput {
    ma_mon: Int
    ten_mon: String
    so_luong: Int!
  }

  input ThongTinGiaoHang {
    ten_nguoi_nhan: String!
    so_dien_thoai: String!
    dia_chi: String!
    tinh_thanh: String
    quan_huyen: String
    phuong_xa: String
    ghi_chu: String
    phuong_thuc_thanh_toan: String
  }

  # ==================== QUERIES ====================

  type Query {
    # Thực đơn
    danhSachMonAn(
      ma_danh_muc: Int
      tu_khoa: String
      gia_min: Float
      gia_max: Float
      sap_xep: String
      gioi_han: Int
    ): [MonAn]

    chiTietMonAn(ma_mon: Int, ten_mon: String): MonAn

    timKiemMonAn(tu_khoa: String!): KetQuaTimKiem

    # Danh mục
    danhSachDanhMuc: [DanhMuc]

    # Top món bán chạy
    topMonBanChay(gioi_han: Int): [TopMonBanChay]

    # Thông tin nhà hàng
    thongTinNhaHang: ThongTinNhaHang

    # Cài đặt
    caiDat(key: String): [CaiDat]

    # Thống kê
    thongKeNhaHang: ThongKeNhaHang

    # Chatbot context - lấy dữ liệu liên quan cho câu hỏi
    chatbotContext(message: String!): ChatbotContext

    # Món ăn theo khoảng giá
    monAnTheoGia(gia_min: Float!, gia_max: Float!): [MonAn]

    # Gợi ý món ăn
    goiYMonAn(so_luong: Int): [MonAn]

    # Giỏ hàng của user
    xemGioHang(ma_nguoi_dung: Int!): GioHang

    # Đơn hàng của user
    danhSachDonHang(ma_nguoi_dung: Int!, gioi_han: Int): [DonHang]

    # Chi tiết đơn hàng
    chiTietDonHang(ma_don_hang: Int!): DonHang
  }

  # ==================== MUTATIONS ====================

  type Mutation {
    # Thêm món vào giỏ hàng (chatbot)
    themVaoGioHang(ma_nguoi_dung: Int!, ma_mon: Int!, so_luong: Int): KetQuaGioHang

    # Thêm nhiều món vào giỏ hàng cùng lúc (chatbot)
    themNhieuMonVaoGio(ma_nguoi_dung: Int!, items: [MonAnInput!]!): KetQuaGioHang

    # Xóa món khỏi giỏ hàng
    xoaKhoiGioHang(ma_nguoi_dung: Int!, ma_mon: Int!): KetQuaGioHang

    # Xóa toàn bộ giỏ hàng
    xoaToanBoGioHang(ma_nguoi_dung: Int!): KetQuaGioHang

    # Đặt hàng nhanh qua chatbot (từ giỏ hàng)
    datHangTuGioHang(ma_nguoi_dung: Int!, thong_tin: ThongTinGiaoHang!): KetQuaDatHang

    # Đặt hàng nhanh - chọn món và đặt luôn (không qua giỏ)
    datHangNhanh(ma_nguoi_dung: Int!, items: [MonAnInput!]!, thong_tin: ThongTinGiaoHang!): KetQuaDatHang
  }
`;

module.exports = typeDefs;
