-- Add pending stations flow to mirror the agent approval process

CREATE TABLE IF NOT EXISTS pending_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  station_name text NOT NULL,
  station_address text NOT NULL,
  location point,
  station_phone text,
  fuel_types text[] DEFAULT ARRAY['petrol', 'diesel'],
  petrol_price decimal(10,2) DEFAULT 0.00,
  diesel_price decimal(10,2) DEFAULT 0.00,
  operating_hours jsonb DEFAULT '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "07:00", "close": "21:00"}}',
  description text,
  image_url text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE pending_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pending stations"
  ON pending_stations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own pending station applications"
  ON pending_stations
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE OR REPLACE FUNCTION update_pending_stations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_stations_updated_at
  BEFORE UPDATE ON pending_stations
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_stations_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_station_registration()
RETURNS TRIGGER AS $$
DECLARE
  station_name TEXT;
  station_address TEXT;
  station_phone TEXT;
  fuel_types TEXT[];
  petrol_price NUMERIC(10,2);
  diesel_price NUMERIC(10,2);
  operating_hours JSONB;
  description TEXT;
  station_location POINT;
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'station' OR NEW.raw_user_meta_data->>'intent' = 'station_registration' THEN
    station_name := NEW.raw_user_meta_data->>'station_name';
    station_address := NEW.raw_user_meta_data->>'station_address';
    station_phone := NEW.raw_user_meta_data->>'station_phone';
    description := NEW.raw_user_meta_data->>'description';

    IF jsonb_typeof(NEW.raw_user_meta_data->'fuel_types') = 'array' THEN
      fuel_types := ARRAY(
        SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'fuel_types')
      );
    ELSE
      fuel_types := ARRAY['petrol', 'diesel'];
    END IF;

    petrol_price := COALESCE(NULLIF(NEW.raw_user_meta_data->>'petrol_price', '')::NUMERIC, 0);
    diesel_price := COALESCE(NULLIF(NEW.raw_user_meta_data->>'diesel_price', '')::NUMERIC, 0);
    operating_hours := COALESCE(
      NEW.raw_user_meta_data->'operating_hours',
      '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "07:00", "close": "21:00"}}'::jsonb
    );

    IF NEW.raw_user_meta_data->'station_location' IS NOT NULL THEN
      station_location := point(
        (NEW.raw_user_meta_data->'station_location'->'coordinates'->>0)::float8,
        (NEW.raw_user_meta_data->'station_location'->'coordinates'->>1)::float8
      );
    END IF;

    INSERT INTO public.pending_stations (
      auth_id,
      email,
      name,
      phone,
      station_name,
      station_address,
      location,
      station_phone,
      fuel_types,
      petrol_price,
      diesel_price,
      operating_hours,
      description,
      image_url,
      status,
      created_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', 'New Station Manager'),
      NEW.raw_user_meta_data->>'phone',
      COALESCE(station_name, 'New Station'),
      COALESCE(station_address, ''),
      station_location,
      station_phone,
      fuel_types,
      petrol_price,
      diesel_price,
      operating_hours,
      description,
      NULL,
      'pending',
      NOW()
    )
    ON CONFLICT (auth_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_station_registration ON auth.users;
CREATE TRIGGER on_auth_user_created_station_registration
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_station_registration();

CREATE OR REPLACE FUNCTION approve_station_application(
  application_id uuid,
  admin_id uuid,
  admin_notes text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  approved_user_id uuid;
  station_auth_id uuid;
  station_email text;
  station_manager_name text;
  station_manager_phone text;
  station_name text;
  station_address text;
  station_location point;
  station_phone text;
  station_fuel_types text[];
  station_petrol_price numeric(10,2);
  station_diesel_price numeric(10,2);
  station_hours jsonb;
  station_description text;
  station_image_url text;
BEGIN
  SELECT
    ps.auth_id,
    ps.email,
    ps.name,
    ps.phone,
    ps.station_name,
    ps.station_address,
    ps.location,
    ps.station_phone,
    ps.fuel_types,
    ps.petrol_price,
    ps.diesel_price,
    ps.operating_hours,
    ps.description,
    ps.image_url
  INTO
    station_auth_id,
    station_email,
    station_manager_name,
    station_manager_phone,
    station_name,
    station_address,
    station_location,
    station_phone,
    station_fuel_types,
    station_petrol_price,
    station_diesel_price,
    station_hours,
    station_description,
    station_image_url
  FROM pending_stations ps
  WHERE ps.id = application_id AND ps.status = 'pending';

  IF station_auth_id IS NULL THEN
    RAISE EXCEPTION 'Invalid application ID or application is not pending';
  END IF;

  SELECT id INTO approved_user_id FROM users WHERE id = station_auth_id;

  IF approved_user_id IS NULL THEN
    INSERT INTO users (
      id, email, role, name, phone, is_verified, is_active, created_at, updated_at
    ) VALUES (
      station_auth_id,
      station_email,
      'station',
      station_manager_name,
      station_manager_phone,
      true,
      true,
      now(),
      now()
    )
    RETURNING id INTO approved_user_id;
  ELSE
    UPDATE users
    SET
      role = 'station',
      is_verified = true,
      is_active = true,
      updated_at = now()
    WHERE id = approved_user_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM stations WHERE user_id = approved_user_id) THEN
    INSERT INTO stations (
      user_id,
      name,
      address,
      location,
      phone,
      fuel_types,
      petrol_price,
      diesel_price,
      is_verified,
      is_active,
      operating_hours,
      description,
      image_url,
      created_at,
      updated_at
    ) VALUES (
      approved_user_id,
      station_name,
      station_address,
      station_location,
      station_phone,
      station_fuel_types,
      station_petrol_price,
      station_diesel_price,
      true,
      true,
      station_hours,
      station_description,
      station_image_url,
      now(),
      now()
    );
  ELSE
    UPDATE stations
    SET
      name = station_name,
      address = station_address,
      location = station_location,
      phone = station_phone,
      fuel_types = station_fuel_types,
      petrol_price = station_petrol_price,
      diesel_price = station_diesel_price,
      is_verified = true,
      is_active = true,
      operating_hours = station_hours,
      description = station_description,
      image_url = station_image_url,
      updated_at = now()
    WHERE user_id = approved_user_id;
  END IF;

  UPDATE pending_stations
  SET
    status = 'approved',
    admin_notes = COALESCE(admin_notes, ''),
    reviewed_at = now(),
    reviewed_by = admin_id
  WHERE id = application_id;

  RETURN approved_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to approve station application: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION approve_station_application TO authenticated;

CREATE OR REPLACE FUNCTION reject_station_application(
  application_id uuid,
  admin_id uuid,
  admin_notes text DEFAULT NULL
) RETURNS boolean AS $$
BEGIN
  UPDATE pending_stations
  SET
    status = 'rejected',
    admin_notes = COALESCE(admin_notes, ''),
    reviewed_at = now(),
    reviewed_by = admin_id
  WHERE id = application_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid application ID or application is not pending';
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reject_station_application TO authenticated;