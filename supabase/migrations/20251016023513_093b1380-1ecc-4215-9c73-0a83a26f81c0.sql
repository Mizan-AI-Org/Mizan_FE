-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'server', 'chef', 'cleaner');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, restaurant_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user roles for a restaurant
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID, _restaurant_id UUID)
RETURNS TABLE(role app_role)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND restaurant_id = _restaurant_id
$$;

-- Create function to check if user has any role in restaurant
CREATE OR REPLACE FUNCTION public.has_restaurant_access(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND restaurant_id = _restaurant_id
  )
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners and managers can view all roles in their restaurant"
  ON public.user_roles
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'owner'
    )
  );

CREATE POLICY "Managers can insert non-owner roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    role != 'owner'
    AND restaurant_id IN (
      SELECT restaurant_id
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'manager'
    )
  );

-- Update staff_members table to link to user_roles
ALTER TABLE public.staff_members
ADD COLUMN IF NOT EXISTS pin_code TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_restaurant 
  ON public.user_roles(user_id, restaurant_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_restaurant 
  ON public.user_roles(restaurant_id);

-- Trigger to automatically assign owner role when restaurant is created
CREATE OR REPLACE FUNCTION public.assign_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, restaurant_id, role, created_by)
  VALUES (NEW.owner_id, NEW.id, 'owner', NEW.owner_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_restaurant_created
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_owner_role();