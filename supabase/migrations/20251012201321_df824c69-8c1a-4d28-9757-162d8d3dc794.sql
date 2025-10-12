-- Fix security issues - simplified

-- Enable RLS on table_name if not already enabled
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;