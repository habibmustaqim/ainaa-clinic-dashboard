# Ainaa Beauty Dashboard Migration Plan

## Overview
This document provides detailed instructions for converting the ainaa-clinic-dashboard to ainaa-beauty-dashboard, which will handle Bizapp e-commerce data from a single CSV file with 137,000+ rows.

---

## 1. Project Setup

### 1.1 Manual Steps (Done by User)
- [x] Duplicate `ainaa-clinic-dashboard` folder to `ainaa-beauty-dashboard`
- [ ] Open new Claude Code CLI session in `ainaa-beauty-dashboard` folder

### 1.2 Configuration Updates
**File: `package.json`**
```json
{
  "name": "ainaa-beauty-dashboard",
  "version": "1.0.0"
}
```

**File: `vite.config.ts`**
```typescript
export default defineConfig({
  server: {
    port: 5174  // Change from 5173 to avoid conflict
  }
})
```

---

## 2. Data Source Information

### 2.1 Source CSV File
**Path:** `/Users/habibmustaqim/Downloads/Data Jualan Ainaa Beauty Bizapp - DATAPELANGGAN.csv`

**Characteristics:**
- **Total Rows:** ~137,000 rows
- **Format:** Single CSV file (not 6 files like clinic system)
- **Data Type:** E-commerce product sales data
- **Structure:** Multi-row per order (1 header row + multiple product line items per order)

### 2.2 CSV Column Structure (65 columns)

**Core Columns:**
1. `NO` - Row number
2. `NO. TEMPAHAN` - Order Number (unique per order)
3. `ID AGEN/STOKIS` - Agent/Stockist ID
4. `NAMA AGEN/STOKIS` - Agent/Stockist Name
5. `PENAJA` - Sponsor name
6. `DIMASUKKAN OLEH` - Entered by (user)
7. `NAMA PELANGGAN` - Customer Name
8. `ALAMAT` - Address
9. `POSKOD` - Postcode
10. `BANDAR` - City
11. `NEGERI` - State
12. `NO H/P` - Phone number
13. `EMEL` - Email
14. `SKU` - Product SKU code
15. `PRODUK` - Product Name
16. `KUANTITI` - Quantity
17. `HARGA JUALAN PRODUK` - Product Sale Price
18. `HARGA JUALAN SEBENAR` - Actual Sale Price (including shipping)
19. `KOS PRODUK` - Product Cost
20. `TARIKH TEMPAHAN` - Order Date
21. `TARIKH PENGHANTARAN` - Shipping Date
22. `NOMBOR TRACKING` - Tracking Number
23. `KURIER` - Courier service
24. `STATUS PARCEL` - Parcel Status
25. Payment gateway fields (FPX)
26. E-commerce platform fields (TikTok Shop, Shopee, etc.)

**Note:** This is an e-commerce dataset, NOT a clinic/medical dataset

---

## 3. Database Schema Changes

### 3.1 Key Principle
**DO NOT REPLACE EXISTING TABLES**

The clinic tables should remain untouched. Add NEW tables alongside them with `bizapp_` prefix.

### 3.2 New Tables to Create

#### Table 1: `bizapp_customers`
Simplified customer table for e-commerce (no medical fields).

```sql
CREATE TABLE bizapp_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bizapp_customers_phone ON bizapp_customers(phone);
CREATE INDEX idx_bizapp_customers_email ON bizapp_customers(email);
CREATE INDEX idx_bizapp_customers_name ON bizapp_customers(name);
```

#### Table 2: `bizapp_agents`
Agent/Stockist information (multi-level distribution).

```sql
CREATE TABLE bizapp_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT UNIQUE NOT NULL,
  agent_name TEXT NOT NULL,
  sponsor TEXT,
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bizapp_agents_agent_id ON bizapp_agents(agent_id);
CREATE INDEX idx_bizapp_agents_sponsor ON bizapp_agents(sponsor);
```

#### Table 3: `bizapp_orders`
Order header information.

