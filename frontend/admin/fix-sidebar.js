const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const adminDir = path.join('d:', 'KhoaLuanTotNghiep2026', 'frontend', 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html') && !f.includes('dang-nhap'));

const templateFile = path.join(adminDir, 'orders.html');
const templateContent = fs.readFileSync(templateFile, 'utf8');

const sidebarRegex = /<aside id="sidebar"[^>]*>[\s\S]*?<\/aside>/;
const match = templateContent.match(sidebarRegex);

if (!match) {
    console.error('Sidebar not found in orders.html');
    process.exit(1);
}

let sidebarContent = match[0];
sidebarContent = sidebarContent.replace(/\s*class="sidebar-item active"/g, ' class="sidebar-item"');
sidebarContent = sidebarContent.replace('</aside>', `
<script>
    document.addEventListener('DOMContentLoaded', () => {
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        document.querySelectorAll('.sidebar-item').forEach(item => {
            if (item.getAttribute('href') === currentPage) {
                item.classList.add('active');
            }
        });
    });
</script>
</aside>
`);

for (const file of files) {
    if (file === 'orders.html' || file === 'admin-pos-new.html') continue;
    
    // Use git checkout to restore
    const filePath = path.join(adminDir, file);
    try {
        execSync('git checkout -- "' + filePath + '"', {stdio: 'ignore'});
    } catch(e) {}
    
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(sidebarRegex, sidebarContent);
    fs.writeFileSync(filePath, newContent, 'utf8');
}
console.log('Restored all files using Node utf8!');
