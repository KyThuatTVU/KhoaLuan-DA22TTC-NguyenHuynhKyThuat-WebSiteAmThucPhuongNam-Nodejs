// GSAP Animations for News Page
gsap.registerPlugin(ScrollTrigger);

// Animate page header
gsap.from('section.relative', {
    opacity: 0,
    y: -50,
    duration: 1,
    ease: 'power3.out'
});

// Animate featured news
gsap.from('#featured-news', {
    opacity: 0,
    y: 50,
    duration: 0.8,
    delay: 0.3,
    scrollTrigger: {
        trigger: '#featured-news',
        start: 'top 80%'
    }
});

// Animate news cards
gsap.from('#news-list > article', {
    opacity: 0,
    y: 30,
    duration: 0.6,
    stagger: 0.1,
    scrollTrigger: {
        trigger: '#news-list',
        start: 'top 80%'
    }
});

// Animate sidebar items
gsap.from('aside > div', {
    opacity: 0,
    x: 50,
    duration: 0.8,
    stagger: 0.15,
    scrollTrigger: {
        trigger: 'aside',
        start: 'top 80%'
    }
});

// Animate pagination
gsap.from('#pagination', {
    opacity: 0,
    y: 20,
    duration: 0.6,
    scrollTrigger: {
        trigger: '#pagination',
        start: 'top 90%'
    }
});
