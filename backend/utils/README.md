# Backend Utilities

This directory contains utility modules used across the backend application.

## Modules

### naturalUnitCalculator.js

Core calculation module for natural unit ingredient tracking feature.

**Purpose**: Provides functions for converting between standard units (grams/ml) and natural units (con, quả, củ), calculating weighted averages, and validating import data.

**Key Functions**:

- `calculateAverageWeight(weightInGrams, naturalQuantity)` - Calculate average weight per natural unit
- `updateWeightedAverage(currentAvgWeight, currentStock, newWeight, newNaturalQty)` - Update average using weighted average formula
- `convertToNaturalUnit(stockInGrams, avgWeight)` - Convert grams to natural unit quantity
- `convertToStandardUnit(naturalQuantity, avgWeight)` - Convert natural units to grams
- `validateNaturalUnitImport(importData, ingredient)` - Validate import data with natural units

**Requirements Implemented**: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 6.4

**Testing**: Run `node backend/utils/test-naturalUnitCalculator.js` to verify functionality

**Usage Example**:

```javascript
const calculator = require('./utils/naturalUnitCalculator');

// Calculate average weight from import
const avgWeight = calculator.calculateAverageWeight(2800, 140); // 20g per unit

// Update weighted average with new import
const newAvg = calculator.updateWeightedAverage(20, 2000, 800, 50); // 18.67g per unit

// Convert stock to natural units
const naturalQty = calculator.convertToNaturalUnit(2800, 20); // 140 units

// Validate import data
const validation = calculator.validateNaturalUnitImport(
  { so_luong_nhap: 2.8, don_vi_nhap: 'kg', so_luong_tu_nhien: 140 },
  { don_vi_tu_nhien: 'con', trong_luong_trung_binh: 20 }
);
```

## Testing

Manual test scripts are provided for each module. Run them with Node.js:

```bash
node backend/utils/test-naturalUnitCalculator.js
```

All tests should pass with ✓ marks indicating successful validation.
