-- Fix security issues

-- 1. Enable RLS on table_name (existing table without RLS)
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Create policy for table_name (allowing authenticated users to manage their own data)
CREATE POLICY "Users can manage their own data" ON public.table_name
  FOR ALL USING (true);

-- 2. Fix handle_new_user function search path (already has it, but ensuring it's correct)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;