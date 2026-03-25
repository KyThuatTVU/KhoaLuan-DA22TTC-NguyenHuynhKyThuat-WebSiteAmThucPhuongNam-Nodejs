const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, '../frontend/admin');

// The links to insert
const newLinks = `                        <a href="nguyen-lieu.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl menu-inventory">
                            <i class="fas fa-boxes w-5"></i><span class="text-sm">Nguyên liệu</span>
                        </a>
                        <a href="cong-thuc.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl menu-recipe">
                            <i class="fas fa-clipboard-list w-5"></i><span class="text-sm">Công thức</span>
                        </a>`;

const newLinksSimpler = `                        <a href="nguyen-lieu.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-boxes w-5"></i><span class="text-sm">Nguyên liệu</span></a>
                        <a href="cong-thuc.html" class="sidebar-item flex items-center space-x-3 px-4 py-3 rounded-xl"><i class="fas fa-clipboard-list w-5"></i><span class="text-sm">Công thức</span></a>`;

async function updateAllFiles() {
    const files = fs.readdirSync(adminDir);
    
    for (const file of files) {
        if (!file.endsWith('.html')) continue;
        if (file === 'nguyen-lieu.html' || file === 'cong-thuc.html') {
             // Already has them, or I should just let them be manually fixed if they don't have menu-inventory.
             continue; 
        }

        const filePath = path.join(adminDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Check if already injected
        if (content.includes('href="nguyen-lieu.html"')) {
            console.log(`Skipping ${file} - Already has inventory link`);
            continue;
        }

        // We try to find the products.html link.
        // There are variations in how it is written (one line vs multi-line, active or not)
        
        let modified = false;

        // Pattern 1: Multi-line products link (e.g. dashboard.html, admin-pos-tables.html)
        const pattern1 = /<a href="products\.html"[\s\S]*?<\/a>/;
        
        if (pattern1.test(content)) {
            content = content.replace(pattern1, match => {
                // If the match doesn't have menu-products, use the simpler link version
                if (match.includes('menu-products')) {
                    return match + '\n' + newLinks;
                } else {
                    return match + '\n' + newLinksSimpler;
                }
            });
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${file}`);
        } else {
            console.log(`Could not find where to insert in ${file}`);
        }
    }
}

updateAllFiles().then(() => console.log('Done'));