```sql
CREATE TABLE bizapp_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES bizapp_customers(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES bizapp_agents(id) ON DELETE SET NULL,

  -- Dates
  order_date TIMESTAMPTZ NOT NULL,
  shipping_date TIMESTAMPTZ,

  -- Pricing
  subtotal DECIMAL(12,2) DEFAULT 0,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,

  -- Shipping
  shipping_method TEXT,
  courier TEXT,
  tracking_number TEXT,
  parcel_status TEXT,

  -- Payment
  payment_method TEXT,
  fpx_bill_id TEXT,
  fpx_receipt_number TEXT,

  -- E-commerce Platform
  sales_channel TEXT,
  platform_order_id TEXT,

  -- Meta
  entered_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bizapp_orders_order_number ON bizapp_orders(order_number);
CREATE INDEX idx_bizapp_orders_customer_id ON bizapp_orders(customer_id);
CREATE INDEX idx_bizapp_orders_agent_id ON bizapp_orders(agent_id);
CREATE INDEX idx_bizapp_orders_date ON bizapp_orders(order_date DESC);
CREATE INDEX idx_bizapp_orders_status ON bizapp_orders(parcel_status);
```

#### Table 4: `bizapp_order_items`
Individual product line items.

```sql
CREATE TABLE bizapp_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES bizapp_orders(id) ON DELETE CASCADE,

  -- Product Info
  sku TEXT,
  product_name TEXT NOT NULL,

  -- Quantity & Pricing
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) DEFAULT 0,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bizapp_order_items_order_id ON bizapp_order_items(order_id);
CREATE INDEX idx_bizapp_order_items_sku ON bizapp_order_items(sku);
CREATE INDEX idx_bizapp_order_items_product_name ON bizapp_order_items(product_name);
```

#### Table 5: `bizapp_products`
Product catalog (aggregated from order items).

```sql
CREATE TABLE bizapp_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  total_quantity_sold INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  total_profit DECIMAL(12,2) DEFAULT 0,
  times_ordered INTEGER DEFAULT 0,
  avg_unit_price DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bizapp_products_sku ON bizapp_products(sku);
CREATE INDEX idx_bizapp_products_name ON bizapp_products(product_name);
```

---

## 4. Upload System Modifications

### 4.1 Current System (6-File Upload)
The clinic system expects:
1. Customer Info CSV
2. Customer Visit Frequency CSV
3. Sales Detailed CSV
4. Payment CSV
5. Item Sales CSV
6. Service Sales CSV

### 4.2 New System (Single CSV Upload)
The beauty dashboard needs:
1. **Single CSV file** (Bizapp export)
2. **Multi-row parsing** (one order = multiple rows)
3. **Denormalized data** (all info in one row)

### 4.3 File Changes Required

#### File: `src/utils/excelParser.ts`
**Current:** Parses 6 different files
**New:** Parse single Bizapp CSV file

**Changes:**
- Remove multi-file parsing logic
- Add single CSV parsing for Bizapp
- Handle large file (137k rows)

#### File: `src/utils/bizappCleaner.ts` (NEW)
**Purpose:** Clean and transform Bizapp CSV data

**Key Functions:**
1. `cleanBizappData(rawData)` - Main entry point
2. `aggregateOrdersByOrderNumber(rows)` - Combine multi-row orders
3. `extractCustomers(rows)` - Extract unique customers
4. `extractAgents(rows)` - Extract unique agents
5. `extractProducts(rows)` - Extract unique products
6. `buildOrders(rows)` - Build order headers
7. `buildOrderItems(rows)` - Build order line items

**Logic:**
- Group rows by `NO. TEMPAHAN` (Order Number)
- First row of each order = order header info
- All rows = product line items
- Sum totals across items for order total

#### File: `src/utils/uploadProcessor.ts`
**Current:** Processes 6 files with complex relationships
**New:** Process single Bizapp file

