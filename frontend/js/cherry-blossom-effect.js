// Cherry Blossom Effect JavaScript - Hiệu ứng hoa mai/hoa đào rơi
// Có thể bật/tắt từ Admin Settings
(function() {
    'use strict';

    // Configuration
    const config = {
        petalCount: 80,
        petalChars: ['🌸', '🏵️', '💮', '✿', '❀', '❁'],
        minSize: 0.8,
        maxSize: 1.8,
        minDuration: 10,
        maxDuration: 20,
        minDelay: 0,
        maxDelay: 8
    };

    // Biến lưu trạng thái
    let isBlossomEnabled = false;
    let isInitialized = false;

    // Inject CSS styles for cherry blossom effect
    function injectStyles() {
        if (document.getElementById('cherry-blossom-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'cherry-blossom-styles';
        style.textContent = `
            /* Cherry Blossom container */
            .cherry-blossom-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9998;
                overflow: hidden;
            }

            /* Individual petal */
            .cherry-petal {
                position: absolute;
                top: -30px;
                font-size: 1em;
                animation: petalFall linear infinite;
                opacity: 0.9;
                user-select: none;
                filter: drop-shadow(0 2px 4px rgba(255,182,193,0.5));
            }

            @keyframes petalFall {
                0% {
                    transform: translateY(-30px) translateX(0) rotate(0deg) scale(1);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                25% {
                    transform: translateY(25vh) translateX(40px) rotate(90deg) scale(0.95);
                }
                50% {
                    transform: translateY(50vh) translateX(-30px) rotate(180deg) scale(1.05);
                }
                75% {
                    transform: translateY(75vh) translateX(50px) rotate(270deg) scale(0.9);
                }
                90% {
                    opacity: 0.7;
                }
                100% {
                    transform: translateY(100vh) translateX(20px) rotate(360deg) scale(1);
                    opacity: 0;
                }
            }

            /* Petal variations for more natural movement */
            .cherry-petal:nth-child(odd) {
                animation-timing-function: ease-in-out;
            }

            .cherry-petal:nth-child(even) {
                animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
            }

            .cherry-petal:nth-child(3n) {
                animation-name: petalFallSway;
            }

            .cherry-petal:nth-child(5n) {
                animation-name: petalFallSpin;
            }

            @keyframes petalFallSway {
                0% {
                    transform: translateY(-30px) translateX(0) rotate(0deg);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                20% {
                    transform: translateY(20vh) translateX(-50px) rotate(72deg);
                }
                40% {
                    transform: translateY(40vh) translateX(60px) rotate(144deg);
                }
                60% {
                    transform: translateY(60vh) translateX(-40px) rotate(216deg);
                }
                80% {
                    transform: translateY(80vh) translateX(30px) rotate(288deg);
                }
                90% {
                    opacity: 0.6;
                }
                100% {
                    transform: translateY(100vh) translateX(-20px) rotate(360deg);
                    opacity: 0;
                }
            }

            @keyframes petalFallSpin {
                0% {
                    transform: translateY(-30px) translateX(0) rotate(0deg) rotateY(0deg);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                50% {
                    transform: translateY(50vh) translateX(30px) rotate(180deg) rotateY(180deg);
                }
                90% {
                    opacity: 0.5;
                }
                100% {
                    transform: translateY(100vh) translateX(-10px) rotate(360deg) rotateY(360deg);
                    opacity: 0;
                }
            }

            /* Corner decorations */
            .blossom-decoration {
                position: fixed;
                z-index: 9997;
                pointer-events: none;
                opacity: 0.7;
                animation: floatBlossom 5s ease-in-out infinite;
            }

            .blossom-decoration.top-left {
                top: 70px;
                left: 15px;
                font-size: 45px;
                animation-delay: 0s;
            }

            .blossom-decoration.top-right {
                top: 90px;
                right: 25px;
                font-size: 38px;
                animation-delay: 1.5s;
            }

            .blossom-decoration.mid-left {
                top: 40%;
                left: 10px;
                font-size: 32px;
                animation-delay: 0.8s;
            }

            .blossom-decoration.mid-right {
                top: 50%;
                right: 15px;
                font-size: 35px;
                animation-delay: 2s;
            }

            @keyframes floatBlossom {
                0%, 100% {
                    transform: translateY(0) rotate(0deg) scale(1);
                }
                25% {
                    transform: translateY(-10px) rotate(5deg) scale(1.05);
                }
                50% {
                    transform: translateY(-5px) rotate(-3deg) scale(1.02);
                }
                75% {
                    transform: translateY(-12px) rotate(3deg) scale(1.08);
                }
            }

            /* Hide decorations on mobile for better UX */
            @media (max-width: 768px) {
                .blossom-decoration {
                    display: none;
                }
                .cherry-blossom-container .cherry-petal {
                    font-size: 0.7em;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Create blossom container
    function createBlossomContainer() {
        let container = document.querySelector('.cherry-blossom-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'cherry-blossom-container';
            document.body.appendChild(container);
        }
        return container;
    }

    // Create a single petal
    function createPetal(container) {
        if (!isBlossomEnabled) return;
        
        const petal = document.createElement('div');
        petal.className = 'cherry-petal';
        
        // Random petal character
        const char = config.petalChars[Math.floor(Math.random() * config.petalChars.length)];
        petal.textContent = char;
        
        // Random properties
        const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
        const left = Math.random() * 100;
        const duration = config.minDuration + Math.random() * (config.maxDuration - config.minDuration);
        const delay = Math.random() * config.maxDelay;
        const opacity = 0.6 + Math.random() * 0.4;
        
        // Apply styles
        petal.style.cssText = `
            left: ${left}%;
            font-size: ${size}em;
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            opacity: ${opacity};
        `;
        
        container.appendChild(petal);
        
        // Remove and recreate petal after animation
        const totalTime = (duration + delay) * 1000;
        setTimeout(() => {
            if (petal.parentNode && isBlossomEnabled) {
                petal.remove();
                createPetal(container);
            }
        }, totalTime);
    }

    // Initialize cherry blossom effect
    function initBlossom() {
        if (!isBlossomEnabled) return;
        
        injectStyles();
        const container = createBlossomContainer();
        
        // Clear existing petals
        container.innerHTML = '';
        
        // Create initial petals with staggered timing
        for (let i = 0; i < config.petalCount; i++) {
            setTimeout(() => {
                if (isBlossomEnabled) {
                    createPetal(container);
                }
            }, i * 80);
        }
    }

    // Add decorative elements (corner blossoms)
    function addDecorations() {
        if (!isBlossomEnabled) return;
        
        // Check if decorations already exist
        if (document.querySelector('.blossom-decoration')) return;
        
        // Blossom decorations on corners
        const positions = ['top-left', 'top-right', 'mid-left', 'mid-right'];
        const chars = ['🌸', '💮', '🏵️', '✿'];
        positions.forEach((pos, index) => {
            const decoration = document.createElement('div');
            decoration.className = `blossom-decoration ${pos}`;
            decoration.textContent = chars[index];
            document.body.appendChild(decoration);
        });
    }

    // Stop cherry blossom effect
    function stopBlossom() {
        isBlossomEnabled = false;
        const container = document.querySelector('.cherry-blossom-container');
        if (container) container.remove();
        
        document.querySelectorAll('.blossom-decoration').forEach(el => el.remove());
    }

    // Start cherry blossom effect
    function startBlossom() {
        isBlossomEnabled = true;
        initBlossom();
        addDecorations();
    }

    // Check settings from API and initialize
    async function checkSettingsAndInit() {
        try {
            // Lấy API URL từ window hoặc mặc định
            const apiUrl = window.API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${apiUrl}/settings`);
            const result = await response.json();
            
            if (result.success && result.data) {
                // Kiểm tra setting hiệu ứng hoa mai
                const blossomSetting = result.data.hieu_ung_hoa_mai;
                isBlossomEnabled = blossomSetting === '1'; // Mặc định tắt
                
                console.log('🌸 Cherry blossom effect setting:', isBlossomEnabled ? 'ON' : 'OFF');
            }
        } catch (error) {
            console.log('🌸 Could not load settings, using default (OFF)');
            isBlossomEnabled = false;
        }
        
        // Khởi tạo nếu được bật
        if (isBlossomEnabled && !isInitialized) {
            isInitialized = true;
            startBlossom();
        }
    }

    // Start when DOM is ready
    function init() {
        checkSettingsAndInit();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose to global for manual control
    window.CherryBlossomEffect = {
        start: startBlossom,
        stop: stopBlossom,
        toggle: function() {
            if (isBlossomEnabled) {
                stopBlossom();
            } else {
                startBlossom();
            }
            return isBlossomEnabled;
        },
        isEnabled: function() {
            return isBlossomEnabled;
        },
        config: config
    };
})();
