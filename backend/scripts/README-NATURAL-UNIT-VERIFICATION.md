# Natural Unit Migration Verification Script

## Overview

The `verify-natural-unit-migration.js` script provides comprehensive verification of all database migrations related to the natural unit ingredient tracking feature. It checks columns, indexes, and optionally tests rollback functionality.

## What It Verifies

### 1. Batch Tracking Columns (chi_tiet_phieu_nhap)
- `so_luong_tu_nhien` (INT NULL) - Natural unit quantity at import time
- `trong_luong_trung_binh_tai_thoi_diem_nhap` (DECIMAL(10,2) NULL) - Average weight at import time

### 2. Natural Unit Configuration Columns (nguyen_lieu)
- `don_vi_tu_nhien` (VARCHAR(50) NULL) - Natural unit name (con, quả, củ, etc.)
- `trong_luong_trung_binh` (DECIMAL(10,2) NULL) - Current rolling average weight
- `don_vi_chuan` (VARCHAR(10) NULL) - Standard storage unit (g or ml)

### 3. Performance Indexes
- `idx_batch_tracking` on chi_tiet_phieu_nhap(ma_nguyen_lieu, ma_phieu_nhap)
- `idx_natural_unit` on nguyen_lieu(don_vi_tu_nhien)
- `idx_low_stock` on nguyen_lieu(so_luong_ton, muc_canh_bao)

### 4. Rollback Functionality (Optional)
Tests database transaction rollback to ensure data integrity during migration failures.

## Usage

### Basic Verification
```bash
node backend/scripts/verify-natural-unit-migration.js
```

This will:
- ✅ Check all columns exist with correct types
- ✅ Verify all indexes are created
- ✅ Display data statistics
- ✅ Exit with code 0 on success, 1 on failure

### With Rollback Testing
```bash
node backend/scripts/verify-natural-unit-migration.js --test-rollback
```

This performs all basic checks PLUS:
- ✅ Tests transaction rollback functionality
- ✅ Verifies data integrity after rollback
- ✅ Ensures no data corruption

## Output Examples

### Successful Verification
```
🚀 Starting comprehensive natural unit migration verification...
======================================================================

### Table: chi_tiet_phieu_nhap (Batch Tracking) ###

📋 Verifying columns in chi_tiet_phieu_nhap...
✅ Column so_luong_tu_nhien: int (YES)
✅ Column trong_luong_trung_binh_tai_thoi_diem_nhap: decimal(10,2) (YES)

📋 Verifying indexes in chi_tiet_phieu_nhap...
✅ Index idx_batch_tracking: (ma_nguyen_lieu, ma_phieu_nhap)

### Table: nguyen_lieu (Natural Unit Configuration) ###

📋 Verifying columns in nguyen_lieu...
✅ Column don_vi_tu_nhien: varchar(50) (YES)
✅ Column trong_luong_trung_binh: decimal(10,2) (YES)
✅ Column don_vi_chuan: varchar(10) (YES)

📋 Verifying indexes in nguyen_lieu...
✅ Index idx_natural_unit: (don_vi_tu_nhien)
✅ Index idx_low_stock: (so_luong_ton, muc_canh_bao)

📊 Data Statistics...

Import Records (chi_tiet_phieu_nhap):
  Total records: 2
  With natural unit: 0
  Without natural unit: 2

Ingredients (nguyen_lieu):
  Total ingredients: 7
  With natural unit: 2
  Without natural unit: 5
  Low stock items: 0

======================================================================
🎉 Migration verification PASSED!
✅ All columns exist with correct types
✅ All indexes are created correctly
```

### Failed Verification
```
❌ Column so_luong_tu_nhien is MISSING
❌ Index idx_batch_tracking is MISSING

======================================================================
❌ Migration verification FAILED!
⚠️  Some columns or indexes are missing or incorrect

📝 Action required:
   - Run migration scripts: add-natural-unit-batch-tracking.js
   - Run migration scripts: add-natural-unit-indexes.js
   - Check database permissions
```

## Exit Codes

- **0**: All verifications passed
- **1**: One or more verifications failed

## When to Run

### Required
- ✅ After running `add-natural-unit-batch-tracking.js`
- ✅ After running `add-natural-unit-indexes.js`
- ✅ Before deploying to production
- ✅ After database restore/migration

### Recommended
- ✅ As part of CI/CD pipeline
- ✅ After database schema changes
- ✅ When troubleshooting natural unit features

## Troubleshooting

### Missing Columns
If columns are missing, run the migration scripts:
```bash
node backend/scripts/add-natural-unit-batch-tracking.js
node backend/scripts/add-natural-unit-columns.js
```

### Missing Indexes
If indexes are missing, run:
```bash
node backend/scripts/add-natural-unit-indexes.js
```

### Rollback Test Fails
If rollback testing fails:
1. Check database transaction support (InnoDB engine required)
2. Verify database user has transaction privileges
3. Check for table locks or long-running queries
4. Review database error logs

### Type Mismatches
If column types don't match:
1. Check MySQL version compatibility
2. Verify migration scripts ran completely
3. Consider dropping and recreating columns (backup first!)

## Related Scripts

- `add-natural-unit-batch-tracking.js` - Adds batch tracking columns and index
- `add-natural-unit-indexes.js` - Adds performance indexes
- `add-natural-unit-columns.js` - Adds natural unit configuration columns
- `check-natural-units.js` - Checks natural unit data integrity

## Requirements Traceability

This script validates:
- **Requirement 9.1**: Backward compatibility with NULL natural units
- **Requirement 9.2**: Gradual adoption without disrupting existing operations
- **Requirement 5.1, 5.2, 5.3**: Batch tracking architecture
- **Requirement 9.5**: Performance indexes for queries

## Technical Details

### Database Connection
Uses the shared database pool from `backend/config/database.js` with environment variables from `.env`.

### Transaction Testing
The rollback test:
1. Captures current state
2. Starts a transaction
3. Makes a test modification
4. Verifies modification is visible
5. Rolls back the transaction
6. Verifies data is restored exactly

This ensures the database supports proper ACID transactions for the natural unit feature.

### Schema Validation
Compares actual database schema against expected schema definitions using MySQL's INFORMATION_SCHEMA tables.

## Support

For issues or questions:
1. Check the main feature documentation: `README-NATURAL-UNIT-TRACKING.md`
2. Review migration script logs
3. Verify database connection settings in `.env`
4. Check MySQL error logs

## Version History

- **v1.0** (2025-01-30): Initial comprehensive verification script
  - Verifies all columns and indexes
  - Includes rollback testing
  - Provides detailed statistics
