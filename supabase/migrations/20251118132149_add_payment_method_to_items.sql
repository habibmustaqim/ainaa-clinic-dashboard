-- Migration: Add payment_method column to items table
-- This standardizes payment data storage across service_sales and items tables

-- Add payment_method column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_items_payment_method ON items(payment_method);

-- Add comment for documentation
COMMENT ON COLUMN items.payment_method IS 'Payment method used for item purchase (e.g., Debit Card, QR Pay, Online Transaction)';
