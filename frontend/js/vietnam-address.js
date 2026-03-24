// Dữ liệu địa chỉ hành chính Việt Nam - Sử dụng API công khai
let vietnamProvinces = [];
let vietnamDistricts = {};
let vietnamWards = {};

// API endpoint - sử dụng provinces.open-api.vn (miễn phí)
const API_BASE = 'https://provinces.open-api.vn/api';

// Cấu hình giới hạn khu vực giao hàng
const DELIVERY_CONFIG = {
    // Chỉ giao hàng trong tỉnh Trà Vinh
    allowedProvinceCode: '84', // Mã tỉnh Trà Vinh
    allowedProvinceName: 'Trà Vinh',
    restrictDelivery: true // Bật/tắt giới hạn khu vực
};

// Load provinces from API
async function loadProvinces() {
    try {
        const response = await fetch(`${API_BASE}/p/`);
        const data = await response.json();
        vietnamProvinces = data.map(p => ({
            code: p.code,
            name: p.name,
            nameWithType: p.name_with_type,
            districts: []
        }));
        console.log('✅ Loaded', vietnamProvinces.length, 'provinces');
        return vietnamProvinces;
    } catch (error) {
        console.error('❌ Error loading provinces:', error);
        // Fallback to static data
        return getFallbackProvinces();
    }
}

// Load districts by province code
async function loadDistricts(provinceCode) {
    try {
        const response = await fetch(`${API_BASE}/p/${provinceCode}?depth=2`);
        const data = await response.json();
        
        if (data.districts) {
            vietnamDistricts[provinceCode] = data.districts.map(d => ({
                code: d.code,
                name: d.name,
                nameWithType: d.name_with_type,
                provinceCode: provinceCode
            }));
            console.log('✅ Loaded', vietnamDistricts[provinceCode].length, 'districts for', data.name);
            return vietnamDistricts[provinceCode];
        }
        return [];
    } catch (error) {
        console.error('❌ Error loading districts:', error);
        return [];
    }
}

// Load wards by district code
async function loadWards(districtCode) {
    try {
        const response = await fetch(`${API_BASE}/d/${districtCode}?depth=2`);
        const data = await response.json();
        
        if (data.wards) {
            vietnamWards[districtCode] = data.wards.map(w => ({
                code: w.code,
                name: w.name,
                nameWithType: w.name_with_type,
                districtCode: districtCode
            }));
            console.log('✅ Loaded', vietnamWards[districtCode].length, 'wards for', data.name);
            return vietnamWards[districtCode];
        }
        return [];
    } catch (error) {
        console.error('❌ Error loading wards:', error);
        return [];
    }
}

