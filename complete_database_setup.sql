-- ============================================================================
-- COMPLETE DATABASE SETUP SCRIPT
-- ============================================================================
-- Date: 2024-11-15
-- Purpose: Complete database setup including all missing columns and tables
-- Run this entire script in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Enhance customers table with missing columns
-- ============================================================================
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS ic_number TEXT,
ADD COLUMN IF NOT EXISTS phone2 TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS income_range TEXT,
ADD COLUMN IF NOT EXISTS race TEXT,
ADD COLUMN IF NOT EXISTS religion TEXT,
ADD COLUMN IF NOT EXISTS preferred_language TEXT,

-- Medical information
ADD COLUMN IF NOT EXISTS drug_allergies TEXT,
ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
ADD COLUMN IF NOT EXISTS alerts TEXT,
ADD COLUMN IF NOT EXISTS smoker BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS patient_tag TEXT,

-- Address enhancement
ADD COLUMN IF NOT EXISTS address2 TEXT,
ADD COLUMN IF NOT EXISTS address3 TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Malaysia',
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postcode TEXT,

-- Membership information
ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'BRONZE',
ADD COLUMN IF NOT EXISTS consultant TEXT,
ADD COLUMN IF NOT EXISTS outlet TEXT,
ADD COLUMN IF NOT EXISTS vip BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deceased BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS employee_number TEXT,
ADD COLUMN IF NOT EXISTS payee_origin TEXT,
ADD COLUMN IF NOT EXISTS coverage_policies TEXT,

-- Referral information
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS referrer_contact TEXT,
ADD COLUMN IF NOT EXISTS referrer_relationship TEXT,

-- Notification preferences
ADD COLUMN IF NOT EXISTS system_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS promotional_notifications BOOLEAN DEFAULT true,

-- Additional tracking fields
ADD COLUMN IF NOT EXISTS created_date DATE,
ADD COLUMN IF NOT EXISTS created_time TIME,
ADD COLUMN IF NOT EXISTS last_visit_date DATE,
ADD COLUMN IF NOT EXISTS last_visit_time TIME,
ADD COLUMN IF NOT EXISTS registration_date DATE,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS total_spending DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;

-- Remove NOT NULL constraints to allow partial customer data
-- Keep NOT NULL only on: id (primary key), membership_number, name (essential fields)
ALTER TABLE customers
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN address DROP NOT NULL,
ALTER COLUMN gender DROP NOT NULL;

