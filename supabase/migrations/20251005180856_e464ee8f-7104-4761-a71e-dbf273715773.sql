-- Create staff members table
CREATE TABLE IF NOT EXISTS public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL,
  email text,
  phone text,
  avatar_url text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'available')),
  hourly_rate decimal(10,2),
  rating decimal(3,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shifts/schedules table
CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff_members(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_members
CREATE POLICY "Users can view staff in their restaurant"
  ON public.staff_members FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert staff in their restaurant"
  ON public.staff_members FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update staff in their restaurant"
  ON public.staff_members FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete staff in their restaurant"
  ON public.staff_members FOR DELETE
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for staff_shifts
CREATE POLICY "Users can view shifts in their restaurant"
  ON public.staff_shifts FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert shifts in their restaurant"
  ON public.staff_shifts FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update shifts in their restaurant"
  ON public.staff_shifts FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete shifts in their restaurant"
  ON public.staff_shifts FOR DELETE
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_shifts_updated_at
  BEFORE UPDATE ON public.staff_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_staff_members_restaurant_id ON public.staff_members(restaurant_id);
CREATE INDEX idx_staff_shifts_restaurant_id ON public.staff_shifts(restaurant_id);
CREATE INDEX idx_staff_shifts_staff_id ON public.staff_shifts(staff_id);
CREATE INDEX idx_staff_shifts_date ON public.staff_shifts(shift_date);