**Changes:**
- Replace 6-file logic with single-file logic
- Update table names (customers → bizapp_customers, etc.)
- Update batch processing for large dataset

**Optimizations for 137k Rows:**
```typescript
// Increase batch size
const BATCH_SIZE = 3000  // Up from 1000

// Add parallel batch uploads
const MAX_CONCURRENT_UPLOADS = 2

// Process batches in parallel
for (let i = 0; i < batches.length; i += MAX_CONCURRENT_UPLOADS) {
  const batchChunk = batches.slice(i, i + MAX_CONCURRENT_UPLOADS)
  await Promise.all(batchChunk.map(batch => uploadBatch(batch)))
}
```

#### File: `src/components/DataUpload.tsx`
**Current:** 6 file dropzones
**New:** Single file dropzone

**Changes:**
- Remove multi-file upload UI
- Single dropzone for Bizapp CSV
- Update validation messages
- Update progress tracking for larger dataset

---

## 5. Performance Optimizations for 137k Rows

### 5.1 Current Performance Issues
- Current batch size: 1000 rows
- Sequential uploads (one batch at a time)
- All processing in main thread (blocks UI)
- Estimated time for 137k rows: **10-15 minutes**

### 5.2 Required Optimizations

#### Optimization 1: Increase Batch Size
```typescript
// Old
const BATCH_SIZE = 1000

// New
const BATCH_SIZE = 3000  // Safe for Supabase, 3x faster
```

#### Optimization 2: Parallel Batch Uploads
```typescript
const MAX_CONCURRENT = 2  // Upload 2 batches simultaneously

const uploadInParallel = async (batches) => {
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
    const chunk = batches.slice(i, i + MAX_CONCURRENT)
    await Promise.all(chunk.map(batch => supabase.from('table').insert(batch)))
  }
}
```

#### Optimization 3: Web Worker for Parsing (Optional but Recommended)
Create `src/workers/csvParser.worker.ts`:
```typescript
import Papa from 'papaparse'

self.onmessage = (e) => {
  const { file } = e.data

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      self.postMessage({ type: 'complete', data: results.data })
    },
    error: (error) => {
      self.postMessage({ type: 'error', error })
    }
  })
}
```

**Expected Performance:**
- Parsing: 30-60 seconds (in Web Worker, non-blocking)
- Upload: 137k ÷ 3000 ÷ 2 = ~23 batch cycles × 3 sec = **2-3 minutes**
- **Total: 3-4 minutes**

---

## 6. Dashboard & UI Changes

### 6.1 Remove Clinic-Specific Features

#### Files to Modify:
1. `src/pages/Homepage.tsx` - Remove clinic metrics
2. `src/pages/Analytics.tsx` - Replace with e-commerce analytics
3. `src/pages/Customers.tsx` - Rename to `BizappCustomers.tsx`
4. `src/pages/CustomerDashboard.tsx` - Update for e-commerce customer view
5. `src/components/Sidebar.tsx` - Update navigation labels

#### Metrics to Replace:

| Old (Clinic) | New (E-commerce) |
|-------------|------------------|
| Total Patients | Total Customers |
| Total Services | Total Products Sold |
| Active Patients | Active Customers |
| Service Revenue | Product Revenue |
| Therapists | Agents/Stockists |
| Treatments Provided | Orders Fulfilled |
| Patient Visit Frequency | Customer Order Frequency |
| Service Sales | Product Sales |

### 6.2 New Pages to Add

#### 6.2.1 `src/pages/Products.tsx`
- Product catalog
- Top selling products
- Product revenue breakdown
- Inventory insights

#### 6.2.2 `src/pages/Agents.tsx`
- Agent performance dashboard
- Sales by agent
- Agent hierarchy (sponsor relationships)
- Commission tracking

#### 6.2.3 `src/pages/Orders.tsx`
- Order list with filters
- Order status tracking
- Shipping status
- Payment status

