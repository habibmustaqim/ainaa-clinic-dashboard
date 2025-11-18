-- Migration: Add sales_person column to items table
-- This allows tracking which beautician/sales person sold each item

-- Add sales_person column to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS sales_person TEXT;

-- Add index for better query performance when filtering by sales_person
CREATE INDEX IF NOT EXISTS idx_items_sales_person ON public.items(sales_person);

-- Add comment to document the column
COMMENT ON COLUMN public.items.sales_person IS 'The beautician or sales person who sold this item';
