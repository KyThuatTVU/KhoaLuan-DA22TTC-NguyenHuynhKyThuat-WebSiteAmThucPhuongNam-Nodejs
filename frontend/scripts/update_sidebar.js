const fs = require('fs');
const path = require('path');

const adminDir = 'd:/KhoaLuanTotNghiep2026/frontend/admin';
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

const linkToInject = `
                        <a href="tables.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl">
                            <i class="fas fa-chair w-5"></i><span class="text-sm">Quản lý bàn</span>
                        </a>`;

let modifiedCount = 0;

files.forEach(file => {
    const filePath = path.join(adminDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Nếu tệp đã có "tables.html" thì bỏ qua
    if (content.includes('href="tables.html"')) {
        console.log(`Bỏ qua ${file}: Đã có Quản lý bàn.`);
        return;
    }

    // Tìm điểm để chèn: Ngay dưới link "reservations.html" (Đặt bàn)
    /**
     * <a href="reservations.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl">
     *     <i class="fas fa-calendar-check w-5"></i><span class="text-sm">Đặt bàn</span>
     * </a>
     */
    const searchPattern = /<a href="reservations\.html"[^>]*>[\s\S]*?<\/a>/;
    
    if (searchPattern.test(content)) {
        content = content.replace(searchPattern, match => match + linkToInject);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Đã cập nhật: ${file}`);
        modifiedCount++;
    } else {
        console.log(`Không tìm thấy mục Đặt bàn trong ${file}`);
    }
});

console.log(`Hoàn tất - đã cập nhật ${modifiedCount} file.`);
