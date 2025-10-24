/*
  # Add measurement type to metrics

  1. Changes
    - Add `measurement_type` column to `metrics` table
      - Values: 'currency', 'count', 'percentage'
      - Default: 'count'
    
  2. Notes
    - This allows metrics to track different types of measurements
    - Currency values will be displayed with $ formatting
    - Count values will be plain numbers
    - Percentage values will be displayed with % formatting
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'metrics' AND column_name = 'measurement_type'
  ) THEN
    ALTER TABLE metrics ADD COLUMN measurement_type text DEFAULT 'count' CHECK (measurement_type IN ('currency', 'count', 'percentage'));
  END IF;
END $$;
