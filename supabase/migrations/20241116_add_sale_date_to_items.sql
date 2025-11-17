-- Migration: Add sale_date column to items table
-- Created: 2024-11-16
-- Description: Adds sale_date column to items table to enable proper date filtering for item-based analytics

-- Add sale_date column to items table
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
