/**
 * Natural Unit Calculator Module
 * 
 * Provides core calculation functions for natural unit ingredient tracking.
 * Handles average weight calculations, weighted averages, unit conversions,
 * and validation for natural unit imports.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 6.4
 */

/**
 * Calculate average weight from import data
 * 
 * @param {number} weightInGrams - Total weight in grams
 * @param {number} naturalQuantity - Number of natural units
 * @returns {number} Average weight per unit (2 decimal places)
 * @throws {Error} If naturalQuantity <= 0
 * 
 * Requirements: 1.1, 1.2, 1.6, 1.7
 */
function calculateAverageWeight(weightInGrams, naturalQuantity) {
  // Validate inputs
  if (naturalQuantity <= 0) {
    throw new Error('Số lượng đơn vị tự nhiên phải lớn hơn 0');
  }
  
  if (weightInGrams <= 0) {
    throw new Error('Trọng lượng phải lớn hơn 0');
  }
  
  // Calculate average and round to 2 decimal places
  const average = weightInGrams / naturalQuantity;
  return Math.round(average * 100) / 100;
}

/**
 * Update ingredient average weight using weighted average
 * 
 * Formula: new_avg = (old_avg * old_stock + new_weight) / (old_stock + new_weight)
 * 
 * This maintains cost accuracy by weighting the average based on stock quantities.
 * 
 * @param {number} currentAvgWeight - Current average weight per natural unit
 * @param {number} currentStock - Current stock in grams
 * @param {number} newWeight - New import weight in grams
 * @param {number} newNaturalQty - New import natural quantity
 * @returns {number} Updated average weight (2 decimal places)
 * 
 * Requirements: 1.4
 */
function updateWeightedAverage(currentAvgWeight, currentStock, newWeight, newNaturalQty) {
  // Validate inputs
  if (currentAvgWeight <= 0) {
    throw new Error('Trọng lượng trung bình hiện tại phải lớn hơn 0');
  }
  
  if (currentStock < 0) {
    throw new Error('Tồn kho hiện tại không được âm');
  }
  
  if (newWeight <= 0) {
    throw new Error('Trọng lượng nhập phải lớn hơn 0');
  }
  
  if (newNaturalQty <= 0) {
    throw new Error('Số lượng đơn vị tự nhiên phải lớn hơn 0');
  }
  
  // Calculate equivalent natural quantity of current stock
  const currentNaturalStock = currentStock / currentAvgWeight;
  
  // Calculate total quantities
  const totalNaturalQty = currentNaturalStock + newNaturalQty;
  const totalWeight = currentStock + newWeight;
  
  // Calculate weighted average and round to 2 decimal places
  const weightedAverage = totalWeight / totalNaturalQty;
  return Math.round(weightedAverage * 100) / 100;
}

/**
 * Convert standard unit (grams) to natural unit quantity
 * 
 * Returns floor value as you can't have fractional natural units in practice.
 * 
 * @param {number} stockInGrams - Stock quantity in grams
 * @param {number} avgWeight - Average weight per natural unit
 * @returns {number} Natural unit quantity (floor value)
 * 
 * Requirements: 1.3, 6.4
 */
function convertToNaturalUnit(stockInGrams, avgWeight) {
  // Handle edge cases
  if (!avgWeight || avgWeight <= 0) {
    return null;
  }
  
  if (stockInGrams < 0) {
    return null;
  }
  
  // Calculate and return floor value
  const exactValue = stockInGrams / avgWeight;
  return Math.floor(exactValue);
}

/**
 * Convert natural unit to standard unit (grams)
 * 
 * @param {number} naturalQuantity - Quantity in natural units
 * @param {number} avgWeight - Average weight per natural unit
 * @returns {number} Weight in grams
 * 
 * Requirements: 6.4
 */
