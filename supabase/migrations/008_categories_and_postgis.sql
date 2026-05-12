-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location column to rider_locations
ALTER TABLE public.rider_locations ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Function to update location on latitude/longitude change
CREATE OR REPLACE FUNCTION update_rider_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rider_locations
DROP TRIGGER IF EXISTS trg_update_rider_location ON public.rider_locations;
CREATE TRIGGER trg_update_rider_location
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON public.rider_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_rider_location();

-- Update existing locations
UPDATE public.rider_locations SET latitude = latitude WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Function to find nearest active rider
CREATE OR REPLACE FUNCTION find_nearest_rider(lat double precision, lon double precision, radius_meters double precision)
RETURNS TABLE(rider_id uuid, distance double precision) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.rider_id,
    ST_Distance(r.location, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) AS distance
  FROM public.rider_locations r
  WHERE r.is_online = true
    AND r.location IS NOT NULL
    AND ST_DWithin(r.location, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, radius_meters)
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  image text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Seed Categories
INSERT INTO public.categories (name, image) VALUES
  ('Local', 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=400&q=80'),
  ('Continental', 'https://images.unsplash.com/photo-1544025162-811114bd4bfa?w=400&q=80'),
  ('Fast Food', 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&q=80'),
  ('Healthy', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80'),
  ('Drinks', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80'),
  ('Desserts', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80')
ON CONFLICT (name) DO NOTHING;