// Fallback static data (reduced set) if API fails
function getFallbackProvinces() {
    return [
    {
        code: "01",
        name: "Hà Nội",
        nameWithType: "Thành phố Hà Nội"
    },
    {
        code: "79",
        name: "Hồ Chí Minh",
        nameWithType: "Thành phố Hồ Chí Minh"
    },
    {
        code: "48",
        name: "Đà Nẵng",
        nameWithType: "Thành phố Đà Nẵng"
    },
    {
        code: "92",
        name: "Cần Thơ",
        nameWithType: "Thành phố Cần Thơ"
    },
    {
        code: "31",
        name: "Hải Phòng",
        nameWithType: "Thành phố Hải Phòng"
    },
    {
        code: "86",
        name: "Vĩnh Long",
        nameWithType: "Tỉnh Vĩnh Long"
    },
    { code: "02", name: "Hà Giang", nameWithType: "Tỉnh Hà Giang" },
    { code: "04", name: "Cao Bằng", nameWithType: "Tỉnh Cao Bằng" },
    { code: "06", name: "Bắc Kạn", nameWithType: "Tỉnh Bắc Kạn" },
    { code: "08", name: "Tuyên Quang", nameWithType: "Tỉnh Tuyên Quang" },
    { code: "10", name: "Lào Cai", nameWithType: "Tỉnh Lào Cai" },
    { code: "11", name: "Điện Biên", nameWithType: "Tỉnh Điện Biên" },
    { code: "12", name: "Lai Châu", nameWithType: "Tỉnh Lai Châu" },
    { code: "14", name: "Sơn La", nameWithType: "Tỉnh Sơn La" },
    { code: "15", name: "Yên Bái", nameWithType: "Tỉnh Yên Bái" },
    { code: "17", name: "Hoà Bình", nameWithType: "Tỉnh Hoà Bình" },
    { code: "19", name: "Thái Nguyên", nameWithType: "Tỉnh Thái Nguyên" },
    { code: "20", name: "Lạng Sơn", nameWithType: "Tỉnh Lạng Sơn" },
    { code: "22", name: "Quảng Ninh", nameWithType: "Tỉnh Quảng Ninh" },
    { code: "24", name: "Bắc Giang", nameWithType: "Tỉnh Bắc Giang" },
    { code: "25", name: "Phú Thọ", nameWithType: "Tỉnh Phú Thọ" },
    { code: "26", name: "Vĩnh Phúc", nameWithType: "Tỉnh Vĩnh Phúc" },
    { code: "27", name: "Bắc Ninh", nameWithType: "Tỉnh Bắc Ninh" },
    { code: "30", name: "Hải Dương", nameWithType: "Tỉnh Hải Dương" },
    { code: "33", name: "Hưng Yên", nameWithType: "Tỉnh Hưng Yên" },
    { code: "34", name: "Thái Bình", nameWithType: "Tỉnh Thái Bình" },
    { code: "35", name: "Hà Nam", nameWithType: "Tỉnh Hà Nam" },
    { code: "36", name: "Nam Định", nameWithType: "Tỉnh Nam Định" },
    { code: "37", name: "Ninh Bình", nameWithType: "Tỉnh Ninh Bình" },
    { code: "38", name: "Thanh Hóa", nameWithType: "Tỉnh Thanh Hóa" },
    { code: "40", name: "Nghệ An", nameWithType: "Tỉnh Nghệ An" },
    { code: "42", name: "Hà Tĩnh", nameWithType: "Tỉnh Hà Tĩnh" },
    { code: "44", name: "Quảng Bình", nameWithType: "Tỉnh Quảng Bình" },
    { code: "45", name: "Quảng Trị", nameWithType: "Tỉnh Quảng Trị" },
    { code: "46", name: "Thừa Thiên Huế", nameWithType: "Tỉnh Thừa Thiên Huế" },
    { code: "49", name: "Quảng Nam", nameWithType: "Tỉnh Quảng Nam" },
    { code: "51", name: "Quảng Ngãi", nameWithType: "Tỉnh Quảng Ngãi" },
    { code: "52", name: "Bình Định", nameWithType: "Tỉnh Bình Định" },
    { code: "54", name: "Phú Yên", nameWithType: "Tỉnh Phú Yên" },
    { code: "56", name: "Khánh Hòa", nameWithType: "Tỉnh Khánh Hòa" },
    { code: "58", name: "Ninh Thuận", nameWithType: "Tỉnh Ninh Thuận" },
    { code: "60", name: "Bình Thuận", nameWithType: "Tỉnh Bình Thuận" },
    { code: "62", name: "Kon Tum", nameWithType: "Tỉnh Kon Tum" },
    { code: "64", name: "Gia Lai", nameWithType: "Tỉnh Gia Lai" },
    { code: "66", name: "Đắk Lắk", nameWithType: "Tỉnh Đắk Lắk" },
    { code: "67", name: "Đắk Nông", nameWithType: "Tỉnh Đắk Nông" },
    { code: "68", name: "Lâm Đồng", nameWithType: "Tỉnh Lâm Đồng" },
    { code: "70", name: "Bình Phước", nameWithType: "Tỉnh Bình Phước" },
    { code: "72", name: "Tây Ninh", nameWithType: "Tỉnh Tây Ninh" },
    { code: "74", name: "Bình Dương", nameWithType: "Tỉnh Bình Dương" },
    { code: "75", name: "Đồng Nai", nameWithType: "Tỉnh Đồng Nai" },
    { code: "77", name: "Bà Rịa - Vũng Tàu", nameWithType: "Tỉnh Bà Rịa - Vũng Tàu" },
    { code: "80", name: "Long An", nameWithType: "Tỉnh Long An" },
    { code: "82", name: "Tiền Giang", nameWithType: "Tỉnh Tiền Giang" },
    { code: "83", name: "Bến Tre", nameWithType: "Tỉnh Bến Tre" },
    { code: "84", name: "Trà Vinh", nameWithType: "Tỉnh Trà Vinh" },
    { code: "87", name: "Đồng Tháp", nameWithType: "Tỉnh Đồng Tháp" },
    { code: "89", name: "An Giang", nameWithType: "Tỉnh An Giang" },
    { code: "91", name: "Kiên Giang", nameWithType: "Tỉnh Kiên Giang" },
    { code: "93", name: "Hậu Giang", nameWithType: "Tỉnh Hậu Giang" },
    { code: "94", name: "Sóc Trăng", nameWithType: "Tỉnh Sóc Trăng" },
    { code: "95", name: "Bạc Liêu", nameWithType: "Tỉnh Bạc Liêu" },
    { code: "96", name: "Cà Mau", nameWithType: "Tỉnh Cà Mau" }
    ];
}

