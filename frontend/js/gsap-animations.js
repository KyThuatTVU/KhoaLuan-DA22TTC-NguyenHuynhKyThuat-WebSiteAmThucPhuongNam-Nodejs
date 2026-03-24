// GSAP Animations for Index Page (Trang chủ)
// Đăng ký plugin ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// ===== 1. HERO BANNER SLIDER ANIMATION =====
// Animation cho nội dung hero khi trang load
gsap.from(".hero-content-mobile", {
    opacity: 0,
    y: 50,
    duration: 1.2,
    delay: 0.5,
    ease: "power3.out"
});

// Animation cho tiêu đề hero
gsap.from(".hero-title-mobile", {
    opacity: 0,
    y: -30,
    duration: 1,
    delay: 0.8,
    ease: "back.out(1.5)"
});

// Animation cho mô tả hero
gsap.from(".hero-description-mobile", {
    opacity: 0,
    y: 20,
    duration: 1,
    delay: 1.1,
    ease: "power2.out"
});

// ===== 2. ADVERTISEMENT BANNER ANIMATION =====
gsap.from(".ad-video-hq, img[alt='Ảnh banner quảng cáo']", {
    scrollTrigger: {
        trigger: "section.py-6",
        start: "top 85%",
        toggleActions: "play none none reverse"
    },
    scale: 0.9,
    opacity: 0,
    duration: 1,
    ease: "power2.out",
    immediateRender: false
});

