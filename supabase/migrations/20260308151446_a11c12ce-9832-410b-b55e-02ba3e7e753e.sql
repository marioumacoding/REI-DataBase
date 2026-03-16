
-- Create properties table
CREATE TABLE public.properties (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zipcode TEXT NOT NULL,
  mailing_address TEXT,
  mailing_city TEXT,
  mailing_state TEXT,
  mailing_zip TEXT,
  client_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  phone_1 TEXT,
  type_1 TEXT,
  phone_2 TEXT,
  type_2 TEXT,
  phone_3 TEXT,
  type_3 TEXT,
  email_1 TEXT,
  email_2 TEXT,
  email_3 TEXT,
  wrong_1 BOOLEAN DEFAULT false,
  wrong_2 BOOLEAN DEFAULT false,
  wrong_3 BOOLEAN DEFAULT false,
  last_seen_1 TEXT,
  last_seen_2 TEXT,
  last_seen_3 TEXT
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Allow public read access (no auth required for now)
CREATE POLICY "Properties are publicly readable"
  ON public.properties FOR SELECT
  USING (true);

-- Allow public insert (for CSV uploads etc.)
CREATE POLICY "Properties are publicly insertable"
  ON public.properties FOR INSERT
  WITH CHECK (true);

-- Allow public update
CREATE POLICY "Properties are publicly updatable"
  ON public.properties FOR UPDATE
  USING (true);

-- Allow public delete
CREATE POLICY "Properties are publicly deletable"
  ON public.properties FOR DELETE
  USING (true);
