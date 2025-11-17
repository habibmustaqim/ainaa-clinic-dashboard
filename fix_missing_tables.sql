-- Combined Migration Script: Fix Missing Tables Issue
-- Date: 2024-11-15
-- Purpose: Create missing tables that are causing upload failures
-- Run this script in your Supabase SQL editor

-- ============================================================
-- PART 1: Create update_updated_at_column function if it doesn't exist
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 2: Create service_sales table
-- ============================================================
CREATE TABLE IF NOT EXISTS service_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  membership_number TEXT NOT NULL,

  -- Transaction reference
  sales_number TEXT NOT NULL,
  invoice_number TEXT,
  sale_date DATE NOT NULL,
  sale_time TIME,
  sale_type TEXT,

  -- Customer info (denormalized for performance)
  customer_name TEXT,
  customer_phone TEXT,

  -- Service details
  service_type TEXT, -- FACIAL, LASER, CHEMICAL PEEL, REJUVENATION, OTHERS
  sku TEXT,
  service_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,

  -- Pricing - Original
  original_retail_price DECIMAL(12,2) DEFAULT 0,
  gross_amount DECIMAL(12,2) DEFAULT 0,

  -- Discounts and deductions
  voucher_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  nett_before_deduction DECIMAL(12,2) DEFAULT 0,

  -- Promotions
  promo TEXT,
  promo_group TEXT,

  -- Tax information
  tax_name TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,

  -- Cash Wallet (CW) transactions
  cw_used_gross DECIMAL(12,2) DEFAULT 0,
  cw_used_tax DECIMAL(12,2) DEFAULT 0,
  cw_cancelled_gross DECIMAL(12,2) DEFAULT 0,
  cw_cancelled_tax DECIMAL(12,2) DEFAULT 0,

  -- Cancellations
  cancelled_gross DECIMAL(12,2) DEFAULT 0,
  cancelled_tax DECIMAL(12,2) DEFAULT 0,
  is_cancelled BOOLEAN DEFAULT false,

  -- Payment details
  payment_amount DECIMAL(12,2) DEFAULT 0,
  payment_outstanding DECIMAL(12,2) DEFAULT 0,
  payment_mode TEXT, -- Debit Card, QR Pay, Online Transaction
  payment_type TEXT,
  approval_code TEXT,
  bank TEXT,

  -- Final amount
  nett_amount DECIMAL(12,2) DEFAULT 0,

  -- Staff information
  sales_person TEXT,
  processed_by TEXT,

  -- Service-specific fields
  therapist TEXT, -- For tracking which therapist performed the service
  room_number TEXT, -- Treatment room
  duration_minutes INTEGER, -- Service duration

  -- Analytics helpers
  service_category TEXT GENERATED ALWAYS AS (
    CASE
      WHEN service_type ILIKE '%FACIAL%' THEN 'FACIAL'
      WHEN service_type ILIKE '%LASER%' THEN 'LASER'
      WHEN service_type ILIKE '%CHEMICAL%' THEN 'CHEMICAL PEEL'
      WHEN service_type ILIKE '%REJUVENATION%' THEN 'REJUVENATION'
      WHEN service_type ILIKE '%CONSULTATION%' THEN 'CONSULTATION'
      ELSE 'OTHERS'
    END
  ) STORED,

  is_promotional BOOLEAN GENERATED ALWAYS AS (
    CASE
      WHEN promo IS NOT NULL AND promo != ''
      THEN true
      ELSE false
    END
  ) STORED,

  discount_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN original_retail_price > 0
      THEN ((discount_amount / original_retail_price) * 100)
      ELSE 0
    END
  ) STORED,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for service_sales
CREATE INDEX IF NOT EXISTS idx_service_sales_transaction ON service_sales(transaction_id);
CREATE INDEX IF NOT EXISTS idx_service_sales_customer ON service_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_sales_membership ON service_sales(membership_number);
CREATE INDEX IF NOT EXISTS idx_service_sales_sales_number ON service_sales(sales_number);
CREATE INDEX IF NOT EXISTS idx_service_sales_invoice ON service_sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_service_sales_date ON service_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_sales_type ON service_sales(service_type);
CREATE INDEX IF NOT EXISTS idx_service_sales_category ON service_sales(service_category);
CREATE INDEX IF NOT EXISTS idx_service_sales_sku ON service_sales(sku);

