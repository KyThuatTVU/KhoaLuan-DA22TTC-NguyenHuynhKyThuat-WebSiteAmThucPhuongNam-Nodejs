// Footer Component
ComponentManager.register('footer', (data = {}) => {
    const { year = new Date().getFullYear() } = data;
    
    return `
        <footer class="bg-gray-900 text-white py-12">
            <div class="container mx-auto px-4">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <h3 class="font-playfair text-2xl font-bold mb-4">Phương Nam</h3>
                        <p class="text-gray-400 mb-4">Ẩm thực Vĩnh Long chính gốc, mang đến hương vị đậm đà miền Tây sông nước.</p>
                        <div class="flex space-x-4">
                            <a href="#" class="text-gray-400 hover:text-white transition">
                                <i class="fab fa-facebook text-2xl"></i>
                            </a>
                            <a href="#" class="text-gray-400 hover:text-white transition">
                                <i class="fab fa-instagram text-2xl"></i>
                            </a>
                            <a href="#" class="text-gray-400 hover:text-white transition">
                                <i class="fab fa-youtube text-2xl"></i>
                            </a>
                            <a href="#" class="text-gray-400 hover:text-white transition">
                                <i class="fab fa-tiktok text-2xl"></i>
                            </a>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-medium text-lg mb-4">Liên kết</h4>
                        <ul class="space-y-2">
                            <li><a href="gioi-thieu.html" class="text-gray-400 hover:text-white transition">Giới thiệu</a></li>
                            <li><a href="thuc-don.html" class="text-gray-400 hover:text-white transition">Thực đơn</a></li>
                            <li><a href="tin-tuc.html" class="text-gray-400 hover:text-white transition">Tin tức</a></li>
                            <li><a href="lien-he.html" class="text-gray-400 hover:text-white transition">Liên hệ</a></li>
                            <li><a href="dat-ban.html" class="text-gray-400 hover:text-white transition">Đặt bàn</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-medium text-lg mb-4">Hỗ trợ</h4>
                        <ul class="space-y-2">
                            <li><a href="#" class="text-gray-400 hover:text-white transition">Chính sách đổi trả</a></li>
                            <li><a href="#" class="text-gray-400 hover:text-white transition">Bảo mật thông tin</a></li>
                            <li><a href="#" class="text-gray-400 hover:text-white transition">Điều khoản dịch vụ</a></li>
                            <li><a href="#" class="text-gray-400 hover:text-white transition">Hướng dẫn đặt hàng</a></li>
                            <li><a href="#" class="text-gray-400 hover:text-white transition">Câu hỏi thường gặp</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-medium text-lg mb-4">Liên hệ</h4>
                        <ul class="space-y-2 text-gray-400">
                            <li><i class="fas fa-map-marker-alt mr-2"></i> 123 Đường ABC, TP. Vĩnh Long</li>
                            <li><i class="fas fa-phone mr-2"></i> 0123 456 789</li>
                            <li><i class="fas fa-envelope mr-2"></i> info@phuongnam.vn</li>
                            <li><i class="fas fa-clock mr-2"></i> 10:00 - 22:00 hàng ngày</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-800 pt-8 text-center text-gray-400">
                    <p>&copy; ${year} Nhà hàng Phương Nam Vĩnh Long. All rights reserved.</p>
                    <p class="mt-2 text-sm">Thiết kế bởi DoAnChuyenNganh2025</p>
                </div>
            </div>
        </footer>
    `;
});
