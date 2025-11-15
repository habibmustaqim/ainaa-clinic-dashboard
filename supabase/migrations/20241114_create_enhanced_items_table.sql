-- Migration: Create enhanced_items table for Service Sales data
-- Created: 2024-11-14
-- Description: Adds enhanced_items table with 36 columns for detailed Service Sales data

-- Create enhanced_items table
CREATE TABLE IF NOT EXISTS public.enhanced_items (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Key to transactions
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,

    -- Core Item Information (7 columns)
    item_number INTEGER,
    item_code TEXT,
    item_description TEXT,
    quantity NUMERIC(10, 2),
    unit_price NUMERIC(10, 2),
    discount_percentage NUMERIC(5, 2),
    amount NUMERIC(10, 2),

    -- Service Sales Specific Fields (29 additional columns)
    service_category TEXT,
    service_type TEXT,
    service_provider TEXT,
    service_date TIMESTAMPTZ,
    service_duration INTEGER, -- in minutes

    -- Patient/Customer Details
    patient_name TEXT,
    patient_ic TEXT,
    patient_phone TEXT,
    patient_email TEXT,
    patient_age INTEGER,
    patient_gender TEXT,

    -- Medical/Treatment Details
    diagnosis_code TEXT,
    treatment_notes TEXT,
    prescription_notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,

    -- Pricing and Billing
    original_price NUMERIC(10, 2),
    discount_amount NUMERIC(10, 2),
    tax_amount NUMERIC(10, 2),
    subtotal NUMERIC(10, 2),

    -- Insurance and Claims
    insurance_claim_number TEXT,
    insurance_provider TEXT,
    insurance_coverage_percentage NUMERIC(5, 2),
    insurance_covered_amount NUMERIC(10, 2),
    patient_payable_amount NUMERIC(10, 2),

    -- Inventory and Stock
    stock_code TEXT,
    batch_number TEXT,
    expiry_date DATE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_enhanced_items_transaction_id
    ON public.enhanced_items(transaction_id);

CREATE INDEX IF NOT EXISTS idx_enhanced_items_service_date
    ON public.enhanced_items(service_date);

CREATE INDEX IF NOT EXISTS idx_enhanced_items_service_category
    ON public.enhanced_items(service_category);

CREATE INDEX IF NOT EXISTS idx_enhanced_items_service_provider
    ON public.enhanced_items(service_provider);

CREATE INDEX IF NOT EXISTS idx_enhanced_items_patient_ic
    ON public.enhanced_items(patient_ic);

CREATE INDEX IF NOT EXISTS idx_enhanced_items_insurance_claim
    ON public.enhanced_items(insurance_claim_number);

CREATE INDEX IF NOT EXISTS idx_enhanced_items_created_at
    ON public.enhanced_items(created_at DESC);

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_enhanced_items_service_date_category
    ON public.enhanced_items(service_date, service_category);

-- Add comment to table
COMMENT ON TABLE public.enhanced_items IS 'Enhanced items table for detailed Service Sales data with patient, treatment, and insurance information';

-- Add comments to important columns
COMMENT ON COLUMN public.enhanced_items.service_duration IS 'Service duration in minutes';
COMMENT ON COLUMN public.enhanced_items.insurance_coverage_percentage IS 'Percentage of service covered by insurance (0-100)';
COMMENT ON COLUMN public.enhanced_items.patient_payable_amount IS 'Amount patient needs to pay after insurance coverage';

-- Enable Row Level Security (RLS)
ALTER TABLE public.enhanced_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.enhanced_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.enhanced_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.enhanced_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.enhanced_items;
DROP POLICY IF EXISTS "Enable read access for anon users" ON public.enhanced_items;

-- Create RLS Policies

-- Policy 1: Allow authenticated users to read all enhanced_items
CREATE POLICY "Enable read access for authenticated users"
    ON public.enhanced_items
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow authenticated users to insert enhanced_items
CREATE POLICY "Enable insert access for authenticated users"
    ON public.enhanced_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy 3: Allow authenticated users to update enhanced_items
CREATE POLICY "Enable update access for authenticated users"
    ON public.enhanced_items
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy 4: Allow authenticated users to delete enhanced_items
CREATE POLICY "Enable delete access for authenticated users"
    ON public.enhanced_items
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy 5: Allow anonymous users to read enhanced_items (optional - adjust based on security requirements)
CREATE POLICY "Enable read access for anon users"
    ON public.enhanced_items
    FOR SELECT
    TO anon
    USING (true);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_enhanced_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_enhanced_items_updated_at ON public.enhanced_items;

CREATE TRIGGER update_enhanced_items_updated_at
    BEFORE UPDATE ON public.enhanced_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_enhanced_items_updated_at();

-- Grant permissions
GRANT ALL ON public.enhanced_items TO authenticated;
GRANT SELECT ON public.enhanced_items TO anon;