// ===== 3. ABOUT SECTION ANIMATION =====
// Animation cho tiêu đề "Về Chúng Tôi"
gsap.from("section.relative.py-10 h2", {
    scrollTrigger: {
        trigger: "section.relative.py-10",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    scale: 0.8,
    opacity: 0,
    duration: 1,
    ease: "elastic.out(1, 0.6)",
    immediateRender: false
});

// Animation cho nội dung About
gsap.from("section.relative.py-10 h3", {
    scrollTrigger: {
        trigger: "section.relative.py-10",
        start: "top 75%",
        toggleActions: "play none none reverse"
    },
    x: -50,
    opacity: 0,
    duration: 0.8,
    delay: 0.2,
    ease: "power2.out",
    immediateRender: false
});

gsap.from("section.relative.py-10 p", {
    scrollTrigger: {
        trigger: "section.relative.py-10",
        start: "top 75%",
        toggleActions: "play none none reverse"
    },
    y: 30,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    delay: 0.4,
    ease: "power2.out",
    immediateRender: false
});

// ===== 4. FEATURED DISHES ANIMATION =====
// Animation cho tiêu đề "Món Ăn Nổi Bật"
gsap.from(".bg-gradient-to-r.from-orange-200", {
    scrollTrigger: {
        trigger: "section.py-8.sm\\:py-12",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    scale: 0.5,
    opacity: 0,
    duration: 0.8,
    ease: "back.out(1.7)",
    immediateRender: false
});

// Animation cho các card món ăn
gsap.from(".card-hover", {
    scrollTrigger: {
        trigger: "section.py-8.sm\\:py-12 .grid",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    y: 60,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: "power2.out",
    immediateRender: false
});

// Hover effect cho dish cards
document.querySelectorAll('.card-hover').forEach(card => {
    card.addEventListener('mouseenter', () => {
        gsap.to(card, {
            y: -10,
            scale: 1.02,
            duration: 0.3,
            ease: "power2.out"
        });
    });

    card.addEventListener('mouseleave', () => {
        gsap.to(card, {
            y: 0,
            scale: 1,
            duration: 0.3,
            ease: "power2.out"
        });
    });
});

// ===== 5. FEATURES SECTION ANIMATION =====
// Animation cho các tính năng (Giao hàng nhanh, Chất lượng...)
gsap.from("section.py-10.bg-orange-50 .text-center.bg-white", {
    scrollTrigger: {
        trigger: "section.py-10.bg-orange-50",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    scale: 0,
    opacity: 0,
    duration: 0.6,
    stagger: 0.1,
    ease: "back.out(1.5)",
    immediateRender: false
});

// Animation cho icons trong features
gsap.from("section.py-10.bg-orange-50 .bg-orange-100", {
    scrollTrigger: {
        trigger: "section.py-10.bg-orange-50",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    rotation: 360,
    scale: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: "back.out(2)",
    immediateRender: false
});

// ===== 6. ẨM THỰC SECTION ANIMATION =====
// Animation cho tiêu đề "ẨM THỰC"
const amThucSection = document.querySelector('section.py-12.sm\\:py-16.md\\:py-20[style*="linear-gradient"]');
if (amThucSection) {
    gsap.from(amThucSection.querySelector('h2'), {
        scrollTrigger: {
            trigger: amThucSection,
            start: "top 80%",
            toggleActions: "play none none reverse"
        },
        scale: 0.7,
        opacity: 0,
        duration: 1,
        ease: "elastic.out(1, 0.5)",
        immediateRender: false
    });

    // Animation cho các food cards
    gsap.from(amThucSection.querySelectorAll('.group'), {
        scrollTrigger: {
            trigger: amThucSection,
            start: "top 75%",
            toggleActions: "play none none reverse"
        },
        y: 80,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        immediateRender: false
    });
}

// ===== 7. KHÔNG GIAN NHÀ HÀNG ANIMATION =====
const khongGianSection = document.querySelectorAll('section.py-12.sm\\:py-16.md\\:py-20[style*="linear-gradient"]')[1];
if (khongGianSection) {
    // Animation cho tiêu đề
    gsap.from(khongGianSection.querySelector('h2'), {
        scrollTrigger: {
            trigger: khongGianSection,
            start: "top 80%",
            toggleActions: "play none none reverse"
        },
        y: -50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        immediateRender: false
    });

    // Animation cho gallery images
    gsap.from(khongGianSection.querySelectorAll('.group'), {
        scrollTrigger: {
            trigger: khongGianSection,
            start: "top 75%",
            toggleActions: "play none none reverse"
        },
        scale: 0.8,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "back.out(1.5)",
        immediateRender: false
    });
}

// ===== 8. TRUYỀN THÔNG SECTION ANIMATION =====
const truyenThongSection = document.querySelector('section.py-12.sm\\:py-16.md\\:py-20.bg-gradient-to-b');
if (truyenThongSection) {
    gsap.from(truyenThongSection.querySelector('h2'), {
        scrollTrigger: {
            trigger: truyenThongSection,
            start: "top 80%",
            toggleActions: "play none none reverse"
        },
        rotationY: 90,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
        immediateRender: false
    });

    // Animation cho video card
    gsap.from(truyenThongSection.querySelector('.max-w-4xl > div'), {
        scrollTrigger: {
            trigger: truyenThongSection,
            start: "top 75%",
            toggleActions: "play none none reverse"
        },
        scale: 0.9,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
        immediateRender: false
    });

    // Animation cho badges
    gsap.from(truyenThongSection.querySelectorAll('.px-4.py-2.bg-white'), {
        scrollTrigger: {
            trigger: truyenThongSection,
            start: "top 70%",
            toggleActions: "play none none reverse"
        },
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "back.out(1.5)",
        immediateRender: false
    });
}

// ===== 9. CẢM NHẬN KHÁCH HÀNG ANIMATION =====
const camNhanSection = document.querySelectorAll('section.py-12.sm\\:py-16.md\\:py-20[style*="linear-gradient"]')[2];
if (camNhanSection) {
    // Animation cho tiêu đề
    gsap.from(camNhanSection.querySelector('h2'), {
        scrollTrigger: {
            trigger: camNhanSection,
            start: "top 80%",
            toggleActions: "play none none reverse"
        },
        scale: 0.5,
        opacity: 0,
        duration: 1,
        ease: "elastic.out(1, 0.6)",
        immediateRender: false
    });

    // Animation cho testimonial cards (sẽ chạy khi swiper load)
    gsap.from(camNhanSection.querySelectorAll('.swiper-slide'), {
        scrollTrigger: {
            trigger: camNhanSection,
            start: "top 75%",
            toggleActions: "play none none reverse"
        },
        scale: 0.8,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "back.out(1.5)",
        immediateRender: false
    });

    // Animation cho stats counter
    ScrollTrigger.create({
        trigger: camNhanSection.querySelector('.grid.grid-cols-3'),
        start: "top 80%",
        once: true,
        onEnter: () => {
            const stats = camNhanSection.querySelectorAll('.grid.grid-cols-3 > div');
            stats.forEach((stat, index) => {
                gsap.from(stat, {
                    scale: 0,
                    opacity: 0,
                    duration: 0.6,
                    delay: index * 0.1,
                    ease: "back.out(2)"
                });

                // Counter animation
                const number = stat.querySelector('div[class*="text-"]');
                if (number) {
                    const text = number.textContent.trim();
                    const match = text.match(/(\d+)/);
                    if (match) {
                        const targetValue = parseInt(match[1]);
                        const suffix = text.replace(match[1], '');
                        
                        const counter = { value: 0 };
                        gsap.to(counter, {
                            value: targetValue,
                            duration: 2,
                            delay: index * 0.1,
                            ease: "power1.out",
                            onUpdate: function() {
                                number.textContent = Math.ceil(counter.value) + suffix;
                            },
                            onComplete: function() {
                                number.textContent = targetValue + suffix;
                            }
                        });
                    }
                }
            });
        }
    });
}

// ===== 10. PARALLAX EFFECTS =====
// Parallax cho background decorative elements
gsap.utils.toArray('.absolute.top-0, .absolute.bottom-0').forEach(element => {
    if (element.classList.contains('bg-orange-200') || element.classList.contains('bg-red-200')) {
        gsap.to(element, {
            yPercent: 30,
            ease: "none",
            scrollTrigger: {
                trigger: element.parentElement,
                start: "top bottom",
                end: "bottom top",
                scrub: 1
            }
        });
    }
});

// ===== 11. SMOOTH SCROLL ANIMATIONS =====
// Tạo hiệu ứng mượt mà khi scroll
gsap.to("body", {
    scrollTrigger: {
        start: 0,
        end: "max",
        onUpdate: (self) => {
            // Có thể thêm các hiệu ứng scroll tùy chỉnh ở đây
        }
    }
});

// ===== 12. BUTTON ANIMATIONS =====
// Animation cho các nút "Đặt Bàn Ngay", "Xem Thực Đơn"
document.querySelectorAll('a[href*="dat-ban"], a[href*="thuc-don"]').forEach(button => {
    button.addEventListener('mouseenter', () => {
        gsap.to(button, {
            scale: 1.05,
            duration: 0.3,
            ease: "power2.out"
        });
    });

    button.addEventListener('mouseleave', () => {
        gsap.to(button, {
            scale: 1,
            duration: 0.3,
            ease: "power2.out"
        });
    });
});

// ===== 13. IMAGE HOVER EFFECTS =====
// Hiệu ứng hover cho images trong gallery
document.querySelectorAll('img[alt*="Không gian"], img[alt*="món"]').forEach(img => {
    const parent = img.closest('.group');
    if (parent) {
        parent.addEventListener('mouseenter', () => {
            gsap.to(img, {
                scale: 1.1,
                duration: 0.5,
                ease: "power2.out"
            });
        });

        parent.addEventListener('mouseleave', () => {
            gsap.to(img, {
                scale: 1,
                duration: 0.5,
                ease: "power2.out"
            });
        });
    }
});

// ===== 14. LOADING ANIMATION =====
// Animation khi trang load xong
window.addEventListener('load', () => {
    gsap.from('body', {
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
    });
});

// Log để xác nhận GSAP đã load
console.log('✅ GSAP animations loaded successfully for Index page');
console.log('📊 Total ScrollTriggers created:', ScrollTrigger.getAll().length);
