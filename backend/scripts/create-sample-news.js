const db = require('../config/database');

async function createSampleNews() {
    try {
        console.log('🔄 Đang tạo dữ liệu tin tức mẫu...');

        const newsData = [
            {
                tieu_de: 'Khai Trương Chi Nhánh Mới Tại Vĩnh Long',
                tom_tat: 'Chúng tôi vui mừng thông báo khai trương chi nhánh thứ 5 tại trung tâm thành phố Vĩnh Long với không gian hiện đại và đội ngũ chuyên nghiệp.',
                noi_dung: `<p>Chúng tôi vui mừng thông báo khai trương chi nhánh thứ 5 tại trung tâm thành phố Vĩnh Long. Với không gian hiện đại, rộng rãi và đội ngũ nhân viên chuyên nghiệp, chúng tôi cam kết mang đến trải nghiệm ẩm thực tuyệt vời nhất cho quý khách hàng.</p>
                
                <h2>Thông tin chi nhánh mới</h2>
                <ul>
                    <li>Địa chỉ: 123 Đường Phạm Thái Bường, Phường 4, Vĩnh Long</li>
                    <li>Diện tích: 500m² với sức chứa 200 khách</li>
                    <li>Giờ mở cửa: 10:00 - 22:00 hàng ngày</li>
                    <li>Đặc biệt: Không gian VIP riêng tư, phù hợp tổ chức tiệc</li>
                </ul>

                <h2>Ưu đãi khai trương</h2>
                <p>Nhân dịp khai trương, chúng tôi dành tặng quý khách:</p>
                <ul>
                    <li>Giảm 20% toàn bộ thực đơn trong tuần đầu tiên</li>
                    <li>Tặng món tráng miệng khi hóa đơn từ 500.000đ</li>
                    <li>Ưu đãi đặc biệt cho khách hàng thân thiết</li>
                </ul>`,
                anh_dai_dien: 'images/tt2.jpg',
                ma_admin_dang: 1
            },
            {
                tieu_de: 'Ra Mắt Thực Đơn Mùa Thu 2025',
                tom_tat: 'Khám phá những món ăn đặc trưng mùa thu với hương vị độc đáo, được chế biến từ nguyên liệu tươi ngon nhất.',
                noi_dung: `<p>Chào đón mùa thu 2025, Nhà hàng Phương Nam tự hào giới thiệu thực đơn mới với những món ăn đặc trưng mang hương vị mùa thu đậm đà.</p>

                <h2>Món ăn nổi bật</h2>
                <ul>
                    <li>Lẩu cá kèo lá giang - 350.000đ</li>
                    <li>Gỏi bưởi tôm thịt - 180.000đ</li>
                    <li>Cơm tấm sườn bì chả - 55.000đ</li>
                    <li>Bánh xèo Vĩnh Long - 45.000đ</li>
                </ul>

                <p>Tất cả món ăn đều được chế biến từ nguyên liệu tươi sống, đảm bảo vệ sinh an toàn thực phẩm.</p>`,
                anh_dai_dien: 'images/tt1.jpg',
                ma_admin_dang: 1
            },
            {
                tieu_de: 'Workshop Ẩm Thực Miền Tây - Tháng 11/2025',
                tom_tat: 'Tham gia workshop học nấu các món ăn truyền thống miền Tây cùng đầu bếp chuyên nghiệp của nhà hàng.',
                noi_dung: `<p>Nhà hàng Phương Nam tổ chức workshop ẩm thực miền Tây dành cho những ai yêu thích nấu ăn và muốn khám phá bí quyết chế biến các món ăn truyền thống.</p>

                <h2>Thông tin workshop</h2>
                <ul>
                    <li>Thời gian: Thứ 7 hàng tuần, 14:00 - 17:00</li>
                    <li>Địa điểm: Nhà hàng Phương Nam - Chi nhánh 1</li>
                    <li>Học phí: 350.000đ/người (bao gồm nguyên liệu)</li>
                    <li>Số lượng: Giới hạn 15 người/buổi</li>
                </ul>

                <h2>Nội dung học</h2>
                <ul>
                    <li>Cách chọn nguyên liệu tươi ngon</li>
                    <li>Kỹ thuật chế biến món lẩu</li>
                    <li>Bí quyết làm nước mắm pha</li>
                    <li>Trình bày món ăn chuyên nghiệp</li>
                </ul>`,
                anh_dai_dien: 'images/banner-1.jpg',
                ma_admin_dang: 1
            },
            {
                tieu_de: 'Chương Trình Khuyến Mãi Cuối Tuần',
                tom_tat: 'Giảm giá 15% cho tất cả các món ăn vào thứ 7 và Chủ nhật. Áp dụng cho cả đơn hàng tại nhà hàng và giao hàng.',
                noi_dung: `<p>Cuối tuần này hãy đến Nhà hàng Phương Nam để thưởng thức những món ăn ngon với ưu đãi đặc biệt!</p>

                <h2>Ưu đãi chi tiết</h2>
                <ul>
                    <li>Giảm 15% toàn bộ thực đơn</li>
                    <li>Tặng nước uống cho hóa đơn từ 300.000đ</li>
                    <li>Freeship cho đơn hàng từ 200.000đ trong bán kính 5km</li>
                </ul>

                <h2>Điều kiện áp dụng</h2>
                <ul>
                    <li>Áp dụng: Thứ 7 và Chủ nhật hàng tuần</li>
                    <li>Không áp dụng đồng thời với chương trình khuyến mãi khác</li>
                    <li>Đặt bàn trước để được phục vụ tốt nhất</li>
                </ul>`,
                anh_dai_dien: 'images/banner-2.jpg',
                ma_admin_dang: 1
            },
            {
                tieu_de: 'Đặc Sản Mùa Vụ - Tháng 11',
                tom_tat: 'Thưởng thức các món ăn được chế biến từ đặc sản mùa vụ của miền Tây, mang đến hương vị đậm đà nhất.',
                noi_dung: `<p>Tháng 11 là mùa của nhiều đặc sản miền Tây. Nhà hàng Phương Nam chọn lọc những nguyên liệu tươi ngon nhất để chế biến các món ăn đặc trưng.</p>

                <h2>Món ăn mùa vụ</h2>
                <ul>
                    <li>Lẩu mắm cá linh - 380.000đ</li>
                    <li>Cá kèo kho tộ - 220.000đ</li>
                    <li>Ốc hấp sả - 150.000đ</li>
                    <li>Gỏi cá trích - 180.000đ</li>
                </ul>

                <p>Các món ăn chỉ có trong mùa, không thể bỏ lỡ!</p>`,
                anh_dai_dien: 'images/album1.jpg',
                ma_admin_dang: 1
            }
        ];

        // Xóa dữ liệu cũ
        await db.query('DELETE FROM tin_tuc');
        console.log('✅ Đã xóa dữ liệu cũ');

        // Thêm dữ liệu mới
        for (const news of newsData) {
            await db.query(
                `INSERT INTO tin_tuc (tieu_de, tom_tat, noi_dung, anh_dai_dien, ma_admin_dang, luot_xem) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    news.tieu_de,
                    news.tom_tat,
                    news.noi_dung,
                    news.anh_dai_dien,
                    news.ma_admin_dang,
                    Math.floor(Math.random() * 1000) + 100 // Random views
                ]
            );
        }

        console.log(`✅ Đã tạo ${newsData.length} tin tức mẫu thành công!`);
        console.log('📰 Bạn có thể xem tin tức tại: http://localhost:3000/tin-tuc.html');

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        process.exit();
    }
}

createSampleNews();