// Initialize address selectors with API data
async function initAddressSelectors() {
    const provinceSelect = document.querySelector('select[name="province"]') || 
                          document.querySelectorAll('select')[0];
    const districtSelect = document.querySelector('select[name="district"]') || 
                          document.querySelectorAll('select')[1];
    const wardSelect = document.querySelector('select[name="ward"]') || 
                          document.querySelectorAll('select')[2];

    if (!provinceSelect || !districtSelect) {
        console.warn('⚠️ Address selectors not found');
        return;
    }

    // Kiểm tra nếu giới hạn khu vực giao hàng
    if (DELIVERY_CONFIG.restrictDelivery) {
        // Chỉ hiển thị tỉnh Trà Vinh
        provinceSelect.innerHTML = `<option value="${DELIVERY_CONFIG.allowedProvinceCode}" selected>Tỉnh ${DELIVERY_CONFIG.allowedProvinceName}</option>`;
        provinceSelect.disabled = true; // Không cho đổi tỉnh
        
        console.log('🚚 Delivery restricted to:', DELIVERY_CONFIG.allowedProvinceName);
        
        // Tự động load quận/huyện của Trà Vinh
        await updateDistrictsRestricted(DELIVERY_CONFIG.allowedProvinceCode);
        return;
    }

    // Show loading
    provinceSelect.innerHTML = '<option value="">Đang tải dữ liệu...</option>';
    provinceSelect.disabled = true;

    // Load provinces from API
    const provinces = await loadProvinces();
    
    // Populate provinces
    provinceSelect.innerHTML = '<option value="">Chọn tỉnh/thành phố</option>';
    provinceSelect.disabled = false;
    
    provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province.code;
        option.textContent = province.nameWithType || province.name;
        option.dataset.provinceName = province.nameWithType || province.name;
        provinceSelect.appendChild(option);
    });

    console.log('✅ Loaded', provinces.length, 'provinces into select box');

    // KHÔNG auto-select tỉnh mặc định - để checkout.js prefill từ user data

    // Province change handler
    provinceSelect.addEventListener('change', async function() {
        await updateDistricts(this.value);
    });

    // District change handler
    districtSelect.addEventListener('change', async function() {
        await updateWards(this.value);
    });

    async function updateDistricts(provinceCode) {
        districtSelect.innerHTML = '<option value="">Đang tải...</option>';
        districtSelect.disabled = true;
        if (wardSelect) {
            wardSelect.innerHTML = '<option value="">Chọn phường/xã</option>';
            wardSelect.disabled = true;
        }

        if (!provinceCode) {
            districtSelect.innerHTML = '<option value="">Chọn quận/huyện</option>';
            districtSelect.disabled = false;
            return;
        }

        // Load districts from API
        const districts = await loadDistricts(provinceCode);
        
        districtSelect.innerHTML = '<option value="">Chọn quận/huyện</option>';
        districtSelect.disabled = false;

        if (districts && districts.length > 0) {
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district.code;
                option.textContent = district.nameWithType || district.name;
                option.dataset.districtName = district.nameWithType || district.name;
                districtSelect.appendChild(option);
            });
        }
    }

    async function updateWards(districtCode) {
        if (!wardSelect) return;

        wardSelect.innerHTML = '<option value="">Đang tải...</option>';
        wardSelect.disabled = true;

        if (!districtCode) {
            wardSelect.innerHTML = '<option value="">Chọn phường/xã</option>';
            wardSelect.disabled = false;
            return;
        }

        // Load wards from API
        const wards = await loadWards(districtCode);
        
        wardSelect.innerHTML = '<option value="">Chọn phường/xã</option>';
        wardSelect.disabled = false;

        if (wards && wards.length > 0) {
            wards.forEach(ward => {
                const option = document.createElement('option');
                option.value = ward.code;
                option.textContent = ward.nameWithType || ward.name;
                option.dataset.wardName = ward.nameWithType || ward.name;
                wardSelect.appendChild(option);
            });
        }
    }

    // Hàm cập nhật quận/huyện khi giới hạn khu vực
    async function updateDistrictsRestricted(provinceCode) {
        districtSelect.innerHTML = '<option value="">Đang tải...</option>';
        districtSelect.disabled = true;
        if (wardSelect) {
            wardSelect.innerHTML = '<option value="">Chọn phường/xã</option>';
            wardSelect.disabled = true;
        }

        // Load districts from API
        const districts = await loadDistricts(provinceCode);
        
        districtSelect.innerHTML = '<option value="">Chọn quận/huyện</option>';
        districtSelect.disabled = false;

        if (districts && districts.length > 0) {
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district.code;
                option.textContent = district.nameWithType || district.name;
                option.dataset.districtName = district.nameWithType || district.name;
                districtSelect.appendChild(option);
            });
        }

        // District change handler
        districtSelect.addEventListener('change', async function() {
            await updateWards(this.value);
        });
    }
}

// Export functions for use in other scripts
window.addressAPI = {
    loadProvinces,
    loadDistricts,
    loadWards,
    getProvinces: () => vietnamProvinces,
    getDistricts: (provinceCode) => vietnamDistricts[provinceCode] || [],
    getWards: (districtCode) => vietnamWards[districtCode] || []
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAddressSelectors);
} else {
    initAddressSelectors();
}