function convertToStandardUnit(naturalQuantity, avgWeight) {
  // Validate inputs
  if (naturalQuantity < 0) {
    throw new Error('Số lượng đơn vị tự nhiên không được âm');
  }
  
  if (!avgWeight || avgWeight <= 0) {
    throw new Error('Trọng lượng trung bình phải lớn hơn 0');
  }
  
  // Calculate weight in grams
  return naturalQuantity * avgWeight;
}

/**
 * Validate natural unit import data
 * 
 * Performs comprehensive validation of import data including:
 * - Natural quantity is positive integer
 * - Weight is positive
 * - Ingredient has natural unit configured
 * - Sudden weight changes (>20%)
 * 
 * @param {Object} importData - Import data object
 * @param {number} importData.so_luong_nhap - Weight in kg or grams
 * @param {string} importData.don_vi_nhap - Unit ('kg' or 'g')
 * @param {number} importData.so_luong_tu_nhien - Natural unit quantity
 * @param {Object} ingredient - Ingredient object from database
 * @param {string} ingredient.don_vi_tu_nhien - Natural unit name
 * @param {number} ingredient.trong_luong_trung_binh - Current average weight
 * @returns {Object} {valid: boolean, errors: string[], warnings: string[]}
 * 
 * Requirements: 1.6, 1.7, 2.5, 10.2, 10.3, 10.4
 */
function validateNaturalUnitImport(importData, ingredient = null) {
  const errors = [];
  const warnings = [];
  
  // Validate natural quantity if provided
  if (importData.so_luong_tu_nhien !== null && importData.so_luong_tu_nhien !== undefined) {
    // Check if ingredient has natural unit configured
    if (ingredient && !ingredient.don_vi_tu_nhien) {
      errors.push('Nguyên liệu chưa có đơn vị tự nhiên được định nghĩa');
    }
    
    // Validate natural quantity is positive integer
    if (!Number.isInteger(importData.so_luong_tu_nhien) || importData.so_luong_tu_nhien <= 0) {
      errors.push('Số lượng đơn vị tự nhiên không hợp lệ: phải là số nguyên dương');
    }
  }
  
  // Validate weight is positive
  if (importData.so_luong_nhap !== null && importData.so_luong_nhap !== undefined) {
    if (typeof importData.so_luong_nhap !== 'number' || importData.so_luong_nhap <= 0) {
      errors.push('Trọng lượng nhập không hợp lệ: phải là số dương');
    }
  } else {
    errors.push('Trọng lượng nhập là bắt buộc');
  }
  
  // Check for large gram values (warning only)
  if (importData.don_vi_nhap === 'g' && importData.so_luong_nhap > 10000) {
    warnings.push('Cân nhắc nhập bằng kg cho dễ đọc');
  }
  
  // Check for sudden weight changes (>20%)
  if (ingredient && 
      ingredient.trong_luong_trung_binh && 
      importData.so_luong_tu_nhien && 
      importData.so_luong_nhap) {
    
    // Convert weight to grams
    let weightInGrams = importData.so_luong_nhap;
    if (importData.don_vi_nhap === 'kg') {
      weightInGrams = importData.so_luong_nhap * 1000;
    }
    
    // Calculate new batch average
    const newBatchAvg = weightInGrams / importData.so_luong_tu_nhien;
    
    // Calculate percent change
    const percentChange = Math.abs(newBatchAvg - ingredient.trong_luong_trung_binh) / 
                          ingredient.trong_luong_trung_binh;
    
    if (percentChange > 0.2) {
      const percentDisplay = Math.round(percentChange * 100);
      warnings.push(`Trọng lượng TB ${newBatchAvg > ingredient.trong_luong_trung_binh ? 'tăng' : 'giảm'} ${percentDisplay}%, vui lòng kiểm tra`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

module.exports = {
  calculateAverageWeight,
  updateWeightedAverage,
  convertToNaturalUnit,
  convertToStandardUnit,
  validateNaturalUnitImport
};
