/*
  # Insert Sample Fuel Stations

  1. New Data
    - Insert sample fuel stations across major cities in Ghana
    - Include verified stations with realistic pricing
    - Set up operating hours and contact information
    - Create corresponding user accounts for station managers

  2. Stations Included
    - Shell stations in Accra, Kumasi, and Tamale
    - Total stations in Cape Coast and Takoradi
    - Goil stations in Ho and Sunyani
    - Star Oil stations in Koforidua and Wa

  3. Features
    - All stations are pre-verified and active
    - Realistic fuel pricing based on Ghana market rates
    - Standard operating hours (6 AM - 10 PM weekdays, 7 AM - 9 PM Sundays)
    - Contact information and addresses
*/

-- First, insert user accounts for station managers
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '00000000-0000-0000-0000-000000000000', 'shell.accra@fillup.gh', crypt('StationPass123!', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Shell Accra Manager"}', false, 'authenticated'),
  ('550e8400-e29b-41d4-a716-446655440002', '00000000-0000-0000-0000-000000000000', 'shell.kumasi@fillup.gh', crypt('StationPass123!', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Shell Kumasi Manager"}', false, 'authenticated'),
  ('550e8400-e29b-41d4-a716-446655440003', '00000000-0000-0000-0000-000000000000', 'total.capecoast@fillup.gh', crypt('StationPass123!', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Total Cape Coast Manager"}', false, 'authenticated'),
  ('550e8400-e29b-41d4-a716-446655440004', '00000000-0000-0000-0000-000000000000', 'goil.ho@fillup.gh', crypt('StationPass123!', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Goil Ho Manager"}', false, 'authenticated'),
  ('550e8400-e29b-41d4-a716-446655440005', '00000000-0000-0000-0000-000000000000', 'star.koforidua@fillup.gh', crypt('StationPass123!', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Star Oil Koforidua Manager"}', false, 'authenticated'),
  ('550e8400-e29b-41d4-a716-446655440006', '00000000-0000-0000-0000-000000000000', 'shell.tamale@fillup.gh', crypt('StationPass123!', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Shell Tamale Manager"}', false, 'authenticated'),
  ('550e8400-e29b-41d4-a716-446655440007', '00000000-0000-0000-0000-000000000000', 'total.takoradi@fillup.gh', crypt('StationPass123!', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Total Takoradi Manager"}', false, 'authenticated'),
  ('550e8400-e29b-41d4-a716-446655440008', '00000000-0000-0000-0000-000000000000', 'goil.sunyani@fillup.gh', crypt('StationPass123!', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Goil Sunyani Manager"}', false, 'authenticated'),
  ('550e8400-e29b-41d4-a716-446655440009', '00000000-0000-0000-0000-000000000000', 'star.wa@fillup.gh', crypt('StationPass123!', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Star Oil Wa Manager"}', false, 'authenticated'),
  ('550e8400-e29b-41d4-a716-446655440010', '00000000-0000-0000-0000-000000000000', 'shell.eastlegon@fillup.gh', crypt('StationPass123!', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Shell East Legon Manager"}', false, 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Insert corresponding user profiles
INSERT INTO users (
  id,
  email,
  role,
  name,
  phone,
  is_verified,
  is_active
) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'shell.accra@fillup.gh', 'station', 'Shell Accra Manager', '+233244123001', true, true),
  ('550e8400-e29b-41d4-a716-446655440002', 'shell.kumasi@fillup.gh', 'station', 'Shell Kumasi Manager', '+233244123002', true, true),
  ('550e8400-e29b-41d4-a716-446655440003', 'total.capecoast@fillup.gh', 'station', 'Total Cape Coast Manager', '+233244123003', true, true),
  ('550e8400-e29b-41d4-a716-446655440004', 'goil.ho@fillup.gh', 'station', 'Goil Ho Manager', '+233244123004', true, true),
  ('550e8400-e29b-41d4-a716-446655440005', 'star.koforidua@fillup.gh', 'station', 'Star Oil Koforidua Manager', '+233244123005', true, true),
  ('550e8400-e29b-41d4-a716-446655440006', 'shell.tamale@fillup.gh', 'station', 'Shell Tamale Manager', '+233244123006', true, true),
  ('550e8400-e29b-41d4-a716-446655440007', 'total.takoradi@fillup.gh', 'station', 'Total Takoradi Manager', '+233244123007', true, true),
  ('550e8400-e29b-41d4-a716-446655440008', 'goil.sunyani@fillup.gh', 'station', 'Goil Sunyani Manager', '+233244123008', true, true),
  ('550e8400-e29b-41d4-a716-446655440009', 'star.wa@fillup.gh', 'station', 'Star Oil Wa Manager', '+233244123009', true, true),
  ('550e8400-e29b-41d4-a716-446655440010', 'shell.eastlegon@fillup.gh', 'station', 'Shell East Legon Manager', '+233244123010', true, true)
ON CONFLICT (id) DO NOTHING;

-- Insert fuel stations
INSERT INTO stations (
  id,
  user_id,
  name,
  address,
  phone,
  fuel_types,
  petrol_price,
  diesel_price,
  is_verified,
  is_active,
  operating_hours
) VALUES 
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440001',
    'Shell Accra Central',
    'Liberation Road, Accra Central, Greater Accra Region',
    '+233302123001',
    ARRAY['petrol', 'diesel'],
    15.85,
    16.20,
    true,
    true,
    '{
      "monday": {"open": "06:00", "close": "22:00"},
      "tuesday": {"open": "06:00", "close": "22:00"},
      "wednesday": {"open": "06:00", "close": "22:00"},
      "thursday": {"open": "06:00", "close": "22:00"},
      "friday": {"open": "06:00", "close": "22:00"},
      "saturday": {"open": "06:00", "close": "22:00"},
      "sunday": {"open": "07:00", "close": "21:00"}
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440002',
    'Shell Kumasi Adum',
    'Prempeh II Street, Adum, Kumasi, Ashanti Region',
    '+233322123002',
    ARRAY['petrol', 'diesel'],
    15.90,
    16.25,
    true,
    true,
    '{
      "monday": {"open": "06:00", "close": "22:00"},
      "tuesday": {"open": "06:00", "close": "22:00"},
      "wednesday": {"open": "06:00", "close": "22:00"},
      "thursday": {"open": "06:00", "close": "22:00"},
      "friday": {"open": "06:00", "close": "22:00"},
      "saturday": {"open": "06:00", "close": "22:00"},
      "sunday": {"open": "07:00", "close": "21:00"}
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003',
    'Total Cape Coast',
    'Commercial Street, Cape Coast, Central Region',
    '+233332123003',
    ARRAY['petrol', 'diesel'],
    15.80,
    16.15,
    true,
    true,
    '{
      "monday": {"open": "06:00", "close": "22:00"},
      "tuesday": {"open": "06:00", "close": "22:00"},
      "wednesday": {"open": "06:00", "close": "22:00"},
      "thursday": {"open": "06:00", "close": "22:00"},
      "friday": {"open": "06:00", "close": "22:00"},
      "saturday": {"open": "06:00", "close": "22:00"},
      "sunday": {"open": "07:00", "close": "21:00"}
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440004',
    'Goil Ho Station',
    'Volta Regional Hospital Road, Ho, Volta Region',
    '+233362123004',
    ARRAY['petrol', 'diesel'],
    15.75,
    16.10,
    true,
    true,
    '{
      "monday": {"open": "06:00", "close": "22:00"},
      "tuesday": {"open": "06:00", "close": "22:00"},
      "wednesday": {"open": "06:00", "close": "22:00"},
      "thursday": {"open": "06:00", "close": "22:00"},
      "friday": {"open": "06:00", "close": "22:00"},
      "saturday": {"open": "06:00", "close": "22:00"},
      "sunday": {"open": "07:00", "close": "21:00"}
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440005',
    'Star Oil Koforidua',
    'Adweso Road, Koforidua, Eastern Region',
    '+233342123005',
    ARRAY['petrol', 'diesel'],
    15.88,
    16.23,
    true,
    true,
    '{
      "monday": {"open": "06:00", "close": "22:00"},
      "tuesday": {"open": "06:00", "close": "22:00"},
      "wednesday": {"open": "06:00", "close": "22:00"},
      "thursday": {"open": "06:00", "close": "22:00"},
      "friday": {"open": "06:00", "close": "22:00"},
      "saturday": {"open": "06:00", "close": "22:00"},
      "sunday": {"open": "07:00", "close": "21:00"}
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440006',
    'Shell Tamale Central',
    'Hospital Road, Tamale, Northern Region',
    '+233372123006',
    ARRAY['petrol', 'diesel'],
    16.00,
    16.35,
    true,
    true,
    '{
      "monday": {"open": "06:00", "close": "22:00"},
      "tuesday": {"open": "06:00", "close": "22:00"},
      "wednesday": {"open": "06:00", "close": "22:00"},
      "thursday": {"open": "06:00", "close": "22:00"},
      "friday": {"open": "06:00", "close": "22:00"},
      "saturday": {"open": "06:00", "close": "22:00"},
      "sunday": {"open": "07:00", "close": "21:00"}
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440007',
    'Total Takoradi Market Circle',
    'Market Circle, Takoradi, Western Region',
    '+233312123007',
    ARRAY['petrol', 'diesel'],
    15.82,
    16.18,
    true,
    true,
    '{
      "monday": {"open": "06:00", "close": "22:00"},
      "tuesday": {"open": "06:00", "close": "22:00"},
      "wednesday": {"open": "06:00", "close": "22:00"},
      "thursday": {"open": "06:00", "close": "22:00"},
      "friday": {"open": "06:00", "close": "22:00"},
      "saturday": {"open": "06:00", "close": "22:00"},
      "sunday": {"open": "07:00", "close": "21:00"}
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440008',
    'Goil Sunyani',
    'Fiapre Road, Sunyani, Bono Region',
    '+233352123008',
    ARRAY['petrol', 'diesel'],
    15.92,
    16.28,
    true,
    true,
    '{
      "monday": {"open": "06:00", "close": "22:00"},
      "tuesday": {"open": "06:00", "close": "22:00"},
      "wednesday": {"open": "06:00", "close": "22:00"},
      "thursday": {"open": "06:00", "close": "22:00"},
      "friday": {"open": "06:00", "close": "22:00"},
      "saturday": {"open": "06:00", "close": "22:00"},
      "sunday": {"open": "07:00", "close": "21:00"}
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440009',
    'Star Oil Wa',
    'Wa-Tumu Road, Wa, Upper West Region',
    '+233392123009',
    ARRAY['petrol', 'diesel'],
    16.05,
    16.40,
    true,
    true,
    '{
      "monday": {"open": "06:00", "close": "22:00"},
      "tuesday": {"open": "06:00", "close": "22:00"},
      "wednesday": {"open": "06:00", "close": "22:00"},
      "thursday": {"open": "06:00", "close": "22:00"},
      "friday": {"open": "06:00", "close": "22:00"},
      "saturday": {"open": "06:00", "close": "22:00"},
      "sunday": {"open": "07:00", "close": "21:00"}
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440010',
    'Shell East Legon',
    'East Legon, Accra, Greater Accra Region',
    '+233302123010',
    ARRAY['petrol', 'diesel'],
    15.95,
    16.30,
    true,
    true,
    '{
      "monday": {"open": "06:00", "close": "22:00"},
      "tuesday": {"open": "06:00", "close": "22:00"},
      "wednesday": {"open": "06:00", "close": "22:00"},
      "thursday": {"open": "06:00", "close": "22:00"},
      "friday": {"open": "06:00", "close": "22:00"},
      "saturday": {"open": "06:00", "close": "22:00"},
      "sunday": {"open": "07:00", "close": "21:00"}
    }'::jsonb
  );