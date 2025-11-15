-- Migration: Create service_sales table
-- Date: 2024-11-15
-- Description: Separate table for service transactions with 37 columns from Service Sales report

-- Create service_sales table
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

-- Create indexes for performance
CREATE INDEX idx_service_sales_transaction ON service_sales(transaction_id);
CREATE INDEX idx_service_sales_customer ON service_sales(customer_id);
CREATE INDEX idx_service_sales_membership ON service_sales(membership_number);
CREATE INDEX idx_service_sales_sales_number ON service_sales(sales_number);
CREATE INDEX idx_service_sales_invoice ON service_sales(invoice_number);
CREATE INDEX idx_service_sales_date ON service_sales(sale_date DESC);
CREATE INDEX idx_service_sales_type ON service_sales(service_type);
CREATE INDEX idx_service_sales_category ON service_sales(service_category);
CREATE INDEX idx_service_sales_sku ON service_sales(sku);
CREATE INDEX idx_service_sales_person ON service_sales(sales_person);
CREATE INDEX idx_service_sales_therapist ON service_sales(therapist);
CREATE INDEX idx_service_sales_payment_mode ON service_sales(payment_mode);
CREATE INDEX idx_service_sales_promotional ON service_sales(is_promotional);
CREATE INDEX idx_service_sales_cancelled ON service_sales(is_cancelled);
CREATE INDEX idx_service_sales_nett ON service_sales(nett_amount DESC);

-- Composite indexes for common queries
CREATE INDEX idx_service_sales_date_type ON service_sales(sale_date, service_type);
CREATE INDEX idx_service_sales_customer_date ON service_sales(customer_id, sale_date DESC);
CREATE INDEX idx_service_sales_therapist_date ON service_sales(therapist, sale_date DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_service_sales_updated_at
BEFORE UPDATE ON service_sales
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE service_sales IS 'Detailed service transactions from Service Sales report';
COMMENT ON COLUMN service_sales.service_type IS 'Type of service: FACIAL, LASER, CHEMICAL PEEL, REJUVENATION, OTHERS';
COMMENT ON COLUMN service_sales.cw_used_gross IS 'Cash Wallet amount used (gross)';
COMMENT ON COLUMN service_sales.cw_cancelled_gross IS 'Cash Wallet amount cancelled (gross)';
COMMENT ON COLUMN service_sales.payment_mode IS 'Payment method: Debit Card, QR Pay, Online Transaction';
COMMENT ON COLUMN service_sales.therapist IS 'Therapist/consultant who performed the service';
COMMENT ON COLUMN service_sales.service_category IS 'Normalized service category for analytics';

-- Enable Row Level Security
ALTER TABLE service_sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users"
  ON service_sales
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for anon users"
  ON service_sales
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);