/**
 * Manual test script for naturalUnitCalculator module
 * Run with: node backend/utils/test-naturalUnitCalculator.js
 */

const calculator = require('./naturalUnitCalculator');

console.log('=== Testing Natural Unit Calculator ===\n');

// Test 1: calculateAverageWeight
console.log('Test 1: calculateAverageWeight');
try {
  const avg1 = calculator.calculateAverageWeight(2800, 140);
  console.log(`✓ 2800g / 140 con = ${avg1}g/con (expected: 20.00)`);
  
  const avg2 = calculator.calculateAverageWeight(3600, 60);
  console.log(`✓ 3600g / 60 quả = ${avg2}g/quả (expected: 60.00)`);
  
  // Test error case
  try {
    calculator.calculateAverageWeight(1000, 0);
    console.log('✗ Should throw error for zero quantity');
  } catch (e) {
    console.log(`✓ Correctly throws error: ${e.message}`);
  }
} catch (e) {
  console.log(`✗ Error: ${e.message}`);
}

console.log('\nTest 2: updateWeightedAverage');
try {
  // Current: 2000g at 20g/con (100 con equivalent)
  // New: 800g, 50 con (16g/con this batch)
  // Expected: (2000 + 800) / (100 + 50) = 2800 / 150 = 18.67g/con
  const newAvg = calculator.updateWeightedAverage(20, 2000, 800, 50);
  console.log(`✓ Weighted average: ${newAvg}g/con (expected: 18.67)`);
  
  // Test with zero current stock (should work like initial average)
  const newAvg2 = calculator.updateWeightedAverage(20, 0, 1000, 50);
  console.log(`✓ Zero stock case: ${newAvg2}g/con (expected: 20.00)`);
} catch (e) {
  console.log(`✗ Error: ${e.message}`);
}

console.log('\nTest 3: convertToNaturalUnit');
try {
  const natural1 = calculator.convertToNaturalUnit(2800, 20);
  console.log(`✓ 2800g / 20g = ${natural1} con (expected: 140)`);
  
  const natural2 = calculator.convertToNaturalUnit(2850, 20);
  console.log(`✓ 2850g / 20g = ${natural2} con (expected: 142, floor of 142.5)`);
  
  const natural3 = calculator.convertToNaturalUnit(2899, 20);
  console.log(`✓ 2899g / 20g = ${natural3} con (expected: 144, floor of 144.95)`);
  
  // Test null cases
  const natural4 = calculator.convertToNaturalUnit(1000, 0);
  console.log(`✓ Zero avgWeight returns: ${natural4} (expected: null)`);
  
  const natural5 = calculator.convertToNaturalUnit(-100, 20);
  console.log(`✓ Negative stock returns: ${natural5} (expected: null)`);
} catch (e) {
  console.log(`✗ Error: ${e.message}`);
}

console.log('\nTest 4: convertToStandardUnit');
try {
  const grams1 = calculator.convertToStandardUnit(140, 20);
  console.log(`✓ 140 con * 20g = ${grams1}g (expected: 2800)`);
  
  const grams2 = calculator.convertToStandardUnit(60, 60);
  console.log(`✓ 60 quả * 60g = ${grams2}g (expected: 3600)`);
  
  // Test error case
  try {
    calculator.convertToStandardUnit(-5, 20);
    console.log('✗ Should throw error for negative quantity');
  } catch (e) {
    console.log(`✓ Correctly throws error: ${e.message}`);
  }
} catch (e) {
  console.log(`✗ Error: ${e.message}`);
}

console.log('\nTest 5: validateNaturalUnitImport');
try {
  // Valid import
  const result1 = calculator.validateNaturalUnitImport(
    { so_luong_nhap: 2.8, don_vi_nhap: 'kg', so_luong_tu_nhien: 140 },
    { don_vi_tu_nhien: 'con', trong_luong_trung_binh: 20 }
  );
  console.log(`✓ Valid import: ${result1.valid}, errors: ${result1.errors.length}, warnings: ${result1.warnings.length}`);
  
  // Missing natural unit configuration
  const result2 = calculator.validateNaturalUnitImport(
    { so_luong_nhap: 2.8, don_vi_nhap: 'kg', so_luong_tu_nhien: 140 },
    { don_vi_tu_nhien: null }
  );
  console.log(`✓ Missing config: ${result2.valid}, error: "${result2.errors[0]}"`);
  
  // Invalid natural quantity (negative)
  const result3 = calculator.validateNaturalUnitImport(
    { so_luong_nhap: 2.8, don_vi_nhap: 'kg', so_luong_tu_nhien: -5 },
    { don_vi_tu_nhien: 'con' }
  );
  console.log(`✓ Negative quantity: ${result3.valid}, error: "${result3.errors[0]}"`);
  
  // Large gram value warning
  const result4 = calculator.validateNaturalUnitImport(
    { so_luong_nhap: 15000, don_vi_nhap: 'g', so_luong_tu_nhien: 100 },
    { don_vi_tu_nhien: 'con' }
  );
  console.log(`✓ Large gram warning: ${result4.valid}, warning: "${result4.warnings[0]}"`);
  
  // Sudden weight change warning (>20%)
  const result5 = calculator.validateNaturalUnitImport(
    { so_luong_nhap: 3.0, don_vi_nhap: 'kg', so_luong_tu_nhien: 100 },
    { don_vi_tu_nhien: 'con', trong_luong_trung_binh: 20 }
  );
  console.log(`✓ Weight change warning: ${result5.valid}, warning: "${result5.warnings[0]}"`);
} catch (e) {
  console.log(`✗ Error: ${e.message}`);
}

console.log('\n=== All Tests Completed ===');