#### 6.2.4 `src/pages/Shipping.tsx`
- Shipping dashboard
- Parcel tracking
- Courier performance
- Delivery times analysis

### 6.3 Reports to Update

#### File: `src/pages/CustomerReport.tsx`
**Changes:**
- Update to use `bizapp_customers` table
- Remove medical fields (drug allergies, conditions, etc.)
- Add e-commerce metrics (order frequency, avg order value)
- Update export columns

#### New File: `src/pages/ProductReport.tsx`
- Product sales report
- SKU-level analysis
- Profit margins by product
- Inventory turnover

#### New File: `src/pages/AgentReport.tsx`
- Agent sales performance
- Commission calculations
- Sponsor hierarchy analysis

---

## 7. Data Flow Architecture

### 7.1 Upload Flow

```
User selects Bizapp CSV
  ↓
Parse CSV (papaparse in Web Worker)
  ↓
Clean & Transform (bizappCleaner.ts)
  ├─ Extract unique customers
  ├─ Extract unique agents
  ├─ Extract unique products
  ├─ Aggregate orders by order number
  └─ Build order items
  ↓
Delete old data (if re-uploading)
  ↓
Batch upload (3000 rows/batch, 2 concurrent)
  ├─ Upload customers first
  ├─ Upload agents
  ├─ Upload products
  ├─ Upload orders (with customer_id FK)
  └─ Upload order_items (with order_id FK)
  ↓
Success / Error handling
```

### 7.2 Data Relationships

```
bizapp_customers (1) ──< (M) bizapp_orders
bizapp_agents (1) ──< (M) bizapp_orders
bizapp_orders (1) ──< (M) bizapp_order_items
bizapp_products (1) ──< (M) bizapp_order_items (via SKU)
```

---

## 8. Key Differences: Clinic vs Beauty

### 8.1 Business Model

| Aspect | Clinic Dashboard | Beauty Dashboard |
|--------|-----------------|------------------|
| **Business Type** | Medical/Beauty Clinic | E-commerce Distribution |
| **Primary Entity** | Patient | Customer |
| **Transaction Type** | Service Appointments | Product Orders |
| **Data Sources** | 6 CSV files | 1 CSV file |
| **Key Stakeholders** | Therapists/Beauticians | Agents/Stockists |
| **Medical Data** | Yes (allergies, conditions) | No |
| **Shipping Data** | No | Yes (courier, tracking) |
| **Multi-level Sales** | No | Yes (agent hierarchy) |

### 8.2 Database Structure

| Clinic Tables | Beauty Tables | Purpose |
|--------------|---------------|---------|
| `customers` | `bizapp_customers` | Customer info (simplified, no medical) |
| `transactions` | `bizapp_orders` | Order headers |
| `items` | `bizapp_order_items` | Line items |
| `service_sales` | N/A (not applicable) | Service-specific data |
| N/A | `bizapp_agents` | Agent/distributor info |
| N/A | `bizapp_products` | Product catalog |

---

## 9. Implementation Checklist

### Phase 1: Project Setup (30 min)
- [ ] Update package.json (name, version)
- [ ] Update vite.config.ts (port 5174)
- [ ] Update README.md (project description)
- [ ] Test dev server runs on port 5174

### Phase 2: Database Setup (2-3 hours)
- [ ] Create migration file: `20241119_create_bizapp_tables.sql`
- [ ] Create `bizapp_customers` table
- [ ] Create `bizapp_agents` table
- [ ] Create `bizapp_orders` table
- [ ] Create `bizapp_order_items` table
- [ ] Create `bizapp_products` table
- [ ] Add all indexes
- [ ] Run migration in Supabase
- [ ] Verify tables exist alongside clinic tables

### Phase 3: Data Processing (4-5 hours)
- [ ] Create `src/utils/bizappCleaner.ts`
  - [ ] Implement `cleanBizappData()`
  - [ ] Implement `aggregateOrdersByOrderNumber()`
  - [ ] Implement `extractCustomers()`
  - [ ] Implement `extractAgents()`
  - [ ] Implement `extractProducts()`
  - [ ] Implement `buildOrders()`
  - [ ] Implement `buildOrderItems()`
