-- =====================================================
-- Ainaa Clinic Dashboard - Complete Database Schema
-- =====================================================
-- Description: Complete schema for all tables, indexes, RLS policies, and relationships
-- Created: 2024-11-14
-- Database: Supabase PostgreSQL
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLE: customers
-- =====================================================
-- Description: Stores customer/patient information

CREATE TABLE IF NOT EXISTS public.customers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Customer Information (15 columns)
    customer_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    ic_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postcode TEXT,
    country TEXT DEFAULT 'Malaysia',
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', NULL)),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Indexes for customers table
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON public.customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_ic_number ON public.customers(ic_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);

-- Comments
COMMENT ON TABLE public.customers IS 'Stores customer/patient information';
COMMENT ON COLUMN public.customers.customer_code IS 'Unique customer identifier from source system';

-- RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for anon users" ON public.customers;

CREATE POLICY "Enable read access for authenticated users"
    ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users"
    ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
    ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
    ON public.customers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for anon users"
    ON public.customers FOR SELECT TO anon USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_customers_updated_at();

-- =====================================================
-- TABLE: transactions
-- =====================================================
-- Description: Stores transaction/invoice information

CREATE TABLE IF NOT EXISTS public.transactions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Key to customers
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,

    -- Transaction Information (12 columns)
    transaction_number TEXT UNIQUE NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('Sale', 'Return', 'Refund', 'Credit Note', NULL)),
    status TEXT CHECK (status IN ('Completed', 'Pending', 'Cancelled', 'Refunded', NULL)) DEFAULT 'Completed',

    -- Financial Details
    subtotal NUMERIC(10, 2) DEFAULT 0,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,

    -- Additional Information
    payment_method TEXT,
    reference_number TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_number ON public.transactions(transaction_number);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date_status
    ON public.transactions(transaction_date, status);

-- Comments
COMMENT ON TABLE public.transactions IS 'Stores transaction/invoice information';
COMMENT ON COLUMN public.transactions.transaction_number IS 'Unique transaction/invoice number from source system';

-- RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Enable read access for anon users" ON public.transactions;

CREATE POLICY "Enable read access for authenticated users"
    ON public.transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users"
    ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
    ON public.transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
    ON public.transactions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for anon users"
    ON public.transactions FOR SELECT TO anon USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_transactions_updated_at();

-- =====================================================
-- TABLE: payments
-- =====================================================
-- Description: Stores payment information for transactions

CREATE TABLE IF NOT EXISTS public.payments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Key to transactions
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,

    -- Payment Information (6 columns)
    payment_date TIMESTAMPTZ NOT NULL,
    payment_method TEXT NOT NULL,
    payment_amount NUMERIC(10, 2) NOT NULL,
    reference_number TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Comments
COMMENT ON TABLE public.payments IS 'Stores payment information for transactions';

-- RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable read access for anon users" ON public.payments;

CREATE POLICY "Enable read access for authenticated users"
    ON public.payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users"
    ON public.payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
    ON public.payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
    ON public.payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for anon users"
    ON public.payments FOR SELECT TO anon USING (true);

-- =====================================================
-- TABLE: items
-- =====================================================
-- Description: Stores basic item/line item information for transactions

CREATE TABLE IF NOT EXISTS public.items (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Key to transactions
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,

    -- Item Information (7 columns)
    item_number INTEGER,
    item_code TEXT,
    item_description TEXT,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) DEFAULT 0,
    amount NUMERIC(10, 2) NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for items table
CREATE INDEX IF NOT EXISTS idx_items_transaction_id ON public.items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_items_item_code ON public.items(item_code);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items(created_at DESC);

-- Comments
COMMENT ON TABLE public.items IS 'Stores basic item/line item information for transactions';

-- RLS for items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.items;
DROP POLICY IF EXISTS "Enable read access for anon users" ON public.items;

CREATE POLICY "Enable read access for authenticated users"
    ON public.items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users"
    ON public.items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
    ON public.items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
    ON public.items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for anon users"
    ON public.items FOR SELECT TO anon USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_items_updated_at ON public.items;

CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_items_updated_at();

-- =====================================================
-- TABLE: enhanced_items
-- =====================================================
-- Description: Enhanced items table for detailed Service Sales data

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

-- Indexes for enhanced_items table
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

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_enhanced_items_service_date_category
    ON public.enhanced_items(service_date, service_category);

-- Comments
COMMENT ON TABLE public.enhanced_items IS 'Enhanced items table for detailed Service Sales data with patient, treatment, and insurance information';
COMMENT ON COLUMN public.enhanced_items.service_duration IS 'Service duration in minutes';
COMMENT ON COLUMN public.enhanced_items.insurance_coverage_percentage IS 'Percentage of service covered by insurance (0-100)';
COMMENT ON COLUMN public.enhanced_items.patient_payable_amount IS 'Amount patient needs to pay after insurance coverage';