-- Create indexes for customers table
CREATE INDEX IF NOT EXISTS idx_customers_ic_number ON customers(ic_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone2 ON customers(phone2);
CREATE INDEX IF NOT EXISTS idx_customers_membership_type ON customers(membership_type);
CREATE INDEX IF NOT EXISTS idx_customers_consultant ON customers(consultant);
CREATE INDEX IF NOT EXISTS idx_customers_vip ON customers(vip);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit_date ON customers(last_visit_date);

-- ============================================================================
-- PART 1A: Enhance transactions table with missing columns
-- ============================================================================
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS so_number TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_discount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transaction_type TEXT;

-- Create indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_so_number ON transactions(so_number);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_is_cancelled ON transactions(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date DESC);

-- ============================================================================
-- PART 1B: Enhance enhanced_items table with missing columns
-- ============================================================================
ALTER TABLE enhanced_items
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS item_type TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_code TEXT,
ADD COLUMN IF NOT EXISTS package_name TEXT,
ADD COLUMN IF NOT EXISTS therapist TEXT,
ADD COLUMN IF NOT EXISTS room TEXT,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS staff TEXT,
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS discount_type TEXT,
ADD COLUMN IF NOT EXISTS discount_reason TEXT;

-- Create indexes for enhanced_items table
CREATE INDEX IF NOT EXISTS idx_enhanced_items_item_type ON enhanced_items(item_type);
CREATE INDEX IF NOT EXISTS idx_enhanced_items_item_name ON enhanced_items(item_name);
CREATE INDEX IF NOT EXISTS idx_enhanced_items_category ON enhanced_items(category);
CREATE INDEX IF NOT EXISTS idx_enhanced_items_therapist ON enhanced_items(therapist);
CREATE INDEX IF NOT EXISTS idx_enhanced_items_service_code ON enhanced_items(service_code);

-- ============================================================================
-- PART 2: Create update_updated_at_column function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 3: Create service_sales table
-- ============================================================================
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
  service_type TEXT,
  sku TEXT,
  service_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,

  -- Pricing
  original_retail_price DECIMAL(12,2) DEFAULT 0,
  gross_amount DECIMAL(12,2) DEFAULT 0,
  voucher_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  nett_before_deduction DECIMAL(12,2) DEFAULT 0,

  -- Promotions
  promo TEXT,
  promo_group TEXT,

  -- Tax
  tax_name TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,

  -- Cash Wallet
  cw_used_gross DECIMAL(12,2) DEFAULT 0,
  cw_used_tax DECIMAL(12,2) DEFAULT 0,
  cw_cancelled_gross DECIMAL(12,2) DEFAULT 0,
  cw_cancelled_tax DECIMAL(12,2) DEFAULT 0,

  -- Cancellations
  cancelled_gross DECIMAL(12,2) DEFAULT 0,
  cancelled_tax DECIMAL(12,2) DEFAULT 0,
  is_cancelled BOOLEAN DEFAULT false,

  -- Payment
  payment_amount DECIMAL(12,2) DEFAULT 0,
  payment_outstanding DECIMAL(12,2) DEFAULT 0,
  payment_mode TEXT,
  payment_type TEXT,
  approval_code TEXT,
  bank TEXT,
  nett_amount DECIMAL(12,2) DEFAULT 0,

  -- Staff
  sales_person TEXT,
  processed_by TEXT,
  therapist TEXT,
  room_number TEXT,
  duration_minutes INTEGER,

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

-- ============================================================================
-- PART 4: Create customer_visit_frequency table
-- ============================================================================
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

  -- Segmentation helpers
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

-- ============================================================================
-- PART 5: Enable Row Level Security (RLS)
-- ============================================================================

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

-- ============================================================================
-- PART 6: Add comments for documentation
-- ============================================================================
COMMENT ON COLUMN customers.ic_number IS 'Malaysian IC number or passport number';
COMMENT ON COLUMN customers.membership_type IS 'Membership tier: BRONZE, SILVER, GOLD, PLATINUM';
COMMENT ON COLUMN customers.consultant IS 'Assigned consultant or therapist';
COMMENT ON COLUMN customers.drug_allergies IS 'Known drug allergies, comma-separated';
COMMENT ON COLUMN customers.medical_conditions IS 'Current medical conditions or illnesses';
COMMENT ON COLUMN customers.alerts IS 'Important alerts or known allergies';
COMMENT ON COLUMN customers.vip IS 'VIP customer status';
COMMENT ON COLUMN customers.income_range IS 'Annual income range for segmentation';

COMMENT ON TABLE service_sales IS 'Service transactions and treatments performed';
COMMENT ON TABLE customer_visit_frequency IS 'Aggregated customer visit and spending metrics';

-- ============================================================================
-- PART 11: Add sale_date column to items table
-- ============================================================================
-- Date: 2024-11-16
-- Purpose: Enable date filtering for item-based analytics and charts

ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS sale_date DATE;

-- Create index for sale_date to improve query performance
CREATE INDEX IF NOT EXISTS idx_items_sale_date
    ON public.items(sale_date DESC);

-- Create composite index for common date + item_name queries
CREATE INDEX IF NOT EXISTS idx_items_sale_date_item_name
    ON public.items(sale_date, item_name);

-- Add comment to column
COMMENT ON COLUMN public.items.sale_date IS 'Date when the item was sold (extracted from Item Sales report)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- After running this script, verify with these queries:

-- Check customers table columns
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'customers'
-- ORDER BY ordinal_position;

-- Check if new tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('service_sales', 'customer_visit_frequency');

-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================
