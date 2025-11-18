-- Migration: Rename payment_mode to payment_method in service_sales table
-- This standardizes payment data naming across service_sales and items tables

-- Rename payment_mode column to payment_method in service_sales table
ALTER TABLE service_sales RENAME COLUMN payment_mode TO payment_method;

-- Update index if it exists
DROP INDEX IF EXISTS idx_service_sales_payment_mode;
CREATE INDEX IF NOT EXISTS idx_service_sales_payment_method ON service_sales(payment_method);

-- Add comment for documentation
COMMENT ON COLUMN service_sales.payment_method IS 'Payment method used for service purchase (e.g., Debit Card, QR Pay, Online Transaction)';