-- Create trigger for service_sales
DROP TRIGGER IF EXISTS update_service_sales_updated_at ON service_sales;
CREATE TRIGGER update_service_sales_updated_at
BEFORE UPDATE ON service_sales
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PART 3: Create customer_visit_frequency table
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_visit_frequency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  membership_number TEXT NOT NULL,

  -- Consultant assignment
  consultant TEXT,

  -- Spending metrics
  total_spent DECIMAL(12,2) DEFAULT 0,
  spent_for_period DECIMAL(12,2) DEFAULT 0,

  -- Visit metrics
  total_visits INTEGER DEFAULT 0,
  avg_visit_week DECIMAL(5,2) DEFAULT 0,
  avg_visit_month DECIMAL(5,2) DEFAULT 0,
  avg_visit_year DECIMAL(5,2) DEFAULT 0,

  -- Transaction tracking
  transaction_count INTEGER DEFAULT 0,

  -- Last activity tracking
  last_visit_action TEXT,
  last_visit_date DATE,
  last_visit_time TIME,

  -- Monthly visit breakdown (for trending)
  visits_oct_2025 INTEGER DEFAULT 0,
  visits_sep_2025 INTEGER DEFAULT 0,
  visits_aug_2025 INTEGER DEFAULT 0,
  visits_jul_2025 INTEGER DEFAULT 0,
  visits_jun_2025 INTEGER DEFAULT 0,
  visits_may_2025 INTEGER DEFAULT 0,
  visits_apr_2025 INTEGER DEFAULT 0,
  visits_mar_2025 INTEGER DEFAULT 0,
  visits_feb_2025 INTEGER DEFAULT 0,
  visits_jan_2025 INTEGER DEFAULT 0,
  visits_dec_2024 INTEGER DEFAULT 0,
  visits_nov_2024 INTEGER DEFAULT 0,

  -- Derived metrics
  first_visit_date DATE,
  customer_lifetime_days INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN last_visit_date IS NOT NULL AND first_visit_date IS NOT NULL
      THEN (last_visit_date - first_visit_date)::INTEGER
      ELSE 0
    END
  ) STORED,

  average_transaction_value DECIMAL(12,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_visits > 0
      THEN total_spent / total_visits
      ELSE 0
    END
  ) STORED,

  -- Segmentation helpers (calculate in application or via triggers)
  is_active BOOLEAN DEFAULT false,
  is_vip BOOLEAN DEFAULT false,
  is_at_risk BOOLEAN DEFAULT false,
  is_dormant BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for customer_visit_frequency
CREATE INDEX IF NOT EXISTS idx_visit_freq_customer_id ON customer_visit_frequency(customer_id);
CREATE INDEX IF NOT EXISTS idx_visit_freq_membership ON customer_visit_frequency(membership_number);
CREATE INDEX IF NOT EXISTS idx_visit_freq_consultant ON customer_visit_frequency(consultant);
CREATE INDEX IF NOT EXISTS idx_visit_freq_total_spent ON customer_visit_frequency(total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_visit_freq_total_visits ON customer_visit_frequency(total_visits DESC);
CREATE INDEX IF NOT EXISTS idx_visit_freq_last_visit ON customer_visit_frequency(last_visit_date DESC);

-- Create trigger for customer_visit_frequency
DROP TRIGGER IF EXISTS update_customer_visit_frequency_updated_at ON customer_visit_frequency;
CREATE TRIGGER update_customer_visit_frequency_updated_at
BEFORE UPDATE ON customer_visit_frequency
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PART 4: Enable Row Level Security (RLS)
-- ============================================================

-- Enable RLS on service_sales
ALTER TABLE service_sales ENABLE ROW LEVEL SECURITY;

-- Create policies for service_sales
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON service_sales;
CREATE POLICY "Allow all operations for authenticated users"
  ON service_sales
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon users" ON service_sales;
CREATE POLICY "Allow all operations for anon users"
  ON service_sales
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Enable RLS on customer_visit_frequency
ALTER TABLE customer_visit_frequency ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_visit_frequency
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON customer_visit_frequency;
CREATE POLICY "Allow all operations for authenticated users"
  ON customer_visit_frequency
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon users" ON customer_visit_frequency;
CREATE POLICY "Allow all operations for anon users"
  ON customer_visit_frequency
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- VERIFICATION
-- ============================================================
-- After running this script, you can verify the tables were created with:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('service_sales', 'customer_visit_frequency');