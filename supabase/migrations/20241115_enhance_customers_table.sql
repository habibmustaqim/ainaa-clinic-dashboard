-- Migration: Enhance customers table with IC number and additional fields
-- Date: 2024-11-15
-- Description: Add IC number, demographics, medical info, and membership fields to support 6-file system

-- Add new columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS ic_number TEXT,
ADD COLUMN IF NOT EXISTS phone2 TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS birth_date DATE,
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

-- Timestamps
ADD COLUMN IF NOT EXISTS created_date DATE,
ADD COLUMN IF NOT EXISTS created_time TIME,
ADD COLUMN IF NOT EXISTS last_visit_date DATE,
ADD COLUMN IF NOT EXISTS last_visit_time TIME;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_ic_number ON customers(ic_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone2 ON customers(phone2);
CREATE INDEX IF NOT EXISTS idx_customers_membership_type ON customers(membership_type);
CREATE INDEX IF NOT EXISTS idx_customers_consultant ON customers(consultant);
CREATE INDEX IF NOT EXISTS idx_customers_vip ON customers(vip);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit_date ON customers(last_visit_date);

-- Add comments for documentation
COMMENT ON COLUMN customers.ic_number IS 'Malaysian IC number or passport number';
COMMENT ON COLUMN customers.membership_type IS 'Membership tier: BRONZE, SILVER, GOLD, PLATINUM';
COMMENT ON COLUMN customers.consultant IS 'Assigned consultant or therapist';
COMMENT ON COLUMN customers.drug_allergies IS 'Known drug allergies, comma-separated';
COMMENT ON COLUMN customers.medical_conditions IS 'Current medical conditions or illnesses';
COMMENT ON COLUMN customers.alerts IS 'Important alerts or known allergies';
COMMENT ON COLUMN customers.vip IS 'VIP customer status';
COMMENT ON COLUMN customers.income_range IS 'Annual income range for segmentation';

-- Update RLS policies to include new fields
-- Maintain existing policies, they already allow all operations for anon users