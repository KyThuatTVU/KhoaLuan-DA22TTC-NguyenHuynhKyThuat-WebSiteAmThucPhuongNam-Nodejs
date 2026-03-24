/**
 * Tet Intro Animation - Lunar New Year
 * Shows a beautiful Tet intro animation when enabled from admin settings
 * Controlled via admin settings - only shows when hieu_ung_intro_tet = '1'
 */

(function() {
    'use strict';
    
    // Variables
    let introShown = false;
    let isEnabled = false;
    
    // Cố định thông tin Tết Bính Ngọ 2026
    function getLunarYearInfo() {
        return {
            year: 2026,
            animal: '🐴',
            chi: 'Ngọ',
            can: 'Bính',
            fullName: 'Bính Ngọ'
        };
    }

    // Create intro overlay
    function createIntroOverlay() {
        const yearInfo = getLunarYearInfo();
        
        const overlay = document.createElement('div');
        overlay.className = 'tet-intro-overlay';
        overlay.id = 'tet-intro';
        
        // Create lanterns
        const lanternsContainer = document.createElement('div');
        lanternsContainer.className = 'tet-lanterns';
        for (let i = 0; i < 5; i++) {
            const lantern = document.createElement('div');
            lantern.className = 'tet-lantern';
            lantern.textContent = '🏮';
            lanternsContainer.appendChild(lantern);
        }
        overlay.appendChild(lanternsContainer);
        
        // Create fireworks
        const fireworksContainer = document.createElement('div');
        fireworksContainer.className = 'tet-fireworks';
        const fireworkEmojis = ['🎆', '🎇', '✨', '💫', '⭐'];
        for (let i = 0; i < 15; i++) {
            const firework = document.createElement('div');
            firework.className = 'tet-firework';
            firework.textContent = fireworkEmojis[Math.floor(Math.random() * fireworkEmojis.length)];
            firework.style.left = Math.random() * 100 + '%';
            firework.style.top = Math.random() * 60 + '%';
            firework.style.animationDelay = Math.random() * 3 + 's';
            firework.style.animationDuration = (Math.random() * 2 + 2) + 's';
            fireworksContainer.appendChild(firework);
        }
        overlay.appendChild(fireworksContainer);
        
        // Create dragon or year animal
        const dragonContainer = document.createElement('div');
        dragonContainer.className = 'tet-dragon-container';
        const dragon = document.createElement('div');
        dragon.className = 'tet-dragon';
        dragon.innerHTML = yearInfo.animal; // Hiển thị con giáp của năm
        dragonContainer.appendChild(dragon);
        overlay.appendChild(dragonContainer);
        
        // Create cherry blossoms
        const blossomsContainer = document.createElement('div');
        blossomsContainer.className = 'tet-blossoms';
        const blossomChars = ['🌸', '💮', '🏵️', '✿', '❀'];
        for (let i = 0; i < 30; i++) {
            const blossom = document.createElement('div');
            blossom.className = 'tet-blossom';
            blossom.textContent = blossomChars[Math.floor(Math.random() * blossomChars.length)];
            blossom.style.left = Math.random() * 100 + '%';
            blossom.style.fontSize = (Math.random() * 15 + 15) + 'px';
            blossom.style.animationDuration = (Math.random() * 5 + 8) + 's';
            blossom.style.animationDelay = Math.random() * 5 + 's';
            blossomsContainer.appendChild(blossom);
        }
        overlay.appendChild(blossomsContainer);
        
        // Create Mai tree
        const maiTree = document.createElement('div');
        maiTree.className = 'tet-mai-tree';
        maiTree.textContent = '🌳';
        overlay.appendChild(maiTree);
        
        // Create food items
        const foodContainer = document.createElement('div');
        foodContainer.className = 'tet-food';
        const foods = ['🍊', '🧧', '🎋'];
        foods.forEach((food) => {
            const item = document.createElement('div');
            item.className = 'tet-food-item';
            item.textContent = food;
            foodContainer.appendChild(item);
        });
        overlay.appendChild(foodContainer);
        
        // Create red envelopes
        const envelopesContainer = document.createElement('div');
        envelopesContainer.className = 'tet-envelopes';
        for (let i = 0; i < 3; i++) {
            const envelope = document.createElement('div');
            envelope.className = 'tet-envelope';
            envelope.textContent = '🧧';
            envelopesContainer.appendChild(envelope);
        }
        overlay.appendChild(envelopesContainer);
        
        // Create decorative corners
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        const cornerEmojis = ['🎊', '🎉', '🎐', '🎏'];
        corners.forEach((pos, index) => {
            const corner = document.createElement('div');
            corner.className = `tet-corner ${pos}`;
            corner.textContent = cornerEmojis[index];
            overlay.appendChild(corner);
        });
        
        // Create welcome text
        const welcomeText = document.createElement('div');
        welcomeText.className = 'tet-welcome-text';
        welcomeText.innerHTML = `
            <div class="tet-title">
                🧧 Chúc Mừng Năm Mới 🧧
            </div>
            <div class="tet-subtitle">
                Nhà hàng Ẩm thực Phương Nam kính chúc Quý khách
            </div>
            <div class="tet-year">
                ${yearInfo.animal} Năm ${yearInfo.fullName} ${yearInfo.year} ${yearInfo.animal}
            </div>
            <div class="tet-subtitle" style="margin-top: 10px;">
                An Khang Thịnh Vượng - Vạn Sự Như Ý! 🎊
            </div>
        `;
        overlay.appendChild(welcomeText);
        
        // Create loading indicator
        const loading = document.createElement('div');
        loading.className = 'tet-loading';
        loading.innerHTML = `
            <div class="tet-loading-dot"></div>
            <div class="tet-loading-dot"></div>
            <div class="tet-loading-dot"></div>
        `;
        overlay.appendChild(loading);
        
        // Create skip button
        const skipButton = document.createElement('button');
        skipButton.className = 'tet-skip-button';
        skipButton.textContent = 'Bỏ qua >';
        skipButton.onclick = function(e) {
            e.stopPropagation();
            skipIntro();
        };
        overlay.appendChild(skipButton);
        
        return overlay;
    }
    
    // Skip intro function
    function skipIntro() {
        const overlay = document.getElementById('tet-intro');
        if (!overlay) return;
        
        overlay.style.animation = 'tetFadeOut 0.5s ease-out forwards';
        document.body.style.overflow = '';
        
        setTimeout(() => {
            overlay.remove();
        }, 500);
    }
    
    // Initialize intro
    function initIntro() {
        // Skip if already shown or not enabled
        if (introShown || !isEnabled) {
            return;
        }
        
        introShown = true;
        
        // Create and add overlay
        const overlay = createIntroOverlay();
        document.body.appendChild(overlay);
        
        // Prevent scrolling during intro
        document.body.style.overflow = 'hidden';
        
        // Remove intro after animation (7 seconds)
        setTimeout(() => {
            skipIntro();
        }, 7000);
    }
    
    // Check settings from API
    async function checkSettingsAndInit() {
        // Mặc định tắt
        isEnabled = false;
        
        try {
            const apiUrl = window.API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${apiUrl}/settings`);
            const result = await response.json();
            
            if (result.success && result.data) {
                // Chỉ bật khi setting = '1'
                const tetIntroSetting = result.data.hieu_ung_intro_tet;
                isEnabled = tetIntroSetting === '1';
                
                console.log('🧧 Tet intro setting:', isEnabled ? 'ON' : 'OFF');
            } else {
                console.log('🧧 No settings found, Tet intro OFF');
            }
        } catch (error) {
            console.log('🧧 Could not load settings, Tet intro OFF');
            isEnabled = false;
        }
        
        // Khởi tạo nếu được bật
        if (isEnabled) {
            initIntro();
        }
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkSettingsAndInit);
    } else {
        checkSettingsAndInit();
    }
    
    // Expose functions for manual control and testing
    window.TetIntro = {
        show: function() {
            introShown = false;
            isEnabled = true;
            initIntro();
        },
        hide: skipIntro,
        isEnabled: function() {
            return isEnabled;
        }
    };
    
    // Reset intro flag when page is about to unload
    window.addEventListener('beforeunload', function() {
        introShown = false;
    });
})();
