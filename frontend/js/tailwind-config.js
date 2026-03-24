// ===============================================
// TAILWIND CSS CONFIGURATION
// Phương Nam Restaurant - Responsive Design
// ===============================================

tailwind.config = {
    theme: {
        screens: {
            // Mobile phones
            'xs': '475px',
            // => @media (min-width: 475px) { ... }

            // Small devices (landscape phones, 640px and up)
            'sm': '640px',
            // => @media (min-width: 640px) { ... }

            // Medium devices (tablets, 768px and up)
            'md': '768px',
            // => @media (min-width: 768px) { ... }

            // Large devices (tablets landscape / laptops, 1024px and up)
            'lg': '1024px',
            // => @media (min-width: 1024px) { ... }

            // Extra large devices (desktops, 1280px and up)
            'xl': '1280px',
            // => @media (min-width: 1280px) { ... }

            // 2X large devices (large desktops, 1536px and up)
            '2xl': '1536px',
            // => @media (min-width: 1536px) { ... }

            // Custom breakpoints for specific devices
            'tablet': '768px',
            'laptop': '1024px',
            'desktop': '1280px',
        },
        extend: {
            // Custom colors
            colors: {
                'orange': {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                },
                'brand': {
                    primary: '#ea580c',
                    secondary: '#ff6b6b',
                    accent: '#feca57',
                },
            },
            // Custom spacing for different devices
            spacing: {
                'mobile': '1rem',
                'tablet': '1.5rem',
                'laptop': '2rem',
                'desktop': '2.5rem',
            },
            // Custom container
            container: {
                center: true,
                padding: {
                    DEFAULT: '1rem',
                    sm: '1.5rem',
                    md: '2rem',
                    lg: '2.5rem',
                    xl: '3rem',
                    '2xl': '4rem',
                },
                screens: {
                    sm: '640px',
                    md: '768px',
                    lg: '1024px',
                    xl: '1280px',
                    '2xl': '1536px',
                },
            },
            // Custom font sizes
            fontSize: {
                'mobile-xs': '0.75rem',
                'mobile-sm': '0.875rem',
                'mobile-base': '1rem',
                'mobile-lg': '1.125rem',
                'mobile-xl': '1.25rem',
                'tablet-xs': '0.875rem',
                'tablet-sm': '1rem',
                'tablet-base': '1.125rem',
                'tablet-lg': '1.25rem',
                'tablet-xl': '1.5rem',
                'laptop-xs': '1rem',
                'laptop-sm': '1.125rem',
                'laptop-base': '1.25rem',
                'laptop-lg': '1.5rem',
                'laptop-xl': '1.875rem',
            },
            // Custom border radius
            borderRadius: {
                'mobile': '0.5rem',
                'tablet': '0.75rem',
                'laptop': '1rem',
            },
            // Custom box shadows
            boxShadow: {
                'mobile': '0 2px 4px rgba(0, 0, 0, 0.1)',
                'tablet': '0 4px 6px rgba(0, 0, 0, 0.1)',
                'laptop': '0 8px 16px rgba(0, 0, 0, 0.1)',
                'desktop': '0 12px 24px rgba(0, 0, 0, 0.1)',
            },
            // Custom transitions
            transitionDuration: {
                'mobile': '200ms',
                'tablet': '250ms',
                'laptop': '300ms',
            },
            // Custom z-index
            zIndex: {
                'navbar': '50',
                'dropdown': '60',
                'modal': '70',
                'tooltip': '80',
            },
        },
    },
    plugins: [],
}

// ===============================================
// RESPONSIVE DESIGN GUIDELINES
// ===============================================

/*
DEVICE CATEGORIES:
==================

1. MOBILE PHONES (xs - sm)
   - Screen: < 640px
   - Orientation: Portrait primarily
   - Touch: Yes
   - Recommended:
     * Single column layouts
     * Larger touch targets (min 44x44px)
     * Simplified navigation
     * Stack elements vertically
     * Reduce padding/margins
     * Larger font sizes for readability

2. TABLETS (sm - lg)
   - Screen: 640px - 1024px
   - Orientation: Both portrait and landscape
   - Touch: Yes
   - Recommended:
     * 2 column layouts
     * Medium touch targets
     * Expandable menus
     * Balance between mobile and desktop UI
     * Moderate padding/margins

3. LAPTOPS / SMALL DESKTOPS (lg - xl)
   - Screen: 1024px - 1280px
   - Touch: Usually no
   - Recommended:
     * 3-4 column layouts
     * Full navigation visible
     * Hover states active
     * Sidebar layouts
     * Standard desktop patterns

4. LARGE DESKTOPS (xl - 2xl+)
   - Screen: 1280px+
   - Touch: No
   - Recommended:
     * 4+ column layouts
     * Maximum content width (prevent too wide lines)
     * Rich hover interactions
     * Advanced UI components
     * Generous spacing

USAGE EXAMPLES:
===============

<!-- Responsive Grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <!-- Content -->
</div>

<!-- Responsive Text -->
<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
    Title
</h1>

<!-- Responsive Padding -->
<div class="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
    <!-- Content -->
</div>

<!-- Responsive Display -->
<div class="block lg:hidden">Mobile Menu</div>
<div class="hidden lg:block">Desktop Menu</div>

<!-- Responsive Flex Direction -->
<div class="flex flex-col md:flex-row">
    <!-- Content -->
</div>

*/