- [ ] Modify `src/utils/excelParser.ts`
  - [ ] Add single CSV parsing
  - [ ] Remove 6-file logic
- [ ] Update `src/utils/uploadProcessor.ts`
  - [ ] Change table names to bizapp_*
  - [ ] Increase batch size to 3000
  - [ ] Add parallel uploads (2 concurrent)
  - [ ] Update upload sequence

### Phase 4: Upload UI (2-3 hours)
- [ ] Update `src/components/DataUpload.tsx`
  - [ ] Single file dropzone
  - [ ] Update validation
  - [ ] Update progress messages
  - [ ] Add large file warnings
- [ ] Test with sample CSV (1000 rows)
- [ ] Test with full CSV (137k rows)

### Phase 5: Dashboard Pages (6-8 hours)
- [ ] Update `src/pages/Homepage.tsx`
  - [ ] Replace clinic metrics with e-commerce
  - [ ] Update data fetching (bizapp_* tables)
- [ ] Update `src/pages/Analytics.tsx`
  - [ ] Product sales charts
  - [ ] Agent performance charts
  - [ ] Order trends
- [ ] Create `src/pages/Products.tsx`
  - [ ] Product list
  - [ ] Top sellers
  - [ ] Revenue by product
- [ ] Create `src/pages/Agents.tsx`
  - [ ] Agent list
  - [ ] Sales by agent
  - [ ] Sponsor relationships
- [ ] Create `src/pages/Orders.tsx`
  - [ ] Order list with filters
  - [ ] Status tracking
- [ ] Update `src/pages/Customers.tsx`
  - [ ] Use bizapp_customers table
  - [ ] Remove medical fields

### Phase 6: Reports (3-4 hours)
- [ ] Update `src/pages/CustomerReport.tsx`
  - [ ] Use bizapp_customers
  - [ ] Add e-commerce metrics
  - [ ] Update export columns
- [ ] Create `src/pages/ProductReport.tsx`
  - [ ] Product performance report
  - [ ] Export functionality
- [ ] Create `src/pages/AgentReport.tsx`
  - [ ] Agent performance report
  - [ ] Export functionality

### Phase 7: Navigation & Polish (2-3 hours)
- [ ] Update `src/components/Sidebar.tsx`
  - [ ] Update menu items
  - [ ] Update labels (Patients → Customers, etc.)
- [ ] Update routes in `src/App.tsx`
- [ ] Update page titles
- [ ] Test all navigation flows
- [ ] Test all export functions

### Phase 8: Testing (2-3 hours)
- [ ] Upload test with sample CSV
- [ ] Upload test with full 137k row CSV
- [ ] Verify data accuracy
- [ ] Test all dashboards load correctly
- [ ] Test all reports export correctly
- [ ] Performance testing

---

## 10. Expected Timeline

**Total Estimated Time: 8-12 hours of development work**

| Phase | Time | Cumulative |
|-------|------|-----------|
| Project Setup | 30 min | 30 min |
| Database Setup | 2-3 hours | 3 hours |
| Data Processing | 4-5 hours | 8 hours |
| Upload UI | 2-3 hours | 10 hours |
| Dashboard Pages | 6-8 hours | 16 hours |
| Reports | 3-4 hours | 19 hours |
| Navigation & Polish | 2-3 hours | 21 hours |
| Testing | 2-3 hours | **24 hours** |

**Realistic Timeline: 2-3 working days**

---

## 11. Success Criteria

### 11.1 Functional Requirements
- [ ] Can upload single Bizapp CSV (137k rows)
- [ ] Upload completes in under 5 minutes
- [ ] All data correctly parsed and stored
- [ ] No data loss or corruption
- [ ] Dashboards display accurate metrics
- [ ] Reports export correctly
- [ ] No conflicts with clinic database

