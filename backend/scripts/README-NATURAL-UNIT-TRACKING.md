# Natural Unit Ingredient Tracking - Migration Guide

## Overview

This document describes the database migration for natural unit ingredient tracking feature. The migration adds batch-level tracking capabilities to the `chi_tiet_phieu_nhap` table, enabling the system to record natural unit quantities and average weights at the time of import.

## Migration Script

**File**: `backend/scripts/add-natural-unit-batch-tracking.js`

**Purpose**: Add columns to track natural unit quantities and average weights at import time, plus an index for efficient batch tracking queries.

## Changes Applied

### 1. New Columns in `chi_tiet_phieu_nhap`

#### `so_luong_tu_nhien` (INT NULL)
- **Purpose**: Stores the natural unit quantity at the time of import
- **Example**: 140 (for 140 con tôm)
- **Nullable**: Yes (NULL for imports without natural unit tracking)
- **Comment**: "Natural unit quantity at time of import"

#### `trong_luong_trung_binh_tai_thoi_diem_nhap` (DECIMAL(10,2) NULL)
- **Purpose**: Stores the calculated average weight per natural unit at import time
- **Example**: 20.00 (for 20 grams per shrimp)
- **Nullable**: Yes (NULL for imports without natural unit tracking)
- **Comment**: "Calculated average weight at time of import (grams per natural unit)"

### 2. New Index

#### `idx_batch_tracking`
- **Columns**: (ma_nguyen_lieu, ma_phieu_nhap)
- **Purpose**: Optimize queries that track size variations over time for specific ingredients
- **Type**: BTREE
- **Use Cases**:
  - Retrieve import history for a specific ingredient
  - Analyze weight trends over time
  - Audit batch-specific average weights

## Running the Migration

### Prerequisites
- Node.js installed
- Database credentials configured in `backend/.env`
- MySQL server running

### Execution

```bash
# From the backend directory
cd backend
node scripts/add-natural-unit-batch-tracking.js
```

### Expected Output

```
✅ Kết nối database thành công!
🚀 Starting natural unit batch tracking migration...

📋 Step 1: Adding so_luong_tu_nhien column...
✅ Column so_luong_tu_nhien added successfully!

📋 Step 2: Adding trong_luong_trung_binh_tai_thoi_diem_nhap column...
✅ Column trong_luong_trung_binh_tai_thoi_diem_nhap added successfully!

📋 Step 3: Creating idx_batch_tracking index...
✅ Index idx_batch_tracking created successfully!

📋 Step 4: Verifying changes...
✅ Verification results:
   - so_luong_tu_nhien: int (NULL)
   - trong_luong_trung_binh_tai_thoi_diem_nhap: decimal(10,2) (NULL)

📋 Step 5: Statistics...
✅ Import records statistics:
   Total import records: X
   With natural unit: 0
   Without natural unit: X

🎉 Migration completed successfully!
```

## Idempotency

The migration script is **idempotent** - it can be run multiple times safely. If columns or indexes already exist, the script will skip them with a warning message:

```
⚠️  Column so_luong_tu_nhien already exists, skipping...
⚠️  Index idx_batch_tracking already exists, skipping...
```

## Rollback

To rollback this migration (if needed):

```sql
-- Remove the index
DROP INDEX idx_batch_tracking ON chi_tiet_phieu_nhap;

-- Remove the columns
ALTER TABLE chi_tiet_phieu_nhap 
DROP COLUMN trong_luong_trung_binh_tai_thoi_diem_nhap,
DROP COLUMN so_luong_tu_nhien;
```

**⚠️ Warning**: Rollback will permanently delete any natural unit data stored in these columns.

## Verification

### Check Column Structure

```sql
DESCRIBE chi_tiet_phieu_nhap;
```

Expected columns:
- `so_luong_tu_nhien` (int, NULL)
- `trong_luong_trung_binh_tai_thoi_diem_nhap` (decimal(10,2), NULL)

### Check Index

```sql
SHOW INDEX FROM chi_tiet_phieu_nhap WHERE Key_name = 'idx_batch_tracking';
```

Expected result: 2 rows showing the composite index on (ma_nguyen_lieu, ma_phieu_nhap)

### Check Data

```sql
SELECT 
    ma_chi_tiet,
    ma_nguyen_lieu,
    so_luong_nhap,
    so_luong_tu_nhien,
    trong_luong_trung_binh_tai_thoi_diem_nhap
FROM chi_tiet_phieu_nhap
WHERE so_luong_tu_nhien IS NOT NULL;
```

## Next Steps

After running this migration:

1. **Update Import Controller** (`backend/controllers/importController.js`)
   - Accept `so_luong_tu_nhien` field in import requests
   - Calculate and store `trong_luong_trung_binh_tai_thoi_diem_nhap`
   - Update the rolling average in `nguyen_lieu.trong_luong_trung_binh`

2. **Implement Natural Unit Calculator** (`backend/utils/naturalUnitCalculator.js`)
   - Average weight calculation logic
   - Weighted average updates
   - Validation functions

3. **Update Import History Queries**
   - Include batch-specific average weights in responses
   - Enable filtering by date range for trend analysis

4. **Add API Endpoints**
   - GET endpoint to retrieve import history with natural unit data
   - Analytics endpoint for weight trend analysis

## Related Requirements

This migration implements:
- **Requirement 5.1**: Add `so_luong_tu_nhien` column
- **Requirement 5.2**: Add `trong_luong_trung_binh_tai_thoi_diem_nhap` column
- **Requirement 5.3**: Create `idx_batch_tracking` index

See `.kiro/specs/natural-unit-ingredient-tracking/requirements.md` for full details.

## Troubleshooting

### Database Connection Error

```
❌ Lỗi kết nối database: Access denied for user...
```

**Solution**: Verify `.env` file exists in `backend/` directory with correct credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=amthuc_phuongnam
DB_PORT=3306
```

### Column Already Exists Error

```
ER_DUP_FIELDNAME: Duplicate column name 'so_luong_tu_nhien'
```

**Solution**: This is handled automatically by the script. The migration will skip existing columns.

### Index Already Exists Error

```
ER_DUP_KEYNAME: Duplicate key name 'idx_batch_tracking'
```

**Solution**: This is handled automatically by the script. The migration will skip existing indexes.

## Support

For issues or questions about this migration:
1. Check the spec documentation in `.kiro/specs/natural-unit-ingredient-tracking/`
2. Review the design document for architecture details
3. Consult the requirements document for acceptance criteria
