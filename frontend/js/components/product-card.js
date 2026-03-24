// Product Card Component
ComponentManager.register('productCard', (product) => {
    const { id, name, price, oldPrice, image, rating = 5, reviews = 0, discount } = product;
    
    const generateStars = (rating) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    };
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };
    
    return `
        <div class="card-hover bg-white rounded-xl overflow-hidden shadow-sm">
            <div class="relative">
                <img src="${image}" alt="${name}" class="w-full h-48 object-cover">
                ${discount ? `<span class="absolute top-3 left-3 badge-discount text-white px-3 py-1 rounded-full text-sm font-medium">-${discount}%</span>` : ''}
                <button class="absolute top-3 right-3 bg-white w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:text-red-500 transition" onclick="toggleWishlist(${id})">
                    <i class="far fa-heart"></i>
                </button>
            </div>
            <div class="p-4">
                <h3 class="font-medium text-lg mb-2 text-gray-800 line-clamp-1">${name}</h3>
                <div class="flex items-center mb-2">
                    <div class="text-yellow-400 text-sm">
                        ${generateStars(rating)}
                    </div>
                    <span class="text-gray-500 text-sm ml-2">(${reviews})</span>
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-orange-600 font-bold text-xl">${formatPrice(price)}</span>
                        ${oldPrice ? `<span class="text-gray-400 line-through text-sm ml-2">${formatPrice(oldPrice)}</span>` : ''}
                    </div>
                    <button onclick="addToCart(${id})" class="bg-orange-600 text-white w-10 h-10 rounded-full hover:bg-orange-700 transition">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
});

// Render multiple product cards
ComponentManager.register('productGrid', (products) => {
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            ${products.map(product => ComponentManager.render('productCard', product)).join('')}
        </div>
    `;
});
