-- Migration: Create customer_visit_frequency table
-- Date: 2024-11-15
-- Description: Table for aggregated customer visit metrics and spending patterns

-- Create customer_visit_frequency table
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

-- Create indexes for performance
CREATE INDEX idx_visit_freq_customer_id ON customer_visit_frequency(customer_id);
CREATE INDEX idx_visit_freq_membership ON customer_visit_frequency(membership_number);
CREATE INDEX idx_visit_freq_consultant ON customer_visit_frequency(consultant);
CREATE INDEX idx_visit_freq_total_spent ON customer_visit_frequency(total_spent DESC);
CREATE INDEX idx_visit_freq_total_visits ON customer_visit_frequency(total_visits DESC);
CREATE INDEX idx_visit_freq_last_visit ON customer_visit_frequency(last_visit_date DESC);
CREATE INDEX idx_visit_freq_active ON customer_visit_frequency(is_active) WHERE is_active = true;
CREATE INDEX idx_visit_freq_vip ON customer_visit_frequency(is_vip) WHERE is_vip = true;
CREATE INDEX idx_visit_freq_at_risk ON customer_visit_frequency(is_at_risk) WHERE is_at_risk = true;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_visit_frequency_updated_at
BEFORE UPDATE ON customer_visit_frequency
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE customer_visit_frequency IS 'Aggregated customer visit and spending metrics for analytics';
COMMENT ON COLUMN customer_visit_frequency.total_spent IS 'Total amount spent by customer across all visits';
COMMENT ON COLUMN customer_visit_frequency.spent_for_period IS 'Amount spent in current reporting period';
COMMENT ON COLUMN customer_visit_frequency.avg_visit_week IS 'Average visits per week';
COMMENT ON COLUMN customer_visit_frequency.avg_visit_month IS 'Average visits per month';
COMMENT ON COLUMN customer_visit_frequency.avg_visit_year IS 'Average visits per year';
COMMENT ON COLUMN customer_visit_frequency.is_active IS 'Customer visited within last 180 days';
COMMENT ON COLUMN customer_visit_frequency.is_at_risk IS 'Customer not visited in 91-180 days';
COMMENT ON COLUMN customer_visit_frequency.is_dormant IS 'Customer not visited in over 180 days';

-- Enable Row Level Security
ALTER TABLE customer_visit_frequency ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users"
  ON customer_visit_frequency
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for anon users"
  ON customer_visit_frequency
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);