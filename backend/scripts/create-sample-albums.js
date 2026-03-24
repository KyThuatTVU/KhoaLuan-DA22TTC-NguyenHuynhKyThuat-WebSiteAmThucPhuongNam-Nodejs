const db = require('../config/database');

async function createSampleAlbums() {
    try {
        console.log('🔄 Đang tạo dữ liệu album mẫu...');

        // Xóa dữ liệu cũ (giữ lại 2 ảnh có sẵn)
        await db.query('DELETE FROM album_anh WHERE ma_album > 2');
        console.log('✅ Đã xóa dữ liệu cũ');

        // Dữ liệu album mẫu
        const albums = [
            // Món ăn
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
                loai_anh: 'mon_an',
                mo_ta: 'Cá lóc nướng trui - món đặc sản miền Tây'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=800',
                loai_anh: 'mon_an',
                mo_ta: 'Lẩu mắm miền Tây - hương vị đậm đà'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800',
                loai_anh: 'mon_an',
                mo_ta: 'Bánh xèo miền Tây giòn rụm'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800',
                loai_anh: 'mon_an',
                mo_ta: 'Gỏi cuốn tôm thịt tươi ngon'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1562059390-a761a084768e?w=800',
                loai_anh: 'mon_an',
                mo_ta: 'Cơm tấm sườn bì chả trứng'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800',
                loai_anh: 'mon_an',
                mo_ta: 'Bánh mì Sài Gòn đặc biệt'
            },

            // Không gian nhà hàng
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
                loai_anh: 'khong_gian',
                mo_ta: 'Không gian nhà hàng sang trọng'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
                loai_anh: 'khong_gian',
                mo_ta: 'Phòng VIP cho sự kiện đặc biệt'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
                loai_anh: 'khong_gian',
                mo_ta: 'Khu vực sân vườn thoáng mát'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=800',
                loai_anh: 'khong_gian',
                mo_ta: 'Quầy bar hiện đại'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800',
                loai_anh: 'khong_gian',
                mo_ta: 'Bàn ăn gia đình ấm cúng'
            },

            // Sự kiện
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
                loai_anh: 'su_kien',
                mo_ta: 'Tiệc cưới lãng mạn'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800',
                loai_anh: 'su_kien',
                mo_ta: 'Tiệc sinh nhật vui vẻ'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
                loai_anh: 'su_kien',
                mo_ta: 'Sự kiện công ty chuyên nghiệp'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800',
                loai_anh: 'su_kien',
                mo_ta: 'Tiệc tất niên cuối năm'
            },

            // Khách hàng
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
                loai_anh: 'khach_hang',
                mo_ta: 'Gia đình sum vầy hạnh phúc'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
                loai_anh: 'khach_hang',
                mo_ta: 'Khách hàng hài lòng với dịch vụ'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1529119368496-2dfda6ec2804?w=800',
                loai_anh: 'khach_hang',
                mo_ta: 'Bạn bè quây quần vui vẻ'
            },
            {
                duong_dan_anh: 'https://images.unsplash.com/photo-1543007631-283050bb3e8c?w=800',
                loai_anh: 'khach_hang',
                mo_ta: 'Khoảnh khắc đáng nhớ của khách hàng'
            }
        ];

        // Insert dữ liệu
        for (const album of albums) {
            await db.query(
                'INSERT INTO album_anh (duong_dan_anh, loai_anh, mo_ta) VALUES (?, ?, ?)',
                [album.duong_dan_anh, album.loai_anh, album.mo_ta]
            );
        }

        console.log(`✅ Đã tạo ${albums.length} album ảnh mẫu thành công!`);
        
        // Thống kê
        const [stats] = await db.query(`
            SELECT loai_anh, COUNT(*) as so_luong 
            FROM album_anh 
            GROUP BY loai_anh
        `);
        
        console.log('\n📊 Thống kê album:');
        stats.forEach(stat => {
            const categoryNames = {
                'mon_an': 'Món ăn',
                'khong_gian': 'Không gian',
                'su_kien': 'Sự kiện',
                'khach_hang': 'Khách hàng',
                'khong_ro': 'Khác'
            };
            console.log(`   ${categoryNames[stat.loai_anh] || stat.loai_anh}: ${stat.so_luong} ảnh`);
        });

        console.log('\n📸 Bạn có thể xem album tại: http://localhost:3000/album.html');

    } catch (error) {
        console.error('❌ Lỗi tạo dữ liệu album:', error);
    } finally {
        process.exit();
    }
}

createSampleAlbums();
