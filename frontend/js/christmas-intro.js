/**
 * Christmas Intro Animation - Santa Sleigh
 * Shows a beautiful intro animation when enabled from admin settings
 * Controlled via admin settings - only shows when hieu_ung_intro_giang_sinh = '1'
 */

(function() {
    'use strict';
    
    // Variables
    let trailInterval = null;
    let introShown = false;
    let isEnabled = false;

    // Create intro overlay
    function createIntroOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'christmas-intro-overlay';
        overlay.id = 'christmas-intro';
        
        // Create stars
        const starsContainer = document.createElement('div');
        starsContainer.className = 'intro-stars';
        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.className = 'intro-star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.width = (Math.random() * 3 + 1) + 'px';
            star.style.height = star.style.width;
            star.style.animationDelay = Math.random() * 2 + 's';
            starsContainer.appendChild(star);
        }
        overlay.appendChild(starsContainer);
        
        // Create moon
        const moon = document.createElement('div');
        moon.className = 'intro-moon';
        overlay.appendChild(moon);
        
        // Create Christmas trees on ground
        const treesContainer = document.createElement('div');
        treesContainer.className = 'intro-trees';
        for (let i = 0; i < 5; i++) {
            const tree = document.createElement('div');
            tree.className = 'intro-tree';
            tree.textContent = '🎄';
            treesContainer.appendChild(tree);
        }
        overlay.appendChild(treesContainer);
        
        // Create snowman
        const snowman = document.createElement('div');
        snowman.className = 'intro-snowman';
        snowman.innerHTML = '⛄';
        overlay.appendChild(snowman);
        
        // Create gifts
        const giftsContainer = document.createElement('div');
        giftsContainer.className = 'intro-gifts';
        giftsContainer.innerHTML = `
            <div class="intro-gift">🎁</div>
            <div class="intro-gift">🎁</div>
            <div class="intro-gift">🎁</div>
        `;
        overlay.appendChild(giftsContainer);
        
        // Create bells
        const bells = document.createElement('div');
        bells.className = 'intro-bells';
        bells.textContent = '🔔';
        overlay.appendChild(bells);
        
        // Create candy cane
        const candy = document.createElement('div');
        candy.className = 'intro-candy';
        candy.textContent = '🍭';
        overlay.appendChild(candy);
        
        // Create Santa sleigh
        const santaContainer = document.createElement('div');
        santaContainer.className = 'santa-sleigh-container';
        
        const santaSleigh = document.createElement('div');
        santaSleigh.className = 'santa-sleigh';
        santaSleigh.innerHTML = `
            <span class="reindeer">🦌</span>
            <span class="reindeer">🦌</span>
            <span>🛷</span>
            <span>🎅</span>
        `;
        santaContainer.appendChild(santaSleigh);
        overlay.appendChild(santaContainer);
        
        // Create trail effect
        const trailContainer = document.createElement('div');
        trailContainer.className = 'santa-trail';
        trailContainer.id = 'santa-trail';
        overlay.appendChild(trailContainer);
        
        // Create snow
        const snowContainer = document.createElement('div');
        snowContainer.className = 'intro-snow';
        for (let i = 0; i < 40; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'intro-snowflake';
            snowflake.textContent = ['❄', '❅', '❆'][Math.floor(Math.random() * 3)];
            snowflake.style.left = Math.random() * 100 + '%';
            snowflake.style.fontSize = (Math.random() * 10 + 12) + 'px';
            snowflake.style.animationDuration = (Math.random() * 5 + 10) + 's';
            snowflake.style.animationDelay = Math.random() * 5 + 's';
            snowContainer.appendChild(snowflake);
        }
        overlay.appendChild(snowContainer);
        
        // Create welcome text
        const welcomeText = document.createElement('div');
        welcomeText.className = 'intro-welcome-text';
        welcomeText.innerHTML = `
            <div class="intro-title">
                🎄 Chào Mừng Đến Phương Nam 🎄
            </div>
            <div class="intro-subtitle">
                Chúc Bạn Một Mùa Giáng Sinh An Lành & Hạnh Phúc! 🎅✨
            </div>
        `;
        overlay.appendChild(welcomeText);
        
        // Create loading indicator
        const loading = document.createElement('div');
        loading.className = 'intro-loading';
        loading.innerHTML = `
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        `;
        overlay.appendChild(loading);
        
        // Create skip button
        const skipButton = document.createElement('button');
        skipButton.className = 'intro-skip-button';
        skipButton.textContent = 'Bỏ qua >';
        skipButton.onclick = function(e) {
            e.stopPropagation();
            skipIntro();
        };
        overlay.appendChild(skipButton);
        
        return overlay;
    }
    
    // Create trail particles
    function createTrailParticles() {
        const trail = document.getElementById('santa-trail');
        if (!trail) return;
        
        const particles = ['✨', '⭐', '❄', '🎁', '🎄', '⛄'];
        const particle = document.createElement('div');
        particle.className = 'trail-particle';
        particle.textContent = particles[Math.floor(Math.random() * particles.length)];
        
        // Random position along the sleigh path
        const santaContainer = document.querySelector('.santa-sleigh-container');
        if (santaContainer) {
            const rect = santaContainer.getBoundingClientRect();
            particle.style.left = rect.left + 'px';
            particle.style.top = (rect.top + Math.random() * 40) + 'px';
        }
        
        trail.appendChild(particle);
        
        // Remove after animation
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
    
    // Skip intro function
    function skipIntro() {
        const overlay = document.getElementById('christmas-intro');
        if (!overlay) return;
        
        if (trailInterval) {
            clearInterval(trailInterval);
        }
        
        overlay.style.animation = 'fadeOut 0.5s ease-out forwards';
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
        
        // Create trail particles periodically
        trailInterval = setInterval(createTrailParticles, 150);
        
        // Remove intro after animation (8 seconds)
        setTimeout(() => {
            skipIntro();
        }, 8000);
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
                const christmasIntroSetting = result.data.hieu_ung_intro_giang_sinh;
                isEnabled = christmasIntroSetting === '1';
                
                console.log('🎄 Christmas intro setting:', isEnabled ? 'ON' : 'OFF');
            } else {
                console.log('🎄 No settings found, Christmas intro OFF');
            }
        } catch (error) {
            console.log('🎄 Could not load settings, Christmas intro OFF');
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
    window.ChristmasIntro = {
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
    
    // Keep old function for backward compatibility
    window.showChristmasIntro = function() {
        introShown = false;
        isEnabled = true;
        initIntro();
    };

    // Reset intro flag when page is about to unload
    window.addEventListener('beforeunload', function() {
        introShown = false;
    });
})();
