-- Integration keys: permite configurar API keys pela UI
CREATE TABLE IF NOT EXISTS integration_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service text NOT NULL,
  key_name text NOT NULL,
  key_value text NOT NULL,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(service, key_name)
);

-- RLS
ALTER TABLE integration_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read integration_keys"
  ON integration_keys FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert integration_keys"
  ON integration_keys FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update integration_keys"
  ON integration_keys FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete integration_keys"
  ON integration_keys FOR DELETE
  TO authenticated
  USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_integration_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_integration_keys_updated_at
  BEFORE UPDATE ON integration_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_keys_updated_at();