-- RLS for enhanced_items
ALTER TABLE public.enhanced_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.enhanced_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.enhanced_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.enhanced_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.enhanced_items;
DROP POLICY IF EXISTS "Enable read access for anon users" ON public.enhanced_items;

CREATE POLICY "Enable read access for authenticated users"
    ON public.enhanced_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users"
    ON public.enhanced_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
    ON public.enhanced_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
    ON public.enhanced_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for anon users"
    ON public.enhanced_items FOR SELECT TO anon USING (true);

-- Trigger for updated_at
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

-- =====================================================
-- TABLE: upload_metadata
-- =====================================================
-- Description: Tracks CSV upload history and metadata

CREATE TABLE IF NOT EXISTS public.upload_metadata (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Upload Information (9 columns)
    file_name TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('Cash Sales', 'Credit Sales', 'Service Sales', 'Purchase', 'Other')) NOT NULL,
    file_size INTEGER, -- in bytes
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID, -- reference to auth.users if needed

    -- Processing Status
    status TEXT CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')) DEFAULT 'Pending',
    rows_processed INTEGER DEFAULT 0,
    rows_failed INTEGER DEFAULT 0,
    error_log TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for upload_metadata table
CREATE INDEX IF NOT EXISTS idx_upload_metadata_upload_date
    ON public.upload_metadata(upload_date DESC);

CREATE INDEX IF NOT EXISTS idx_upload_metadata_file_type
    ON public.upload_metadata(file_type);

CREATE INDEX IF NOT EXISTS idx_upload_metadata_status
    ON public.upload_metadata(status);

CREATE INDEX IF NOT EXISTS idx_upload_metadata_created_at
    ON public.upload_metadata(created_at DESC);

-- Comments
COMMENT ON TABLE public.upload_metadata IS 'Tracks CSV upload history and processing metadata';
COMMENT ON COLUMN public.upload_metadata.file_size IS 'File size in bytes';

-- RLS for upload_metadata
ALTER TABLE public.upload_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.upload_metadata;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.upload_metadata;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.upload_metadata;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.upload_metadata;

CREATE POLICY "Enable read access for authenticated users"
    ON public.upload_metadata FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users"
    ON public.upload_metadata FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
    ON public.upload_metadata FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
    ON public.upload_metadata FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_upload_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_upload_metadata_updated_at ON public.upload_metadata;

CREATE TRIGGER update_upload_metadata_updated_at
    BEFORE UPDATE ON public.upload_metadata
    FOR EACH ROW
    EXECUTE FUNCTION public.update_upload_metadata_updated_at();

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.items TO authenticated;
GRANT ALL ON public.enhanced_items TO authenticated;
GRANT ALL ON public.upload_metadata TO authenticated;

-- Grant SELECT permissions to anonymous users (adjust based on security requirements)
GRANT SELECT ON public.customers TO anon;
GRANT SELECT ON public.transactions TO anon;
GRANT SELECT ON public.payments TO anon;
GRANT SELECT ON public.items TO anon;
GRANT SELECT ON public.enhanced_items TO anon;

-- =====================================================
-- HELPFUL VIEWS (Optional)
-- =====================================================

-- View: Transaction Summary with Customer Details
CREATE OR REPLACE VIEW public.v_transaction_summary AS
SELECT
    t.id,
    t.transaction_number,
    t.transaction_date,
    t.transaction_type,
    t.status,
    t.total_amount,
    c.customer_code,
    c.customer_name,
    c.phone,
    c.email,
    COUNT(i.id) as item_count,
    t.created_at
FROM public.transactions t
LEFT JOIN public.customers c ON t.customer_id = c.id
LEFT JOIN public.items i ON t.id = i.transaction_id
GROUP BY t.id, c.customer_code, c.customer_name, c.phone, c.email;

-- View: Enhanced Items with Transaction Details
CREATE OR REPLACE VIEW public.v_enhanced_items_detail AS
SELECT
    ei.*,
    t.transaction_number,
    t.transaction_date,
    t.status as transaction_status,
    c.customer_code,
    c.customer_name
FROM public.enhanced_items ei
JOIN public.transactions t ON ei.transaction_id = t.id
LEFT JOIN public.customers c ON t.customer_id = c.id;

-- View: Daily Sales Summary
CREATE OR REPLACE VIEW public.v_daily_sales_summary AS
SELECT
    DATE(transaction_date) as sale_date,
    transaction_type,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_sales,
    AVG(total_amount) as average_transaction,
    SUM(tax_amount) as total_tax,
    SUM(discount_amount) as total_discount
FROM public.transactions
WHERE status = 'Completed'
GROUP BY DATE(transaction_date), transaction_type
ORDER BY sale_date DESC;

-- Grant SELECT on views
GRANT SELECT ON public.v_transaction_summary TO authenticated, anon;
GRANT SELECT ON public.v_enhanced_items_detail TO authenticated, anon;
GRANT SELECT ON public.v_daily_sales_summary TO authenticated, anon;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