### 11.2 Performance Requirements
- [ ] Upload handles 137k rows without browser crash
- [ ] Dashboard loads in under 3 seconds
- [ ] Charts render smoothly
- [ ] Reports generate in under 10 seconds
- [ ] Export files download successfully

### 11.3 Data Integrity
- [ ] Customer records unique and accurate
- [ ] Orders linked to correct customers
- [ ] Order items linked to correct orders
- [ ] Totals calculated correctly
- [ ] Dates parsed correctly
- [ ] No duplicate orders

---

## 12. Troubleshooting Guide

### Issue 1: Browser Crashes During Upload
**Cause:** Out of memory (137k rows × 65 columns)
**Solution:**
- Implement Web Worker for parsing
- Process in smaller chunks (10k rows at a time)
- Increase batch size to 5000

### Issue 2: Upload Takes Too Long
**Cause:** Small batch size or sequential uploads
**Solution:**
- Increase batch size to 3000-5000
- Increase MAX_CONCURRENT to 3
- Use `Promise.all()` for parallel uploads

### Issue 3: Duplicate Orders
**Cause:** Re-uploading same CSV
**Solution:**
- Add "Clear existing data" checkbox
- Delete existing bizapp_* data before upload
- Add order number uniqueness constraint

### Issue 4: Foreign Key Errors
**Cause:** Uploading orders before customers
**Solution:**
- Ensure upload order: customers → agents → products → orders → order_items
- Fetch and map IDs after each table upload

---

## 13. Next Steps After Migration

### 13.1 Immediate (Week 1)
1. Deploy to production
2. Import historical data
3. Train users on new system
4. Monitor performance

### 13.2 Short-term (Month 1)
1. Add advanced analytics
2. Implement automated reporting
3. Add email notifications
4. Integrate with accounting system

### 13.3 Long-term (Quarter 1)
1. Add inventory management
2. Implement forecasting
3. Add agent commission automation
4. Mobile app development

---

## 14. Contact & Support

**Project:** Ainaa Beauty Dashboard
**Based On:** Ainaa Clinic Dashboard
**Data Source:** Bizapp E-commerce Export
**Developer:** [Your Name]
**Date:** 2024-11-19

---

## Appendix A: Sample Bizapp CSV Structure

```csv
NO,NO. TEMPAHAN,ID AGEN/STOKIS,NAMA AGEN/STOKIS,PENAJA,NAMA PELANGGAN,NO H/P,EMEL,SKU,PRODUK,KUANTITI,HARGA JUALAN PRODUK,TARIKH TEMPAHAN,...
1,ORD001,AG123,AGENT NAME,SPONSOR,Customer Name,0123456789,email@test.com,SKU001,Product A,2,50.00,2024-01-15,...
2,ORD001,AG123,AGENT NAME,SPONSOR,Customer Name,0123456789,email@test.com,SKU002,Product B,1,30.00,2024-01-15,...
3,ORD002,AG456,AGENT NAME 2,SPONSOR 2,Customer 2,0129876543,email2@test.com,SKU001,Product A,1,50.00,2024-01-16,...
```

**Note:** Order ORD001 has 2 rows (2 products), Order ORD002 has 1 row (1 product)

---

## Appendix B: Database Size Estimates

**Per Record Sizes (approximate):**
- bizapp_customers: ~200 bytes/record
- bizapp_agents: ~150 bytes/record
- bizapp_orders: ~400 bytes/record
- bizapp_order_items: ~250 bytes/record

**For 137k CSV rows:**
- Unique customers: ~5,000-10,000 → 1-2 MB
- Unique agents: ~100-500 → <0.1 MB
- Unique orders: ~30,000-50,000 → 12-20 MB
- Order items: ~137,000 → 35 MB
- **Total estimated database size: ~50-60 MB**

**Supabase Free Tier:** 500 MB → Plenty of space

---

END OF DOCUMENT
