// GSAP Animations for Gioi Thieu Page
gsap.registerPlugin(ScrollTrigger);

// Hero Section Animation - Fade in and scale
gsap.from(".hero-section", {
    opacity: 0,
    scale: 1.1,
    duration: 1.5,
    ease: "power2.out"
});

// Title Animation - Slide up with stagger
gsap.from(".hero-section h1", {
    y: 50,
    opacity: 0,
    duration: 1,
    delay: 0.3,
    ease: "power3.out"
});

gsap.from(".hero-section p", {
    y: 30,
    opacity: 0,
    duration: 1,
    delay: 0.6,
    ease: "power3.out"
});

// Our Story Section - Parallax effect
gsap.to(".story-section .absolute", {
    yPercent: 30,
    ease: "none",
    scrollTrigger: {
        trigger: ".story-section",
        start: "top bottom",
        end: "bottom top",
        scrub: true
    }
});

// Story Content Animation
gsap.from(".story-section h2", {
    scrollTrigger: {
        trigger: ".story-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    x: -100,
    opacity: 0,
    duration: 1,
    ease: "power2.out",
    immediateRender: false
});

gsap.from(".story-section p", {
    scrollTrigger: {
        trigger: ".story-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    x: -50,
    opacity: 0,
    duration: 1,
    stagger: 0.2,
    delay: 0.3,
    ease: "power2.out",
    immediateRender: false
});

// Story Image Animation
gsap.from(".story-section img", {
    scrollTrigger: {
        trigger: ".story-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    x: 100,
    opacity: 0,
    duration: 1,
    ease: "power2.out",
    immediateRender: false
});

// Values Section - Cards Animation
gsap.from(".values-section .bg-white", {
    scrollTrigger: {
        trigger: ".values-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    y: 50,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: "back.out(1.2)",
    immediateRender: false
});

// Values Icons - Continuous Loop Animation
gsap.to(".values-section .fa-heart", {
    scale: 1.2,
    duration: 1.5,
    repeat: -1,
    yoyo: true,
    ease: "power1.inOut"
});

gsap.to(".values-section .fa-users", {
    rotation: 360,
    duration: 3,
    repeat: -1,
    ease: "none"
});

gsap.to(".values-section .fa-leaf", {
    y: -10,
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
});

gsap.to(".values-section .fa-lightbulb", {
    opacity: 0.5,
    duration: 1,
    repeat: -1,
    yoyo: true,
    ease: "power1.inOut"
});

// Values Images Animation
gsap.from(".values-section img", {
    scrollTrigger: {
        trigger: ".values-section img",
        start: "top 85%",
        toggleActions: "play none none reverse"
    },
    scale: 0.8,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: "back.out(1.5)",
    immediateRender: false
});

// Gallery Section Animation
gsap.from(".gallery-section h2", {
    scrollTrigger: {
        trigger: ".gallery-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    scale: 0.5,
    opacity: 0,
    duration: 1,
    ease: "elastic.out(1, 0.5)",
    immediateRender: false
});

// Gallery Items - Stagger Animation
gsap.from(".gallery-item", {
    scrollTrigger: {
        trigger: ".gallery-section",
        start: "top 70%",
        toggleActions: "play none none reverse"
    },
    scale: 0,
    opacity: 0,
    duration: 0.6,
    stagger: {
        amount: 1,
        from: "random"
    },
    ease: "back.out(1.7)",
    immediateRender: false
});

// Video Section Animation
gsap.from(".video-section h2", {
    scrollTrigger: {
        trigger: ".video-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    y: -50,
    opacity: 0,
    duration: 1,
    ease: "power3.out",
    immediateRender: false
});

// Video Cards Animation
gsap.from(".video-section .bg-white", {
    scrollTrigger: {
        trigger: ".video-section",
        start: "top 75%",
        toggleActions: "play none none reverse"
    },
    y: 100,
    opacity: 0,
    duration: 0.8,
    stagger: 0.2,
    ease: "power2.out",
    immediateRender: false
});

// Team Section Animation
gsap.from(".team-section h2", {
    scrollTrigger: {
        trigger: ".team-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    scale: 0.8,
    opacity: 0,
    duration: 1,
    ease: "back.out(1.5)",
    immediateRender: false
});

// Team Members Animation
gsap.from(".team-section .text-center", {
    scrollTrigger: {
        trigger: ".team-section",
        start: "top 75%",
        toggleActions: "play none none reverse"
    },
    y: 50,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: "power2.out",
    immediateRender: false
});

// Team Avatar Loop Animation
gsap.to(".team-section img", {
    y: -10,
    duration: 2,
    repeat: -1,
    yoyo: true,
    stagger: 0.3,
    ease: "sine.inOut"
});

// Stats Section - Counter Animation
gsap.from(".stats-section > div > div", {
    scrollTrigger: {
        trigger: ".stats-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
    },
    scale: 0,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: "back.out(2)",
    immediateRender: false
});

// Stats Numbers - Count Up Animation
document.addEventListener('DOMContentLoaded', function () {
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        ScrollTrigger.create({
            trigger: statsSection,
            start: "top 80%",
            once: true,
            onEnter: () => {
                const numbers = statsSection.querySelectorAll('p.text-3xl, p.text-4xl, p.text-5xl');
                numbers.forEach(num => {
                    const text = num.textContent;
                    const match = text.match(/(\d+)/);
                    if (match) {
                        const suffix = text.replace(match[1], '');
                        gsap.from(num, {
                            textContent: 0,
                            duration: 2,
                            ease: "power1.out",
                            snap: { textContent: 1 },
                            onUpdate: function () {
                                num.textContent = Math.ceil(this.targets()[0].textContent) + suffix;
                            }
                        });
                    }
                });
            }
        });
    }
});

// Parallax effect for background images
gsap.utils.toArray('.absolute[style*="background-image"]').forEach(bg => {
    gsap.to(bg, {
        yPercent: 50,
        ease: "none",
        scrollTrigger: {
            trigger: bg.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: true
        }
    });
});

// Hover animations for interactive elements
document.querySelectorAll('.hover\\:shadow-xl').forEach(element => {
    element.addEventListener('mouseenter', () => {
        gsap.to(element, {
            y: -5,
            duration: 0.3,
            ease: "power2.out"
        });
    });

    element.addEventListener('mouseleave', () => {
        gsap.to(element, {
            y: 0,
            duration: 0.3,
            ease: "power2.out"
        });
    });
});

console.log('GSAP animations loaded for Gioi Thieu page');
