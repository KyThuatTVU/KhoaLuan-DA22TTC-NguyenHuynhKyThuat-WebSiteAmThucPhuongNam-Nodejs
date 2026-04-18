# Natural Unit Indexes Migration

## Overview

This migration adds performance indexes to the `nguyen_lieu` table to optimize queries for natural unit ingredient tracking.

## Migration Script

**File**: `add-natural-unit-indexes.js`

**Requirements**: 9.5

**Task**: 1.2 Create database indexes for nguyen_lieu table

## Indexes Created

### 1. idx_natural_unit

**Purpose**: Optimize filtering ingredients by natural unit type

**Definition**:
```sql
CREATE INDEX idx_natural_unit ON nguyen_lieu(don_vi_tu_nhien);
```

**Use Cases**:
- Filtering ingredients that have natural units configured
- Displaying only ingredients with natural unit tracking
- Grouping ingredients by natural unit type (con, quả, củ, etc.)

**Example Query**:
```sql
SELECT ma_nguyen_lieu, ten_nguyen_lieu, don_vi_tu_nhien, trong_luong_trung_binh
FROM nguyen_lieu
WHERE don_vi_tu_nhien IS NOT NULL;
```

### 2. idx_low_stock

**Purpose**: Optimize low stock warning queries

**Definition**:
```sql
CREATE INDEX idx_low_stock ON nguyen_lieu(so_luong_ton, muc_canh_bao);
```

**Use Cases**:
- Finding ingredients below warning threshold
- Dashboard low stock alerts
- Inventory monitoring queries
- Automated notification triggers

**Example Query**:
```sql
SELECT ma_nguyen_lieu, ten_nguyen_lieu, so_luong_ton, muc_canh_bao
FROM nguyen_lieu
WHERE so_luong_ton <= muc_canh_bao;
```

## Running the Migration

### Prerequisites

1. Database connection configured in `backend/.env`
2. Node.js installed
3. Required npm packages installed (`npm install`)

### Execution

```bash
# From project root
node backend/scripts/add-natural-unit-indexes.js
```

### Expected Output

```
🚀 Starting natural unit indexes migration...

📋 Step 1: Creating idx_natural_unit index...
✅ Index idx_natural_unit created successfully!
   Purpose: Optimize filtering ingredients by natural unit type

📋 Step 2: Creating idx_low_stock index...
✅ Index idx_low_stock created successfully!
   Purpose: Optimize low stock warning queries

📋 Step 3: Verifying indexes...
✅ Verification results:

   idx_low_stock (BTREE):
     - Column 1: so_luong_ton
     - Column 2: muc_canh_bao

   idx_natural_unit (BTREE):
     - Column 1: don_vi_tu_nhien

📋 Step 4: Statistics...
✅ Ingredient statistics:
   Total ingredients: X
   With natural unit: Y
   Low stock items: Z

📋 Step 5: Testing index usage...
✅ Query plan for natural unit filter:
   Using index: idx_natural_unit
   Rows examined: Y

✅ Query plan for low stock warning:
   Using index: idx_low_stock (or None if no low stock items)
   Rows examined: X

🎉 Migration completed successfully!
```

## Verification

To verify the indexes were created correctly:

```sql
SHOW INDEX FROM nguyen_lieu WHERE Key_name IN ('idx_natural_unit', 'idx_low_stock');
```

Expected results:
- `idx_natural_unit`: Single column index on `don_vi_tu_nhien`
- `idx_low_stock`: Composite index on `(so_luong_ton, muc_canh_bao)`

## Performance Impact

### Before Indexes

- Natural unit filter: Full table scan
- Low stock query: Full table scan

### After Indexes

- Natural unit filter: Index scan on `idx_natural_unit`
- Low stock query: Index scan on `idx_low_stock`

**Expected Performance Improvement**:
- Small tables (<100 rows): Minimal impact
- Medium tables (100-10,000 rows): 2-5x faster
- Large tables (>10,000 rows): 10-100x faster

## Rollback

If you need to remove these indexes:

```sql
DROP INDEX idx_natural_unit ON nguyen_lieu;
DROP INDEX idx_low_stock ON nguyen_lieu;
```

## Related Migrations

1. `add-natural-unit-columns.js` - Adds natural unit columns to nguyen_lieu
2. `add-natural-unit-batch-tracking.js` - Adds batch tracking to chi_tiet_phieu_nhap
3. **`add-natural-unit-indexes.js`** - Adds performance indexes (this migration)

## Notes

- The migration is idempotent - it can be run multiple times safely
- Existing indexes will be skipped with a warning message
- The script includes automatic verification and statistics
- Index creation is non-blocking for small tables
- For large tables, consider running during low-traffic periods

## Context

These indexes support the Natural Unit Ingredient Tracking feature, which allows:
- Dual-unit display (grams + natural units like "con", "quả")
- Dynamic average weight calculation
- Intelligent stock warnings
- Batch-level tracking of ingredient sizes

See `README-NATURAL-UNIT-TRACKING.md` for complete feature documentation.
